import { Injectable, emitEvent } from '@nitrostack/core';
import type {
  CompensatorSpec,
  RollbackOptions,
  RollbackReport,
  Step,
  StepReport,
} from '../types.js';
import { JournalService } from './journal.service.js';
import { TransactionService } from './transaction.service.js';
import { CompensatorRegistry } from './registry.service.js';
import { ReversibilityClassifier } from './classifier.service.js';
import { TxnError } from './txn-error.js';

/**
 * Invokes a tool outside of any single request's ExecutionContext (the orchestrator
 * runs across many steps, potentially from many original callers, so it cannot rely
 * on one live ctx.invoke). Must be wired in at boot via RollbackOrchestrator.setToolExecutor.
 */
export type ToolExecutor = (toolName: string, args: unknown, idempotencyKey: string) => Promise<unknown>;

/** Implements LIFO compensation with conflict detection, idempotency, and an honest report. */
@Injectable({ deps: [JournalService, TransactionService, CompensatorRegistry, ReversibilityClassifier] })
export class RollbackOrchestrator {
  private toolExecutor?: ToolExecutor;

  constructor(
    private readonly journal: JournalService,
    private readonly txns: TransactionService,
    private readonly registry: CompensatorRegistry,
    private readonly classifier: ReversibilityClassifier
  ) {}

  /** Wires in the tool invocation mechanism; must be called once at boot. */
  setToolExecutor(executor: ToolExecutor): void {
    this.toolExecutor = executor;
  }

