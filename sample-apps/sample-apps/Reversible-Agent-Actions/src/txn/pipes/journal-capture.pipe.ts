import { Injectable } from '@nitrostack/core';
import type { ArgumentMetadata, PipeInterface } from '@nitrostack/core';
import type { ToolExecutor } from '../services/rollback.service.js';
import { journalCallStorage } from '../interceptors/journal-call-context.js';

/**
 * Captures tool input and performs the pre-read (if the active spec requires
 * one) for JournalInterceptor. Must be paired with that interceptor via
 * @UsePipes(JournalCapturePipe) on the same tool method — see
 * journal-call-context.ts for why input capture can't live in the interceptor
 * itself.
 */
@Injectable()
export class JournalCapturePipe implements PipeInterface {
  private toolExecutor?: ToolExecutor;

  /** Wires in the tool invocation mechanism used for pre-reads; call once at boot. */
  setToolExecutor(executor: ToolExecutor): void {
    this.toolExecutor = executor;
  }

  async transform(value: unknown, _metadata: ArgumentMetadata): Promise<unknown> {
    const store = journalCallStorage.getStore();
    if (!store) return value; // not inside an active JournalInterceptor call.

    store.input = value;

    const spec = store.spec;
    if (spec?.requiresPreRead && spec.preReadTool && spec.preReadArgs) {
      if (!this.toolExecutor) {
        store.preReadWarning = 'Pre-read skipped — no tool executor configured; step will classify as TERMINAL';
      } else {
        try {
          const preReadInput = spec.preReadArgs(value);
          const snap: any = await this.toolExecutor(spec.preReadTool, preReadInput, `pre-read:${spec.toolName}`);
          store.captured.value = snap?.value ?? snap;
          store.captured.ref = snap?.ref ?? null;
          store.captured.version = snap?.version ?? snap?.updatedAt ?? null;
        } catch (err) {
          // do NOT throw — continue without captured state. The classifier handles it.
          store.preReadWarning = `Pre-read failed — step will classify as TERMINAL: ${String(err)}`;
        }
      }
    }

    return value;
  }
}
