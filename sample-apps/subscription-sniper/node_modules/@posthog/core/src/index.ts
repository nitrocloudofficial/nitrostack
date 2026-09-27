export {
  getFeatureFlagValue,
  getEnabledFromValue,
  getVariantFromValue,
  parsePayload,
  flagDetailsToResults,
} from './featureFlagUtils'
export {
  gzipCompress,
  isGzipData,
  isGzipRequest,
  isGzipSupported,
  isNativeAsyncGzipError,
  isNativeAsyncGzipReadError,
} from './gzip'
export * from './utils'
export * as ErrorTracking from './error-tracking'
export {
  buildOtlpLogRecord,
  buildOtlpLogsPayload,
  buildResourceAttributes,
  getOtlpSeverityNumber,
  getOtlpSeverityText,
  toOtlpAnyValue,
  toOtlpKeyValueList,
} from './logs/logs-utils'
export { PostHogLogs } from './logs'
export type {
  BeforeSendLogFn,
  BufferedLogEntry,
  CaptureLogger,
  LogSdkContext,
  PostHogLogsConfig,
  ResolvedPostHogLogsConfig,
} from './logs/types'
// Re-export the user-facing OTLP log types straight from `@posthog/types`
// via the `logs/types` barrel so consumers don't have to import from two
// packages to type their `captureLog` calls.
export type { CaptureLogOptions, LogAttributeValue, LogAttributes, LogSeverityLevel } from './logs/types'
// Re-export the shared error tracking rate-limiter config type so SDKs built on core
// (e.g. posthog-node) don't have to depend on `@posthog/types` directly.
export type { ExceptionRateLimiterConfig } from '@posthog/types'
export {
  PostHogMetrics,
  buildOtlpMetricsPayload,
  buildMetricsResourceAttributes,
  DEFAULT_HISTOGRAM_BOUNDS,
  resolveMetricsConfig,
} from './metrics'
export type {
  MetricsHost,
  PostHogMetricsConfig,
  ResolvedPostHogMetricsConfig,
  SendMetricsBatchOutcome,
} from './metrics'
// Same barrel convention as logs for the user-facing metric types.
export type {
  CaptureMetricOptions,
  MetricAttributes,
  MetricAttributeValue,
  MetricSample,
  MetricType,
  Metrics,
  MetricsConfig,
} from './metrics/types'
export { uuidv7 } from './vendor/uuidv7'
export * from './cookie'
export * from './posthog-core'
export * from './posthog-core-stateless'
export * from './tracing-headers'
export * from './types'
export { getValidationError, getLengthFromRules, getRequirementsHint } from './surveys/validation'
