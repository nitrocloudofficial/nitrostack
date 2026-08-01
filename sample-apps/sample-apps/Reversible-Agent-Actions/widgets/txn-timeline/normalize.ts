import type { ReversibilityClass, RollbackReport, Step, StepReport, Transaction, TransactionStatus } from '../../src/txn/types';

/** Result shape returned by the preflight_plan tool (src/txn/services/preflight.service.ts). */
export interface PreflightResult {
  steps: Array<{ seq: number; toolName: string; reversibility: ReversibilityClass; rationale: string }>;
  pivotIndex: number | null;
  strandedReversibleSteps: number;
  reorderRecommended: boolean;
  suggestedOrder: string[];
  summary: string;
}

/** Result shape returned by the get_transaction tool. */
export interface GetTransactionResult {
  transaction: Transaction;
  steps: Step[];
  profile: { total: number; byClass: Record<ReversibilityClass, number>; pivotSeq: number | null };
}

export type TxnTimelineData = GetTransactionResult | RollbackReport | PreflightResult;

/** A card's compensation state, independent of which shape it came from. */
export type CompensationState =
  | 'EXECUTED'
  | 'FAILED'
  | 'COMPENSATING'
  | 'COMPENSATED'
  | 'COMPENSATION_FAILED'
  | 'SKIPPED_TERMINAL'
  | 'SKIPPED_CONFLICT'
  | null;

export interface NormalizedStep {
  seq: number;
  toolName: string;
  server: string | null;
  /** Null when the source shape (RollbackReport) doesn't carry this — see rationale below. */
  reversibility: ReversibilityClass | null;
  compensationState: CompensationState;
  manualAction: string | null;
  note: string | null;
}

export interface NormalizedView {
  kind: 'transaction' | 'rollback' | 'preflight' | 'error';
  transactionId: string | null;
  label: string | null;
  actor: string | null;
  openedAt: Date | null;
  scope: string[] | null;
  status: TransactionStatus | RollbackReport['status'] | null;
  steps: NormalizedStep[];
  pivotSeq: number | null;
  summary: string;
  systemsTouched: number;
  /** Drives the intervention panel; only ever populated for a RollbackReport. */
  notReversed: StepReport[] | null;
  /** Set only for kind: 'error' — the raw message to show. */
  errorMessage?: string;
}

function isGetTransactionResult(data: TxnTimelineData): data is GetTransactionResult {
  return typeof data === 'object' && data !== null && 'transaction' in data && 'steps' in data && 'profile' in data;
}

function isRollbackReport(data: TxnTimelineData): data is RollbackReport {
  return typeof data === 'object' && data !== null && 'transactionId' in data && 'reversed' in data && 'notReversed' in data;
}

function isPreflightResult(data: TxnTimelineData): data is PreflightResult {
  return typeof data === 'object' && data !== null && 'pivotIndex' in data && 'suggestedOrder' in data;
}

const CLASS_ORDER: ReversibilityClass[] = ['CLEAN', 'RESTORATIVE', 'TOMBSTONED', 'MITIGABLE', 'TERMINAL'];

function buildSummary(steps: NormalizedStep[]): string {
  const counts: Record<ReversibilityClass, number> = { CLEAN: 0, RESTORATIVE: 0, TOMBSTONED: 0, MITIGABLE: 0, TERMINAL: 0 };
  for (const s of steps) {
    if (s.reversibility) counts[s.reversibility]++;
  }
  const parts = CLASS_ORDER.map((cls) => `${counts[cls]} ${cls.toLowerCase()}`);
  return `${steps.length} action${steps.length === 1 ? '' : 's'} · ${parts.join(' · ')}`;
}

/**
 * A RollbackReport's StepReport doesn't carry `reversibility` (it carries
 * `outcome` instead), so it can only be inferred, not read directly. We only
 * infer the unambiguous cases — REVERSED-with-no-trace as CLEAN and
 * IRREVERSIBLE as TERMINAL — and leave the rest null rather than guess.
 */
