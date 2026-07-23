import { FeatureFlagValue, JsonType, PostHogCaptureOptions, PostHogCoreStateless, PostHogEventProperties, PostHogFetchOptions, PostHogFetchResponse, PostHogFlagsAndPayloadsResponse, PostHogPersistedProperty, RetriableOptions } from '@posthog/core';
import type { Metrics } from '@posthog/core';
import { AllFlagsOptions, EventMessage, FeatureFlagResult, FlagEvaluationOptions, GroupIdentifyMessage, IdentifyMessage, IPostHog, OverrideFeatureFlagsOptions, PostHogOptions, SetPersonPropertiesMessage, UnsetPersonPropertiesMessage } from './types';
import { FeatureFlagEvaluations, FlagCalledEventParams } from './feature-flag-evaluations';
import ErrorTracking from './extensions/error-tracking';
import { ContextData, ContextOptions, IPostHogContext } from './extensions/context/types';
/**
 * @internal — clears the process-wide deprecation dedup set. Test-only.
 */
export declare function _resetDeprecationWarningsForTests(): void;
export declare abstract class PostHogBackendClient extends PostHogCoreStateless implements IPostHog {
    private _memoryStorage;
    private featureFlagsPoller?;
    protected errorTracking: ErrorTracking;
    private maxCacheSize;
    readonly options: PostHogOptions;
    protected readonly context?: IPostHogContext;
    private _metrics?;
    private readonly captureMode;
    private _v1Sender?;
    private _flagOverrides?;
    private _payloadOverrides?;
    distinctIdHasSentFlagCalls: Record<string, Set<string>>;
    private _waitUntilCycle?;
    /**
     * Initialize a new PostHog client instance.
     *
     * @example
     * ```ts
     * // Basic initialization
     * const client = new PostHogBackendClient(
     *   'your-api-key',
     *   { host: 'https://app.posthog.com' }
     * )
     * ```
     *
     * @example
     * ```ts
     * // With a secret key (Personal API Key or Project Secret API Key) for local evaluation
     * const client = new PostHogBackendClient(
     *   'your-api-key',
     *   {
     *     host: 'https://app.posthog.com',
     *     secretKey: 'your-secret-key'
     *   }
     * )
     * ```
     *
     * {@label Initialization}
     *
     * @param apiKey - Your PostHog project API key
     * @param options - Configuration options for the client
     */
    constructor(apiKey: string, options?: PostHogOptions);
    protected enqueue(type: string, message: any, options?: PostHogCaptureOptions): void;
    flush(): Promise<void>;
    private scheduleDebouncedFlush;
    private _consumeWaitUntilCycle;
    private resolveWaitUntilFlush;
    /**
     * Get a persisted property value from memory storage.
     *
     * @example
     * ```ts
     * // Get user ID
     * const userId = client.getPersistedProperty('userId')
     * ```
     *
     * @example
     * ```ts
     * // Get session ID
     * const sessionId = client.getPersistedProperty('sessionId')
     * ```
     *
     * {@label Initialization}
     *
     * @param key - The property key to retrieve
     * @returns The stored property value or undefined if not found
     */
    getPersistedProperty(key: PostHogPersistedProperty): any | undefined;
    /**
     * Set a persisted property value in memory storage.
     *
     * @example
     * ```ts
     * // Set user ID
     * client.setPersistedProperty('userId', 'user_123')
     * ```
     *
     * @example
     * ```ts
     * // Set session ID
     * client.setPersistedProperty('sessionId', 'session_456')
     * ```
     *
     * {@label Initialization}
     *
     * @param key - The property key to set
     * @param value - The value to store (null to remove)
     */
    setPersistedProperty(key: PostHogPersistedProperty, value: any | null): void;
    /**
     * Make an HTTP request using the configured fetch function or default fetch.
     *
     * @example
     * ```ts
     * // POST request
     * const response = await client.fetch('/api/endpoint', {
     *   method: 'POST',
     *   headers: { 'Content-Type': 'application/json' },
     *   body: JSON.stringify(data)
     * })
     * ```
     *
     * @internal
     *
     * {@label Initialization}
     *
     * @param url - The URL to fetch
     * @param options - Fetch options
     * @returns Promise resolving to the fetch response
     */
    fetch(url: string, options: PostHogFetchOptions): Promise<PostHogFetchResponse>;
    /**
     * Route an event to its queue. In v1 mode `$ai_*` events go to the isolated {@link AI_ROUTE}
     * (legacy transport) and everything else to {@link ANALYTICS_ROUTE} (Capture V1); in v0 mode
     * every event stays on {@link ANALYTICS_ROUTE}, which maps to the historical queue. Routing runs
     * on the post-`before_send`, normalized event name (core calls this after `processBeforeEnqueue`).
     */
    protected getQueueRouteKey(message: PostHogEventProperties): string;
    protected persistedQueueKeyForRoute(route: string): PostHogPersistedProperty;
    protected getActiveQueueRoutes(): string[];
    /**
     * Capture submission seam shared by the batched (`_flush`) and immediate (`sendImmediate`)
     * paths. Events are routed to homogeneous per-route queues at enqueue time, so a batch here is
     * never mixed: the {@link AI_ROUTE} (and all of v0 mode) uses the legacy `/batch/` transport,
     * which throws so `_flush` can shrink/persist/retry its own queue; the {@link ANALYTICS_ROUTE}
     * in v1 mode uses the Capture V1 endpoint. Because the routes flush independently, a v0/AI leg
     * failure can never re-send analytics events already accepted on the V1 leg.
     */
    protected sendBatch(batchMessages: (PostHogEventProperties | undefined)[], retryOptions?: Partial<RetriableOptions>, route?: string): Promise<void>;
    private getV1Sender;
    /**
     * Get the library version from package.json.
     *
     * @example
     * ```ts
     * // Get version
     * const version = client.getLibraryVersion()
     * console.log(`Using PostHog SDK version: ${version}`)
     * ```
     *
     * {@label Initialization}
     *
     * @returns The current library version string
     */
    getLibraryVersion(): string;
    /**
     * The `posthog.metrics` API: a statsd-style pre-aggregating metrics client — alpha.
     * Samples are folded into per-series aggregates in memory and flushed
     * periodically as one OTLP data point per series per window, so recording
     * from hot paths is cheap. Configure via the `metrics` client option.
     *
     * @example
     * ```ts
     * client.metrics.count('jobs.processed', 1, { attributes: { queue: 'default' } })
     * client.metrics.gauge('queue.depth', 42)
     * client.metrics.histogram('job.duration', 187, { unit: 'ms' })
     * ```
     *
     * {@label Metrics}
     */
    get metrics(): Metrics;
    /**
     * Get the custom user agent string for this client.
     *
     * @example
     * ```ts
     * // Get user agent
     * const userAgent = client.getCustomUserAgent()
     * // Returns: "posthog-node/5.7.0"
     * ```
     *
     * {@label Identification}
     *
     * @returns The formatted user agent string
     */
    getCustomUserAgent(): string;
    /**
     * Returns the common properties attached to every captured event.
     *
     * @remarks
     * Extends the shared core properties (`$lib`, `$lib_version`) with
     * `$is_server: true` so that events emitted from the server-side SDKs
     * (posthog-node and posthog-edge, which both extend this class) are
     * distinguishable from browser and react-native events. Browser and
     * react-native clients do not extend `PostHogBackendClient`, so they
     * never receive this property.
     *
     * This is controlled by the `isServer` option, which defaults to `true`.
     * When `isServer` is `false` (e.g. when using the SDK as a client/CLI), the
     * `$is_server` property is omitted entirely so the device OS is attributed
     * normally.
     *
     * @returns The common event properties, including `$is_server: true` when
     * the `isServer` option is enabled.
     */
    protected getCommonEventProperties(): PostHogEventProperties;
    /**
     * Enable the PostHog client (opt-in).
     *
     * @example
     * ```ts
     * // Enable client
     * await client.enable()
     * // Client is now enabled and will capture events
     * ```
     *
     * {@label Privacy}
     *
     * @returns Promise that resolves when the client is enabled
     */
    enable(): Promise<void>;
    /**
     * Disable the PostHog client (opt-out).
     *
     * @example
     * ```ts
     * // Disable client
     * await client.disable()
     * // Client is now disabled and will not capture events
     * ```
     *
     * {@label Privacy}
     *
     * @returns Promise that resolves when the client is disabled
     */
    disable(): Promise<void>;
    /**
     * Enable or disable debug logging.
     *
     * @example
     * ```ts
     * // Enable debug logging
     * client.debug(true)
     * ```
     *
     * @example
     * ```ts
     * // Disable debug logging
     * client.debug(false)
     * ```
     *
     * {@label Initialization}
     *
     * @param enabled - Whether to enable debug logging
     */
    debug(enabled?: boolean): void;
    private _warnIfInvalidCapture;
    private _sendPreparedEvent;
    _capturePreparedEvent(props: EventMessage, immediate: boolean): Promise<void>;
    /**
     * Capture an event manually.
     *
     * @example
     * ```ts
     * // Basic capture
     * client.capture({
     *   distinctId: 'user_123',
     *   event: 'button_clicked',
     *   properties: { button_color: 'red' }
     * })
     * ```
     *
     * {@label Capture}
     *
     * @param props - The event properties
     * @returns void
     */
    capture(props: EventMessage): void;
    /**
     * Capture an event immediately (synchronously).
     *
     * @example
     * ```ts
     * // Basic immediate capture
     * await client.captureImmediate({
     *   distinctId: 'user_123',
     *   event: 'button_clicked',
     *   properties: { button_color: 'red' }
     * })
     * ```
     *
     * @example
     * ```ts
     * // With feature flags
     * await client.captureImmediate({
     *   distinctId: 'user_123',
     *   event: 'user_action',
     *   sendFeatureFlags: true
     * })
     * ```
     *
     * @example
     * ```ts
     * // With custom feature flags options
     * await client.captureImmediate({
     *   distinctId: 'user_123',
     *   event: 'user_action',
     *   sendFeatureFlags: {
     *     onlyEvaluateLocally: true,
     *     personProperties: { plan: 'premium' },
     *     groupProperties: { org: { tier: 'enterprise' } }
     *     flagKeys: ['flag1', 'flag2']
     *   }
     * })
     * ```
     *
     * {@label Capture}
     *
     * @param props - The event properties
     * @returns Promise that resolves when the event is captured
     */
    captureImmediate(props: EventMessage): Promise<void>;
    /**
     * Identify a user and set their properties.
     *
     * @example
     * ```ts
     * // Basic identify with properties
     * client.identify({
     *   distinctId: 'user_123',
     *   properties: {
     *     name: 'John Doe',
     *     email: 'john@example.com',
     *     plan: 'premium'
     *   }
     * })
     * ```
     *
     * @example
     * ```ts
     * // Using $set and $set_once
     * client.identify({
     *   distinctId: 'user_123',
     *   properties: {
     *     $set: { name: 'John Doe', email: 'john@example.com' },
     *     $set_once: { first_login: new Date().toISOString() }
     *     $anon_distinct_id: 'anonymous_user_456'
     *   }
     * })
     * ```
     *
     * {@label Identification}
     *
     * @param data - The identify data containing distinctId and properties
     */
    identify({ distinctId, properties, disableGeoip }: IdentifyMessage): void;
    /**
     * Identify a user and set their properties immediately (synchronously).
     *
     * @example
     * ```ts
     * // Basic immediate identify
     * await client.identifyImmediate({
     *   distinctId: 'user_123',
     *   properties: {
     *     name: 'John Doe',
     *     email: 'john@example.com'
     *   }
     * })
     * ```
     *
     * {@label Identification}
     *
     * @param data - The identify data containing distinctId and properties
     * @returns Promise that resolves when the identify is processed
     */
    identifyImmediate({ distinctId, properties, disableGeoip }: IdentifyMessage): Promise<void>;
    /**
     * Set properties on a person profile.
     *
     * @example
     * ```ts
     * client.setPersonProperties({
     *   distinctId: 'user_123',
     *   properties: { plan: 'premium' },
     *   propertiesOnce: { first_seen: '2026-06-15' }
     * })
     * ```
     *
     * {@label Identification}
     *
     * @param data - The data containing distinctId and properties to set
     */
    setPersonProperties({ distinctId, properties, propertiesOnce }: SetPersonPropertiesMessage): void;
    /**
     * Remove properties from a person profile.
     *
     * @example
     * ```ts
     * client.unsetPersonProperties({
     *   distinctId: 'user_123',
     *   properties: ['plan', 'email']
     * })
     * ```
     *
     * {@label Identification}
     *
     * @param data - The data containing distinctId and property names to unset
     */
    unsetPersonProperties({ distinctId, properties }: UnsetPersonPropertiesMessage): void;
    /**
     * Create an alias to link two distinct IDs together.
     *
     * @example
     * ```ts
     * // Link an anonymous user to an identified user
     * client.alias({
     *   distinctId: 'anonymous_123',
     *   alias: 'user_456'
     * })
     * ```
     *
     * {@label Identification}
     *
     * @param data - The alias data containing distinctId and alias
     */
    alias(data: {
        distinctId: string;
        alias: string;
        disableGeoip?: boolean;
    }): void;
    /**
     * Create an alias to link two distinct IDs together immediately (synchronously).
     *
     * @example
     * ```ts
     * // Link an anonymous user to an identified user immediately
     * await client.aliasImmediate({
     *   distinctId: 'anonymous_123',
     *   alias: 'user_456'
     * })
     * ```
     *
     * {@label Identification}
     *
     * @param data - The alias data containing distinctId and alias
     * @returns Promise that resolves when the alias is processed
     */
    aliasImmediate(data: {
        distinctId: string;
        alias: string;
        disableGeoip?: boolean;
    }): Promise<void>;
    /**
     * Check if local evaluation of feature flags is ready.
     *
     * @example
     * ```ts
     * // Check if ready
     * if (client.isLocalEvaluationReady()) {
     *   // Local evaluation is ready, can evaluate flags locally
     *   const flag = await client.getFeatureFlag('flag-key', 'user_123')
     * } else {
     *   // Local evaluation not ready, will use remote evaluation
     *   const flag = await client.getFeatureFlag('flag-key', 'user_123')
     * }
     * ```
     *
     * {@label Feature flags}
     *
     * @returns true if local evaluation is ready, false otherwise
     */
    isLocalEvaluationReady(): boolean;
    /**
     * Wait for local evaluation of feature flags to be ready.
     *
     * @example
     * ```ts
     * // Wait for local evaluation
     * const isReady = await client.waitForLocalEvaluationReady()
     * if (isReady) {
     *   console.log('Local evaluation is ready')
     * } else {
     *   console.log('Local evaluation timed out')
     * }
     * ```
     *
     * @example
     * ```ts
     * // Wait with custom timeout
     * const isReady = await client.waitForLocalEvaluationReady(10000) // 10 seconds
     * ```
     *
     * {@label Feature flags}
     *
     * @param timeoutMs - Timeout in milliseconds (default: 30000)
     * @returns Promise that resolves to true if ready, false if timed out
     */
    waitForLocalEvaluationReady(timeoutMs?: number): Promise<boolean>;
    private _resolveDistinctId;
    /**
     * Internal method that handles feature flag evaluation with full details.
     * Used by getFeatureFlag, getFeatureFlagPayload, and getFeatureFlagResult.
     *
     * @param key - The feature flag key
     * @param distinctId - The user's distinct ID
     * @param options - Evaluation options (includes sendFeatureFlagEvents, defaults to true)
     * @param matchValue - Optional match value for payload lookup (used by getFeatureFlagPayload)
     * @returns Promise that resolves to the flag result or undefined
     */
    private _getFeatureFlagResult;
    /**
     * Get the value of a feature flag for a specific user.
     *
     * @example
     * ```ts
     * // Basic feature flag check
     * const flagValue = await client.getFeatureFlag('new-feature', 'user_123')
     * if (flagValue === 'variant-a') {
     *   // Show variant A
     * } else if (flagValue === 'variant-b') {
     *   // Show variant B
     * } else {
     *   // Flag is disabled or not found
     * }
     * ```
     *
     * @example
     * ```ts
     * // With groups and properties
     * const flagValue = await client.getFeatureFlag('org-feature', 'user_123', {
     *   groups: { organization: 'acme-corp' },
     *   personProperties: { plan: 'enterprise' },
     *   groupProperties: { organization: { tier: 'premium' } }
     * })
     * ```
     *
     * @example
     * ```ts
     * // Only evaluate locally
     * const flagValue = await client.getFeatureFlag('local-flag', 'user_123', {
     *   onlyEvaluateLocally: true
     * })
     * ```
     *
     * {@label Feature flags}
     *
     * @deprecated Use {@link evaluateFlags} and call `flags.getFlag(key)` on the returned snapshot.
     *   This consolidates flag evaluation into a single `/flags` request per incoming request and
     *   avoids drift between the values your code branched on and the values attached to events.
     *   Will be removed in the next major version.
     *
     * @param key - The feature flag key
     * @param distinctId - The user's distinct ID
     * @param options - Optional configuration for flag evaluation
     * @returns Promise that resolves to the flag value or undefined
     */
    getFeatureFlag(key: string, distinctId: string, options?: {
        groups?: Record<string, string>;
        personProperties?: Record<string, string>;
        groupProperties?: Record<string, Record<string, string>>;
        onlyEvaluateLocally?: boolean;
        sendFeatureFlagEvents?: boolean;
        disableGeoip?: boolean;
    }): Promise<FeatureFlagValue | undefined>;
    /**
     * Get the payload for a feature flag.
     *
     * @example
     * ```ts
     * // Get payload for a feature flag
     * const payload = await client.getFeatureFlagPayload('flag-key', 'user_123')
     * if (payload) {
     *   console.log('Flag payload:', payload)
     * }
     * ```
     *
     * @example
     * ```ts
     * // Get payload with specific match value
     * const payload = await client.getFeatureFlagPayload('flag-key', 'user_123', 'variant-a')
     * ```
     *
     * @example
     * ```ts
     * // With groups and properties
     * const payload = await client.getFeatureFlagPayload('org-flag', 'user_123', undefined, {
     *   groups: { organization: 'acme-corp' },
     *   personProperties: { plan: 'enterprise' }
     * })
     * ```
     *
     * {@label Feature flags}
     *
     * @deprecated Use {@link evaluateFlags} and call `flags.getFlagPayload(key)` on the returned
     *   snapshot. This consolidates flag evaluation into a single `/flags` request per incoming
     *   request. Will be removed in the next major version.
     *
     * @param key - The feature flag key
     * @param distinctId - The user's distinct ID
     * @param matchValue - Optional match value to get payload for
     * @param options - Optional configuration for flag evaluation
     * @returns Promise that resolves to the flag payload or undefined
     */
    getFeatureFlagPayload(key: string, distinctId: string, matchValue?: FeatureFlagValue, options?: {
        groups?: Record<string, string>;
        personProperties?: Record<string, string>;
        groupProperties?: Record<string, Record<string, string>>;
        onlyEvaluateLocally?: boolean;
        /** @deprecated THIS OPTION HAS NO EFFECT, kept here for backwards compatibility reasons. */
        sendFeatureFlagEvents?: boolean;
        disableGeoip?: boolean;
    }): Promise<JsonType | undefined>;
    /**
     * Get the result of evaluating a feature flag, including its value and payload.
     * This is more efficient than calling getFeatureFlag and getFeatureFlagPayload separately when you need both.
     *
     * @example
     * ```ts
     * // Get flag result
     * const result = await client.getFeatureFlagResult('my-flag', 'user_123')
     * if (result) {
     *   console.log('Flag enabled:', result.enabled)
     *   console.log('Variant:', result.variant)
     *   console.log('Payload:', result.payload)
     * }
     * ```
     *
     * @example
     * ```ts
     * // With groups and properties
     * const result = await client.getFeatureFlagResult('org-feature', 'user_123', {
     *   groups: { organization: 'acme-corp' },
     *   personProperties: { plan: 'enterprise' }
     * })
     * ```
     *
     * {@label Feature flags}
     *
     * @param key - The feature flag key
     * @param distinctId - The user's distinct ID
     * @param options - Optional configuration for flag evaluation
     * @returns Promise that resolves to the flag result or undefined
     */
    getFeatureFlagResult(key: string, options?: FlagEvaluationOptions): Promise<FeatureFlagResult | undefined>;
    getFeatureFlagResult(key: string, distinctId: string, options?: FlagEvaluationOptions): Promise<FeatureFlagResult | undefined>;
    /**
     * Get the remote config payload for a feature flag.
     *
     * @example
     * ```ts
     * // Get remote config payload
     * const payload = await client.getRemoteConfigPayload('flag-key')
     * if (payload) {
     *   console.log('Remote config payload:', payload)
     * }
     * ```
     *
     * {@label Feature flags}
     *
     * @param flagKey - The feature flag key
     * @returns Promise that resolves to the remote config payload or undefined
     * @throws Error if personal API key is not provided
     */
    getRemoteConfigPayload(flagKey: string): Promise<JsonType | undefined>;
    /**
     * Check if a feature flag is enabled for a specific user.
     *
     * @example
     * ```ts
     * // Basic feature flag check
     * const isEnabled = await client.isFeatureEnabled('new-feature', 'user_123')
     * if (isEnabled) {
     *   // Feature is enabled
     *   console.log('New feature is active')
     * } else {
     *   // Feature is disabled
     *   console.log('New feature is not active')
     * }
     * ```
     *
     * @example
     * ```ts
     * // With groups and properties
     * const isEnabled = await client.isFeatureEnabled('org-feature', 'user_123', {
     *   groups: { organization: 'acme-corp' },
     *   personProperties: { plan: 'enterprise' }
     * })
     * ```
     *
     * {@label Feature flags}
     *
     * @deprecated Use {@link evaluateFlags} and call `flags.isEnabled(key)` on the returned snapshot.
     *   This consolidates flag evaluation into a single `/flags` request per incoming request.
     *   Will be removed in the next major version.
     *
     * @param key - The feature flag key
     * @param distinctId - The user's distinct ID
     * @param options - Optional configuration for flag evaluation
     * @returns Promise that resolves to true if enabled, false if disabled, undefined if not found
     */
    isFeatureEnabled(key: string, distinctId: string, options?: {
        groups?: Record<string, string>;
        personProperties?: Record<string, string>;
        groupProperties?: Record<string, Record<string, string>>;
        onlyEvaluateLocally?: boolean;
        sendFeatureFlagEvents?: boolean;
        disableGeoip?: boolean;
    }): Promise<boolean | undefined>;
    /**
     * Get all feature flag values for a specific user.
     *
     * @example
     * ```ts
     * // Get all flags for a user
     * const allFlags = await client.getAllFlags('user_123')
     * console.log('User flags:', allFlags)
     * // Output: { 'flag-1': 'variant-a', 'flag-2': false, 'flag-3': 'variant-b' }
     * ```
     *
     * @example
     * ```ts
     * // With specific flag keys
     * const specificFlags = await client.getAllFlags('user_123', {
     *   flagKeys: ['flag-1', 'flag-2']
     * })
     * ```
     *
     * @example
     * ```ts
     * // With groups and properties
     * const orgFlags = await client.getAllFlags('user_123', {
     *   groups: { organization: 'acme-corp' },
     *   personProperties: { plan: 'enterprise' }
     * })
     * ```
     *
     * {@label Feature flags}
     *
     * @param distinctId - The user's distinct ID
     * @param options - Optional configuration for flag evaluation
     * @returns Promise that resolves to a record of flag keys and their values
     */
    getAllFlags(options?: AllFlagsOptions): Promise<Record<string, FeatureFlagValue>>;
    getAllFlags(distinctId: string, options?: AllFlagsOptions): Promise<Record<string, FeatureFlagValue>>;
    /**
     * Get all feature flag values and payloads for a specific user.
     *
     * @example
     * ```ts
     * // Get all flags and payloads for a user
     * const result = await client.getAllFlagsAndPayloads('user_123')
     * console.log('Flags:', result.featureFlags)
     * console.log('Payloads:', result.featureFlagPayloads)
     * ```
     *
     * @example
     * ```ts
     * // With specific flag keys
     * const result = await client.getAllFlagsAndPayloads('user_123', {
     *   flagKeys: ['flag-1', 'flag-2']
     * })
     * ```
     *
     * @example
     * ```ts
     * // Only evaluate locally
     * const result = await client.getAllFlagsAndPayloads('user_123', {
     *   onlyEvaluateLocally: true
     * })
     * ```
     *
     * {@label Feature flags}
     *
     * @param distinctId - The user's distinct ID
     * @param options - Optional configuration for flag evaluation
     * @returns Promise that resolves to flags and payloads
     */
    getAllFlagsAndPayloads(options?: AllFlagsOptions): Promise<PostHogFlagsAndPayloadsResponse>;
    getAllFlagsAndPayloads(distinctId: string, options?: AllFlagsOptions): Promise<PostHogFlagsAndPayloadsResponse>;
    /**
     * Evaluate all feature flags for a user in a single call and return a
     * {@link FeatureFlagEvaluations} snapshot. Branch on `.isEnabled()` / `.getFlag()`,
     * then pass the same snapshot to `capture()` via the `flags` option so the
     * captured event carries the exact flag values the code branched on.
     *
     * Prefer this over repeated `isFeatureEnabled()` / `getFeatureFlag()` calls and
     * over `capture({ sendFeatureFlags: true })` — it consolidates flag evaluation
     * into a single `/flags` request per incoming request.
     *
     * **Local evaluation is transparent.** When the poller can resolve a flag from
     * cached definitions, no network call is made and the snapshot's `$feature_flag_called`
     * events are tagged `locally_evaluated: true`.
     *
     * **Trim the request.** Pass `flagKeys` to scope the underlying `/flags` request
     * to a subset of flags — useful when you only need a few flags and want to reduce
     * the response payload.
     *
     * **Trim the event payload.** Use `flags.only([...])` or `flags.onlyAccessed()`
     * to filter which flags get attached to a captured event without re-fetching.
     *
     * @example
     * Basic usage:
     * ```ts
     * const flags = await client.evaluateFlags('user_123', {
     *   personProperties: { plan: 'enterprise' },
     * })
     * if (flags.isEnabled('new-dashboard')) {
     *   renderNewDashboard()
     * }
     * client.capture({ distinctId: 'user_123', event: 'page_viewed', flags })
     * ```
     *
     * @example
     * Scope the `/flags` request to specific keys:
     * ```ts
     * const flags = await client.evaluateFlags('user_123', {
     *   flagKeys: ['new-dashboard', 'checkout-flow'],
     *   personProperties: { plan: 'enterprise' },
     * })
     * ```
     *
     * @example
     * Attach only the flags the developer actually checked:
     * ```ts
     * const flags = await client.evaluateFlags('user_123')
     * if (flags.isEnabled('new-dashboard')) { ... }
     * client.capture({ distinctId: 'user_123', event: 'page_viewed', flags: flags.onlyAccessed() })
     * ```
     *
     * @example
     * Use `withContext()` to avoid repeating the distinctId:
     * ```ts
     * await client.withContext({ distinctId: 'user_123' }, async () => {
     *   const flags = await client.evaluateFlags()
     *   if (flags.isEnabled('new-dashboard')) { ... }
     *   client.capture({ event: 'page_viewed', flags })
     * })
     * ```
     *
     * {@label Feature flags}
     *
     * @param distinctIdOrOptions - The user's distinct ID, or options when the distinctId comes from `withContext()`
     * @param options - Optional configuration for flag evaluation. Supports the same fields as `getAllFlags()`, including `flagKeys` to scope the `/flags` request.
     * @returns Promise that resolves to a `FeatureFlagEvaluations` snapshot
     */
    evaluateFlags(options?: AllFlagsOptions): Promise<FeatureFlagEvaluations>;
    evaluateFlags(distinctId: string, options?: AllFlagsOptions): Promise<FeatureFlagEvaluations>;
    /**
     * Fires a `$feature_flag_called` event for the given flag if the (distinctId, flag, response)
     * triple hasn't already been reported for this client. Shared by the single-flag evaluation
     * path and `FeatureFlagEvaluations.isEnabled() / getFlag()` so both paths dedupe identically.
     *
     * @internal
     */
    protected _captureFlagCalledEventIfNeeded(params: FlagCalledEventParams): void;
    private _featureFlagEvaluationsHost?;
    private _getFeatureFlagEvaluationsHost;
    /**
     * Create or update a group and its properties.
     *
     * @example
     * ```ts
     * // Create a company group
     * client.groupIdentify({
     *   groupType: 'company',
     *   groupKey: 'acme-corp',
     *   properties: {
     *     name: 'Acme Corporation',
     *     industry: 'Technology',
     *     employee_count: 500
     *   },
     *   distinctId: 'user_123'
     * })
     * ```
     *
     * @example
     * ```ts
     * // Update organization properties
     * client.groupIdentify({
     *   groupType: 'organization',
     *   groupKey: 'org-456',
     *   properties: {
     *     plan: 'enterprise',
     *     region: 'US-West'
     *   }
     * })
     * ```
     *
     * {@label Identification}
     *
     * @param data - The group identify data
     */
    groupIdentify({ groupType, groupKey, properties, distinctId, disableGeoip }: GroupIdentifyMessage): void;
    /**
     * Create or update a group and its properties immediately (synchronously).
     *
     * @example
     * ```ts
     * // Immediately create or update a company group
     * await client.groupIdentifyImmediate({
     *   groupType: 'company',
     *   groupKey: 'acme-corp',
     *   properties: {
     *     name: 'Acme Corporation',
     *     industry: 'Technology',
     *     employee_count: 500
     *   }
     * })
     * ```
     *
     * {@label Identification}
     *
     * @param data - The group identify data
     * @returns Promise that resolves when the group identify is processed
     */
    groupIdentifyImmediate({ groupType, groupKey, properties, distinctId, disableGeoip, }: GroupIdentifyMessage): Promise<void>;
    /**
     * Reload feature flag definitions from the server for local evaluation.
     *
     * @example
     * ```ts
     * // Force reload of feature flags
     * await client.reloadFeatureFlags()
     * console.log('Feature flags reloaded')
     * ```
     *
     * @example
     * ```ts
     * // Reload before checking a specific flag
     * await client.reloadFeatureFlags()
     * const flag = await client.getFeatureFlag('flag-key', 'user_123')
     * ```
     *
     * {@label Feature flags}
     *
     * @returns Promise that resolves when flags are reloaded
     */
    reloadFeatureFlags(): Promise<void>;
    /**
     * Override feature flags locally. Useful for testing and local development.
     * Overridden flags take precedence over both local evaluation and remote evaluation.
     *
     * @example
     * ```ts
     * // Clear all overrides
     * client.overrideFeatureFlags(false)
     *
     * // Enable a list of flags (sets them to true)
     * client.overrideFeatureFlags(['flag-a', 'flag-b'])
     *
     * // Set specific flag values/variants
     * client.overrideFeatureFlags({ 'my-flag': 'variant-a', 'other-flag': true })
     *
     * // Set both flags and payloads
     * client.overrideFeatureFlags({
     *   flags: { 'my-flag': 'variant-a' },
     *   payloads: { 'my-flag': { discount: 20 } }
     * })
     * ```
     *
     * {@label Feature flags}
     *
     * @param overrides - Flag overrides configuration
     */
    overrideFeatureFlags(overrides: OverrideFeatureFlagsOptions): void;
    /**
     * Type guard to check if overrides is a FeatureFlagOverrideOptions object.
     *
     * This distinguishes between:
     * - { flags: { 'flag-a': true } } -> FeatureFlagOverrideOptions (flags is an object/array/false)
     * - { flags: true } -> Record<string, FeatureFlagValue> (a flag named "flags" with value true)
     */
    private _isFeatureFlagOverrideOptions;
    protected abstract initializeContext(): IPostHogContext | undefined;
    /**
     * Run a function with specific context that will be applied to all events captured within that context.
     * It propagates the context to all subsequent calls down the call stack.
     * Context properties like tags and sessionId will be automatically attached to all events.
     * By default, nested contexts inherit from parent contexts. Use `{ fresh: true }` to start with a clean context.
     *
     * @example
     * ```ts
     * posthog.withContext({ distinctId: 'user_123' }, () => {
     *   posthog.capture({ event: 'button clicked' })
     * })
     * ```
     *
     * {@label Context}
     *
     * @param data - Context data to apply (sessionId, distinctId, properties, enableExceptionAutocapture)
     * @param fn - Function to run with the context
     * @param options - Context options (fresh: true to start with clean context instead of inheriting)
     * @returns The return value of the function
     */
    withContext<T>(data: Partial<ContextData>, fn: () => T, options?: ContextOptions): T;
    /**
     * Get the current context data.
     *
     * @example
     * ```ts
     * // Get current context within a withContext block
     * posthog.withContext({ distinctId: 'user_123' }, () => {
     *   const context = posthog.getContext()
     *   console.log(context?.distinctId) // 'user_123'
     * })
     * ```
     *
     * {@label Context}
     *
     * @returns The current context data, or undefined if no context is set
     */
    getContext(): ContextData | undefined;
    /**
     * Set context without a callback wrapper.
     *
     * Uses `AsyncLocalStorage.enterWith()` to attach context to the current
     * async execution context. The context lives until that async context ends.
     *
     * Must be called in the same async scope that makes PostHog calls.
     * Calling this outside a request-scoped async context will leak context
     * across unrelated work. Prefer `withContext()` when you can wrap code
     * in a callback — it creates an isolated scope that cleans up automatically.
     *
     * @param data - Context data to apply (distinctId, sessionId, properties)
     * @param options - Context options (fresh: true to start with clean context instead of inheriting)
     */
    enterContext(data: Partial<ContextData>, options?: ContextOptions): void;
    /**
     * Shutdown the PostHog client gracefully.
     *
     * @example
     * ```ts
     * // Shutdown with default timeout
     * await client._shutdown()
     * ```
     *
     * @example
     * ```ts
     * // Shutdown with custom timeout
     * await client._shutdown(5000) // 5 seconds
     * ```
     *
     * {@label Shutdown}
     *
     * @param shutdownTimeoutMs - Timeout in milliseconds for shutdown
     * @returns Promise that resolves when shutdown is complete
     */
    _shutdown(shutdownTimeoutMs?: number): Promise<void>;
    private _requestRemoteConfigPayload;
    private extractPropertiesFromEvent;
    private getFeatureFlagsForEvent;
    private addLocalPersonAndGroupProperties;
    private personPropertiesForLocalEvaluation;
    private createFeatureFlagEvaluationContext;
    /**
     * Capture an error exception as an event.
     *
     * @example
     * ```ts
     * // Capture an error with user ID
     * try {
     *   // Some risky operation
     *   riskyOperation()
     * } catch (error) {
     *   client.captureException(error, 'user_123')
     * }
     * ```
     *
     * @example
     * ```ts
     * // Capture with additional properties
     * try {
     *   apiCall()
     * } catch (error) {
     *   client.captureException(error, 'user_123', {
     *     endpoint: '/api/users',
     *     method: 'POST',
     *     status_code: 500
     *   })
     * }
     * ```
     *
     * {@label Error tracking}
     *
     * @param error - The error to capture
     * @param distinctId - Optional user distinct ID
     * @param additionalProperties - Optional additional properties to include
     * @param uuid - Optional event UUID
     * @param flags - Optional `FeatureFlagEvaluations` snapshot to attach the same flag context as your other events
     */
    captureException(error: unknown, distinctId?: string, additionalProperties?: Record<string | number, any>, uuid?: EventMessage['uuid'], flags?: FeatureFlagEvaluations): void;
    /**
     * Capture an error exception as an event immediately (synchronously).
     *
     * @example
     * ```ts
     * // Capture an error immediately with user ID
     * try {
     *   // Some risky operation
     *   riskyOperation()
     * } catch (error) {
     *   await client.captureExceptionImmediate(error, 'user_123')
     * }
     * ```
     *
     * @example
     * ```ts
     * // Capture with additional properties
     * try {
     *   apiCall()
     * } catch (error) {
     *   await client.captureExceptionImmediate(error, 'user_123', {
     *     endpoint: '/api/users',
     *     method: 'POST',
     *     status_code: 500
     *   })
     * }
     * ```
     *
     * {@label Error tracking}
     *
     * @param error - The error to capture
     * @param distinctId - Optional user distinct ID
     * @param additionalProperties - Optional additional properties to include
     * @param flags - Optional `FeatureFlagEvaluations` snapshot to attach the same flag context as your other events
     * @returns Promise that resolves when the error is captured
     */
    captureExceptionImmediate(error: unknown, distinctId?: string, additionalProperties?: Record<string | number, any>, flags?: FeatureFlagEvaluations): Promise<void>;
    prepareEventMessage(props: EventMessage): Promise<{
        distinctId: string;
        event: string;
        properties: PostHogEventProperties;
        options: PostHogCaptureOptions;
    }>;
    private _prepareEventMessage;
    private _runBeforeSend;
}
//# sourceMappingURL=client.d.ts.map