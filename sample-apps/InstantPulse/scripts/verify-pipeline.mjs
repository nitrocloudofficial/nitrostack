/**
 * End-to-end verification against the real MCP server over stdio.
 *
 * Spawns dist/index.js, speaks JSON-RPC to it exactly as NitroStudio or Claude
 * Desktop would, and drives the full onboarding journey for every persona —
 * including the officer override path and the band gate on Stripe onboarding.
 *
 *   node scripts/verify-pipeline.mjs
 *
 * Exits non-zero if any assertion fails, so it works as a CI check.
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let nextId = 1;
const pending = new Map();
let failures = 0;
let checks = 0;

const server = spawn(process.execPath, [path.join(ROOT, 'dist', 'index.js')], {
  cwd: ROOT,
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, NITRO_LOG_LEVEL: 'error', INSTANTPULSE_OFFICER_TOKEN: 'demo-officer-token' },
});

let buffer = '';
server.stdout.on('data', (chunk) => {
  buffer += chunk.toString();
  let index;
  while ((index = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, index).trim();
    buffer = buffer.slice(index + 1);
    if (!line.startsWith('{')) continue;
    try {
      const msg = JSON.parse(line);
      const resolver = pending.get(msg.id);
      if (resolver) {
        pending.delete(msg.id);
        resolver(msg);
      }
    } catch {
      /* not a JSON-RPC frame */
    }
  }
});

function rpc(method, params) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, resolve);
    server.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error(`Timed out waiting for ${method}`));
      }
    }, 120_000);
  });
}

async function callTool(name, args) {
  const res = await rpc('tools/call', { name, arguments: args });
  if (res.error) return { __error: res.error.message };
  const content = res.result?.structuredContent;
  if (content) return content;
  const text = res.result?.content?.find((c) => c.type === 'text')?.text;
  try {
    return text ? JSON.parse(text) : res.result;
  } catch {
    return { __raw: text, isError: res.result?.isError };
  }
}

function check(label, condition, detail = '') {
  checks++;
  if (condition) {
    console.log(`  PASS  ${label}${detail ? `  — ${detail}` : ''}`);
  } else {
    failures++;
    console.log(`  FAIL  ${label}${detail ? `  — ${detail}` : ''}`);
  }
}

function heading(text) {
  console.log(`\n${'='.repeat(72)}\n${text}\n${'='.repeat(72)}`);
}

