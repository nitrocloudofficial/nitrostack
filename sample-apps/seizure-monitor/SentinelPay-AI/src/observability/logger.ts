/**
 * SentinelPay AI — Structured Logger
 * Source: Technical Specification §13.1 (Logs)
 *
 * Emits structured JSON log lines with the mandatory fields:
 * timestamp, level, caseId, correlationId, tool, operation, durationMs,
 * status, errorCode. Deliberately dependency-free (no pino/winston) so
 * it works unmodified under whatever runtime the NitroStack scaffold
 * provides; swap the `write` implementation for a platform-native
 * logger later if NitroStack exposes one, without touching call sites.
 *
 * §12.5 — never logs secrets or unnecessary sensitive information. Call
 * sites should only ever pass IDs, statuses, durations, and non-PII
 * observations, never account numbers, tokens, or raw fixture payloads.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogFields {
  caseId?: string;
  correlationId?: string;
  tool?: string;
  operation?: string;
  durationMs?: number;
  status?: string;
  errorCode?: string;
  [key: string]: unknown;
}

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

function currentThreshold(): LogLevel {
  const configured = (process.env.LOG_LEVEL ?? "info").toLowerCase();
  return (["debug", "info", "warn", "error"] as const).includes(configured as LogLevel)
    ? (configured as LogLevel)
    : "info";
}

/** A small set of field names that must never be logged, even accidentally. */
const REDACTED_FIELD_NAMES = new Set([
  "beneficiaryaccount",
  "verifiedbeneficiaryaccount",
  "token",
  "authorization",
  "apikey",
  "password",
  "secret",
]);

function redact(fields: LogFields): LogFields {
  const safe: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    if (REDACTED_FIELD_NAMES.has(key.toLowerCase())) {
      safe[key] = "[REDACTED]";
    } else {
      safe[key] = value;
    }
  }
  return safe;
}

class Logger {
  private write(level: LogLevel, event: string, fields: LogFields = {}) {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[currentThreshold()]) return;

    const line = {
      timestamp: new Date().toISOString(),
      level,
      event,
      ...redact(fields),
    };

    const serialized = JSON.stringify(line);
    // stdout is the exclusive MCP JSON-RPC channel under the stdio transport
    // (see @modelcontextprotocol/sdk/shared/stdio.js — every stdout line is
    // JSON.parse'd as a protocol message). ALL log output, at every level,
    // must go to stderr instead, or it corrupts the message stream.
    // eslint-disable-next-line no-console
    console.error(serialized);
  }

  debug(event: string, fields?: LogFields) {
    this.write("debug", event, fields);
  }
  info(event: string, fields?: LogFields) {
    this.write("info", event, fields);
  }
  warn(event: string, fields?: LogFields) {
    this.write("warn", event, fields);
  }
  error(event: string, fields?: LogFields) {
    this.write("error", event, fields);
  }
}

export const logger = new Logger();
