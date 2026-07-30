import type { MetricAttributeValue, OtlpMetric, OtlpMetricsPayload } from '@posthog/types'
import { toOtlpKeyValueList } from '../logs/logs-utils'
import type { ResolvedPostHogMetricsConfig } from './types'

/**
 * Default histogram bucket boundaries — the OpenTelemetry SDK defaults.
 * Chosen so the server-side p95/quantile aggregations have usable resolution
 * for the common latency/size ranges without any per-metric configuration.
 */
export const DEFAULT_HISTOGRAM_BOUNDS = [0, 5, 10, 25, 50, 75, 100, 250, 500, 750, 1000, 2500, 5000, 7500, 10000]

/**
 * Converts epoch millis to the unix-nanos string OTLP requires (uint64
 * doesn't fit in JS Number, so concatenate instead of multiplying).
 */
export function msToUnixNano(ms: number): string {
  return String(ms) + '000000'
}

/**
 * Canonical identity of a series within the aggregation window: type, name,
 * unit, and the attribute set with keys sorted so insertion order can't split
 * a series. NUL (`\u0000`) separators can't appear in metric names or JSON output.
 */
export function seriesKey(
  type: string,
  name: string,
  unit: string | undefined,
  attributes: Record<string, MetricAttributeValue> | undefined
): string {
  let attrsKey = ''
  if (attributes) {
    const keys = Object.keys(attributes).sort()
    attrsKey = keys.map((k) => `${JSON.stringify(k)}:${JSON.stringify(attributes[k])}`).join(',')
  }
  return `${type}\u0000${name}\u0000${unit ?? ''}\u0000${attrsKey}`
}

/**
 * Returns the bucket index for a histogram observation: the first boundary
 * the value is `<=`, or the overflow bucket (`bounds.length`) past the last.
 */
export function bucketIndexFor(value: number, bounds: number[]): number {
  for (let i = 0; i < bounds.length; i++) {
    if (value <= bounds[i]) {
      return i
    }
  }
  return bounds.length
}

/**
 * OTLP resource attributes for every metrics batch. Same layering policy as
 * the logs builder: user `resourceAttributes` spread first, SDK-controlled
 * keys layered on top so a stray user key can't clobber attribution.
 */
export function buildMetricsResourceAttributes(
  config: ResolvedPostHogMetricsConfig,
  scopeName: string,
  scopeVersion: string
): Record<string, MetricAttributeValue> {
  return {
    ...config.resourceAttributes,
    'service.name': config.serviceName || 'unknown_service',
    ...(config.environment && { 'deployment.environment': config.environment }),
    ...(config.serviceVersion && { 'service.version': config.serviceVersion }),
    'telemetry.sdk.name': scopeName,
    'telemetry.sdk.version': scopeVersion,
  }
}

/**
 * Wraps aggregated metrics in the OTLP `resourceMetrics` envelope
 * (`ExportMetricsServiceRequest`, JSON encoding).
 *
 * Encoding notes pinned by the ingest's JSON deserializer: nano timestamps
 * are decimal strings, but histogram `count`/`bucketCounts` are plain JSON
 * numbers — string-encoded u64s in those fields have been silently dropped
 * by upstream opentelemetry-proto deserializers (opentelemetry-rust#3328).
 */
export function buildOtlpMetricsPayload(
  metrics: OtlpMetric[],
  resourceAttributes: Record<string, MetricAttributeValue>,
  scopeName: string,
  scopeVersion: string
): OtlpMetricsPayload {
  return {
    resourceMetrics: [
      {
        resource: { attributes: toOtlpKeyValueList(resourceAttributes) },
        scopeMetrics: [
          {
            scope: { name: scopeName, version: scopeVersion },
            metrics,
          },
        ],
      },
    ],
  }
}
