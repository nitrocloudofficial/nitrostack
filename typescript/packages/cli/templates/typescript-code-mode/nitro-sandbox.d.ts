/**
 * Ambient type definitions for NitroStack Code Mode runtime.
 */
declare function callTool(name: string, args?: Record<string, unknown>): Promise<unknown>;
declare const console: {
  log(...args: unknown[]): void;
  error(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  info(...args: unknown[]): void;
};