  async run(txnId: string, options: RollbackOptions): Promise<RollbackReport> {
    const start = Date.now();

    // INVARIANT 7: rollback is idempotent — re-running against an already-finalized
    // transaction returns the same report rather than re-executing compensation.
    const txn = this.txns.get(txnId);
    if (txn.status === 'ROLLED_BACK' || txn.status === 'PARTIAL') {
      return this.cachedReport(txnId);
    }
    if (txn.status === 'COMMITTED') {
      throw new TxnError('COMMITTED_IMMUTABLE', txnId);
    }

    this.txns.transition(txnId, 'ROLLING_BACK');

    // LIFO — INVARIANT 3, NEVER sort in application code.
    const steps = this.journal.stepsDescending(txnId);

    const report: StepReport[] = [];
    const total = steps.length;
    let done = 0;

    // Tracks the version this rollback run itself has most recently observed
    // for each resourceRef, seeded from each step's own forward-execution
    // capture. A later (higher-seq, processed-earlier-in-LIFO) step's own
    // compensation can legitimately touch a resource that an EARLIER step
    // also declared a resourceRef for (e.g. granting then revoking an API key
    // both bump the same account's version that an update_tier step also
    // captured) — that must not be mistaken for external interference. This
    // map is refreshed via a live read after every step (in the loop's
    // `finally`, so it runs regardless of continue/break), always using the
    // state as of BEFORE that step's own conflict check — never overwriting a
    // resourceRef's baseline right before checking the very step that owns it,
    // which would erase a genuine pre-existing external conflict.
    const lastKnownVersion = new Map<string, string>();
    const representativeStepByRef = new Map<string, Step>();
    for (const s of steps) {
      if (s.resourceRef) {
        if (!representativeStepByRef.has(s.resourceRef)) representativeStepByRef.set(s.resourceRef, s);
        if (s.resourceVersion && !lastKnownVersion.has(s.resourceRef)) {
          lastKnownVersion.set(s.resourceRef, s.resourceVersion);
        }
      }
    }

    // SEQUENTIAL LOOP (never Promise.all — order is a correctness requirement).
    for (const step of steps) {
      try {
        options.onProgress?.(++done, total, `compensating ${step.toolName} on ${step.server}`);

        // a. RE-CLASSIFY for decay (class is a function of time — §3.2).
        const spec = this.registry.lookup(step.toolName);
        const cls = this.classifier.classify({
          spec,
          prior: step.priorState,
          at: step.executedAt,
          now: new Date(),
        });

        // b. TERMINAL: skip and report.
        if (cls === 'TERMINAL') {
          this.journal.mark(step.id, 'SKIPPED_TERMINAL', spec?.manualInstruction);
          emitEvent('txn.step.compensated', { txnId, seq: step.seq, outcome: 'IRREVERSIBLE', tool: step.toolName });
          report.push({
            seq: step.seq,
            tool: step.toolName,
            server: step.server,
            outcome: 'IRREVERSIBLE',
            note: 'Cannot be reversed.',
            manualAction: spec?.manualInstruction ?? null,
            residualTrace: false,
          });
          continue;
        }

        // c. CONFLICT DETECTION (if resourceVersion was captured).
        if (step.resourceVersion && step.resourceRef) {
          let conflictAbort = false;
          try {
            const expected = lastKnownVersion.get(step.resourceRef) ?? step.resourceVersion;
            const current = await this.readCurrentVersion(step, spec);
            if (current !== null && current !== expected) {
              if (options.conflictPolicy === 'abort') {
                this.journal.mark(step.id, 'COMPENSATION_FAILED', 'concurrent modification detected');
                report.push({
                  seq: step.seq,
                  tool: step.toolName,
                  server: step.server,
                  outcome: 'CONFLICT',
                  note: 'Resource modified since capture.',
                  manualAction: 'Review and manually reconcile.',
                  residualTrace: false,
                });
                conflictAbort = true;
              } else if (options.conflictPolicy === 'skip') {
                report.push({
                  seq: step.seq,
                  tool: step.toolName,
                  server: step.server,
                  outcome: 'SKIPPED_CONFLICT',
                  note: 'Skipped due to conflict.',
                  manualAction: null,
                  residualTrace: false,
                });
                continue;
              } else {
                // 'force' falls through — log a loud warning.
                console.warn('FORCE overwriting concurrent human edit', { step: step.id });
              }
            }
          } catch {
            // version check failed — proceed with compensation.
          }
          if (conflictAbort) break; // stop entirely — do not overwrite human work.
        }

        // d. DRY RUN: just report, don't invoke.
        if (options.dryRun) {
          report.push({
            seq: step.seq,
            tool: step.toolName,
            server: step.server,
            outcome: 'REVERSED',
            note: '[DRY RUN] would reverse.',
            manualAction: null,
            residualTrace: cls === 'TOMBSTONED',
          });
          continue;
        }

        // e. COMPENSATE (idempotent via compensationKey).
        this.journal.mark(step.id, 'COMPENSATING');
        try {
          const args = spec!.argsFromOutput
            ? spec!.argsFromOutput(step.output, step.input, step.priorState)
            : (step.priorState ?? {});
          await this.invokeCompensator(spec!.inverse!, args, step.compensationKey);
          this.journal.mark(step.id, 'COMPENSATED');
          emitEvent('txn.step.compensated', { txnId, seq: step.seq, outcome: 'REVERSED', tool: step.toolName });
          const residual = cls === 'TOMBSTONED';
          const note = residual ? 'Reversed — deletion marker remains visible.' : 'Reversed.';
          report.push({
            seq: step.seq,
            tool: step.toolName,
            server: step.server,
            outcome: 'REVERSED',
            note,
            manualAction: null,
            residualTrace: residual,
          });
        } catch (err) {
          this.journal.mark(step.id, 'COMPENSATION_FAILED', String(err));
          emitEvent('txn.step.compensated', { txnId, seq: step.seq, outcome: 'FAILED', tool: step.toolName });
          report.push({
            seq: step.seq,
            tool: step.toolName,
            server: step.server,
            outcome: 'FAILED',
            note: String(err),
            manualAction: 'Manual recovery required.',
            residualTrace: false,
          });
        }
      } finally {
        // Refresh every tracked resource's baseline for the NEXT iteration,
        // using the state as it stands after whatever this step just did.
        for (const [ref, repStep] of representativeStepByRef) {
          try {
            const repSpec = this.registry.lookup(repStep.toolName);
            const fresh = await this.readCurrentVersion(repStep, repSpec);
            if (fresh !== null) lastKnownVersion.set(ref, fresh);
          } catch {
            // leave the previous baseline in place if the refresh read fails.
          }
        }
      }
    }

    // DETERMINE FINAL STATUS. A step the operator explicitly chose to skip does not
    // itself make the transaction PARTIAL; anything else unresolved does.
    const allReversed = report.every((r) => r.outcome === 'REVERSED' || r.outcome === 'SKIPPED_CONFLICT');
    const finalStatus = allReversed ? 'ROLLED_BACK' : 'PARTIAL';
    this.txns.transition(txnId, finalStatus);

    // BUILD AND RETURN THE HONEST REPORT.
    const reversed = report.filter((r) => r.outcome === 'REVERSED');
    const notReversed = report.filter((r) => r.outcome !== 'REVERSED');

    emitEvent('txn.rollback.finished', { txnId, status: finalStatus, reversed, notReversed });

    return {
      transactionId: txnId,
      status: finalStatus,
      headline: `${reversed.length} of ${report.length} actions reversed.${
        notReversed.length > 0 ? ` ${notReversed.length} require attention.` : ''
      }`,
      reversed,
      notReversed,
      operatorSummary: this.buildOperatorSummary(notReversed),
      durationMs: Date.now() - start,
    };
  }

