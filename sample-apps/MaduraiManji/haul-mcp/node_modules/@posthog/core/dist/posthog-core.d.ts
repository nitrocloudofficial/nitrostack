import type { PostHogAutocaptureElement, PostHogFlagsResponse, PostHogFeatureFlagsResponse, PostHogCoreOptions, PostHogEventProperties, PostHogCaptureOptions, JsonType, PostHogRemoteConfig, FeatureFlagValue, FeatureFlagResult, FeatureFlagResultOptions, IsFeatureEnabledOptions, PostHogFeatureFlagDetails, PostHogGroupProperties } from './types';
import { PostHogPersistedProperty } from './types';
import { PostHogCoreStateless } from './posthog-core-stateless';
import { EventHint } from './error-tracking';
interface FlagsAsyncOptions {
    sendAnonDistinctId?: boolean;
    fetchConfig?: boolean;
    triggerOnRemoteConfig?: boolean;
}
export declare abstract class PostHogCore extends PostHogCoreStateless {
    private sendFeatureFlagEvent;
    private disableRemoteFeatureFlags;
    private flagCallReported;
    private _beforeSend?;
    protected _flagsResponsePromise?: Promise<PostHogFeatureFlagsResponse | undefined>;
    protected _sessionExpirationTimeSeconds: number;
    private _sessionMaxLengthSeconds;
    protected sessionProps: PostHogEventProperties;
    private _pendingFlagsRequest?;
    protected _personProfiles: 'always' | 'identified_only' | 'never';
    protected _cachedPersonProperties: string | null;
    constructor(apiKey: string, options?: PostHogCoreOptions);
    protected setupBootstrap(options?: Partial<PostHogCoreOptions>): void;
    private clearProps;
    on(event: string, cb: (...args: any[]) => void): () => void;
    /**
     * Resets the user's ID and clears all persisted properties.
     *
     * Note: The event queues (`PostHogPersistedProperty.Queue` and the isolated
     * `PostHogPersistedProperty.AiQueue`) and the logs queue
     * (`PostHogPersistedProperty.LogsQueue`) are always preserved regardless
     * of what is passed in `propertiesToKeep`, to ensure in-flight data
     * is not lost when identity changes.
     *
     * @param propertiesToKeep - Optional array of persisted properties to preserve during reset.
     */
    reset(propertiesToKeep?: PostHogPersistedProperty[]): void;
    _shutdown(shutdownTimeoutMs?: number): Promise<void>;
    protected getCommonEventProperties(): PostHogEventProperties;
    private enrichProperties;
    /**
     * Returns the current session_id.
     *
     * @remarks
     * This should only be used for informative purposes.
     * Any actual internal use case for the session_id should be handled by the sessionManager.
     *
     * @public
     *
     * @returns The stored session ID for the current session. This may be an empty string if the client is not yet fully initialized.
     */
    getSessionId(): string;
    resetSessionId(): void;
    /**
     * Returns the current anonymous ID.
     *
     * This is the ID assigned to users before they are identified. It's used to track
     * anonymous users and link them to identified users when they sign up.
     *
     * {@label Identification}
     *
     * @example
     * ```js
     * // get the anonymous ID
     * const anonId = posthog.getAnonymousId()
     * console.log('Anonymous ID:', anonId)
     * ```
     *
     * @public
     *
     * @returns {string} The stored anonymous ID. This may be an empty string if the client is not yet fully initialized.
     */
    getAnonymousId(): string;
    /**
     * * @returns {string} The stored distinct ID. This may be an empty string if the client is not yet fully initialized.
     */
    getDistinctId(): string;
    registerForSession(properties: PostHogEventProperties): void;
    unregisterForSession(property: string): void;
    /***
     *** TRACKING
     ***/
    identify(distinctId?: string, properties?: PostHogEventProperties, options?: PostHogCaptureOptions): void;
    capture(event: string, properties?: PostHogEventProperties, options?: PostHogCaptureOptions): void;
    alias(alias: string): void;
    autocapture(eventType: string, elements: PostHogAutocaptureElement[], properties?: PostHogEventProperties, options?: PostHogCaptureOptions): void;
    /***
     *** GROUPS
     ***/
    groups(groups: PostHogGroupProperties): void;
    group(groupType: string, groupKey: string | number, groupProperties?: PostHogEventProperties, options?: PostHogCaptureOptions): void;
    groupIdentify(groupType: string, groupKey: string | number, groupProperties?: PostHogEventProperties, options?: PostHogCaptureOptions): void;
    /***
     * PROPERTIES
     ***/
    setPersonPropertiesForFlags(properties: {
        [type: string]: JsonType;
    }, reloadFeatureFlags?: boolean): void;
    resetPersonPropertiesForFlags(): void;
    setGroupPropertiesForFlags(properties: {
        [type: string]: Record<string, JsonType>;
    }): void;
    resetGroupPropertiesForFlags(): void;
    private remoteConfigAsync;
    /***
     *** FEATURE FLAGS
     ***/
    protected flagsAsync(options?: FlagsAsyncOptions): Promise<PostHogFeatureFlagsResponse | undefined>;
    /**
     * Called when remote config has been loaded (from either the remote config endpoint or the flags endpoint).
     * Override in subclasses to react to remote config changes (e.g., gating error tracking, session replay features).
     *
     * The full response is passed so consumers can read whatever fields they need.
     * This is called exactly once per remote config load cycle.
     *
     * @param _response The remote config or flags response containing config fields
     */
    protected onRemoteConfig(_response: PostHogRemoteConfig): void;
    /**
     * Conditionally triggers onRemoteConfig if requested.
     * Only _remoteConfigAsync passes triggerOnRemoteConfig=true to apply remote config values
     * (errorTracking, capturePerformance, etc.) on initial load.
     * User-triggered reloadFeatureFlags/reloadFeatureFlagsAsync don't set this,
     * so they won't re-trigger onRemoteConfig or reinstall/uninstall integrations.
     */
    private maybeNotifyRemoteConfig;
    private cacheSessionReplay;
    private _remoteConfigAsync;
    private _flagsAsync;
    private setKnownFeatureFlagDetails;
    private getKnownFeatureFlagDetails;
    private getStoredFlagDetails;
    protected isMinimalFlagCalledEventsEnabled(): boolean;
    protected getKnownFeatureFlags(): PostHogFlagsResponse['featureFlags'] | undefined;
    private getBootstrappedFeatureFlagDetails;
    private setBootstrappedFeatureFlagDetails;
    private getBootstrappedFeatureFlags;
    private getBootstrappedFeatureFlagPayloads;
    getFeatureFlagResult(key: string, options?: FeatureFlagResultOptions): FeatureFlagResult | undefined;
    /**
     * Returns all currently cached feature flags as `FeatureFlagResult`s. This is a synchronous read of
     * the flags from the last load (no network request) and does not send a `$feature_flag_called` event.
     */
    getAllFeatureFlags(): FeatureFlagResult[];
    protected _getFeatureFlagResult(key: string, options?: {
        /** Whether to send an event that the flag was evaluated. This defaults to true,
         * but will respect the instance-level sendFeatureFlagEvent setting.
         */
        sendEvent?: boolean;
        /**
         * Preserves the legacy missing-flag behavior of the named function.
         * Each value matches how that function handled missing flags before getFeatureFlagResult existed:
         * - 'getFeatureFlag': returns a default only when non-empty flags are cached
         * - 'getFeatureFlagPayload': returns a default whenever any flags response was stored (even if empty, e.g. error/quota)
         * Without this, missing flags simply return undefined (this is usually what you want).
         */
        missingFlagBehavior?: 'getFeatureFlag' | 'getFeatureFlagPayload';
    }): FeatureFlagResult | undefined;
    getFeatureFlag(key: string, options?: FeatureFlagResultOptions): FeatureFlagValue | undefined;
    /**
     * @deprecated Use `getFeatureFlagResult()` instead, which returns the flag value and payload from a single evaluation.
     */
    getFeatureFlagPayload(key: string): JsonType | undefined;
    getFeatureFlagPayloads(): PostHogFlagsResponse['featureFlagPayloads'] | undefined;
    getFeatureFlags(): PostHogFlagsResponse['featureFlags'] | undefined;
    getFeatureFlagDetails(): PostHogFeatureFlagDetails | undefined;
    getFeatureFlagsAndPayloads(): {
        flags: PostHogFlagsResponse['featureFlags'] | undefined;
        payloads: PostHogFlagsResponse['featureFlagPayloads'] | undefined;
    };
    isFeatureEnabled(key: string, options: IsFeatureEnabledOptions & {
        defaultValue: boolean;
    }): boolean;
    isFeatureEnabled(key: string, options?: IsFeatureEnabledOptions): boolean | undefined;
    reloadFeatureFlags(options?: {
        cb?: (err?: Error, flags?: PostHogFlagsResponse['featureFlags']) => void;
    }): void;
    reloadRemoteConfigAsync(): Promise<PostHogRemoteConfig | undefined>;
    reloadFeatureFlagsAsync(sendAnonDistinctId?: boolean): Promise<PostHogFlagsResponse['featureFlags'] | undefined>;
    onFeatureFlags(cb: (flags: PostHogFlagsResponse['featureFlags']) => void): () => void;
    onFeatureFlag(key: string, cb: (value: FeatureFlagValue) => void): () => void;
    overrideFeatureFlag(flags: PostHogFlagsResponse['featureFlags'] | null): Promise<void>;
    /**
     * Replaces (or merges into) the stored feature flags and payloads with locally supplied
     * values, exactly as if they had been returned by the flags endpoint: the values are
     * persisted, `getFeatureFlag()`/`getFeatureFlagPayload()` read them back, and
     * `onFeatureFlags` listeners fire. Makes no network request.
     *
     * Intended for apps that evaluate flags outside the SDK (e.g. server-side local
     * evaluation) and push the results in at runtime, typically together with the
     * `disableRemoteFeatureFlags` option so the SDK never fetches flags itself.
     *
     * The values are cleared by `reset()`, so push them again after an identity change.
     *
     * @param flags - Flag keys mapped to their values (boolean, or a variant string)
     * @param payloads - Optional flag keys mapped to their JSON payloads
     * @param options - Set `merge: true` to merge with the currently stored flags instead of replacing them
     */
    updateFlags(flags: Record<string, FeatureFlagValue>, payloads?: Record<string, JsonType>, options?: {
        merge?: boolean;
    }): void;
    /**
     * Capture a caught exception manually
     *
     * {@label Error tracking}
     *
     * @public
     *
     * @example
     * ```js
     * // Capture a caught exception
     * try {
     *   // something that might throw
     * } catch (error) {
     *   posthog.captureException(error)
     * }
     * ```
     *
     * @example
     * ```js
     * // With additional properties
     * posthog.captureException(error, {
     *   customProperty: 'value',
     *   anotherProperty: ['I', 'can be a list'],
     *   ...
     * })
     * ```
     *
     * @param {Error} error The error to capture
     * @param {Object} [additionalProperties] Any additional properties to add to the error event
     * @returns {CaptureResult} The result of the capture
     */
    captureException(error: unknown, additionalProperties?: PostHogEventProperties, hint?: EventHint): void;
    /**
     * Capture written user feedback for a LLM trace. Numeric values are converted to strings.
     *
     * {@label LLM analytics}
     *
     * @public
     *
     * @param traceId The trace ID to capture feedback for.
     * @param userFeedback The feedback to capture.
     */
    captureTraceFeedback(traceId: string | number, userFeedback: string): void;
    /**
     * Capture a metric for a LLM trace. Numeric values are converted to strings.
     *
     * {@label LLM analytics}
     *
     * @public
     *
     * @param traceId The trace ID to capture the metric for.
     * @param metricName The name of the metric to capture.
     * @param metricValue The value of the metric to capture.
     */
    captureTraceMetric(traceId: string | number, metricName: string, metricValue: string | number | boolean): void;
    /***
     *** PERSON PROFILES
     ***/
    /**
     * Returns whether the current user is identified (has a person profile).
     *
     * This checks:
     * 1. If PersonMode is explicitly set to 'identified'
     * 2. For backwards compatibility: if DistinctId differs from AnonymousId
     *    (meaning the user was identified before the SDK was upgraded)
     *
     * @internal
     */
    protected _isIdentified(): boolean;
    /**
     * Returns the current groups object from super properties.
     * @internal
     */
    protected _getGroups(): PostHogGroupProperties;
    /**
     * Determines whether the current user should have person processing enabled.
     *
     * Returns true if:
     * - person_profiles is set to 'always', OR
     * - person_profiles is 'identified_only' AND (user is identified OR has groups OR person processing was explicitly enabled)
     *
     * Returns false if:
     * - person_profiles is 'never', OR
     * - person_profiles is 'identified_only' AND user is not identified AND has no groups AND person processing was not enabled
     *
     * @internal
     */
    protected _hasPersonProcessing(): boolean;
    /**
     * Enables person processing if the config allows it.
     *
     * If person_profiles is 'never', this logs an error and returns false.
     * Otherwise, it enables person processing and returns true.
     *
     * @param functionName - The name of the function calling this method (for error messages)
     * @returns true if person processing is enabled, false if it's blocked by config
     * @internal
     */
    protected _requirePersonProcessing(functionName: string): boolean;
    /**
     * Creates a person profile for the current user, if they don't already have one.
     *
     * If personProfiles is 'identified_only' and no profile exists, this will create one.
     * If personProfiles is 'never', this will log an error and do nothing.
     * If personProfiles is 'always' or a profile already exists, this is a no-op.
     *
     * @public
     */
    createPersonProfile(): void;
    /**
     * Sets properties on the person profile associated with the current `distinct_id`.
     * Learn more about [identifying users](https://posthog.com/docs/product-analytics/identify)
     *
     * {@label Identification}
     *
     * @remarks
     * Updates user properties that are stored with the person profile in PostHog.
     * If `personProfiles` is set to `identified_only` and no profile exists, this will create one.
     *
     * @example
     * ```js
     * // set user properties
     * posthog.setPersonProperties({
     *     email: 'user@example.com',
     *     plan: 'premium'
     * })
     * ```
     *
     * @example
     * ```js
     * // set properties with $set_once
     * posthog.setPersonProperties(
     *     { name: 'Max Hedgehog' },  // $set properties
     *     { initial_url: '/blog' }   // $set_once properties
     * )
     * ```
     *
     * @public
     *
     * @param userPropertiesToSet - Optional: An object of properties to store about the user.
     *   These properties will overwrite any existing values for the same keys.
     * @param userPropertiesToSetOnce - Optional: An object of properties to store about the user.
     *   If a property is previously set, this does not override that value.
     * @param reloadFeatureFlags - Whether to reload feature flags after setting the properties. Defaults to true.
     */
    setPersonProperties(userPropertiesToSet?: {
        [key: string]: JsonType;
    }, userPropertiesToSetOnce?: {
        [key: string]: JsonType;
    }, reloadFeatureFlags?: boolean): void;
    /**
     * Removes properties from the person profile associated with the current `distinct_id`.
     * Learn more about [identifying users](https://posthog.com/docs/product-analytics/identify)
     *
     * {@label Identification}
     *
     * @remarks
     * Deletes the given person properties from the person profile in PostHog. This is the
     * counterpart to {@link setPersonProperties} — instead of hand-passing `$unset` inside a
     * `capture()` call, you can remove properties with a dedicated method.
     * If `personProfiles` is set to `never`, this call is ignored.
     *
     * @example
     * ```js
     * // remove a single property
     * posthog.unsetPersonProperties('plan')
     * ```
     *
     * @example
     * ```js
     * // remove multiple properties
     * posthog.unsetPersonProperties(['plan', 'email'])
     * ```
     *
     * @public
     *
     * @param propertyNames - The name (or names) of the person properties to remove.
     * @param reloadFeatureFlags - Whether to reload feature flags after removing the properties. Defaults to true.
     */
    unsetPersonProperties(propertyNames: string | string[], reloadFeatureFlags?: boolean): void;
    /**
     * Override processBeforeEnqueue to run before_send hooks.
     * This runs after prepareMessage, giving users full control over the final event.
     *
     * The internal message contains many fields (event, distinct_id, properties, timestamp, uuid).
     * Deprecated top-level type, library, and library_version values may still be present on legacy
     * queued messages; type is a no-op, while library and library_version are only used as fallbacks
     * for the official properties.$lib and properties.$lib_version fields.
     * CaptureEvent exposes a subset matching the web SDK's
     * CaptureResult: uuid, event, properties, $set, $set_once, timestamp.
     * Note: $set/$set_once are extracted from properties.$set and properties.$set_once.
     */
    protected processBeforeEnqueue(message: PostHogEventProperties): PostHogEventProperties | null;
    /**
     * Runs the before_send hook(s) on the given capture event.
     * If any hook returns null, the event is dropped.
     *
     * @param captureEvent The event to process
     * @returns The processed event, or null if the event should be dropped
     */
    private _runBeforeSend;
}
export {};
//# sourceMappingURL=posthog-core.d.ts.map