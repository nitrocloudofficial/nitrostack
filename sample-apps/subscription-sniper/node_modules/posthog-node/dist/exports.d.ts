export * from './extensions/sentry-integration';
export * from './extensions/express';
export * from './types';
export { FeatureFlagEvaluations } from './feature-flag-evaluations';
export type { FlagDefinitionCacheData, FlagDefinitionCacheProvider } from './extensions/feature-flags/cache';
export { FeatureFlagError } from '@posthog/core';
export type { FeatureFlagErrorType } from '@posthog/core';
export type { CaptureMetricOptions, Metrics, MetricsConfig } from '@posthog/core';
export { cookieStateToProperties, cookieStoreFromHeader, getPostHogCookieName, parsePostHogCookie, readPostHogCookie, serializePostHogCookie, uuidv7, } from '@posthog/core';
export type { CookieStore, PostHogCookieState } from '@posthog/core';
//# sourceMappingURL=exports.d.ts.map