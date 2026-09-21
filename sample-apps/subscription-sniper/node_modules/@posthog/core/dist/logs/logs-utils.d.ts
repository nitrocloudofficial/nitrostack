import type { CaptureLogOptions, LogAttributeValue, LogSeverityLevel, OtlpAnyValue, OtlpKeyValue, OtlpLogRecord, OtlpLogsPayload, OtlpSeverityText } from '@posthog/types';
import type { LogSdkContext, ResolvedPostHogLogsConfig } from './types';
export declare function getOtlpSeverityText(level: LogSeverityLevel): OtlpSeverityText;
export declare function getOtlpSeverityNumber(level: LogSeverityLevel): number;
export declare function toOtlpAnyValue(value: LogAttributeValue): OtlpAnyValue;
export declare function toOtlpKeyValueList(attrs: Record<string, LogAttributeValue>): OtlpKeyValue[];
/**
 * Builds a single OTLP log record.
 *
 * Auto-attribute population is shape-driven: any field present on `sdkContext`
 * is emitted as the corresponding attribute. Each SDK populates only the
 * fields that apply to it (browser fills `currentUrl`; mobile fills
 * `screenName` / `appState`), so a missing field never adds a stray attribute.
 *
 * User-provided `options.attributes` always wins on conflicts.
 */
export declare function buildOtlpLogRecord(options: CaptureLogOptions, sdkContext: LogSdkContext): OtlpLogRecord;
/**
 * OTLP resource attributes for every batch, shared by the core flush path and
 * SDK-specific paths that bypass it (e.g. the browser's synchronous sendBeacon
 * drain). Having one builder keeps those paths from drifting.
 *
 * Layout: user `resourceAttributes` spread first, then SDK-controlled keys
 * (`service.name`, `deployment.environment`, `service.version`,
 * `telemetry.sdk.*`) layered on top so a stray user key can't clobber the
 * ingestion-attribution keys. The dedicated `serviceName` / `environment` /
 * `serviceVersion` config fields are the supported way to override the first
 * three; each SDK resolves its own `service.name` default before this point, so
 * the `unknown_service` fallback here only fires if a config slips through with
 * an empty `serviceName`.
 */
export declare function buildResourceAttributes(config: ResolvedPostHogLogsConfig, sdkName: string, sdkVersion: string): Record<string, LogAttributeValue>;
/**
 * Wraps a list of records in the OTLP `resourceLogs` envelope.
 *
 * `scopeName` is the OTLP instrumentation scope name (`web`/`console` for
 * browser, or the SDK library ID for other platforms). `scopeVersion` is the
 * SDK semver. The server combines them into a single `instrumentation_scope`
 * field (`{name}@{version}`) used for attribution in queries and dashboards.
 */
export declare function buildOtlpLogsPayload(logRecords: OtlpLogRecord[], resourceAttributes: Record<string, LogAttributeValue>, scopeName: string, scopeVersion: string): OtlpLogsPayload;
//# sourceMappingURL=logs-utils.d.ts.map