import { getQuickJS } from 'quickjs-emscripten';
import { ExecutionContext } from '../../types.js';
import { SandboxProvider, ToolDispatcher } from './sandbox.interface.js';
import { ExecutionLimits, SandboxExecutionResult } from './types.js';
import { evaluateGuestScript } from './guest-evaluator.js';

/**
 * Sandboxed execution provider utilizing QuickJS compiled to WebAssembly.
 * Guarantees memory isolation and cross-platform zero-dependency execution.
 */
export class QuickJsWasmSandboxProvider implements SandboxProvider {
  readonly name = 'quickjs-wasm';

  /**
   * Warms the QuickJS WebAssembly module so the first execute() does not pay for
   * compilation. `getQuickJS` memoizes process-wide, so there is nothing to cache here.
   */
  async initialize(): Promise<void> {
    await getQuickJS();
  }

  /**
   * Executes a user-provided script in the QuickJS WebAssembly sandbox.
   */
  async execute(
    code: string,
    dispatcher: ToolDispatcher,
    limits: ExecutionLimits,
    context?: ExecutionContext
  ): Promise<SandboxExecutionResult> {
    await this.initialize();
    return evaluateGuestScript(
      code,
      limits,
      (toolName: string, args: Record<string, unknown>) => dispatcher(toolName, args, context)
    );
  }

  /**
   * No-op: each execute() builds and tears down its own runtime and context, and the
   * WebAssembly module itself is shared process-wide rather than owned here.
   */
  async dispose(): Promise<void> {
    // Nothing to release.
  }
}
