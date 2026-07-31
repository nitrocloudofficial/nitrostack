/**
 * Safe Logger Utility — Aegis Protocol
 * 
 * Non-negotiable rule: NEVER use console.* in server code because it can corrupt
 * the JSON-RPC stream on stdout.
 * 
 * This utility writes directly to process.stderr, which is completely separate
 * from stdout and safe for MCP stdio transport.
 */

export const safeLogger = {
  info: (msg: string) => {
    process.stderr.write(`[INFO] ${msg}\n`);
  },
  error: (msg: string) => {
    process.stderr.write(`[ERROR] ${msg}\n`);
  },
  warn: (msg: string) => {
    process.stderr.write(`[WARN] ${msg}\n`);
  },
  log: (msg: string) => {
    process.stderr.write(`${msg}\n`);
  }
};
