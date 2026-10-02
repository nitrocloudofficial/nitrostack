import { ExecutionContext } from '../../types.js';
import { ExecutionLimits, SandboxExecutionResult } from './types.js';

export type ToolDispatcher = (
  name: string,
  args: Record<string, unknown>,
  context?: ExecutionContext
) => Promise<unknown>;

export interface SandboxProvider {
  readonly name: string;
  initialize(): Promise<void>;
  execute(
    code: string,
    dispatcher: ToolDispatcher,
    limits: ExecutionLimits,
    context?: ExecutionContext
  ): Promise<SandboxExecutionResult>;
  dispose(): Promise<void>;
}
