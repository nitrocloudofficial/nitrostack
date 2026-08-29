export type { MetricAttributeValue, MetricAttributes, MetricType, MetricsConfig, CaptureMetricOptions, MetricSample, BeforeSendMetricFn, Metrics, OtlpNumberDataPoint, OtlpHistogramDataPoint, OtlpMetric, OtlpMetricsPayload, } from '@posthog/types';
import type { BeforeSendMetricFn, MetricAttributeValue, OtlpMetricsPayload } from '@posthog/types';
/** Same tagged outcome shape as `SendLogsBatchOutcome` — one policy for both signals. */
export type SendMetricsBatchOutcome = {
    kind: 'ok';
} | {
    kind: 'retry-later';
    error: unknown;
} | {
    kind: 'too-large';
} | {
    kind: 'fatal';
    error: unknown;
};
/**
 * The minimal host surface `PostHogMetrics` depends on. `PostHogCoreStateless`
 * satisfies it structurally; the browser supplies an adapter backed by its
 * own request layer.
 */
export interface MetricsHost {
    readonly isDisabled: boolean;
    readonly optedOut: boolean;
    _sendMetricsBatch(payload: OtlpMetricsPayload): Promise<SendMetricsBatchOutcome>;
    getLibraryId(): string;
    getLibraryVersion(): string;
}
/**
 * Configuration for the metrics feature on `new PostHog(key, { metrics: ... })`.
 * All fields are optional; per-SDK defaults apply.
 */
export interface PostHogMetricsConfig {
    /**
     * Service name attached as the OTLP `service.name` resource attribute.
     * Part of every series' identity; used by the Metrics UI for filtering.
     * Defaults to `'unknown_service'` when unset.
     */
    serviceName?: string;
    /** Service version attached as OTLP `service.version`. */
    serviceVersion?: string;
    /** Deployment environment attached as OTLP `deployment.environment`. */
    environment?: string;
    /**
     * Extra OTLP resource attributes attached to every batch. Spread first;
     * SDK-controlled keys are layered on top so users can't clobber them.
     */
    resourceAttributes?: Record<string, MetricAttributeValue>;
    /**
     * How often the aggregated window is flushed (ms). Samples are aggregated
     * in memory between flushes — one data point per series per window, no
     * matter how many calls. Default: 10000.
     */
    flushIntervalMs?: number;
    /**
     * Cardinality guardrail: max distinct series (name + type + unit +
     * attribute combination) held per flush window. Samples for series beyond
     * the cap are dropped with one warning per window. Default: 1000.
     */
    maxSeriesPerFlush?: number;
    /**
     * Pre-aggregation filter. See {@link BeforeSendMetricFn}. Configure as a
     * single function or a chain.
     */
    beforeSend?: BeforeSendMetricFn | BeforeSendMetricFn[];
}
export interface ResolvedPostHogMetricsConfig extends PostHogMetricsConfig {
    flushIntervalMs: number;
    maxSeriesPerFlush: number;
}
//# sourceMappingURL=types.d.ts.map