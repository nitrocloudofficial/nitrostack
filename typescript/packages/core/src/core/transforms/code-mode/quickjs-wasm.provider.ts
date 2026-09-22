import { getQuickJS, QuickJSWASMModule } from 'quickjs-emscripten';
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
  private quickJs: QuickJSWASMModule | null = null;

  /**
   * Initializes the underlying QuickJS WebAssembly module instance.
   */
  async initialize(): Promise<void> {
    if (!this.quickJs) {
      this.quickJs = await getQuickJS();
    }
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
   * Disposes the sandbox provider.
   */
  async dispose(): Promise<void> {
    this.quickJs = null;
  }
}
