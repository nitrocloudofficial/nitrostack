/**
 * Log capture types
 */
export type LogSeverityLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
export type OtlpSeverityText = 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
export interface OtlpSeverityEntry {
    text: OtlpSeverityText;
    number: number;
}
export type LogAttributeValue = string | number | boolean | null | undefined | unknown[] | Record<string, unknown>;
export type LogAttributes = Record<string, LogAttributeValue>;
export interface CaptureLogOptions {
    /** The log message body (required) */
    body: string;
    /** Log severity level (default: 'info') */
    level?: LogSeverityLevel;
    /** Trace ID for correlation — 32 hex chars */
    trace_id?: string;
    /** Span ID for correlation — 16 hex chars */
    span_id?: string;
    /** W3C trace flags (default: 0) */
    trace_flags?: number;
    /** Per-log attributes (request-specific context like order_id, duration_ms) */
    attributes?: LogAttributes;
}
/**
 * Pre-send filter. Inspect, mutate, or drop a captured log record before it
 * enters the rate cap or the buffer. Return the (possibly transformed) record
 * to keep it; return `null` to drop it.
 *
 * Configure as a single function or an array. Arrays form a left-to-right
 * chain: each function receives the previous function's return value, and a
 * `null` from any link short-circuits the chain and drops the record. A
 * function that throws also drops the record (the error is logged).
 *
 * @example Redact secrets from log bodies
 * ```ts
 * logs: { beforeSend: (record) => ({ ...record, body: record.body.replace(/token=\S+/g, 'token=[REDACTED]') }) }
 * ```
 */
export type BeforeSendLogFn = (record: CaptureLogOptions) => CaptureLogOptions | null;
/**
 * Per-level convenience logger. Each method captures a structured log record
 * at the corresponding severity, equivalent to
 * `posthog.captureLog({ body, level, attributes })`.
 *
 * @example
 * ```ts
 * posthog.logger.info('checkout completed', { order_id: 'ord_789' })
 * posthog.logger.error('payment failed', { code: 'E001' })
 * ```
 */
export interface Logger {
    /** Lowest severity. Trace-level diagnostic detail. */
    trace(body: string, attributes?: LogAttributes): void;
    /** Debug-level detail. Verbose, only useful while diagnosing. */
    debug(body: string, attributes?: LogAttributes): void;
    /** Informational. Normal app events worth recording. */
    info(body: string, attributes?: LogAttributes): void;
    /** Warning. Something unexpected but non-fatal. */
    warn(body: string, attributes?: LogAttributes): void;
    /** Error. Operation failed; the app may continue. */
    error(body: string, attributes?: LogAttributes): void;
    /** Fatal. Operation failed; the app likely cannot continue. */
    fatal(body: string, attributes?: LogAttributes): void;
}
export interface OtlpAnyValue {
    stringValue?: string;
    intValue?: number;
    doubleValue?: number;
    boolValue?: boolean;
    arrayValue?: {
        values: OtlpAnyValue[];
    };
}
export interface OtlpKeyValue {
    key: string;
    value: OtlpAnyValue;
}
export interface OtlpLogRecord {
    timeUnixNano: string;
    observedTimeUnixNano: string;
    severityNumber: number;
    severityText: OtlpSeverityText;
    body: {
        stringValue: string;
    };
    attributes: OtlpKeyValue[];
    traceId?: string;
    spanId?: string;
    flags?: number;
}
export interface OtlpLogsPayload {
    resourceLogs: Array<{
        resource: {
            attributes: OtlpKeyValue[];
        };
        scopeLogs: Array<{
            scope: {
                name: string;
                version?: string;
            };
            logRecords: OtlpLogRecord[];
        }>;
    }>;
}
//# sourceMappingURL=capture-log.d.ts.map