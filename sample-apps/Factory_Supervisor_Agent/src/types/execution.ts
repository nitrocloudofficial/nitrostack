import { ToolResponse } from './tool.js';

export interface ExecutionResult {
  success: boolean;
  toolName: string;
  response: ToolResponse;
  durationMs: number;
  error?: string;
}

export interface ExecutionOptions {
  validateSchema?: boolean;
  timeoutMs?: number;
}
