/**
 * Ambient definitions available within the NitroStack Code Mode sandbox.
 * Target environment: ECMAScript 2020 (ES11).
 * Node.js globals (process, require, Buffer, fs, fetch) are prohibited.
 */

/**
 * Invokes an available tool within the NitroStack server.
 * Returns the tool execution result.
 */
declare function callTool<TArgs extends Record<string, any> = Record<string, any>, TResult = any>(
  toolName: string,
  params?: TArgs
): Promise<TResult>;

/**
 * Standard sandboxed console for capturing script diagnostic output.
 */
declare const console: {
  log(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
};
