/**
 * Feature flag types
 */
import type { JsonType } from './common';
export type FeatureFlagsCallback = (flags: string[], variants: Record<string, string | boolean>, context?: {
    errorsLoading?: boolean;
}) => void;
export type FeatureFlagDetail = {
    key: string;
    enabled: boolean;
    original_enabled?: boolean | undefined;
    variant: string | undefined;
    original_variant?: string | undefined;
    reason: EvaluationReason | undefined;
    metadata: FeatureFlagMetadata | undefined;
    failed?: boolean;
};
export type FeatureFlagMetadata = {
    id: number;
    version: number | undefined;
    description: string | undefined;
    payload: JsonType | undefined;
    /** Whether the flag is linked to an experiment. Absent when the server does not report it. */
    has_experiment?: boolean;
    original_payload?: JsonType | undefined;
};
export type EvaluationReason = {
    code: string;
    condition_index: number | undefined;
    description: string | undefined;
};
export type RemoteConfigFeatureFlagCallback = (payload: JsonType) => void;
/** A feature that isn't publicly available yet.*/
export interface EarlyAccessFeature {
    name: string;
    description: string;
    stage: 'concept' | 'alpha' | 'beta';
    documentationUrl: string | null;
    payload: JsonType;
    flagKey: string | null;
}
export type EarlyAccessFeatureStage = 'concept' | 'alpha' | 'beta' | 'general-availability';
export type EarlyAccessFeatureCallback = (earlyAccessFeatures: EarlyAccessFeature[]) => void;
/**
 * Result of evaluating a feature flag, including both the flag value and its payload.
 */
export type FeatureFlagResult = {
    /** The key of the feature flag */
    readonly key: string;
    /** Whether the feature flag is enabled (truthy value) */
    readonly enabled: boolean;
    /** The variant key if this is a multivariate flag, undefined for boolean flags */
    readonly variant: string | undefined;
    /** The JSON payload associated with this flag, if any */
    readonly payload: JsonType | undefined;
};
export interface EarlyAccessFeatureResponse {
    earlyAccessFeatures: EarlyAccessFeature[];
}
export type FeatureFlagOverrides = {
    [flagName: string]: string | boolean;
};
export type FeatureFlagPayloadOverrides = {
    [flagName: string]: JsonType;
};
export type FeatureFlagOverrideOptions = {
    flags?: boolean | string[] | FeatureFlagOverrides;
    payloads?: FeatureFlagPayloadOverrides;
    suppressWarning?: boolean;
};
/**
 * Options for feature flag lookup methods (getFeatureFlag, isFeatureEnabled, getFeatureFlagResult).
 */
export type FeatureFlagOptions = {
    /**
     * Whether to send a $feature_flag_called event. Defaults to true.
     */
    send_event?: boolean;
    /**
     * If true, only return values loaded from the server, not cached localStorage values.
     * Returns undefined if flags haven't been loaded from the server yet.
     * Defaults to false.
     */
    fresh?: boolean;
};
/**
 * Options for isFeatureEnabled.
 */
export type IsFeatureEnabledOptions = FeatureFlagOptions & {
    /**
     * Value to return when the flag has no value, e.g. flags have not loaded yet or no flag with that key exists.
     */
    defaultValue?: boolean;
};
/**
 * Options for overriding feature flags on the client-side.
 *
 * Can be:
 * - `false` to clear all overrides
 * - `string[]` to enable a list of flags
 * - `FeatureFlagOverrides` to set variants directly
 * - `FeatureFlagOverrideOptions` for granular control over flags and payloads
 */
export type OverrideFeatureFlagsOptions = boolean | string[] | FeatureFlagOverrides | FeatureFlagOverrideOptions;
//# sourceMappingURL=feature-flags.d.ts.map