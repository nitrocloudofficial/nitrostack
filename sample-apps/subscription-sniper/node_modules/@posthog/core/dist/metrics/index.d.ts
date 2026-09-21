import type { CaptureMetricOptions, OtlpMetricsPayload } from '@posthog/types';
import type { Logger } from '../types';
import type { MetricsHost, ResolvedPostHogMetricsConfig } from './types';
/**
 * Statsd-style pre-aggregating metrics client.
 *
 * Samples are folded into per-series aggregates in memory (counts sum,
 * gauges keep the last value, histograms accumulate buckets) and flushed as
 * one OTLP data point per series per window — a burst of 10k `count()` calls
 * costs one data point on the wire. Sums and histograms use delta
 * temporality, so each data point stands alone and client restarts need no
 * cross-window state.
 *
 * Deliberately unlike logs, no per-user context (distinct ID, session ID) is
 * attached: every attribute value creates a new series, and per-user series
 * are the canonical metrics-cardinality explosion.
 */
export declare class PostHogMetrics {
    private readonly _instance;
    private readonly _config;
    private readonly _logger;
    private _series;
    private _flushTimer?;
    private _flushPromise;
    private _seriesCapWarned;
    private _typeByName;
    private _typeCollisionWarned;
    private _generation;
    constructor(_instance: MetricsHost, _config: ResolvedPostHogMetricsConfig, _logger: Logger);
    count(name: string, value?: number, options?: CaptureMetricOptions): void;
    gauge(name: string, value: number, options?: CaptureMetricOptions): void;
    histogram(name: string, value: number, options?: CaptureMetricOptions): void;
    /** Sends everything aggregated so far without waiting for the flush interval. */
    flush(): Promise<void>;
    /**
     * Synchronously snapshots the current window into an OTLP payload and
     * resets it, bypassing the flush serializer entirely — for unload-time
     * drains where the host must hand the payload to a synchronous transport
     * (sendBeacon) in the same tick. Returns `null` when there is nothing to
     * send. The caller owns delivery; there is no retry for a drained window.
     */
    drainWindow(): OtlpMetricsPayload | null;
    /** Clears the flush timer, drops the current window, and invalidates in-flight flushes. */
    reset(): void;
    private _capture;
    /**
     * Cardinality gate for adding a series to the live window — warns once per
     * window when the cap is hit. Applied on capture and on merge-back alike.
     */
    private _admitNewSeries;
    private _fold;
    private _runBeforeSend;
    private _armFlushTimer;
    private _clearFlushTimer;
    private _doFlush;
    private _buildPayload;
    /**
     * Groups the window's series into OTLP metric entries — one entry per
     * (type, name, unit), one data point per attribute combination.
     */
    private _buildMetrics;
    /** Folds an unsent window back into the live one after a transient send failure. */
    private _mergeWindowBack;
}
export { buildOtlpMetricsPayload, buildMetricsResourceAttributes, DEFAULT_HISTOGRAM_BOUNDS } from './metrics-utils';
export { resolveMetricsConfig } from './config';
export type { MetricsHost, PostHogMetricsConfig, ResolvedPostHogMetricsConfig, SendMetricsBatchOutcome } from './types';
//# sourceMappingURL=index.d.ts.map