  /** Looks up the current version of a resource by re-running its pre-read tool, if any. */
  private async readCurrentVersion(step: Step, spec: CompensatorSpec | null): Promise<string | null> {
    if (!spec?.preReadTool || !spec.preReadArgs || !this.toolExecutor) return null;
    const snap: any = await this.toolExecutor(
      spec.preReadTool,
      spec.preReadArgs(step.input),
      `${step.compensationKey}:version-check`
    );
    return snap?.value?.version ?? snap?.version ?? snap?.updatedAt ?? null;
  }

  /** Calls the compensating tool via the configured executor, keyed for idempotency. */
  private async invokeCompensator(toolName: string, args: unknown, idempotencyKey: string): Promise<unknown> {
    if (!this.toolExecutor) {
      throw new Error('No tool executor configured for RollbackOrchestrator');
    }
    return this.toolExecutor(toolName, args, idempotencyKey);
  }

  /** Builds the human-facing operator summary text for unresolved steps. */
  private buildOperatorSummary(notReversed: StepReport[]): string {
    if (notReversed.length === 0) {
      return 'All actions were successfully reversed.';
    }
    const lines = notReversed.map((r) => {
      const action = r.manualAction ? ` → ${r.manualAction}` : '';
      return `- seq ${r.seq} ${r.tool} (${r.server}): ${r.note}${action}`;
    });
    return `${notReversed.length} action(s) require attention:\n${lines.join('\n')}`;
  }

  /**
   * Reconstructs the report from the journal for an already-finalized transaction,
   * so a repeated rollback call is idempotent rather than re-running compensation.
   *
   * NOTE: steps left 'EXECUTED' were either explicitly skipped for conflict or never
   * reached because an earlier step aborted the run — the journal doesn't distinguish
   * these post-hoc, so both are honestly reported as SKIPPED_CONFLICT here.
   */
  private cachedReport(txnId: string): RollbackReport {
    const txn = this.txns.get(txnId);
    const steps = this.journal.stepsDescending(txnId);

    const report: StepReport[] = steps.map((step) => {
      const spec = this.registry.lookup(step.toolName);

      switch (step.status) {
        case 'COMPENSATED': {
          const cls = this.classifier.classifyStatic(spec);
          const residual = cls === 'TOMBSTONED';
          return {
            seq: step.seq,
            tool: step.toolName,
            server: step.server,
            outcome: 'REVERSED',
            note: residual ? 'Reversed — deletion marker remains visible.' : 'Reversed.',
            manualAction: null,
            residualTrace: residual,
          };
        }
        case 'COMPENSATION_FAILED': {
          if (step.compensationNote === 'concurrent modification detected') {
            return {
              seq: step.seq,
              tool: step.toolName,
              server: step.server,
              outcome: 'CONFLICT',
              note: 'Resource modified since capture.',
              manualAction: 'Review and manually reconcile.',
              residualTrace: false,
            };
          }
          return {
            seq: step.seq,
            tool: step.toolName,
            server: step.server,
            outcome: 'FAILED',
            note: step.compensationNote ?? 'Compensation failed.',
            manualAction: 'Manual recovery required.',
            residualTrace: false,
          };
        }
        case 'SKIPPED_TERMINAL':
          return {
            seq: step.seq,
            tool: step.toolName,
            server: step.server,
            outcome: 'IRREVERSIBLE',
            note: 'Cannot be reversed.',
            manualAction: step.compensationNote ?? spec?.manualInstruction ?? null,
            residualTrace: false,
          };
        default:
          return {
            seq: step.seq,
            tool: step.toolName,
            server: step.server,
            outcome: 'SKIPPED_CONFLICT',
            note: 'Skipped due to conflict.',
            manualAction: null,
            residualTrace: false,
          };
      }
    });

    const reversed = report.filter((r) => r.outcome === 'REVERSED');
    const notReversed = report.filter((r) => r.outcome !== 'REVERSED');

    return {
      transactionId: txnId,
      status: txn.status === 'PARTIAL' ? 'PARTIAL' : 'ROLLED_BACK',
      headline: `${reversed.length} of ${report.length} actions reversed.${
        notReversed.length > 0 ? ` ${notReversed.length} require attention.` : ''
      }`,
      reversed,
      notReversed,
      operatorSummary: this.buildOperatorSummary(notReversed),
      durationMs: 0,
    };
  }
}
