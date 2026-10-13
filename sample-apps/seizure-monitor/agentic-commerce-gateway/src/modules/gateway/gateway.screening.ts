import { verifySignature } from './gateway.signing.js';
import { catalogTotalMinor } from './gateway.normalize.js';
import { formatMinor, store, HITL_THRESHOLD_MINOR } from './gateway.store.js';
import type {
  NormalizedOrder,
  ScoreSignal,
  ScreeningCheck,
  ScreeningResult,
  TrustScoreResult,
  Verdict,
} from './gateway.types.js';

/**
 * Signal weights. They sum to 100 so the score reads as a percentage, and each
 * one is reported separately so a seller can see *which* signal sank an order
 * rather than just a number.
 */
const WEIGHTS = {
  signature: 35,
  reputation: 25,
  orderSize: 20,
  velocity: 12,
  accountAge: 8,
} as const;

const APPROVE_AT = 70;
const HOLD_AT = 45;

/**
 * Stage 1 — identity. Verifies the presented signature against the registry key
 * and pulls the agent's standing. Produces pass/fail checks, not a score.
 */
export function screenAgent(order: NormalizedOrder): ScreeningResult {
  const checks: ScreeningCheck[] = [];
  const agent = store.agents.get(order.agentId);
  const registered = Boolean(agent?.registered);

  checks.push({
    id: 'registry_lookup',
    label: 'Agent registry lookup',
    passed: registered,
    detail: agent
      ? registered
        ? `${agent.displayName} (${agent.operator}) found in registry, reputation ${agent.reputation}/100`
        : `${agent.displayName} is present but not a registered operator — no reputation to draw on`
      : `No registry entry for ${order.agentId}`,
  });

  let signatureValid = false;
  if (agent) {
    signatureValid = verifySignature(
      {
        protocol: order.protocol,
        agentId: order.agentId,
        nonce: order.nonce,
        items: order.items.map((i) => ({ sku: i.sku, qty: i.qty })),
        totalMinor: order.totalMinor,
        currency: order.currency,
      },
      agent.signingKey,
      order.signature,
    );
  }

  checks.push({
    id: 'signature_valid',
    label: 'Payload signature',
    passed: signatureValid,
    detail: signatureValid
      ? `HMAC over the canonical ${order.protocol.toUpperCase()} payload matches the registry key`
      : agent
        ? `Signature ${order.signature.slice(0, 16)}… does not verify against ${order.agentId}'s registry key — spoofed or replayed`
        : 'No registry key available to verify against',
  });

  const blocklisted = store.isBlocklisted(order.agentId);
  checks.push({
    id: 'not_blocklisted',
    label: 'Blocklist status',
    passed: !blocklisted,
    detail: blocklisted
      ? `Agent is blocklisted: ${store.blocklist.get(order.agentId)?.reason}`
      : 'Agent is not blocklisted',
  });

  const disputes = agent?.disputes ?? 0;
  checks.push({
    id: 'dispute_history',
    label: 'Dispute history',
    passed: disputes <= 2,
    detail: `${disputes} prior dispute(s) across ${agent?.lifetimeOrders ?? 0} lifetime order(s)`,
  });

  // x402 declares what it intends to pay; ACP does not, so this check only
  // exists on one evidence path.
  if (order.protocol === 'x402') {
    const catalog = catalogTotalMinor(order);
    const matches = catalog === order.totalMinor;
    checks.push({
      id: 'amount_declaration',
      label: 'Declared amount vs catalog',
      passed: matches,
      detail: matches
        ? `Declared ${formatMinor(order.totalMinor, order.currency)} matches catalog pricing`
        : `Declared ${formatMinor(order.totalMinor, order.currency)} but catalog prices this cart at ${formatMinor(catalog, order.currency)} — underpayment of ${formatMinor(catalog - order.totalMinor, order.currency)}`,
    });
  }

  const failedChecks = checks.filter((c) => !c.passed).length;

  return {
    orderId: order.orderId,
    agentId: order.agentId,
    agentDisplayName: order.agentDisplayName,
    registered,
    signatureValid,
    blocklisted,
    checks,
    failedChecks,
    summary:
      failedChecks === 0
        ? `All ${checks.length} identity checks passed for ${order.agentDisplayName}`
        : `${failedChecks} of ${checks.length} identity checks failed for ${order.agentDisplayName}`,
  };
}

