export interface ExecutionLimits {
  timeoutMs: number; // Default: 30000ms (30s)
  memoryLimitMb: number; // Default: 100MB (max 128MB)
  maxToolCalls: number; // Default: 50 calls per script execution
  allowDestructive: boolean; // Default: false
}

export interface SandboxLogEntry {
  level: 'log' | 'warn' | 'error';
  message: string;
  timestamp: number;
}

export interface SandboxExecutionResult {
  success: boolean;
  value?: unknown;
  error?: string;
  logs: SandboxLogEntry[];
  toolCallCount: number;
  durationMs: number;
  memoryUsedMb: number;
}

export interface CodeModeTransformOptions {
  workerPoolSize?: number; // Default: 4
  memoryLimitMb?: number; // Default: 100
  timeoutMs?: number; // Default: 30000
  maxToolCalls?: number; // Default: 50
  allowDestructive?: boolean; // Default: false
  alwaysVisible?: string[]; // Tools that stay exposed in tools/list
  searchToolName?: string; // Default: 'search'
  getSchemaToolName?: string; // Default: 'get_schema'
  executeToolName?: string; // Default: 'execute'
}
