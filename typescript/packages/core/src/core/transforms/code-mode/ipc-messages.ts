import { ExecutionLimits, SandboxExecutionResult } from './types.js';

// Messages Host -> Worker
export type HostToWorkerMessage =
  | { type: 'EXECUTE'; taskId: string; code: string; limits: ExecutionLimits }
  | { type: 'TOOL_RESPONSE'; taskId: string; callId: string; result?: unknown; error?: string }
  | { type: 'SHUTDOWN' };

// Messages Worker -> Host
export type WorkerToHostMessage =
  | { type: 'TOOL_REQUEST'; taskId: string; callId: string; toolName: string; args: Record<string, unknown> }
  | { type: 'EXECUTION_COMPLETE'; taskId: string; result: SandboxExecutionResult }
  | { type: 'EXECUTION_FAILED'; taskId: string; error: string };