/** Worst per-SKU quantity ratio against that SKU's normal ceiling. */
function orderSizeRatio(order: NormalizedOrder): { ratio: number; worstSku: string } {
  let ratio = 0;
  let worstSku = order.items[0]?.sku ?? 'n/a';
  for (const item of order.items) {
    const product = store.products.get(item.sku);
    if (!product) continue;
    const r = item.qty / product.maxNormalQty;
    if (r > ratio) {
      ratio = r;
      worstSku = item.sku;
    }
  }
  return { ratio, worstSku };
}

/**
 * Stage 2 — scoring. Weighs the screening output plus behavioural signals, then
 * reasons over the combination: a strong positive sitting next to a strong
 * negative is recorded as an explicit conflict rather than silently averaged
 * away.
 */
export function computeTrustScore(
  order: NormalizedOrder,
  screening: ScreeningResult,
): TrustScoreResult {
  const agent = store.agents.get(order.agentId);
  const signals: ScoreSignal[] = [];
  const conflicts: string[] = [];
  const reasoning: string[] = [];

  // --- Signature ---
  signals.push({
    id: 'signature',
    label: 'Signature validity',
    points: screening.signatureValid ? WEIGHTS.signature : 0,
    max: WEIGHTS.signature,
    status: screening.signatureValid ? 'pass' : 'fail',
    detail: screening.signatureValid
      ? 'Payload signature verifies against the registry key'
      : 'Payload signature does not verify — identity is not proven',
  });

  // --- Reputation ---
  const registered = screening.registered;
  const reputation = agent?.reputation ?? 0;
  const repPoints = registered ? Math.round((reputation / 100) * WEIGHTS.reputation) : 2;
  signals.push({
    id: 'reputation',
    label: 'Registry reputation',
    points: repPoints,
    max: WEIGHTS.reputation,
    status: !registered ? 'fail' : reputation >= 70 ? 'pass' : reputation >= 45 ? 'warn' : 'fail',
    detail: registered
      ? `Reputation ${reputation}/100 over ${agent?.lifetimeOrders ?? 0} lifetime orders`
      : 'Agent is not in the reputation registry — treated as unknown',
  });

  // --- Order size anomaly ---
  const { ratio, worstSku } = orderSizeRatio(order);
  const worstProduct = store.products.get(worstSku);
  let sizePoints: number;
  let sizeStatus: ScoreSignal['status'];
  if (ratio <= 1) {
    sizePoints = WEIGHTS.orderSize;
    sizeStatus = 'pass';
  } else if (ratio <= 2) {
    sizePoints = 12;
    sizeStatus = 'warn';
  } else if (ratio <= 4) {
    sizePoints = 6;
    sizeStatus = 'warn';
  } else {
    sizePoints = 0;
    sizeStatus = 'fail';
  }
  const worstQty = order.items.find((i) => i.sku === worstSku)?.qty ?? 0;
  signals.push({
    id: 'order_size',
    label: 'Order size vs product norms',
    points: sizePoints,
    max: WEIGHTS.orderSize,
    status: sizeStatus,
    detail:
      ratio <= 1
        ? `${worstQty}× ${worstSku} is within normal purchase size`
        : `${worstQty}× ${worstSku} is ${ratio.toFixed(1)}× the normal ceiling of ${worstProduct?.maxNormalQty ?? '?'} for that SKU`,
  });

  // --- Velocity ---
  const velocity = agent?.ordersLastHour ?? 0;
  let velPoints: number;
  let velStatus: ScoreSignal['status'];
  if (velocity <= 5) {
    velPoints = WEIGHTS.velocity;
    velStatus = 'pass';
  } else if (velocity <= 15) {
    velPoints = 7;
    velStatus = 'warn';
  } else if (velocity <= 30) {
    velPoints = 3;
    velStatus = 'warn';
  } else {
    velPoints = 0;
    velStatus = 'fail';
  }
  signals.push({
    id: 'velocity',
    label: 'Order velocity',
    points: velPoints,
    max: WEIGHTS.velocity,
    status: velStatus,
    detail: `${velocity} order(s) placed in the last hour`,
  });

  // --- Account age ---
  const age = agent?.accountAgeDays ?? 0;
  let agePoints: number;
  let ageStatus: ScoreSignal['status'];
  if (age >= 90) {
    agePoints = WEIGHTS.accountAge;
    ageStatus = 'pass';
  } else if (age >= 30) {
    agePoints = 5;
    ageStatus = 'warn';
  } else if (age >= 7) {
    agePoints = 2;
    ageStatus = 'warn';
  } else {
    agePoints = 0;
    ageStatus = 'fail';
  }
  signals.push({
    id: 'account_age',
    label: 'Account age',
    points: agePoints,
    max: WEIGHTS.accountAge,
    status: ageStatus,
    detail: `Agent account is ${age} day(s) old`,
  });

  const score = signals.reduce((sum, s) => sum + s.points, 0);

  // --- Conflict detection: signals pointing in opposite directions ---
  if (screening.signatureValid && sizeStatus === 'fail') {
    conflicts.push(
      `Signature is cryptographically valid, yet the order is ${ratio.toFixed(1)}× normal size for ${worstSku} — a real key does not make a bulk-drain order legitimate.`,
    );
  }
  if (reputation >= 70 && velStatus === 'fail') {
    conflicts.push(
      `Reputation is high (${reputation}/100) but the agent has placed ${velocity} orders this hour — reputation may be stale or the account compromised.`,
    );
  }
  if (reputation >= 70 && sizeStatus !== 'pass') {
    conflicts.push(
      `Established agent (${reputation}/100) placing an unusually large order — plausible business procurement, but outside its own historical pattern.`,
    );
  }
  if (age < 14 && (agent?.lifetimeOrders ?? 0) > 50) {
    conflicts.push(
      `Account is ${age} day(s) old but claims ${agent?.lifetimeOrders} lifetime orders — the history is inconsistent with the age.`,
    );
  }
  if (screening.signatureValid && screening.checks.some((c) => c.id === 'amount_declaration' && !c.passed)) {
    conflicts.push(
      'Signature verifies, but the signed amount is below catalog price — the agent correctly signed an underpayment.',
    );
  }

  // --- Verdict ---
  let verdict: Verdict;
  if (screening.blocklisted) {
    verdict = 'decline';
    reasoning.push('Agent is on the store blocklist — declined without further scoring.');
  } else if (!screening.signatureValid) {
    verdict = 'decline';
    reasoning.push('Signature verification failed; identity is unproven, so the sale cannot settle safely.');
  } else if (score >= APPROVE_AT) {
    verdict = 'approve';
    reasoning.push(`Trust score ${score}/100 clears the approval bar of ${APPROVE_AT}.`);
  } else if (score >= HOLD_AT) {
    verdict = 'hold';
    reasoning.push(`Trust score ${score}/100 sits between ${HOLD_AT} and ${APPROVE_AT} — routed to the seller instead of auto-approving.`);
  } else {
    verdict = 'decline';
    reasoning.push(`Trust score ${score}/100 is below the ${HOLD_AT} floor.`);
  }

  // A signed underpayment is never auto-approved.
  const declarationFailed = screening.checks.some(
    (c) => c.id === 'amount_declaration' && !c.passed,
  );
  if (verdict === 'approve' && declarationFailed) {
    verdict = 'hold';
    reasoning.push('Declared settlement amount is below catalog price — held for seller review rather than approved.');
  }

  // An agent with no registry entry has no reputation to stand on, so it never
  // clears automatically however benign the rest of the order looks.
  if (verdict === 'approve' && !screening.registered) {
    verdict = 'hold';
    reasoning.push('Agent is not in the reputation registry — routed to the seller instead of auto-approving an unknown buyer.');
  }

  // Human-in-the-loop: high-value orders always get a human, however clean.
  const hitlRequired = order.totalMinor > HITL_THRESHOLD_MINOR;
  if (hitlRequired && verdict === 'approve') {
    verdict = 'hold';
    reasoning.push(
      `Order total ${formatMinor(order.totalMinor, order.currency)} exceeds the ${formatMinor(HITL_THRESHOLD_MINOR)} human-review threshold — held for the seller even though screening passed.`,
    );
  }

  for (const c of conflicts) reasoning.push(`Conflict: ${c}`);

  const band: TrustScoreResult['band'] =
    score >= APPROVE_AT ? 'low-risk' : score >= HOLD_AT ? 'elevated' : 'high-risk';

  return {
    orderId: order.orderId,
    agentId: order.agentId,
    agentDisplayName: order.agentDisplayName,
    score,
    band,
    verdict,
    signals,
    failedSignals: signals.filter((s) => s.status === 'fail').length,
    conflicts,
    reasoning,
    hitlRequired,
    orderTotalMinor: order.totalMinor,
    currency: order.currency,
  };
}
