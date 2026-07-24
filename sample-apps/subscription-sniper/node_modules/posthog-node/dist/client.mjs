import { version } from "./version.mjs";
import { PostHogCoreStateless, PostHogMetrics, PostHogPersistedProperty, isBlockedUA, isPlainObject, resolveMetricsConfig, safeSetTimeout, uuidv7 } from "@posthog/core";
import { FeatureFlagError } from "./types.mjs";
import { FeatureFlagEvaluations } from "./feature-flag-evaluations.mjs";
import { FeatureFlagsPoller, InconclusiveMatchError, RequiresServerEvaluation } from "./extensions/feature-flags/feature-flags.mjs";
import error_tracking from "./extensions/error-tracking/index.mjs";
import { PostHogMemoryStorage } from "./storage-memory.mjs";
import { resolveCaptureMode } from "./capture-v1/config.mjs";
import { AI_ROUTE, ANALYTICS_ROUTE, isLegacyOnlyEvent } from "./capture-v1/routing.mjs";
import { V1CaptureSender } from "./capture-v1/sender.mjs";
const MINIMUM_POLLING_INTERVAL = 100;
const THIRTY_SECONDS = 30000;
const MAX_CACHE_SIZE = 50000;
const WAITUNTIL_DEBOUNCE_MS = 50;
const WAITUNTIL_MAX_WAIT_MS = 500;
const DEFAULT_NODE_HOST = 'https://us.i.posthog.com';
const _emittedDeprecations = new Set();
function emitDeprecationWarningOnce(id, message) {
    if (_emittedDeprecations.has(id)) return;
    _emittedDeprecations.add(id);
    console.warn(`[PostHog] ${message}`);
}
function _resetDeprecationWarningsForTests() {
    _emittedDeprecations.clear();
}
function normalizeApiKey(value) {
    return 'string' == typeof value ? value.trim() : '';
}
function normalizePersonalApiKey(value) {
    const normalizedValue = 'string' == typeof value ? value.trim() : '';
    return normalizedValue || void 0;
}
function normalizeHost(value) {
    const normalizedValue = 'string' == typeof value ? value.trim() : '';
    return normalizedValue || DEFAULT_NODE_HOST;
}
function normalizeUnsetPersonProperties(value) {
    const propertyNames = Array.isArray(value) ? value : [
        value
    ];
    return propertyNames.filter((propertyName)=>'string' == typeof propertyName && propertyName.trim().length > 0);
}
function buildFlagEventProperties(flagValues) {
    if (!flagValues) return {};
    const additionalProperties = {};
    for (const [feature, variant] of Object.entries(flagValues))additionalProperties[`$feature/${feature}`] = variant;
    const activeFlags = Object.keys(flagValues).filter((flag)=>false !== flagValues[flag]).sort();
    if (activeFlags.length > 0) additionalProperties['$active_feature_flags'] = activeFlags;
    return additionalProperties;
}
class PostHogBackendClient extends PostHogCoreStateless {
    constructor(apiKey, options = {}){
        const normalizedApiKey = normalizeApiKey(apiKey);
        const normalizedOptions = {
            ...options,
            maxQueueSize: options.maxQueueSize ?? 10000,
            flushInterval: options.flushInterval ?? 5000,
            host: normalizeHost(options.host),
            personalApiKey: normalizePersonalApiKey(options.secretKey ?? options.personalApiKey)
        };
        super(normalizedApiKey, normalizedOptions), this._memoryStorage = new PostHogMemoryStorage();
        this.options = normalizedOptions;
        this.captureMode = resolveCaptureMode();
        this.context = this.initializeContext();
        this.options.featureFlagsPollingInterval = 'number' == typeof normalizedOptions.featureFlagsPollingInterval ? Math.max(normalizedOptions.featureFlagsPollingInterval, MINIMUM_POLLING_INTERVAL) : THIRTY_SECONDS;
        if ('number' == typeof normalizedOptions.waitUntilDebounceMs) this.options.waitUntilDebounceMs = Math.max(normalizedOptions.waitUntilDebounceMs, 0);
        if ('number' == typeof normalizedOptions.waitUntilMaxWaitMs) this.options.waitUntilMaxWaitMs = Math.max(normalizedOptions.waitUntilMaxWaitMs, 0);
        if (!this.disabled && normalizedOptions.personalApiKey) {
            if (normalizedOptions.personalApiKey.includes('phc_')) throw new Error('Your Personal API key is invalid. These keys are prefixed with "phx_" and can be created in PostHog project settings.');
            const shouldEnableLocalEvaluation = false !== normalizedOptions.enableLocalEvaluation;
            if (shouldEnableLocalEvaluation) this.featureFlagsPoller = new FeatureFlagsPoller({
                pollingInterval: this.options.featureFlagsPollingInterval,
                personalApiKey: normalizedOptions.personalApiKey,
                projectApiKey: normalizedApiKey,
                timeout: normalizedOptions.requestTimeout ?? 10000,
                host: this.host,
                fetch: normalizedOptions.fetch,
                onError: (err)=>{
                    this._events.emit('error', err);
                },
                onLoad: (count)=>{
                    this._events.emit('localEvaluationFlagsLoaded', count);
                },
                customHeaders: this.getCustomHeaders(),
                cacheProvider: normalizedOptions.flagDefinitionCacheProvider,
                strictLocalEvaluation: normalizedOptions.strictLocalEvaluation
            });
        }
        this.errorTracking = new error_tracking(this, normalizedOptions, this._logger);
        this.distinctIdHasSentFlagCalls = {};
        this.maxCacheSize = normalizedOptions.maxCacheSize || MAX_CACHE_SIZE;
    }
    enqueue(type, message, options) {
        super.enqueue(type, message, options);
        this.scheduleDebouncedFlush();
    }
    async flush() {
        const flushPromise = this.flushWithPendingPromises();
        const waitUntil = this.options.waitUntil;
        if (waitUntil && !this._waitUntilCycle) try {
            waitUntil(flushPromise.catch(()=>{}));
        } catch  {}
        return flushPromise;
    }
    scheduleDebouncedFlush() {
        const waitUntil = this.options.waitUntil;
        if (!waitUntil) return;
        if (this.disabled || this.optedOut) return;
        if (!this._waitUntilCycle) {
            let resolve;
            const promise = new Promise((r)=>{
                resolve = r;
            });
            try {
                waitUntil(promise);
            } catch  {
                return;
            }
            this._waitUntilCycle = {
                resolve: resolve,
                startedAt: Date.now(),
                timer: void 0
            };
        }
        const elapsed = Date.now() - this._waitUntilCycle.startedAt;
        const maxWaitMs = this.options.waitUntilMaxWaitMs ?? WAITUNTIL_MAX_WAIT_MS;
        const flushNow = elapsed >= maxWaitMs;
        if (void 0 !== this._waitUntilCycle.timer) clearTimeout(this._waitUntilCycle.timer);
        if (flushNow) return void this.resolveWaitUntilFlush();
        const debounceMs = this.options.waitUntilDebounceMs ?? WAITUNTIL_DEBOUNCE_MS;
        this._waitUntilCycle.timer = safeSetTimeout(()=>{
            this.resolveWaitUntilFlush();
        }, debounceMs);
    }
    _consumeWaitUntilCycle() {
        const cycle = this._waitUntilCycle;
        if (cycle) {
            clearTimeout(cycle.timer);
            this._waitUntilCycle = void 0;
        }
        return cycle?.resolve;
    }
    async resolveWaitUntilFlush() {
        const resolve = this._consumeWaitUntilCycle();
        try {
            await this.flushWithPendingPromises();
        } catch  {} finally{
            resolve?.();
        }
    }
    getPersistedProperty(key) {
        return this._memoryStorage.getProperty(key);
    }
    setPersistedProperty(key, value) {
        return this._memoryStorage.setProperty(key, value);
    }
    fetch(url, options) {
        return this.options.fetch ? this.options.fetch(url, options) : fetch(url, options);
    }
    getQueueRouteKey(message) {
        return 'v1' === this.captureMode && isLegacyOnlyEvent(message) ? AI_ROUTE : ANALYTICS_ROUTE;
    }
    persistedQueueKeyForRoute(route) {
        return route === AI_ROUTE ? PostHogPersistedProperty.AiQueue : PostHogPersistedProperty.Queue;
    }
    getActiveQueueRoutes() {
        return 'v1' === this.captureMode ? [
            ANALYTICS_ROUTE,
            AI_ROUTE
        ] : [
            ANALYTICS_ROUTE
        ];
    }
    async sendBatch(batchMessages, retryOptions, route = ANALYTICS_ROUTE) {
        if ('v1' !== this.captureMode || route === AI_ROUTE) return super.sendBatch(batchMessages, retryOptions, route);
        const v1Events = batchMessages.filter((message)=>void 0 !== message);
        await this.getV1Sender().sendV1Batch(v1Events);
    }
    getV1Sender() {
        if (!this._v1Sender) this._v1Sender = new V1CaptureSender({
            host: this.host,
            apiKey: this.apiKey,
            libraryId: this.getLibraryId(),
            libraryVersion: this.getLibraryVersion(),
            userAgent: this.getCustomUserAgent() || void 0,
            historicalMigration: this.historicalMigration,
            compressionEnabled: !this.disableCompression,
            requestTimeoutMs: this.requestTimeout,
            maxAttempts: (this.options.fetchRetryCount ?? 3) + 1,
            initialRetryDelayMs: this.options.fetchRetryDelay ?? 3000,
            isDebug: this.isDebug
        }, {
            fetch: (url, fetchOptions)=>this.fetch(url, fetchOptions),
            onError: (error)=>this._events.emit('error', error)
        });
        return this._v1Sender;
    }
    getLibraryVersion() {
        return version;
    }
    get metrics() {
        if (!this._metrics) this._metrics = new PostHogMetrics(this, resolveMetricsConfig(this.options.metrics), this._logger);
        return this._metrics;
    }
    getCustomUserAgent() {
        return `${this.getLibraryId()}/${this.getLibraryVersion()}`;
    }
    getCommonEventProperties() {
        const commonProperties = super.getCommonEventProperties();
        if (this.options.isServer ?? true) commonProperties.$is_server = true;
        return commonProperties;
    }
    enable() {
        return super.optIn();
    }
    disable() {
        return super.optOut();
    }
    debug(enabled = true) {
        super.debug(enabled);
        this.featureFlagsPoller?.debug(enabled);
    }
    _warnIfInvalidCapture(props, stringArgumentWarning, exceptionCaptureWarning) {
        if ('string' == typeof props) this._logger.warn(stringArgumentWarning);
        if ('$exception' === props.event && !props._originatedFromCaptureException) this._logger.warn(exceptionCaptureWarning);
    }
    _sendPreparedEvent(type, props, immediate, prepareOptions) {
        return this.addPendingPromise(this._prepareEventMessage(props, prepareOptions).then(({ distinctId, event, properties, options })=>{
            const captureOptions = {
                timestamp: options.timestamp,
                disableGeoip: options.disableGeoip,
                uuid: options.uuid
            };
            const message = {
                distinctId,
                event,
                properties: {
                    ...properties,
                    ...this.getCommonEventProperties()
                }
            };
            return immediate ? this.sendImmediate(type, message, captureOptions) : this.enqueue(type, message, captureOptions);
        }).catch((err)=>{
            if (err) console.error(err);
        }));
    }
    _capturePreparedEvent(props, immediate) {
        return this._sendPreparedEvent('capture', props, immediate);
    }
    capture(props) {
        this._warnIfInvalidCapture(props, 'Called capture() with a string as the first argument when an object was expected.', "Using `posthog.capture('$exception')` is unreliable because it does not attach required metadata. Use `posthog.captureException(error)` instead, which attaches required metadata automatically.");
        this._capturePreparedEvent(props, false);
    }
    async captureImmediate(props) {
        this._warnIfInvalidCapture(props, 'Called captureImmediate() with a string as the first argument when an object was expected.', "Capturing a `$exception` event via `posthog.captureImmediate('$exception')` is unreliable because it does not attach required metadata. Use `posthog.captureExceptionImmediate(error)` instead, which attaches this metadata by default.");
        return this._capturePreparedEvent(props, true);
    }
    identify({ distinctId, properties = {}, disableGeoip }) {
        const { $set, $set_once, $anon_distinct_id, ...rest } = properties;
        const setProps = $set || rest;
        const setOnceProps = $set_once || {};
        const eventProperties = {
            $set: setProps,
            $set_once: setOnceProps,
            $anon_distinct_id: $anon_distinct_id ?? void 0
        };
        this._sendPreparedEvent('identify', {
            distinctId,
            event: '$identify',
            properties: eventProperties,
            disableGeoip
        }, false, {
            includeContextProperties: false
        });
    }
    async identifyImmediate({ distinctId, properties = {}, disableGeoip }) {
        const { $set, $set_once, $anon_distinct_id, ...rest } = properties;
        const setProps = $set || rest;
        const setOnceProps = $set_once || {};
        const eventProperties = {
            $set: setProps,
            $set_once: setOnceProps,
            $anon_distinct_id: $anon_distinct_id ?? void 0
        };
        await this._sendPreparedEvent('identify', {
            distinctId,
            event: '$identify',
            properties: eventProperties,
            disableGeoip
        }, true, {
            includeContextProperties: false
        });
    }
    setPersonProperties({ distinctId, properties = {}, propertiesOnce = {} }) {
        if (0 === Object.keys(properties).length && 0 === Object.keys(propertiesOnce).length) return;
        const eventProperties = {};
        if (Object.keys(properties).length > 0) eventProperties.$set = properties;
        if (Object.keys(propertiesOnce).length > 0) eventProperties.$set_once = propertiesOnce;
        this.capture({
            distinctId,
            event: '$set',
            properties: eventProperties
        });
    }
    unsetPersonProperties({ distinctId, properties }) {
        const propertyNames = normalizeUnsetPersonProperties(properties);
        if (0 === propertyNames.length) return;
        this.capture({
            distinctId,
            event: '$set',
            properties: {
                $unset: propertyNames
            }
        });
    }
    alias(data) {
        this._sendPreparedEvent('alias', {
            distinctId: data.distinctId,
            event: '$create_alias',
            properties: {
                distinct_id: data.distinctId,
                alias: data.alias
            },
            disableGeoip: data.disableGeoip
        }, false, {
            includeContextProperties: false
        });
    }
    async aliasImmediate(data) {
        await this._sendPreparedEvent('alias', {
            distinctId: data.distinctId,
            event: '$create_alias',
            properties: {
                distinct_id: data.distinctId,
                alias: data.alias
            },
            disableGeoip: data.disableGeoip
        }, true, {
            includeContextProperties: false
        });
    }
    isLocalEvaluationReady() {
        return this.featureFlagsPoller?.isLocalEvaluationReady() ?? false;
    }
    async waitForLocalEvaluationReady(timeoutMs = THIRTY_SECONDS) {
        if (this.isLocalEvaluationReady()) return true;
        if (void 0 === this.featureFlagsPoller) return false;
        return new Promise((resolve)=>{
            const timeout = setTimeout(()=>{
                cleanup();
                resolve(false);
            }, timeoutMs);
            const cleanup = this._events.on('localEvaluationFlagsLoaded', (count)=>{
                clearTimeout(timeout);
                cleanup();
                resolve(count > 0);
            });
        });
    }
    _resolveDistinctId(distinctIdOrOptions, options) {
        if ('string' == typeof distinctIdOrOptions) return {
            distinctId: distinctIdOrOptions,
            options
        };
        return {
            distinctId: this.context?.get()?.distinctId,
            options: distinctIdOrOptions
        };
    }
    async _getFeatureFlagResult(key, distinctId, options = {}, matchValue) {
        if (this.disabled) return void this._logger.warn('The client is disabled');
        const sendFeatureFlagEvents = options.sendFeatureFlagEvents ?? true;
        if (void 0 !== this._flagOverrides && key in this._flagOverrides) {
            const overrideValue = this._flagOverrides[key];
            if (void 0 === overrideValue) return;
            const overridePayload = this._payloadOverrides?.[key];
            return {
                key,
                enabled: false !== overrideValue,
                variant: 'string' == typeof overrideValue ? overrideValue : void 0,
                payload: overridePayload
            };
        }
        const { groups, disableGeoip } = options;
        let { onlyEvaluateLocally, personProperties, groupProperties } = options;
        const adjustedProperties = this.addLocalPersonAndGroupProperties(distinctId, groups, personProperties, groupProperties);
        personProperties = adjustedProperties.allPersonProperties;
        groupProperties = adjustedProperties.allGroupProperties;
        const evaluationContext = this.createFeatureFlagEvaluationContext(distinctId, groups, this.personPropertiesForLocalEvaluation(distinctId, personProperties), groupProperties);
        if (void 0 == onlyEvaluateLocally) onlyEvaluateLocally = this.options.strictLocalEvaluation ?? false;
        let result;
        let flagWasLocallyEvaluated = false;
        let requestId;
        let evaluatedAt;
        let featureFlagError;
        let flagId;
        let flagVersion;
        let flagReason;
        let flagHasExperiment;
        const localEvaluationEnabled = void 0 !== this.featureFlagsPoller;
        if (localEvaluationEnabled) {
            await this.featureFlagsPoller?.loadFeatureFlags();
            const flag = this.featureFlagsPoller?.featureFlagsByKey[key];
            if (flag) try {
                const localResult = await this.featureFlagsPoller?.computeFlagAndPayloadLocally(flag, evaluationContext, {
                    matchValue
                });
                if (localResult) {
                    flagWasLocallyEvaluated = true;
                    const value = localResult.value;
                    flagId = flag.id;
                    flagReason = 'Evaluated locally';
                    flagHasExperiment = flag.has_experiment;
                    result = {
                        key,
                        enabled: false !== value,
                        variant: 'string' == typeof value ? value : void 0,
                        payload: localResult.payload ?? void 0
                    };
                }
            } catch (e) {
                if (e instanceof RequiresServerEvaluation || e instanceof InconclusiveMatchError) this._logger?.info(`${e.name} when computing flag locally: ${key}: ${e.message}`);
                else throw e;
            }
        }
        if (!flagWasLocallyEvaluated && !onlyEvaluateLocally) {
            const flagsResponse = await super.getFeatureFlagDetailsStateless(evaluationContext.distinctId, evaluationContext.groups, personProperties, groupProperties, disableGeoip, [
                key
            ]);
            if (void 0 === flagsResponse) featureFlagError = FeatureFlagError.UNKNOWN_ERROR;
            else {
                requestId = flagsResponse.requestId;
                evaluatedAt = flagsResponse.evaluatedAt;
                const errors = [];
                if (flagsResponse.errorsWhileComputingFlags) errors.push(FeatureFlagError.ERRORS_WHILE_COMPUTING);
                if (flagsResponse.quotaLimited?.includes('feature_flags')) errors.push(FeatureFlagError.QUOTA_LIMITED);
                const flagDetail = flagsResponse.flags[key];
                if (void 0 === flagDetail) errors.push(FeatureFlagError.FLAG_MISSING);
                else {
                    flagId = flagDetail.metadata?.id;
                    flagVersion = flagDetail.metadata?.version;
                    flagReason = flagDetail.reason?.description ?? flagDetail.reason?.code;
                    flagHasExperiment = flagDetail.metadata?.has_experiment;
                    let parsedPayload;
                    if (flagDetail.metadata?.payload !== void 0) try {
                        parsedPayload = JSON.parse(flagDetail.metadata.payload);
                    } catch  {
                        parsedPayload = flagDetail.metadata.payload;
                    }
                    result = {
                        key,
                        enabled: flagDetail.enabled,
                        variant: flagDetail.variant,
                        payload: parsedPayload
                    };
                }
                if (errors.length > 0) featureFlagError = errors.join(',');
            }
        }
        if (sendFeatureFlagEvents) {
            const response = void 0 === result ? void 0 : false === result.enabled ? false : result.variant ?? true;
            const properties = {
                $feature_flag: key,
                $feature_flag_response: response,
                $feature_flag_id: flagId,
                $feature_flag_version: flagVersion,
                $feature_flag_reason: flagReason,
                locally_evaluated: flagWasLocallyEvaluated,
                [`$feature/${key}`]: response,
                $feature_flag_request_id: requestId,
                $feature_flag_evaluated_at: flagWasLocallyEvaluated ? Date.now() : evaluatedAt
            };
            if (void 0 !== flagHasExperiment) properties.$feature_flag_has_experiment = flagHasExperiment;
            if (flagWasLocallyEvaluated && this.featureFlagsPoller) {
                const flagDefinitionsLoadedAt = this.featureFlagsPoller.getFlagDefinitionsLoadedAt();
                if (void 0 !== flagDefinitionsLoadedAt) properties.$feature_flag_definitions_loaded_at = flagDefinitionsLoadedAt;
            }
            if (featureFlagError) properties.$feature_flag_error = featureFlagError;
            this._captureFlagCalledEventIfNeeded({
                distinctId,
                key,
                response,
                groups,
                disableGeoip,
                properties
            });
        }
        if (void 0 !== result && void 0 !== this._payloadOverrides && key in this._payloadOverrides) result = {
            ...result,
            payload: this._payloadOverrides[key]
        };
        return result;
    }
    async getFeatureFlag(key, distinctId, options) {
        emitDeprecationWarningOnce('getFeatureFlag', "`getFeatureFlag` is deprecated and will be removed in a future major version. Use `posthog.evaluateFlags(distinctId, ...)` and call `flags.getFlag(key)` instead — this consolidates flag evaluation into a single `/flags` request per incoming request.");
        const result = await this._getFeatureFlagResult(key, distinctId, {
            ...options,
            sendFeatureFlagEvents: options?.sendFeatureFlagEvents ?? this.options.sendFeatureFlagEvent ?? true
        });
        if (void 0 === result) return;
        if (false === result.enabled) return false;
        return result.variant ?? true;
    }
    async getFeatureFlagPayload(key, distinctId, matchValue, options) {
        emitDeprecationWarningOnce('getFeatureFlagPayload', "`getFeatureFlagPayload` is deprecated and will be removed in a future major version. Use `posthog.evaluateFlags(distinctId, ...)` and call `flags.getFlagPayload(key)` instead — this consolidates flag evaluation into a single `/flags` request per incoming request.");
        if (void 0 !== this._payloadOverrides && key in this._payloadOverrides) return this._payloadOverrides[key];
        const result = await this._getFeatureFlagResult(key, distinctId, {
            ...options,
            sendFeatureFlagEvents: false
        }, matchValue);
        if (void 0 === result) return;
        return result.payload ?? null;
    }
    async getFeatureFlagResult(key, distinctIdOrOptions, options) {
        const { distinctId: resolvedDistinctId, options: resolvedOptions } = this._resolveDistinctId(distinctIdOrOptions, options);
        if (!resolvedDistinctId) return void this._logger.warn("[PostHog] distinctId is required \u2014 pass it explicitly or use withContext()");
        return this._getFeatureFlagResult(key, resolvedDistinctId, {
            ...resolvedOptions,
            sendFeatureFlagEvents: resolvedOptions?.sendFeatureFlagEvents ?? this.options.sendFeatureFlagEvent ?? true
        });
    }
    async getRemoteConfigPayload(flagKey) {
        if (this.disabled) return void this._logger.warn('The client is disabled');
        if (!this.options.personalApiKey) throw new Error('Personal API key is required for remote config payload decryption');
        const response = await this._requestRemoteConfigPayload(flagKey);
        if (!response) return;
        const parsed = await response.json();
        if ('string' == typeof parsed) try {
            return JSON.parse(parsed);
        } catch (e) {}
        return parsed;
    }
    async isFeatureEnabled(key, distinctId, options) {
        emitDeprecationWarningOnce('isFeatureEnabled', "`isFeatureEnabled` is deprecated and will be removed in a future major version. Use `posthog.evaluateFlags(distinctId, ...)` and call `flags.isEnabled(key)` instead — this consolidates flag evaluation into a single `/flags` request per incoming request.");
        const result = await this._getFeatureFlagResult(key, distinctId, {
            ...options,
            sendFeatureFlagEvents: options?.sendFeatureFlagEvents ?? this.options.sendFeatureFlagEvent ?? true
        });
        if (void 0 === result) return;
        if (false === result.enabled) return false;
        const feat = result.variant ?? true;
        return !!feat || false;
    }
    async getAllFlags(distinctIdOrOptions, options) {
        const { distinctId: resolvedDistinctId, options: resolvedOptions } = this._resolveDistinctId(distinctIdOrOptions, options);
        if (!resolvedDistinctId) {
            this._logger.warn("[PostHog] distinctId is required to get feature flags \u2014 pass it explicitly or use withContext()");
            return {};
        }
        const response = await this.getAllFlagsAndPayloads(resolvedDistinctId, resolvedOptions);
        return response.featureFlags || {};
    }
    async getAllFlagsAndPayloads(distinctIdOrOptions, options) {
        const { distinctId: resolvedDistinctId, options: resolvedOptions } = this._resolveDistinctId(distinctIdOrOptions, options);
        if (!resolvedDistinctId) {
            this._logger.warn("[PostHog] distinctId is required to get feature flags and payloads \u2014 pass it explicitly or use withContext()");
            return {
                featureFlags: {},
                featureFlagPayloads: {}
            };
        }
        if (this.disabled) {
            this._logger.warn('The client is disabled');
            return {
                featureFlags: {},
                featureFlagPayloads: {}
            };
        }
        const { groups, disableGeoip, flagKeys } = resolvedOptions || {};
        let { onlyEvaluateLocally, personProperties, groupProperties } = resolvedOptions || {};
        const adjustedProperties = this.addLocalPersonAndGroupProperties(resolvedDistinctId, groups, personProperties, groupProperties);
        personProperties = adjustedProperties.allPersonProperties;
        groupProperties = adjustedProperties.allGroupProperties;
        const evaluationContext = this.createFeatureFlagEvaluationContext(resolvedDistinctId, groups, this.personPropertiesForLocalEvaluation(resolvedDistinctId, personProperties), groupProperties);
        if (void 0 == onlyEvaluateLocally) onlyEvaluateLocally = this.options.strictLocalEvaluation ?? false;
        const localEvaluationResult = await this.featureFlagsPoller?.getAllFlagsAndPayloads(evaluationContext, flagKeys);
        let featureFlags = {};
        let featureFlagPayloads = {};
        let fallbackToFlags = true;
        if (localEvaluationResult) {
            featureFlags = localEvaluationResult.response;
            featureFlagPayloads = localEvaluationResult.payloads;
            fallbackToFlags = localEvaluationResult.fallbackToFlags;
        }
        if (fallbackToFlags && !onlyEvaluateLocally) {
            const remoteEvaluationResult = await super.getFeatureFlagsAndPayloadsStateless(evaluationContext.distinctId, evaluationContext.groups, personProperties, groupProperties, disableGeoip, flagKeys);
            featureFlags = {
                ...featureFlags,
                ...remoteEvaluationResult.flags || {}
            };
            featureFlagPayloads = {
                ...featureFlagPayloads,
                ...remoteEvaluationResult.payloads || {}
            };
        }
        if (void 0 !== this._flagOverrides) featureFlags = {
            ...featureFlags,
            ...this._flagOverrides
        };
        if (void 0 !== this._payloadOverrides) featureFlagPayloads = {
            ...featureFlagPayloads,
            ...this._payloadOverrides
        };
        return {
            featureFlags,
            featureFlagPayloads
        };
    }
    async evaluateFlags(distinctIdOrOptions, options) {
        const { distinctId: resolvedDistinctId, options: resolvedOptions } = this._resolveDistinctId(distinctIdOrOptions, options);
        if (!resolvedDistinctId) {
            this._logger.warn("[PostHog] distinctId is required to evaluate feature flags \u2014 pass it explicitly or use withContext()");
            return new FeatureFlagEvaluations({
                host: this._getFeatureFlagEvaluationsHost(),
                distinctId: '',
                flags: {}
            });
        }
        if (this.disabled) {
            this._logger.warn('The client is disabled');
            return new FeatureFlagEvaluations({
                host: this._getFeatureFlagEvaluationsHost(),
                distinctId: resolvedDistinctId,
                flags: {}
            });
        }
        const { groups, disableGeoip, flagKeys } = resolvedOptions || {};
        let { onlyEvaluateLocally, personProperties, groupProperties } = resolvedOptions || {};
        const adjustedProperties = this.addLocalPersonAndGroupProperties(resolvedDistinctId, groups, personProperties, groupProperties);
        personProperties = adjustedProperties.allPersonProperties;
        groupProperties = adjustedProperties.allGroupProperties;
        const evaluationContext = this.createFeatureFlagEvaluationContext(resolvedDistinctId, groups, this.personPropertiesForLocalEvaluation(resolvedDistinctId, personProperties), groupProperties);
        if (void 0 == onlyEvaluateLocally) onlyEvaluateLocally = this.options.strictLocalEvaluation ?? false;
        const records = {};
        let requestId;
        let evaluatedAt;
        let errorsWhileComputing = false;
        let quotaLimited = false;
        const localResult = await this.featureFlagsPoller?.getAllFlagsAndPayloads(evaluationContext, flagKeys);
        const locallyEvaluatedKeys = new Set();
        if (localResult) for (const [key, value] of Object.entries(localResult.response)){
            const flagDef = this.featureFlagsPoller?.featureFlagsByKey[key];
            records[key] = {
                key,
                enabled: false !== value,
                variant: 'string' == typeof value ? value : void 0,
                payload: localResult.payloads[key],
                id: flagDef?.id,
                version: void 0,
                reason: 'Evaluated locally',
                locallyEvaluated: true,
                hasExperiment: flagDef?.has_experiment
            };
            locallyEvaluatedKeys.add(key);
        }
        const fallbackToFlags = localResult ? localResult.fallbackToFlags : true;
        if (fallbackToFlags && !onlyEvaluateLocally) {
            const details = await super.getFeatureFlagDetailsStateless(evaluationContext.distinctId, evaluationContext.groups, personProperties, groupProperties, disableGeoip, flagKeys);
            if (details) {
                requestId = details.requestId;
                evaluatedAt = details.evaluatedAt;
                errorsWhileComputing = Boolean(details.errorsWhileComputingFlags);
                quotaLimited = Array.isArray(details.quotaLimited) && details.quotaLimited.includes('feature_flags');
                for (const [key, detail] of Object.entries(details.flags)){
                    if (locallyEvaluatedKeys.has(key)) continue;
                    let parsedPayload;
                    if (detail.metadata?.payload !== void 0) try {
                        parsedPayload = JSON.parse(detail.metadata.payload);
                    } catch  {
                        parsedPayload = detail.metadata.payload;
                    }
                    records[key] = {
                        key,
                        enabled: detail.enabled,
                        variant: detail.variant,
                        payload: parsedPayload,
                        id: detail.metadata?.id,
                        version: detail.metadata?.version,
                        reason: detail.reason?.description ?? detail.reason?.code,
                        locallyEvaluated: false,
                        hasExperiment: detail.metadata?.has_experiment
                    };
                }
            }
        }
        if (void 0 !== this._flagOverrides) for (const [key, value] of Object.entries(this._flagOverrides)){
            if (void 0 === value) {
                delete records[key];
                continue;
            }
            const existing = records[key];
            records[key] = {
                key,
                enabled: false !== value,
                variant: 'string' == typeof value ? value : void 0,
                payload: existing?.payload,
                id: existing?.id,
                version: existing?.version,
                reason: existing?.reason,
                locallyEvaluated: existing?.locallyEvaluated ?? false,
                hasExperiment: existing?.hasExperiment
            };
        }
        if (void 0 !== this._payloadOverrides) for (const [key, payload] of Object.entries(this._payloadOverrides)){
            const existing = records[key];
            if (existing) records[key] = {
                ...existing,
                payload
            };
        }
        return new FeatureFlagEvaluations({
            host: this._getFeatureFlagEvaluationsHost(),
            distinctId: resolvedDistinctId,
            groups,
            disableGeoip,
            flags: records,
            requestId,
            evaluatedAt,
            flagDefinitionsLoadedAt: this.featureFlagsPoller?.getFlagDefinitionsLoadedAt(),
            errorsWhileComputing,
            quotaLimited
        });
    }
    _captureFlagCalledEventIfNeeded(params) {
        const { distinctId, key, response, groups, disableGeoip, properties } = params;
        const groupSuffix = groups && Object.keys(groups).length > 0 ? `_${JSON.stringify(Object.entries(groups).sort(([a], [b])=>a < b ? -1 : a > b ? 1 : 0))}` : '';
        const featureFlagReportedKey = `${key}_${response}${groupSuffix}`;
        if (distinctId in this.distinctIdHasSentFlagCalls && this.distinctIdHasSentFlagCalls[distinctId].has(featureFlagReportedKey)) return;
        if (Object.keys(this.distinctIdHasSentFlagCalls).length >= this.maxCacheSize) this.distinctIdHasSentFlagCalls = {};
        if (this.distinctIdHasSentFlagCalls[distinctId] instanceof Set) this.distinctIdHasSentFlagCalls[distinctId].add(featureFlagReportedKey);
        else this.distinctIdHasSentFlagCalls[distinctId] = new Set([
            featureFlagReportedKey
        ]);
        this.capture({
            distinctId,
            event: '$feature_flag_called',
            properties,
            groups,
            disableGeoip
        });
    }
    _getFeatureFlagEvaluationsHost() {
        if (!this._featureFlagEvaluationsHost) this._featureFlagEvaluationsHost = {
            captureFlagCalledEventIfNeeded: (params)=>this._captureFlagCalledEventIfNeeded(params),
            logWarning: (message)=>{
                if (false !== this.options.featureFlagsLogWarnings) console.warn(`[PostHog] ${message}`);
            }
        };
        return this._featureFlagEvaluationsHost;
    }
    groupIdentify({ groupType, groupKey, properties, distinctId, disableGeoip }) {
        this._sendPreparedEvent('capture', {
            distinctId: distinctId || `$${groupType}_${groupKey}`,
            event: '$groupidentify',
            properties: {
                $group_type: groupType,
                $group_key: groupKey,
                $group_set: properties || {}
            },
            disableGeoip
        }, false, {
            includeContextProperties: false
        });
    }
    async groupIdentifyImmediate({ groupType, groupKey, properties, distinctId, disableGeoip }) {
        await this._sendPreparedEvent('capture', {
            distinctId: distinctId || `$${groupType}_${groupKey}`,
            event: '$groupidentify',
            properties: {
                $group_type: groupType,
                $group_key: groupKey,
                $group_set: properties || {}
            },
            disableGeoip
        }, true, {
            includeContextProperties: false
        });
    }
    async reloadFeatureFlags() {
        await this.featureFlagsPoller?.loadFeatureFlags(true);
    }
    overrideFeatureFlags(overrides) {
        const flagArrayToRecord = (flags)=>Object.fromEntries(flags.map((f)=>[
                    f,
                    true
                ]));
        if (false === overrides) {
            this._flagOverrides = void 0;
            this._payloadOverrides = void 0;
            return;
        }
        if (Array.isArray(overrides)) {
            this._flagOverrides = flagArrayToRecord(overrides);
            return;
        }
        if (this._isFeatureFlagOverrideOptions(overrides)) {
            if ('flags' in overrides) {
                if (false === overrides.flags) this._flagOverrides = void 0;
                else if (Array.isArray(overrides.flags)) this._flagOverrides = flagArrayToRecord(overrides.flags);
                else if (void 0 !== overrides.flags) this._flagOverrides = {
                    ...overrides.flags
                };
            }
            if ('payloads' in overrides) {
                if (false === overrides.payloads) this._payloadOverrides = void 0;
                else if (void 0 !== overrides.payloads) this._payloadOverrides = {
                    ...overrides.payloads
                };
            }
            return;
        }
        this._flagOverrides = {
            ...overrides
        };
    }
    _isFeatureFlagOverrideOptions(overrides) {
        if ('object' != typeof overrides || null === overrides || Array.isArray(overrides)) return false;
        const obj = overrides;
        if ('flags' in obj) {
            const flagsValue = obj['flags'];
            if (false === flagsValue || Array.isArray(flagsValue) || 'object' == typeof flagsValue && null !== flagsValue) return true;
        }
        if ('payloads' in obj) {
            const payloadsValue = obj['payloads'];
            if (false === payloadsValue || 'object' == typeof payloadsValue && null !== payloadsValue) return true;
        }
        return false;
    }
    withContext(data, fn, options) {
        if (!this.context) return fn();
        return this.context.run(data, fn, options);
    }
    getContext() {
        return this.context?.get();
    }
    enterContext(data, options) {
        this.context?.enter(data, options);
    }
    async _shutdown(shutdownTimeoutMs) {
        const shutdownDeadlineMs = Date.now() + (shutdownTimeoutMs ?? 30000);
        const resolve = this._consumeWaitUntilCycle();
        await this.featureFlagsPoller?.stopPoller(shutdownTimeoutMs);
        this.errorTracking.shutdown();
        if (this._metrics) {
            await Promise.race([
                this._metrics.flush().catch(()=>{}),
                new Promise((resolve)=>safeSetTimeout(resolve, Math.max(0, shutdownDeadlineMs - Date.now())))
            ]);
            this._metrics.reset();
        }
        try {
            return await super._shutdown(Math.max(0, shutdownDeadlineMs - Date.now()));
        } finally{
            this.distinctIdHasSentFlagCalls = {};
            resolve?.();
        }
    }
    async _requestRemoteConfigPayload(flagKey) {
        if (this.disabled || !this.apiKey || !this.options.personalApiKey) return;
        const url = `${this.host}/api/projects/@current/feature_flags/${flagKey}/remote_config?token=${encodeURIComponent(this.apiKey)}`;
        const options = {
            method: 'GET',
            headers: {
                ...this.getCustomHeaders(),
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.options.personalApiKey}`
            }
        };
        let abortTimeout = null;
        if (this.options.requestTimeout && 'number' == typeof this.options.requestTimeout) {
            const controller = new AbortController();
            abortTimeout = safeSetTimeout(()=>{
                controller.abort();
            }, this.options.requestTimeout);
            options.signal = controller.signal;
        }
        try {
            return await this.fetch(url, options);
        } catch (error) {
            this._events.emit('error', error);
            return;
        } finally{
            if (abortTimeout) clearTimeout(abortTimeout);
        }
    }
    extractPropertiesFromEvent(eventProperties, groups) {
        if (!eventProperties) return {
            personProperties: {},
            groupProperties: {}
        };
        const personProperties = {};
        const groupProperties = {};
        for (const [key, value] of Object.entries(eventProperties))if (isPlainObject(value) && groups && key in groups) {
            const groupProps = {};
            for (const [groupKey, groupValue] of Object.entries(value))groupProps[String(groupKey)] = String(groupValue);
            groupProperties[String(key)] = groupProps;
        } else personProperties[String(key)] = String(value);
        return {
            personProperties,
            groupProperties
        };
    }
    async getFeatureFlagsForEvent(distinctId, groups, disableGeoip, sendFeatureFlagsOptions) {
        if (this.disabled || !this.apiKey) return void this._logger.warn('The client is disabled');
        const finalPersonProperties = sendFeatureFlagsOptions?.personProperties || {};
        const finalGroupProperties = sendFeatureFlagsOptions?.groupProperties || {};
        const flagKeys = sendFeatureFlagsOptions?.flagKeys;
        const onlyEvaluateLocally = sendFeatureFlagsOptions?.onlyEvaluateLocally ?? this.options.strictLocalEvaluation ?? false;
        if (onlyEvaluateLocally) if (!((this.featureFlagsPoller?.featureFlags?.length || 0) > 0)) return {};
        else {
            const groupsWithStringValues = {};
            for (const [key, value] of Object.entries(groups || {}))groupsWithStringValues[key] = String(value);
            return await this.getAllFlags(distinctId, {
                groups: groupsWithStringValues,
                personProperties: finalPersonProperties,
                groupProperties: finalGroupProperties,
                disableGeoip,
                onlyEvaluateLocally: true,
                flagKeys
            });
        }
        if ((this.featureFlagsPoller?.featureFlags?.length || 0) > 0) {
            const groupsWithStringValues = {};
            for (const [key, value] of Object.entries(groups || {}))groupsWithStringValues[key] = String(value);
            return await this.getAllFlags(distinctId, {
                groups: groupsWithStringValues,
                personProperties: finalPersonProperties,
                groupProperties: finalGroupProperties,
                disableGeoip,
                onlyEvaluateLocally: true,
                flagKeys
            });
        }
        return (await super.getFeatureFlagsStateless(distinctId, groups, finalPersonProperties, finalGroupProperties, disableGeoip)).flags;
    }
    addLocalPersonAndGroupProperties(distinctId, groups, personProperties, groupProperties) {
        const allPersonProperties = {
            ...personProperties || {}
        };
        const allGroupProperties = {};
        if (groups) for (const groupName of Object.keys(groups))allGroupProperties[groupName] = {
            $group_key: groups[groupName],
            ...groupProperties?.[groupName] || {}
        };
        return {
            allPersonProperties,
            allGroupProperties
        };
    }
    personPropertiesForLocalEvaluation(distinctId, personProperties) {
        return {
            distinct_id: distinctId,
            ...personProperties || {}
        };
    }
    createFeatureFlagEvaluationContext(distinctId, groups, personProperties, groupProperties) {
        return {
            distinctId,
            groups: groups || {},
            personProperties: personProperties || {},
            groupProperties: groupProperties || {},
            evaluationCache: {}
        };
    }
    captureException(error, distinctId, additionalProperties, uuid, flags) {
        if (!error_tracking.isPreviouslyCapturedError(error)) {
            const syntheticException = new Error('PostHog syntheticException');
            this.addPendingPromise(error_tracking.buildEventMessage(this.getErrorPropertiesBuilder(), error, {
                syntheticException
            }, distinctId, additionalProperties).then((msg)=>this._capturePreparedEvent({
                    ...msg,
                    uuid,
                    flags
                }, false)));
        }
    }
    async captureExceptionImmediate(error, distinctId, additionalProperties, flags) {
        if (!error_tracking.isPreviouslyCapturedError(error)) {
            const syntheticException = new Error('PostHog syntheticException');
            return this.addPendingPromise(error_tracking.buildEventMessage(this.getErrorPropertiesBuilder(), error, {
                syntheticException
            }, distinctId, additionalProperties).then((msg)=>this.captureImmediate({
                    ...msg,
                    flags
                })));
        }
    }
    async prepareEventMessage(props) {
        return this._prepareEventMessage(props);
    }
    async _prepareEventMessage(props, options = {}) {
        const { distinctId, event, properties, groups, flags, sendFeatureFlags, timestamp, disableGeoip, uuid } = props;
        const contextData = this.context?.get();
        const includeContextProperties = options.includeContextProperties ?? true;
        let mergedDistinctId = distinctId || contextData?.distinctId;
        const mergedProperties = includeContextProperties ? {
            ...this.props,
            ...contextData?.properties || {},
            ...properties || {}
        } : {
            ...properties || {}
        };
        if (!mergedDistinctId) {
            mergedDistinctId = uuidv7();
            mergedProperties.$process_person_profile = false;
        }
        if (includeContextProperties && contextData?.sessionId && !mergedProperties.$session_id) mergedProperties.$session_id = contextData.sessionId;
        const eventMessage = this._runBeforeSend({
            distinctId: mergedDistinctId,
            event,
            properties: mergedProperties,
            groups,
            flags,
            sendFeatureFlags,
            timestamp,
            disableGeoip,
            uuid
        });
        if (!eventMessage) return Promise.reject(null);
        const eventProperties = await Promise.resolve().then(async ()=>{
            if (flags) {
                if (sendFeatureFlags) console.warn('[PostHog] Both `flags` and `sendFeatureFlags` were passed to capture(); using `flags` and ignoring `sendFeatureFlags`.');
                return flags._getEventProperties();
            }
            if (sendFeatureFlags) {
                emitDeprecationWarningOnce('sendFeatureFlags', "`sendFeatureFlags` is deprecated and will be removed in a future major version. Pass a `flags` snapshot from `posthog.evaluateFlags(...)` instead — it avoids a second `/flags` request per capture and guarantees the event carries the exact flag values your code branched on.");
                const sendFeatureFlagsOptions = 'object' == typeof sendFeatureFlags ? sendFeatureFlags : void 0;
                const flagValues = await this.getFeatureFlagsForEvent(eventMessage.distinctId, groups, disableGeoip, sendFeatureFlagsOptions);
                return buildFlagEventProperties(flagValues);
            }
            return {};
        }).catch(()=>({})).then((additionalProperties)=>{
            const resolvedGroups = eventMessage.groups || groups;
            return {
                ...additionalProperties,
                ...eventMessage.properties || {},
                ...void 0 !== resolvedGroups && Object.keys(resolvedGroups).length > 0 ? {
                    $groups: resolvedGroups
                } : {}
            };
        });
        if ('$pageview' === eventMessage.event && this.options.__preview_capture_bot_pageviews && 'string' == typeof eventProperties.$raw_user_agent) {
            if (isBlockedUA(eventProperties.$raw_user_agent, this.options.custom_blocked_useragents || [])) {
                eventMessage.event = '$bot_pageview';
                eventProperties.$browser_type = 'bot';
            }
        }
        return {
            distinctId: eventMessage.distinctId,
            event: eventMessage.event,
            properties: eventProperties,
            options: {
                timestamp: eventMessage.timestamp,
                disableGeoip: eventMessage.disableGeoip,
                uuid: eventMessage.uuid
            }
        };
    }
    _runBeforeSend(eventMessage) {
        const beforeSend = this.options.before_send;
        if (!beforeSend) return eventMessage;
        const fns = Array.isArray(beforeSend) ? beforeSend : [
            beforeSend
        ];
        let result = eventMessage;
        for (const fn of fns){
            result = fn(result);
            if (!result) {
                this._logger.info(`Event '${eventMessage.event}' was rejected in beforeSend function`);
                return null;
            }
            if (!result.properties || 0 === Object.keys(result.properties).length) {
                const message = `Event '${result.event}' has no properties after beforeSend function, this is likely an error.`;
                this._logger.warn(message);
            }
        }
        return result;
    }
}
export { PostHogBackendClient, _resetDeprecationWarningsForTests };
