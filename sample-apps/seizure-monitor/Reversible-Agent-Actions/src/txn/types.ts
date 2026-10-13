/**
 * The 5-class reversibility taxonomy assigned to every step at execution time.
 * CLEAN = fully reversible with no trace. RESTORATIVE = reversible by restoring
 * captured prior state. TOMBSTONED = reversible but leaves a visible marker
 * (e.g. a "deleted" flag). MITIGABLE = not truly reversible, but a counteracting
 * action can offset its effect. TERMINAL = irreversible by any means.
 */
export type ReversibilityClass = 'CLEAN' | 'RESTORATIVE' | 'TOMBSTONED' | 'MITIGABLE' | 'TERMINAL';

/**
 * Lifecycle status of a transaction.
 * PARTIAL means some steps could not be reversed and a human must act.
 */
export type TransactionStatus = 'OPEN' | 'COMMITTED' | 'ROLLING_BACK' | 'ROLLED_BACK' | 'PARTIAL';

/** Lifecycle status of an individual step within a transaction. */
export type StepStatus =
  | 'EXECUTED'
  | 'FAILED'
  | 'COMPENSATING'
  | 'COMPENSATED'
  | 'COMPENSATION_FAILED'
  | 'SKIPPED_TERMINAL';

/**
 * Governs how rollback behaves when the current resource state conflicts with
 * what was captured at execution time.
 * abort = stop on conflict (default, safest). skip = leave the conflicting
 * step unreversed and continue. force = may destroy concurrent human edits.
 */
export type ConflictPolicy = 'abort' | 'skip' | 'force';

/** A logical grouping of steps executed on behalf of a single agent intent. */
export interface Transaction {
  /** txn_ prefixed unique identifier. */
  id: string;
  /** Human-readable statement of intent. */
  label: string;
  /** Authenticated subject that opened the transaction. */
  actor: string;
  /** Systems this transaction is permitted to touch, enforced at runtime. */
  scope: string[];
  status: TransactionStatus;
  /** Seq of the first TERMINAL step, if any; null if none has occurred. */
  pivotSeq: number | null;
  openedAt: Date;
  closedAt: Date | null;
  ttlSeconds: number;
}

/** A single recorded tool invocation within a transaction. */
export interface Step {
  id: string;
  txnId: string;
  /** Monotonic sequence number within the transaction, 1-indexed. */
  seq: number;
  server: string;
  toolName: string;
  input: unknown;
  output: unknown;
  /** State captured before the write (pre-read); null if none was needed. */
  priorState: unknown | null;
  /** Stable reference to the affected resource, e.g. 'crm:account:acc_88'. */
  resourceRef: string | null;
  /** Etag or version marker of the resource at execution time, for conflict detection. */
  resourceVersion: string | null;
  reversibility: ReversibilityClass;
  executedAt: Date;
  status: StepStatus;
  /** Idempotency key generated at append time, never at rollback time. */
  compensationKey: string;
  compensationNote: string | null;
}

/** Declarative specification of how a tool's effects can be compensated. */
export interface CompensatorSpec {
  toolName: string;
  server: string;
  /** Name of the inverse tool to call; null means the action is TERMINAL. */
  inverse: string | null;
  /** Derives inverse-call args from the original output, input, and prior state. */
  argsFromOutput?: (output: unknown, input: unknown, prior: unknown) => unknown;
  /** Whether a pre-read must be captured before this tool executes. */
  requiresPreRead: boolean;
  /** Tool used to perform the pre-read, if requiresPreRead is true. */
  preReadTool?: string;
  /** Derives the pre-read tool's args from the original input. */
  preReadArgs?: (input: unknown) => unknown;
  /** Reversibility class assigned before any decay is applied. */
  baseClass: ReversibilityClass;
  /** Window in ms after which baseClass decays to decaysTo. */
  window?: number;
  /** Reversibility class this decays to once window has elapsed. */
  decaysTo?: ReversibilityClass;
  /** Whether reversal leaves a visible deletion marker. */
  leavesTrace?: boolean;
  /** Whether the inverse only counteracts the effect rather than truly undoing it. */
  counteractionOnly?: boolean;
  /** Human-readable instruction for manual remediation when no inverse exists. */
  manualInstruction?: string;
}

/** Options controlling a rollback operation. */
export interface RollbackOptions {
  conflictPolicy: ConflictPolicy;
  reason: string;
  dryRun: boolean;
  /** If set, rollback stops after reaching this sequence number. */
  stopAtSeq?: number;
  onProgress?: (done: number, total: number, message: string) => void;
}

/** Outcome of attempting to reverse a single step during rollback. */
export interface StepReport {
  seq: number;
  tool: string;
  server: string;
  outcome: 'REVERSED' | 'CONFLICT' | 'IRREVERSIBLE' | 'FAILED' | 'SKIPPED_CONFLICT';
  note: string;
  /** Instruction for a human operator when the step could not be automatically reversed. */
  manualAction: string | null;
  /** Whether a visible trace of the original action remains after reversal. */
  residualTrace: boolean;
}

/** Summary of a full rollback operation across all steps in a transaction. */
export interface RollbackReport {
  transactionId: string;
  status: 'ROLLED_BACK' | 'PARTIAL';
  headline: string;
  reversed: StepReport[];
  notReversed: StepReport[];
  operatorSummary: string;
  durationMs: number;
}

/** State captured about a resource, typically via a pre-read before a write. */
export interface CapturedState {
  value: unknown | null;
  ref: string | null;
  version: string | null;
}

// invariant: step.priorState === null && spec.requiresPreRead → classify as TERMINAL
