/**
 * Sentinel Gateway — Core Type Definitions
 * 
 * All shared interfaces used across the gateway's modules.
 */

// ─── Tool & Server Types ─────────────────────────────────────────────────────

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
}

export interface ServerRegistration {
  name: string;
  url: string;
  tools: ToolDefinition[];
  registeredAt: string;
  status: ServerStatus;
}

export type ServerStatus = 'online' | 'offline' | 'degraded';

// ─── Fingerprint Types ───────────────────────────────────────────────────────

export interface ToolFingerprint {
  serverName: string;
  toolName: string;
  hash: string;
  description: string;
  schema?: Record<string, unknown>;
  pinnedAt: string;
  lastVerifiedAt: string;
}

export interface FingerprintCheckResult {
  match: boolean;
  serverName: string;
  toolName: string;
  expectedHash: string;
  actualHash: string;
  drift?: {
    oldDescription: string;
    newDescription: string;
  };
}

// ─── Ledger Types ────────────────────────────────────────────────────────────

export type LedgerAction =
  | 'CALL'
  | 'BLOCK_DRIFT'
  | 'BLOCK_POLICY'
  | 'BLOCK_INJECTION'
  | 'POLICY_CHANGE'
  | 'SERVER_REGISTERED'
  | 'SERVER_REMOVED'
  | 'ADMIN_ACTION'
  | 'FINGERPRINT_PINNED'
  | 'FINGERPRINT_RESET'
  | 'REVIEW_APPROVED'
  | 'REVIEW_DENIED';

export type LedgerStatus = 'ALLOWED' | 'BLOCKED' | 'FLAGGED' | 'INFO';

export interface LedgerEntry {
  id: string;
  index: number;
  timestamp: string;
  agentId: string;
  serverName: string;
  toolName: string;
  action: LedgerAction;
  status: LedgerStatus;
  details: string;
  inputHash?: string;
  outputHash?: string;
  prevHash: string;
  hash: string;
}

export interface ChainVerificationResult {
  valid: boolean;
  totalEntries: number;
  brokenAtIndex?: number;
  brokenEntry?: LedgerEntry;
  message: string;
}

export interface LedgerStats {
  totalEntries: number;
  totalCalls: number;
  totalBlocked: number;
  totalAllowed: number;
  driftDetections: number;
  policyDenials: number;
  injectionFlags: number;
  chainValid: boolean;
}

// ─── Policy Types ────────────────────────────────────────────────────────────

export interface PolicyRule {
  id: string;
  agentId: string;
  serverName: string;
  toolName: string;
  constraints?: PolicyConstraints;
  createdAt: string;
  active: boolean;
}

export interface PolicyConstraints {
  maxAmount?: number;
  allowedPaths?: string[];
  paramRules?: Record<string, unknown>;
  rateLimit?: {
    maxCalls: number;
    windowSeconds: number;
  };
}

export interface PolicyCheckResult {
  allowed: boolean;
  reason: string;
  rule?: PolicyRule;
}

// ─── Review Queue Types ──────────────────────────────────────────────────────

export type ReviewType = 'DRIFT' | 'INJECTION' | 'POLICY' | 'NEW_SERVER';

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'DENIED';

export interface ReviewItem {
  id: string;
  type: ReviewType;
  serverName: string;
  toolName: string;
  reason: string;
  details: Record<string, unknown>;
  createdAt: string;
  status: ReviewStatus;
  resolvedAt?: string;
  resolvedBy?: string;
}

// ─── Call Record Types ───────────────────────────────────────────────────────

export interface CallRecord {
  id: string;
  agentId: string;
  serverName: string;
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
  status: 'ALLOWED' | 'BLOCKED';
  blockReason?: string;
  timestamp: string;
  durationMs?: number;
  ledgerEntryId: string;
}

// ─── Agent Identity Types ────────────────────────────────────────────────────

export interface AgentIdentity {
  id: string;
  name: string;
  role: string;
  registeredAt: string;
}

// ─── Dashboard / Topology Types ──────────────────────────────────────────────

export type TopologyNodeType = 'agent' | 'gateway' | 'server' | 'tool';
export type TrustStatus = 'trusted' | 'drifted' | 'pending' | 'unknown';

export interface TopologyNode {
  id: string;
  label: string;
  type: TopologyNodeType;
  trustStatus: TrustStatus;
  metadata?: Record<string, unknown>;
}

export interface TopologyEdge {
  source: string;
  target: string;
  trustStatus: TrustStatus;
  lastActivity?: string;
  callCount: number;
}

export interface TopologyGraph {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

// ─── Injection Detection Types ───────────────────────────────────────────────

export interface InjectionScanResult {
  clean: boolean;
  score: number;
  patterns: string[];
  details: string;
}

// ─── Attack Simulation Types ─────────────────────────────────────────────────

export type AttackScenario =
  | 'tool_poisoning'
  | 'rbac_violation'
  | 'ledger_tampering'
  | 'description_injection';

export interface AttackResult {
  scenario: AttackScenario;
  success: boolean;
  steps: AttackStep[];
  detectedBy: string;
  blockedAt: string;
}

export interface AttackStep {
  order: number;
  description: string;
  status: 'executed' | 'detected' | 'blocked';
  timestamp: string;
}
