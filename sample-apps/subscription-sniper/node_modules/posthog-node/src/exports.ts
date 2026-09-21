export * from './extensions/sentry-integration'
export * from './extensions/express'
export * from './types'

export { FeatureFlagEvaluations } from './feature-flag-evaluations'
export type { FlagDefinitionCacheData, FlagDefinitionCacheProvider } from './extensions/feature-flags/cache'

// Re-export FeatureFlagError from core for backwards compatibility.
// These were originally defined in posthog-node and moved to core for reuse across SDKs.
export { FeatureFlagError } from '@posthog/core'
export type { FeatureFlagErrorType } from '@posthog/core'

// Metrics types re-exported so consumers can name the `metrics` client option
// and API surface without a direct @posthog/core dependency.
export type { CaptureMetricOptions, Metrics, MetricsConfig } from '@posthog/core'

// Identity helpers re-exported from core for posthog-node consumers managing
// distinct_id outside the browser SDK (e.g. Lambda functions handing out
// `download-app` redirects). Closes #2143.
export {
  cookieStateToProperties,
  cookieStoreFromHeader,
  getPostHogCookieName,
  parsePostHogCookie,
  readPostHogCookie,
  serializePostHogCookie,
  uuidv7,
} from '@posthog/core'
export type { CookieStore, PostHogCookieState } from '@posthog/core'
