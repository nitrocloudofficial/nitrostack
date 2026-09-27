import { FeatureFlagCondition, PostHogFeatureFlag, PropertyGroup } from '../../types';
import type { FeatureFlagValue, JsonType, PostHogFetchOptions, PostHogFetchResponse } from '@posthog/core';
import { FlagDefinitionCacheProvider } from './cache';
type ConditionMatchResult = 'match' | 'no_match' | 'out_of_rollout_bound';
declare class ClientError extends Error {
    constructor(message: string);
}
declare class InconclusiveMatchError extends Error {
    constructor(message: string);
}
declare class RequiresServerEvaluation extends Error {
    constructor(message: string);
}
type FeatureFlagsPollerOptions = {
    personalApiKey: string;
    projectApiKey: string;
    host: string;
    pollingInterval: number;
    timeout?: number;
    fetch?: (url: string, options: PostHogFetchOptions) => Promise<PostHogFetchResponse>;
    onError?: (error: Error) => void;
    onLoad?: (count: number) => void;
    customHeaders?: {
        [key: string]: string;
    };
    cacheProvider?: FlagDefinitionCacheProvider;
    strictLocalEvaluation?: boolean;
};
export type FeatureFlagEvaluationContext = {
    distinctId: string;
    groups: Record<string, string>;
    personProperties: Record<string, any>;
    groupProperties: Record<string, Record<string, any>>;
    evaluationCache: Record<string, FeatureFlagValue>;
};
type ComputeFlagAndPayloadOptions = {
    matchValue?: FeatureFlagValue;
    skipLoadCheck?: boolean;
};
declare class FeatureFlagsPoller {
    pollingInterval: number;
    personalApiKey: string;
    projectApiKey: string;
    featureFlags: Array<PostHogFeatureFlag>;
    featureFlagsByKey: Record<string, PostHogFeatureFlag>;
    groupTypeMapping: Record<string, string>;
    cohorts: Record<string, PropertyGroup>;
    loadedSuccessfullyOnce: boolean;
    timeout?: number;
    host: FeatureFlagsPollerOptions['host'];
    poller?: NodeJS.Timeout;
    fetch: (url: string, options: PostHogFetchOptions) => Promise<PostHogFetchResponse>;
    debugMode: boolean;
    onError?: (error: Error) => void;
    customHeaders?: {
        [key: string]: string;
    };
    shouldBeginExponentialBackoff: boolean;
    backOffCount: number;
    onLoad?: (count: number) => void;
    private cacheProvider?;
    private loadingPromise?;
    private flagsEtag?;
    private nextFetchAllowedAt?;
    private strictLocalEvaluation;
    private flagDefinitionsLoadedAt?;
    constructor({ pollingInterval, personalApiKey, projectApiKey, timeout, host, customHeaders, ...options }: FeatureFlagsPollerOptions);
    debug(enabled?: boolean): void;
    private logMsgIfDebug;
    private createEvaluationContext;
    getFeatureFlag(key: string, distinctId: string, groups?: Record<string, string>, personProperties?: Record<string, any>, groupProperties?: Record<string, Record<string, any>>): Promise<FeatureFlagValue | undefined>;
    getAllFlagsAndPayloads(evaluationContext: FeatureFlagEvaluationContext, flagKeysToExplicitlyEvaluate?: string[]): Promise<{
        response: Record<string, FeatureFlagValue>;
        payloads: Record<string, JsonType>;
        fallbackToFlags: boolean;
    }>;
    computeFlagAndPayloadLocally(flag: PostHogFeatureFlag, evaluationContext: FeatureFlagEvaluationContext, options?: ComputeFlagAndPayloadOptions): Promise<{
        value: FeatureFlagValue;
        payload: JsonType | null;
    }>;
    private computeFlagValueLocally;
    private getBucketingValueForFlag;
    private getFeatureFlagPayload;
    private evaluateFlagDependency;
    private flagEvaluatesToExpectedValue;
    matchFeatureFlagProperties(flag: PostHogFeatureFlag, bucketingValue: string, properties: Record<string, any>, evaluationContext: FeatureFlagEvaluationContext): Promise<FeatureFlagValue>;
    isConditionMatch(flag: PostHogFeatureFlag, bucketingValue: string, condition: FeatureFlagCondition, properties: Record<string, any>, evaluationContext: FeatureFlagEvaluationContext): Promise<ConditionMatchResult>;
    getMatchingVariant(flag: PostHogFeatureFlag, bucketingValue: string): Promise<FeatureFlagValue | undefined>;
    variantLookupTable(flag: PostHogFeatureFlag): {
        valueMin: number;
        valueMax: number;
        key: string;
    }[];
    /**
     * Updates the internal flag state with the provided flag data.
     */
    private updateFlagState;
    /**
     * Warn about flags that cannot be evaluated locally.
     * Called after loading flag definitions when local evaluation is enabled.
     * Only warns if strictLocalEvaluation is NOT enabled (when it's enabled, server fallback is already prevented).
     */
    private warnAboutExperienceContinuityFlags;
    /**
     * Attempts to load flags from cache and update internal state.
     * Returns true if flags were successfully loaded from cache, false otherwise.
     */
    private loadFromCache;
    loadFeatureFlags(forceReload?: boolean): Promise<void>;
    /**
     * Returns true if the feature flags poller has loaded successfully at least once and has more than 0 feature flags.
     * This is useful to check if local evaluation is ready before calling getFeatureFlag.
     */
    isLocalEvaluationReady(): boolean;
    /**
     * Returns the timestamp (in milliseconds) when flag definitions were last loaded.
     * Returns undefined if flags have not been loaded yet.
     */
    getFlagDefinitionsLoadedAt(): number | undefined;
    /**
     * If a client is misconfigured with an invalid or improper API key, the polling interval is doubled each time
     * until a successful request is made, up to a maximum of 60 seconds.
     *
     * @returns The polling interval to use for the next request.
     */
    private getPollingInterval;
    /**
     * Enter backoff state after receiving an error response (401, 403, 429).
     * This enables exponential backoff for the poller and blocks on-demand fetches.
     */
    private beginBackoff;
    /**
     * Clear backoff state after a successful response (200, 304).
     * This resets the polling interval and allows on-demand fetches immediately.
     */
    private clearBackoff;
    _loadFeatureFlags(): Promise<void>;
    private getPersonalApiKeyRequestOptions;
    _requestFeatureFlagDefinitions(): Promise<PostHogFetchResponse>;
    stopPoller(timeoutMs?: number): Promise<void>;
}
declare function matchProperty(property: FeatureFlagCondition['properties'][number], propertyValues: Record<string, any>, warnFunction?: (msg: string) => void): boolean;
type SemverTuple = [number, number, number];
/**
 * Parse a version string into a [major, minor, patch] tuple.
 * - Strips leading/trailing whitespace
 * - Strips 'v' or 'V' prefix
 * - Strips pre-release and build metadata (-alpha, +build)
 * - Defaults missing components to 0
 * - Ignores extra components beyond the third
 * - Throws InconclusiveMatchError for invalid input
 */
declare function parseSemver(value: string): SemverTuple;
declare function relativeDateParseForFeatureFlagMatching(value: string): Date | null;
export { FeatureFlagsPoller, matchProperty, relativeDateParseForFeatureFlagMatching, parseSemver, InconclusiveMatchError, RequiresServerEvaluation, ClientError, };
//# sourceMappingURL=feature-flags.d.ts.map