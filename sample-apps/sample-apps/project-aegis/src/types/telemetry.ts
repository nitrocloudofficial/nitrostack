// ============================================================================
// Project Aegis — Core Telemetry Data Models
// Foundational type definitions for the SVD subspace anomaly detection engine,
// constrained pattern library, and MCP tool interface contracts.
// ============================================================================

/**
 * 4-dimensional telemetry vector representing instantaneous system state.
 * Each dimension maps to a specific infrastructure health metric:
 *   [0] queueDepth      — pending requests in the ingress queue
 *   [1] threadOccupancy  — percentage of worker threads actively processing
 *   [2] dbSaturation     — connection pool utilization ratio (0.0 – 1.0 scaled to 0–100)
 *   [3] retryRate        — retry attempts per second across all callers
 */
export type TelemetryVector = [number, number, number, number];

/** Human-readable labels for each telemetry dimension, indexed positionally. */
export const TELEMETRY_LABELS = [
  'Queue Depth',
  'Thread Occupancy (%)',
  'DB Saturation (%)',
  'Retry Rate (req/s)',
] as const;

/** Number of dimensions in the telemetry vector space. */
export const TELEMETRY_DIMENSIONS = 4;

// ──────────────────────────────────────────────────────────────────────────────
// SVD Subspace Analysis
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Result envelope from the AegisMathematicsEngine's subspace projection.
 * Encapsulates both the mathematical output and the binary anomaly decision.
 */
export interface SubspaceAnalysis {
  /** L2 norm of the residual after projecting onto the healthy subspace: ‖(I - P_S)x‖ */
  readonly residualNorm: number;

  /** True when residualNorm exceeds the configured anomaly threshold. */
  readonly isAnomaly: boolean;

  /** The anomaly detection threshold (default: 15.0). */
  readonly threshold: number;

  /** Number of singular vectors retained in the healthy subspace basis (k). */
  readonly baselineDimensions: number;

  /** Cumulative energy ratio captured by the retained subspace (0.0 – 1.0). */
  readonly capturedEnergy: number;

  /** Timestamp of this analysis in ISO-8601. */
  readonly timestamp: string;

  /** True during the initial 60-second warmup window while the SVD baseline converges. */
  readonly isWarmupPeriod: boolean;
}

// ──────────────────────────────────────────────────────────────────────────────
// Bottleneck Classification
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Discrete classification of the dominant failure mode detected in the
 * telemetry vector's deviation from the healthy subspace.
 */
export enum BottleneckSignature {
  /** Massive parallel identical read requests overwhelming the upstream. */
  THUNDERING_HERD = 'THUNDERING_HERD',

  /** Duplicate transaction payloads from retrying clients. */
  DUPLICATE_STORM = 'DUPLICATE_STORM',

  /** Downstream service (e.g., KYC/Gateway) hanging or timing out. */
  DOWNSTREAM_TIMEOUT = 'DOWNSTREAM_TIMEOUT',

  /** System operating within nominal parameters. */
  NOMINAL = 'NOMINAL',
}

/**
 * Maps each bottleneck signature to the constrained pattern that remediates it.
 */
export const SIGNATURE_TO_PATTERN: Record<BottleneckSignature, string | null> = {
  [BottleneckSignature.THUNDERING_HERD]: 'SingleFlightGate',
  [BottleneckSignature.DUPLICATE_STORM]: 'IdempotencyEnforcer',
  [BottleneckSignature.DOWNSTREAM_TIMEOUT]: 'CircuitBreaker',
  [BottleneckSignature.NOMINAL]: null,
};

/**
 * Full classification result from the Aegis engine, including the recommended
 * pattern template and an audit-ready justification string.
 */
export interface BottleneckClassification {
  /** The classified signature type. */
  readonly signature: BottleneckSignature;

  /** The recommended constrained pattern ID (null if nominal). */
  readonly recommendedPattern: string | null;

  /** Structured, audit-ready justification for the classification. */
  readonly justification: string;

  /** The raw telemetry vector that was analyzed. */
  readonly inputVector: TelemetryVector;

  /** The subspace analysis that triggered this classification. */
  readonly subspaceAnalysis: SubspaceAnalysis;

  /** Per-dimension deviation magnitudes from the subspace projection. */
  readonly dimensionDeviations: number[];
}

// ──────────────────────────────────────────────────────────────────────────────
// Remediation Patch
// ──────────────────────────────────────────────────────────────────────────────

