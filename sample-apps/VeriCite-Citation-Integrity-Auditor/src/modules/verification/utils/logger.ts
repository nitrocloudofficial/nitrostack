/**
 * VeriCite – Verification Engine
 * utils/logger.ts — Structured, levelled console logger
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: "\x1b[36m", // cyan
  info: "\x1b[32m",  // green
  warn: "\x1b[33m",  // yellow
  error: "\x1b[31m", // red
};

const RESET = "\x1b[0m";

function getEnvLevel(): LogLevel {
  const raw = (process.env["LOG_LEVEL"] ?? "info").toLowerCase();
  if (raw in LOG_LEVELS) return raw as LogLevel;
  return "info";
}

function timestamp(): string {
  return new Date().toISOString();
}

function formatMessage(level: LogLevel, namespace: string, message: string, meta?: unknown): string {
  const color = LEVEL_COLORS[level];
  const prefix = `${color}[${level.toUpperCase()}]${RESET} ${timestamp()} [${namespace}]`;
  const metaStr = meta !== undefined ? ` ${JSON.stringify(meta)}` : "";
  return `${prefix} ${message}${metaStr}`;
}

export class Logger {
  private readonly namespace: string;
  private readonly minLevel: number;

  constructor(namespace: string) {
    this.namespace = namespace;
    this.minLevel = LOG_LEVELS[getEnvLevel()];
  }

  private log(level: LogLevel, message: string, meta?: unknown): void {
    if (LOG_LEVELS[level] < this.minLevel) return;
    const formatted = formatMessage(level, this.namespace, message, meta);
    if (level === "error") {
      console.error(formatted);
    } else if (level === "warn") {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
  }

  debug(message: string, meta?: unknown): void {
    this.log("debug", message, meta);
  }

  info(message: string, meta?: unknown): void {
    this.log("info", message, meta);
  }

  warn(message: string, meta?: unknown): void {
    this.log("warn", message, meta);
  }

  error(message: string, meta?: unknown): void {
    this.log("error", message, meta);
  }
}

/** Factory helper — preferred over constructing Logger directly. */
export function createLogger(namespace: string): Logger {
  return new Logger(namespace);
}
