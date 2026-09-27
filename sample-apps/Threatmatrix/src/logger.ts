/**
 * ThreatMatrix Professional Logger
 * Writes to stderr so that MCP STDIO transport (stdout) is never polluted.
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

const LEVELS: Record<LogLevel, number> = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };

const COLORS: Record<LogLevel, string> = {
  DEBUG: '\x1b[36m', // cyan
  INFO: '\x1b[32m',  // green
  WARN: '\x1b[33m',  // yellow
  ERROR: '\x1b[31m', // red
};
const RESET = '\x1b[0m';

const MIN_LEVEL: number = LEVELS[(process.env.LOG_LEVEL as LogLevel) ?? 'INFO'] ?? 1;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  if (LEVELS[level] < MIN_LEVEL) return;

  const ts = new Date().toISOString();
  const color = IS_PRODUCTION ? '' : COLORS[level];
  const reset = IS_PRODUCTION ? '' : RESET;

  if (IS_PRODUCTION) {
    // JSON structured log for cloud environments
    const entry: Record<string, unknown> = { level, ts, message };
    if (meta) Object.assign(entry, meta);
    process.stderr.write(JSON.stringify(entry) + '\n');
  } else {
    const metaStr = meta ? ' ' + JSON.stringify(meta) : '';
    process.stderr.write(`${color}[${level}]${reset} ${ts} ${message}${metaStr}\n`);
  }
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => log('DEBUG', msg, meta),
  info:  (msg: string, meta?: Record<string, unknown>) => log('INFO',  msg, meta),
  warn:  (msg: string, meta?: Record<string, unknown>) => log('WARN',  msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log('ERROR', msg, meta),
};
