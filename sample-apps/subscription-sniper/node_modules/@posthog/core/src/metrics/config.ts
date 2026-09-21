import type { MetricsConfig } from '@posthog/types'
import type { ResolvedPostHogMetricsConfig } from './types'

const DEFAULT_FLUSH_INTERVAL_MS = 10000
const DEFAULT_MAX_SERIES_PER_FLUSH = 1000

/**
 * Resolves the public `metrics` config into the shape `PostHogMetrics`
 * consumes. Same precedence rule as logs: OTLP keys in `resourceAttributes`
 * win over the named config fields.
 */
export function resolveMetricsConfig(config: MetricsConfig | undefined): ResolvedPostHogMetricsConfig {
  const resourceAttributes = config?.resourceAttributes
  return {
    serviceName: (resourceAttributes?.['service.name'] as string | undefined) ?? config?.serviceName,
    serviceVersion: (resourceAttributes?.['service.version'] as string | undefined) ?? config?.serviceVersion,
    environment: (resourceAttributes?.['deployment.environment'] as string | undefined) ?? config?.environment,
    resourceAttributes,
    beforeSend: config?.beforeSend,
    flushIntervalMs: config?.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS,
    maxSeriesPerFlush: config?.maxSeriesPerFlush ?? DEFAULT_MAX_SERIES_PER_FLUSH,
  }
}
