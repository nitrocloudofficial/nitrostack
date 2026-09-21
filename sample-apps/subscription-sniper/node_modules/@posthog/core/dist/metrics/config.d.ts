import type { MetricsConfig } from '@posthog/types';
import type { ResolvedPostHogMetricsConfig } from './types';
/**
 * Resolves the public `metrics` config into the shape `PostHogMetrics`
 * consumes. Same precedence rule as logs: OTLP keys in `resourceAttributes`
 * win over the named config fields.
 */
export declare function resolveMetricsConfig(config: MetricsConfig | undefined): ResolvedPostHogMetricsConfig;
//# sourceMappingURL=config.d.ts.map