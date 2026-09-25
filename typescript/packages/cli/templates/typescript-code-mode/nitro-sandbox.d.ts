/**
 * Ambient type definitions for NitroStack Code Mode runtime.
 * Node.js globals (process, require, Buffer, fs, fetch) are not available.
 */
declare function callTool(name: string, args?: Record<string, unknown>): Promise<any>;
declare const console: {
  log(...args: unknown[]): void;
  error(...args: unknown[]): void;
  warn(...args: unknown[]): void;
};
