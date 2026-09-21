import type { MetricAttributeValue, OtlpMetric, OtlpMetricsPayload } from '@posthog/types';
import type { ResolvedPostHogMetricsConfig } from './types';
/**
 * Default histogram bucket boundaries — the OpenTelemetry SDK defaults.
 * Chosen so the server-side p95/quantile aggregations have usable resolution
 * for the common latency/size ranges without any per-metric configuration.
 */
export declare const DEFAULT_HISTOGRAM_BOUNDS: number[];
/**
 * Converts epoch millis to the unix-nanos string OTLP requires (uint64
 * doesn't fit in JS Number, so concatenate instead of multiplying).
 */
export declare function msToUnixNano(ms: number): string;
/**
 * Canonical identity of a series within the aggregation window: type, name,
 * unit, and the attribute set with keys sorted so insertion order can't split
 * a series. NUL (`\u0000`) separators can't appear in metric names or JSON output.
 */
export declare function seriesKey(type: string, name: string, unit: string | undefined, attributes: Record<string, MetricAttributeValue> | undefined): string;
/**
 * Returns the bucket index for a histogram observation: the first boundary
 * the value is `<=`, or the overflow bucket (`bounds.length`) past the last.
 */
export declare function bucketIndexFor(value: number, bounds: number[]): number;
/**
 * OTLP resource attributes for every metrics batch. Same layering policy as
 * the logs builder: user `resourceAttributes` spread first, SDK-controlled
 * keys layered on top so a stray user key can't clobber attribution.
 */
export declare function buildMetricsResourceAttributes(config: ResolvedPostHogMetricsConfig, scopeName: string, scopeVersion: string): Record<string, MetricAttributeValue>;
/**
 * Wraps aggregated metrics in the OTLP `resourceMetrics` envelope
 * (`ExportMetricsServiceRequest`, JSON encoding).
 *
 * Encoding notes pinned by the ingest's JSON deserializer: nano timestamps
 * are decimal strings, but histogram `count`/`bucketCounts` are plain JSON
 * numbers — string-encoded u64s in those fields have been silently dropped
 * by upstream opentelemetry-proto deserializers (opentelemetry-rust#3328).
 */
export declare function buildOtlpMetricsPayload(metrics: OtlpMetric[], resourceAttributes: Record<string, MetricAttributeValue>, scopeName: string, scopeVersion: string): OtlpMetricsPayload;
//# sourceMappingURL=metrics-utils.d.ts.map