async function main() {
  await rpc('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'instantpulse-verify', version: '1.0.0' },
  });

  // -- Surface ------------------------------------------------------------
  heading('MCP surface');
  const tools = await rpc('tools/list', {});
  const resources = await rpc('resources/list', {});
  const prompts = await rpc('prompts/list', {});

  const toolNames = (tools.result?.tools ?? []).map((t) => t.name);
  const resourceUris = (resources.result?.resources ?? []).map((r) => r.uri);
  const promptNames = (prompts.result?.prompts ?? []).map((p) => p.name);

  check('tools registered', toolNames.length >= 17, `${toolNames.length} tools`);
  check('prompts registered', promptNames.length === 3, promptNames.join(', '));
  check(
    'risk policy resource published',
    resourceUris.includes('instantpulse://policy/risk-model'),
  );
  check(
    'pipeline tool present',
    toolNames.includes('decision_run_full_pipeline'),
  );

  // -- Per-persona pipeline ------------------------------------------------
  const expectations = {
    healthy: 'GREEN',
    volatile: 'YELLOW',
    distressed: 'RED',
  };

  const applications = {};

  for (const [persona, expectedBand] of Object.entries(expectations)) {
    heading(`Pipeline — ${persona} (expect ${expectedBand})`);

    const out = await callTool('decision_run_full_pipeline', {
      businessName: `Verify ${persona}`,
      industry: 'verification',
      requestedAmount: 50_000,
      persona,
      windowDays: 180,
      autoStartStripe: true,
    });

    if (out.__error) {
      check(`${persona} pipeline ran`, false, out.__error);
      continue;
    }

    applications[persona] = out.applicationId;

    console.log(
      `  score=${out.score} band=${out.band} limit=$${out.recommendedLimit} ` +
        `elapsed=${out.timing?.elapsedMs}ms source=${out.provenance?.dataSource}`,
    );

    check(`${persona} → ${expectedBand}`, out.band === expectedBand, `got ${out.band} (${out.score}/100)`);
    check(
      `${persona} produced reason codes`,
      Array.isArray(out.decision?.reasonCodes) && out.decision.reasonCodes.length === 7,
      `${out.decision?.reasonCodes?.length ?? 0} codes`,
    );
    check(
      `${persona} every reason code has an explanation`,
      (out.decision?.reasonCodes ?? []).every((r) => typeof r.explanation === 'string' && r.explanation.length > 20),
    );
    // Live Plaid has to wait out the two-stage transaction delivery, so the
    // budget differs by mode. Either way the point stands: seconds, not days.
    const live = out.provenance?.dataSource === 'plaid_sandbox';
    const budget = live ? 45_000 : 5_000;
    check(
      `${persona} decided within ${budget / 1000}s (${live ? 'live Plaid' : 'simulated'})`,
      (out.timing?.elapsedMs ?? Infinity) < budget,
      `${out.timing?.elapsedMs}ms`,
    );

    if (expectedBand === 'GREEN') {
      check('green started Stripe onboarding', Boolean(out.stripe?.onboardingUrl));
      check('green has a non-zero limit', out.recommendedLimit > 0, `$${out.recommendedLimit}`);
    } else {
      check(`${expectedBand} did NOT start Stripe onboarding`, !out.stripe, out.stripeSkippedReason ?? '');
    }

    if (expectedBand === 'RED') {
      check('red has hard blockers', (out.decision?.hardBlockers ?? []).length > 0,
        (out.decision?.hardBlockers ?? []).map((b) => b.code).join(', '));
      check('red recommends no credit', out.recommendedLimit === 0);
    }

    // No access token may ever cross the MCP boundary.
    const serialized = JSON.stringify(out);
    check(`${persona} response leaks no access token`, !serialized.includes('access_token') && !serialized.includes('accessToken'));
  }

  // -- Band gate on Stripe -------------------------------------------------
  heading('Band gate — Stripe refuses an unreviewed YELLOW');
  const blocked = await callTool('stripe_start_onboarding', { applicationId: applications.volatile });
  const blockedText = JSON.stringify(blocked);
  check(
    'yellow onboarding refused before officer approval',
    blockedText.includes('YELLOW') && blockedText.includes('review'),
    blocked.message ?? blocked.__error ?? '',
  );

  const redBlocked = await callTool('stripe_start_onboarding', { applicationId: applications.distressed });
  check(
    'red onboarding refused',
    JSON.stringify(redBlocked).includes('RED'),
    redBlocked.message ?? redBlocked.__error ?? '',
  );

  // -- Officer workflow ----------------------------------------------------
  heading('Officer review workflow');
  const queue = await callTool('review_list_queue', { includeResolved: false, limit: 25 });
  check('review queue populated', (queue.queue?.length ?? 0) > 0, `${queue.total} in queue`);
  check(
    'queue ordered by score descending',
    (queue.queue ?? []).every((q, i, arr) => i === 0 || arr[i - 1].score >= q.score),
  );

  const badToken = await callTool('review_override_decision', {
    applicationId: applications.volatile,
    newBand: 'GREEN',
    justification: 'Attempting an override without a valid officer credential.',
    officerName: 'impostor',
    officerToken: 'wrong-token',
  });
  check(
    'override rejected with a bad officer token',
    JSON.stringify(badToken).toLowerCase().includes('rejected'),
    badToken.message ?? badToken.__error ?? '',
  );

  const override = await callTool('review_override_decision', {
    applicationId: applications.volatile,
    newBand: 'GREEN',
    justification:
      'Seasonality confirmed against three years of filed accounts; the two large wires are documented equipment purchases.',
    officerName: 'j.okafor',
    officerToken: 'demo-officer-token',
  });
  check('override accepted with the correct token', override.override?.newBand === 'GREEN', override.__error ?? '');
  check(
    'original machine decision preserved',
    override.machineDecision?.band === 'YELLOW',
    `machine said ${override.machineDecision?.band}, officer said ${override.override?.newBand}`,
  );

  const afterOverride = await callTool('stripe_start_onboarding', { applicationId: applications.volatile });
  check(
    'onboarding proceeds after officer approval',
    Boolean(afterOverride.stripe?.onboardingUrl),
    afterOverride.stripe?.accountId ?? afterOverride.__error ?? '',
  );

  const audit = await callTool('review_get_audit_trail', { applicationId: applications.volatile });
  check('audit trail records the override', (audit.entries ?? []).some((e) => e.event === 'review.decision_overridden'));
  check(
    'audit trail records the justification',
    JSON.stringify(audit).includes('Seasonality confirmed'),
  );
  check('audit trail is complete', (audit.entries?.length ?? 0) >= 6, `${audit.entries?.length} entries`);

  // -- Transparency --------------------------------------------------------
  heading('Transparency');
  const policy = await rpc('resources/read', { uri: 'instantpulse://policy/risk-model' });
  const policyText = policy.result?.contents?.[0]?.text ?? '';
  check('risk policy is readable', policyText.length > 500, `${policyText.length} bytes`);
  check('policy publishes factor weights', policyText.includes('cashFlowHealth'));

  const explain = await callTool('risk_explain_score', { applicationId: applications.healthy });
  const arithmetic = explain.arithmetic;
  check('score arithmetic is reproducible', Boolean(arithmetic?.calculation), arithmetic?.calculation ?? '');
  check(
    'points sum to the raw score',
    Math.abs(
      (arithmetic?.factorPointsAwarded ?? []).reduce((s, f) => s + f.points, 0) - (arithmetic?.rawScore ?? -1),
    ) < 0.5,
  );

  const memo = await rpc('prompts/get', {
    name: 'credit_memo',
    arguments: { applicationId: applications.healthy, tone: 'concise' },
  });
  check('credit memo prompt renders', Boolean(memo.result?.messages?.length));

  // -- Input contract ------------------------------------------------------
  // NitroStack does not itself parse tool input with the declared Zod schema,
  // so these assert our ValidateInput pipe is actually doing that job. Without
  // it, omitted fields arrive as undefined and surface as nonsense far downstream.
  heading('Input contract');

  const rejected = await callTool('decision_run_full_pipeline', {
    businessName: 'Bad Input Co.',
    windowDays: 5, // below the schema minimum of 30
    autoStartStripe: false,
  });
  check(
    'out-of-range input is rejected',
    JSON.stringify(rejected).includes('windowDays'),
    rejected.message ?? rejected.__error ?? JSON.stringify(rejected).slice(0, 140),
  );

  const missingRequired = await callTool('risk_score_application', {});
  check(
    'missing required field is rejected',
    JSON.stringify(missingRequired).includes('applicationId'),
    missingRequired.message ?? missingRequired.__error ?? '',
  );

  // -- Determinism ---------------------------------------------------------
  // These deliberately omit windowDays, persona defaults and country so that a
  // regression in default handling fails here rather than in a demo.
  heading('Determinism (with defaults applied)');
  const runA = await callTool('decision_run_full_pipeline', {
    businessName: 'Determinism A', industry: 'test', persona: 'healthy', autoStartStripe: false,
  });
  const runB = await callTool('decision_run_full_pipeline', {
    businessName: 'Determinism B', industry: 'test', persona: 'healthy', autoStartStripe: false,
  });
  check(
    'determinism runs produced scores',
    typeof runA.score === 'number' && typeof runB.score === 'number',
    typeof runA.score === 'number' && typeof runB.score === 'number'
      ? `${runA.score} / ${runB.score}`
      : `A=${JSON.stringify(runA).slice(0, 220)} B=${JSON.stringify(runB).slice(0, 220)}`,
  );
  check(
    'same persona yields the same score',
    typeof runA.score === 'number' && runA.score === runB.score,
    `${runA.score} vs ${runB.score}`,
  );
  check(
    'same persona yields the same limit',
    typeof runA.recommendedLimit === 'number' && runA.recommendedLimit === runB.recommendedLimit,
    `${runA.recommendedLimit} vs ${runB.recommendedLimit}`,
  );

  // -- Summary -------------------------------------------------------------
  heading('Result');
  console.log(`  ${checks - failures}/${checks} checks passed`);
  if (failures > 0) console.log(`  ${failures} FAILED`);

  server.kill();
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Verification harness failed:', error);
  server.kill();
  process.exit(1);
});