/** Unique identifier for a proposed remediation patch. */
export type PatchId = string;

/**
 * A parameterized remediation template ready for shadow verification
 * and human approval before live deployment.
 */
export interface RemediationPatch {
  /** Unique patch identifier (UUID v4). */
  readonly patchId: PatchId;

  /** The constrained pattern class name (e.g., 'SingleFlightGate'). */
  readonly patternId: string;

  /** Configuration parameters for the pattern instance. */
  readonly parameters: Record<string, unknown>;

  /** Human-readable justification from the classification engine. */
  readonly justification: string;

  /** Pseudo-diff preview showing what the pattern activation changes. */
  readonly diffPreview: string;

  /** Shadow benchmark results (null until verify_remediation_diff is called). */
  shadowBenchmark: ShadowBenchmark | null;

  /** Current lifecycle state. */
  status: PatchStatus;

  /** ISO-8601 timestamp of patch creation. */
  readonly createdAt: string;
}

export enum PatchStatus {
  PROPOSED = 'PROPOSED',
  VERIFIED = 'VERIFIED',
  APPROVED = 'APPROVED',
  APPLIED = 'APPLIED',
  REJECTED = 'REJECTED',
}

/**
 * Performance delta measured during shadow verification.
 */
export interface ShadowBenchmark {
  /** Requests/sec before pattern activation. */
  readonly baselineRps: number;

  /** Requests/sec after pattern activation in shadow. */
  readonly remediatedRps: number;

  /** Upstream calls/sec before (measures coalescing effectiveness). */
  readonly baselineUpstreamCalls: number;

  /** Upstream calls/sec after pattern activation. */
  readonly remediatedUpstreamCalls: number;

  /** P99 latency (ms) before. */
  readonly baselineP99Ms: number;

  /** P99 latency (ms) after. */
  readonly remediatedP99Ms: number;

  /** True if shadow output was byte-identical to baseline output. */
  readonly zeroVariance: boolean;

  /** Duration of the shadow benchmark in milliseconds. */
  readonly benchmarkDurationMs: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// Audit Trail
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Immutable compliance record for every remediation action.
 * Cryptographic integrity via SHA-256 hash chaining.
 */
export interface AuditEntry {
  /** Monotonically increasing sequence number. */
  readonly sequenceNumber: number;

  /** ISO-8601 timestamp of the audit event. */
  readonly timestamp: string;

  /** The action performed. */
  readonly action: AuditAction;

  /** The patch this entry relates to. */
  readonly patchId: PatchId;

  /** Operator identifier (human or system). */
  readonly operator: string;

  /** SHA-256 hash of this entry's content for tamper detection. */
  readonly integrityHash: string;

  /** SHA-256 hash of the previous entry (chain link). */
  readonly previousHash: string;

  /** Arbitrary metadata payload. */
  readonly metadata: Record<string, unknown>;
}

export enum AuditAction {
  ANOMALY_DETECTED = 'ANOMALY_DETECTED',
  BOTTLENECK_CLASSIFIED = 'BOTTLENECK_CLASSIFIED',
  PATCH_PROPOSED = 'PATCH_PROPOSED',
  SHADOW_VERIFIED = 'SHADOW_VERIFIED',
  HUMAN_APPROVED = 'HUMAN_APPROVED',
  PATCH_APPLIED = 'PATCH_APPLIED',
  PATCH_REJECTED = 'PATCH_REJECTED',
}

// ──────────────────────────────────────────────────────────────────────────────
// Account Model (Mock CBS)
// ──────────────────────────────────────────────────────────────────────────────

/** A simplified bank account in the mock core banking ledger. */
export interface BankAccount {
  readonly accountId: string;
  balance: number;
  readonly currency: string;
  readonly holderName: string;
  readonly createdAt: string;
}

/** Transaction request payload for the mock CBS. */
export interface TransactionPayload {
  readonly fromAccountId: string;
  readonly toAccountId: string;
  readonly amount: number;
  readonly currency: string;
  readonly idempotencyKey?: string;
  readonly timestamp: string;
}

/** Result of a processed transaction. */
export interface TransactionResult {
  readonly success: boolean;
  readonly transactionId: string;
  readonly fromBalance: number;
  readonly toBalance: number;
  readonly processedAt: string;
  readonly latencyMs: number;
}
