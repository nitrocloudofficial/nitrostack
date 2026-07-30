/**
 * Metric capture types
 */
import type { OtlpKeyValue } from './capture-log';
/**
 * Metric attribute values are restricted to scalars. Every distinct
 * attribute-value combination creates a new metric series, so high-cardinality
 * values (user IDs, request IDs, URLs) must not be used as attributes — put
 * those on logs or events instead.
 */
export type MetricAttributeValue = string | number | boolean;
export type MetricAttributes = Record<string, MetricAttributeValue>;
export type MetricType = 'count' | 'gauge' | 'histogram';
/** Options accepted by `posthog.metrics.count/gauge/histogram`. */
export interface CaptureMetricOptions {
    /**
     * Unit of the value (e.g. 'ms', 'byte'). Displayed in the Metrics UI and
     * part of the series identity — the same name with two units is two series.
     */
    unit?: string;
    /**
     * Low-cardinality dimensions to filter and group by (e.g. route, plan,
     * region). Each distinct combination is its own series.
     */
    attributes?: MetricAttributes;
}
/**
 * A captured metric as seen by `beforeSend`, before aggregation. Mutating
 * `name`, `value`, `unit`, or `attributes` changes what gets aggregated;
 * returning `null` drops the sample.
 */
export interface MetricSample {
    name: string;
    type: MetricType;
    value: number;
    unit?: string;
    attributes?: MetricAttributes;
}
/**
 * Pre-aggregation filter. Return the (possibly transformed) sample to keep
 * it; return `null` to drop it. Configure as a single function or an array
 * forming a left-to-right chain; a `null` from any link drops the sample and
 * a thrown error also drops it (the error is logged).
 *
 * @example Drop debug metrics in production
 * ```ts
 * metrics: { beforeSend: (m) => (m.name.startsWith('debug_') ? null : m) }
 * ```
 */
export type BeforeSendMetricFn = (sample: MetricSample) => MetricSample | null;
/**
 * The public `posthog.metrics` API.
 *
 * @example
 * ```ts
 * posthog.metrics.count('orders_created', 1)
 * posthog.metrics.gauge('active_connections', 42)
 * posthog.metrics.histogram('api_latency', 187, { unit: 'ms' })
 * ```
 */
export interface Metrics {
    /** Add to a counter — things that only go up (orders, clicks, API calls). Value defaults to 1. */
    count(name: string, value?: number, options?: CaptureMetricOptions): void;
    /** Record the current value of something that goes up and down (queue depth, connections). */
    gauge(name: string, value: number, options?: CaptureMetricOptions): void;
    /** Record one observation of a distribution (latency, payload size). */
    histogram(name: string, value: number, options?: CaptureMetricOptions): void;
    /** Send everything aggregated so far without waiting for the flush interval. */
    flush(): Promise<void>;
}
export interface OtlpNumberDataPoint {
    attributes: OtlpKeyValue[];
    /** Unix nanos as a decimal string (uint64 doesn't fit in JS Number). */
    timeUnixNano: string;
    startTimeUnixNano?: string;
    asDouble: number;
}
export interface OtlpHistogramDataPoint {
    attributes: OtlpKeyValue[];
    timeUnixNano: string;
    startTimeUnixNano: string;
    /** Plain JSON numbers, not strings — see the ingest's u64 handling. */
    count: number;
    sum: number;
    min: number;
    max: number;
    bucketCounts: number[];
    explicitBounds: number[];
}
/** AGGREGATION_TEMPORALITY_DELTA — each data point covers one flush window. */
export declare const OTLP_AGGREGATION_TEMPORALITY_DELTA = 1;
export interface OtlpMetric {
    name: string;
    unit?: string;
    sum?: {
        aggregationTemporality: number;
        isMonotonic: boolean;
        dataPoints: OtlpNumberDataPoint[];
    };
    gauge?: {
        dataPoints: OtlpNumberDataPoint[];
    };
    histogram?: {
        aggregationTemporality: number;
        dataPoints: OtlpHistogramDataPoint[];
    };
}
export interface OtlpMetricsPayload {
    resourceMetrics: Array<{
        resource: {
            attributes: OtlpKeyValue[];
        };
        scopeMetrics: Array<{
            scope: {
                name: string;
                version?: string;
            };
            metrics: OtlpMetric[];
        }>;
    }>;
}
//# sourceMappingURL=capture-metric.d.ts.map