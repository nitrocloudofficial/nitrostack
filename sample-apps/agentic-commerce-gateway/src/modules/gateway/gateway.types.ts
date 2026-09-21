/**
 * Shared domain types for the Agentic Commerce Gateway.
 *
 * Money is always handled in **minor units** (paise) as integers so that
 * receipt-vs-chain comparisons are exact — a float rupee amount would make
 * a genuine tampering diff indistinguishable from a rounding artefact.
 */

export type Protocol = 'acp' | 'x402';

export type OrderStatus =
  | 'pending'
  | 'approved'
  | 'held'
  | 'declined'
  | 'flagged';

export type Verdict = 'approve' | 'hold' | 'decline';

export interface Product {
  sku: string;
  name: string;
  category: string;
  priceMinor: number;
  /** Quantity a normal human buyer orders in one go. */
  typicalQty: number;
  /** Above this, the order size is anomalous for this SKU. */
  maxNormalQty: number;
}

export interface AgentRecord {
  agentId: string;
  displayName: string;
  operator: string;
  /** Whether the agent exists in the mock reputation registry at all. */
  registered: boolean;
  /** 0-100 reputation from the registry. */
  reputation: number;
  accountAgeDays: number;
  lifetimeOrders: number;
  disputes: number;
  /** Observed order rate used for the velocity signal. */
  ordersLastHour: number;
  /** Shared secret backing this agent's payload signature (mock registry key). */
  signingKey: string;
  wallet?: string;
}

export interface OrderItem {
  sku: string;
  name: string;
  qty: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
}

/**
 * Protocol-agnostic order shape. Both ACP- and x402-shaped payloads are
 * normalized into this before any screening logic runs, so the scoring engine
 * never branches on wire format.
 */
export interface NormalizedOrder {
  orderId: string;
  protocol: Protocol;
  protocolVersion: string;
  agentId: string;
  agentDisplayName: string;
  items: OrderItem[];
  currency: string;
  totalMinor: number;
  signature: string;
  nonce: string;
  receivedAt: string;
  status: OrderStatus;
  /** x402-only settlement fields; absent for ACP. */
  payee?: string;
  network?: string;
  wallet?: string;
  /** Evidence path taken during normalization, surfaced to the judge/user. */
  evidencePath: string[];
}

export interface ScreeningCheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface ScreeningResult {
  orderId: string;
  agentId: string;
  agentDisplayName: string;
  registered: boolean;
  signatureValid: boolean;
  blocklisted: boolean;
  checks: ScreeningCheck[];
  failedChecks: number;
  summary: string;
}

export interface ScoreSignal {
  id: string;
  label: string;
  /** Points awarded out of `max`. */
  points: number;
  max: number;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
}

export interface TrustScoreResult {
  orderId: string;
  agentId: string;
  agentDisplayName: string;
  score: number;
  band: 'low-risk' | 'elevated' | 'high-risk';
  verdict: Verdict;
  signals: ScoreSignal[];
  /** How many of the five weighted signals came back `fail`. */
  failedSignals: number;
  /** Signals that point in opposite directions — the reasoning surface. */
  conflicts: string[];
  reasoning: string[];
  hitlRequired: boolean;
  orderTotalMinor: number;
  currency: string;
}

export interface OnChainRecord {
  orderId: string;
  txHash: string;
  network: string;
  amountMinor: number;
  currency: string;
  payee: string;
  items: Array<{ sku: string; qty: number }>;
  settledAt: string;
}

export interface SalesReceipt {
  orderId: string;
  agentId: string;
  amountMinor: number;
  currency: string;
  payee: string;
  items: Array<{ sku: string; qty: number }>;
  issuedAt: string;
}

export interface FieldDiff {
  field: string;
  receiptValue: string;
  chainValue: string;
  match: boolean;
  severity: 'ok' | 'warning' | 'critical';
}

export interface ReceiptVerification {
  orderId: string;
  verified: boolean;
  diffs: FieldDiff[];
  mismatchCount: number;
  criticalMismatches: number;
  /** Money the seller would have lost had the receipt been trusted. */
  exposureMinor: number;
  summary: string;
  recommendedAction: string;
}