function inferReversibility(r: StepReport): ReversibilityClass | null {
  if (r.outcome === 'IRREVERSIBLE') return 'TERMINAL';
  if (r.outcome === 'REVERSED') return r.residualTrace ? 'TOMBSTONED' : 'CLEAN';
  return null;
}

function outcomeToCompensationState(outcome: StepReport['outcome']): CompensationState {
  switch (outcome) {
    case 'REVERSED':
      return 'COMPENSATED';
    case 'IRREVERSIBLE':
      return 'SKIPPED_TERMINAL';
    case 'FAILED':
    case 'CONFLICT':
      return 'COMPENSATION_FAILED';
    case 'SKIPPED_CONFLICT':
      return 'SKIPPED_CONFLICT';
  }
}

export function normalize(data: TxnTimelineData): NormalizedView {
  if (isGetTransactionResult(data)) {
    const steps: NormalizedStep[] = data.steps.map((s) => ({
      seq: s.seq,
      toolName: s.toolName,
      server: s.server,
      reversibility: s.reversibility,
      compensationState: s.status,
      manualAction: null,
      note: s.compensationNote,
    }));
    return {
      kind: 'transaction',
      transactionId: data.transaction.id,
      label: data.transaction.label,
      actor: data.transaction.actor,
      openedAt: new Date(data.transaction.openedAt),
      scope: data.transaction.scope,
      status: data.transaction.status,
      steps,
      pivotSeq: data.profile.pivotSeq,
      summary: buildSummary(steps),
      systemsTouched: new Set(steps.map((s) => s.server).filter(Boolean)).size,
      notReversed: null,
    };
  }

  if (isRollbackReport(data)) {
    const all = [...data.reversed, ...data.notReversed].sort((a, b) => a.seq - b.seq);
    const steps: NormalizedStep[] = all.map((r) => ({
      seq: r.seq,
      toolName: r.tool,
      server: r.server,
      reversibility: inferReversibility(r),
      compensationState: outcomeToCompensationState(r.outcome),
      manualAction: r.manualAction,
      note: r.note,
    }));
    const pivotSeq = data.notReversed.find((r) => r.outcome === 'IRREVERSIBLE')?.seq ?? null;
    return {
      kind: 'rollback',
      transactionId: data.transactionId,
      label: null,
      actor: null,
      openedAt: null,
      scope: null,
      status: data.status,
      steps,
      pivotSeq,
      summary: data.headline,
      systemsTouched: new Set(steps.map((s) => s.server).filter(Boolean)).size,
      notReversed: data.notReversed.length > 0 ? data.notReversed : null,
    };
  }

  if (isPreflightResult(data)) {
    const steps: NormalizedStep[] = data.steps.map((s) => ({
      seq: s.seq,
      toolName: s.toolName,
      server: null,
      reversibility: s.reversibility,
      compensationState: null,
      manualAction: null,
      note: s.rationale,
    }));
    const pivotSeq = data.pivotIndex !== null ? data.steps[data.pivotIndex]?.seq ?? null : null;
    return {
      kind: 'preflight',
      transactionId: null,
      label: null,
      actor: null,
      openedAt: null,
      scope: null,
      status: null,
      steps,
      pivotSeq,
      summary: data.summary,
      systemsTouched: 0,
      notReversed: null,
    };
  }

  // Anything else — most commonly a TxnExceptionFilter error response
  // ({ isError: true, code, message, report }), e.g. TXN_NOT_FOUND from
  // get_transaction on a bad id — renders as a clean error state instead of
  // crashing the whole widget. `report` (a RollbackReport), when present, is
  // still shown via the normal rollback view.
  const maybeError = data as { isError?: boolean; code?: string; message?: string; report?: RollbackReport | null };
  if (maybeError?.report) {
    return normalize(maybeError.report);
  }
  return {
    kind: 'error',
    transactionId: null,
    label: null,
    actor: null,
    openedAt: null,
    scope: null,
    status: null,
    steps: [],
    pivotSeq: null,
    summary: '',
    systemsTouched: 0,
    notReversed: null,
    errorMessage: maybeError?.message ?? maybeError?.code ?? 'Unrecognized response from the server.',
  };
}
