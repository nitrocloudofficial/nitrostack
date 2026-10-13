import { Injectable, Interceptor, emitEvent } from '@nitrostack/core';
import type { ExecutionContext, InterceptorInterface } from '@nitrostack/core';
import type { StepStatus } from '../types.js';
import { JournalService } from '../services/journal.service.js';
import { CompensatorRegistry } from '../services/registry.service.js';
import { ReversibilityClassifier } from '../services/classifier.service.js';
import { TransactionContext } from '../services/transaction-context.service.js';
import { TxnError } from '../services/txn-error.js';
import type { ToolExecutor } from '../services/rollback.service.js';
import { journalCallStorage, type JournalCallState } from './journal-call-context.js';

/**
 * Wraps every tool call executed inside a transaction with journaling: captures
 * prior state via pre-read before execution, classifies reversibility, and appends
 * an immutable step record — even when the wrapped call fails.
 *
 * Must be paired with @UsePipes(JournalCapturePipe) on the same tool method.
 * This SDK's interceptors never receive tool input (only context, and the
 * output of next()); only the Pipe stage sees input. See journal-call-context.ts.
 */
@Injectable({ deps: [JournalService, CompensatorRegistry, ReversibilityClassifier, TransactionContext] })
@Interceptor()
export class JournalInterceptor implements InterceptorInterface {
  private toolExecutor?: ToolExecutor;

  constructor(
    private readonly journal: JournalService,
    private readonly registry: CompensatorRegistry,
    private readonly classifier: ReversibilityClassifier,
    private readonly txnCtx: TransactionContext
  ) {}

  /**
   * Wires in the tool invocation mechanism used to re-read a resource's version
   * immediately after a successful write (see the post-execution re-read below
   * for why this can't just reuse the pre-execution capture). Call once at boot,
   * with the same executor passed to JournalCapturePipe.setToolExecutor.
   */
  setToolExecutor(executor: ToolExecutor): void {
    this.toolExecutor = executor;
  }

  async intercept(context: ExecutionContext, next: () => Promise<unknown>): Promise<unknown> {
    // INVARIANT 8: not in a transaction — pass through unchanged.
    const txnId = this.txnCtx.activeId;
    if (!txnId) return next();

    const spec = this.registry.lookup(context.toolName ?? '');

    // SCOPE CHECK
    if (!this.txnCtx.scopeAllows(spec?.server)) {
      throw new TxnError(
        'SCOPE_VIOLATION',
        `Tool ${context.toolName} (server: ${spec?.server}) is outside transaction scope`
      );
    }

    // Shared per-call state: JournalCapturePipe fills in `input` and performs the
    // pre-read (THE MOST FORGOTTEN STEP) during the Pipe stage, which — per the
    // real pipeline order — runs strictly before the handler executes.
    const store: JournalCallState = {
      spec,
      input: undefined,
      captured: { value: null, ref: null, version: null },
      preReadWarning: null,
    };

    // EXECUTE
    let output: unknown;
    let stepStatus: StepStatus = 'EXECUTED';
    try {
      output = await journalCallStorage.run(store, () => next());
    } catch (err) {
      stepStatus = 'FAILED';
      output = { error: String(err) };
    }

    if (store.preReadWarning) {
      context.logger.warn(store.preReadWarning, { tool: context.toolName });
    } else if (store.input === undefined) {
      context.logger.warn('JournalCapturePipe not applied to this tool — input was not captured', {
        tool: context.toolName,
      });
    }

    // POST-EXECUTION VERSION RE-READ. The Pipe's pre-read runs before the
    // handler, so its captured version is the resource's version *before* this
    // step's own write — comparing that against a fresh read at rollback time
    // would always look "conflicted" even with zero concurrent interference,
    // since this step's own write is what changed it. Re-read once more, now,
    // so resourceVersion reflects the state immediately after this step wrote,
    // which is the correct baseline for detecting *later* concurrent changes.
    if (stepStatus === 'EXECUTED' && spec?.requiresPreRead && spec.preReadTool && spec.preReadArgs && this.toolExecutor) {
      try {
        const postReadInput = spec.preReadArgs(store.input);
        const snap: any = await this.toolExecutor(spec.preReadTool, postReadInput, `post-read:${spec.toolName}`);
        store.captured.ref = snap?.ref ?? store.captured.ref;
        store.captured.version = snap?.version ?? snap?.updatedAt ?? store.captured.version;
      } catch {
        // leave the pre-execution capture as a fallback.
      }
    }

    // CLASSIFY
    const reversibility = this.classifier.classify({ spec, prior: store.captured.value, at: new Date() });

    // APPEND (always — even on failure — INVARIANT 2)
    const seq = this.journal.nextSeq(txnId);
    this.journal.append({
      txnId,
      seq,
      server: spec?.server ?? 'unknown',
      toolName: context.toolName ?? '',
      // store.input stays undefined if JournalCapturePipe wasn't applied to this
      // tool; append() must never fail (INVARIANT 2), so fall back to null.
      input: store.input ?? null,
      output,
      priorState: store.captured.value,
      resourceRef: store.captured.ref,
      resourceVersion: store.captured.version,
      reversibility,
      status: stepStatus,
      compensationNote: null,
    });

    // PIVOT UPDATE (INVARIANT 5)
    if (reversibility === 'TERMINAL') {
      this.journal.markPivotIfUnset(txnId, seq);
    }

    // EMIT
    emitEvent('txn.step.recorded', {
      txnId,
      seq,
      tool: context.toolName,
      class: reversibility,
      status: stepStatus,
    });

    if (stepStatus === 'FAILED') {
      throw new Error((output as { error: string }).error);
    }
    return output;
  }
}
