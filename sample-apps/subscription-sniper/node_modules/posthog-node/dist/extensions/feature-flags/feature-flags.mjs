import { safeSetTimeout } from "@posthog/core";
import { hashSHA1 } from "./crypto.mjs";
const SIXTY_SECONDS = 60000;
const LONG_SCALE = 0xfffffffffffffff;
const NULL_VALUES_ALLOWED_OPERATORS = [
    'is_not',
    'is_set'
];
class ClientError extends Error {
    constructor(message){
        super();
        Error.captureStackTrace(this, this.constructor);
        this.name = 'ClientError';
        this.message = message;
        Object.setPrototypeOf(this, ClientError.prototype);
    }
}
function setCustomErrorPrototype(error, constructor) {
    error.name = constructor.name;
    Error.captureStackTrace(error, constructor);
    Object.setPrototypeOf(error, constructor.prototype);
}
class InconclusiveMatchError extends Error {
    constructor(message){
        super(message);
        setCustomErrorPrototype(this, InconclusiveMatchError);
    }
}
class RequiresServerEvaluation extends Error {
    constructor(message){
        super(message);
        setCustomErrorPrototype(this, RequiresServerEvaluation);
    }
}
class FeatureFlagsPoller {
    constructor({ pollingInterval, personalApiKey, projectApiKey, timeout, host, customHeaders, ...options }){
        this.debugMode = false;
        this.shouldBeginExponentialBackoff = false;
        this.backOffCount = 0;
        this.pollingInterval = pollingInterval;
        this.personalApiKey = personalApiKey;
        this.featureFlags = [];
        this.featureFlagsByKey = {};
        this.groupTypeMapping = {};
        this.cohorts = {};
        this.loadedSuccessfullyOnce = false;
        this.timeout = timeout;
        this.projectApiKey = projectApiKey;
        this.host = host;
        this.poller = void 0;
        this.fetch = options.fetch || fetch;
        this.onError = options.onError;
        this.customHeaders = customHeaders;
        this.onLoad = options.onLoad;
        this.cacheProvider = options.cacheProvider;
        this.strictLocalEvaluation = options.strictLocalEvaluation ?? false;
        this.loadFeatureFlags();
    }
    debug(enabled = true) {
        this.debugMode = enabled;
    }
    logMsgIfDebug(fn) {
        if (this.debugMode) fn();
    }
    createEvaluationContext(distinctId, groups = {}, personProperties = {}, groupProperties = {}, evaluationCache = {}) {
        return {
            distinctId,
            groups,
            personProperties,
            groupProperties,
            evaluationCache
        };
    }
    async getFeatureFlag(key, distinctId, groups = {}, personProperties = {}, groupProperties = {}) {
        await this.loadFeatureFlags();
        let response;
        let featureFlag;
        if (!this.loadedSuccessfullyOnce) return response;
        featureFlag = this.featureFlagsByKey[key];
        if (void 0 !== featureFlag) {
            const evaluationContext = this.createEvaluationContext(distinctId, groups, personProperties, groupProperties);
            try {
                const result = await this.computeFlagAndPayloadLocally(featureFlag, evaluationContext);
                response = result.value;
                this.logMsgIfDebug(()=>console.debug(`Successfully computed flag locally: ${key} -> ${response}`));
            } catch (e) {
                if (e instanceof RequiresServerEvaluation || e instanceof InconclusiveMatchError) this.logMsgIfDebug(()=>console.debug(`${e.name} when computing flag locally: ${key}: ${e.message}`));
                else if (e instanceof Error) this.onError?.(new Error(`Error computing flag locally: ${key}: ${e}`));
            }
        }
        return response;
    }
    async getAllFlagsAndPayloads(evaluationContext, flagKeysToExplicitlyEvaluate) {
        await this.loadFeatureFlags();
        const response = {};
        const payloads = {};
        let fallbackToFlags = 0 == this.featureFlags.length;
        const flagsToEvaluate = flagKeysToExplicitlyEvaluate ? flagKeysToExplicitlyEvaluate.map((key)=>this.featureFlagsByKey[key]).filter(Boolean) : this.featureFlags;
        const sharedEvaluationContext = {
            ...evaluationContext,
            evaluationCache: evaluationContext.evaluationCache ?? {}
        };
        await Promise.all(flagsToEvaluate.map(async (flag)=>{
            try {
                const { value: matchValue, payload: matchPayload } = await this.computeFlagAndPayloadLocally(flag, sharedEvaluationContext);
                response[flag.key] = matchValue;
                if (matchPayload) payloads[flag.key] = matchPayload;
            } catch (e) {
                if (e instanceof RequiresServerEvaluation || e instanceof InconclusiveMatchError) this.logMsgIfDebug(()=>console.debug(`${e.name} when computing flag locally: ${flag.key}: ${e.message}`));
                else if (e instanceof Error) this.onError?.(new Error(`Error computing flag locally: ${flag.key}: ${e}`));
                fallbackToFlags = true;
            }
        }));
        return {
            response,
            payloads,
            fallbackToFlags
        };
    }
    async computeFlagAndPayloadLocally(flag, evaluationContext, options = {}) {
        const { matchValue, skipLoadCheck = false } = options;
        if (!skipLoadCheck) await this.loadFeatureFlags();
        if (!this.loadedSuccessfullyOnce) return {
            value: false,
            payload: null
        };
        let flagValue;
        flagValue = void 0 !== matchValue ? matchValue : await this.computeFlagValueLocally(flag, evaluationContext);
        const payload = this.getFeatureFlagPayload(flag.key, flagValue);
        return {
            value: flagValue,
            payload
        };
    }
    async computeFlagValueLocally(flag, evaluationContext) {
        const { distinctId, groups, personProperties, groupProperties } = evaluationContext;
        if (!flag.active) return false;
        if (flag.ensure_experience_continuity) throw new InconclusiveMatchError('Flag has experience continuity enabled');
        const flagFilters = flag.filters || {};
        const aggregation_group_type_index = flagFilters.aggregation_group_type_index;
        if (void 0 != aggregation_group_type_index) {
            const groupName = this.groupTypeMapping[String(aggregation_group_type_index)];
            if (!groupName) {
                this.logMsgIfDebug(()=>console.warn(`[FEATURE FLAGS] Unknown group type index ${aggregation_group_type_index} for feature flag ${flag.key}`));
                throw new InconclusiveMatchError('Flag has unknown group type index');
            }
            if (!(groupName in groups)) {
                this.logMsgIfDebug(()=>console.warn(`[FEATURE FLAGS] Can't compute group feature flag: ${flag.key} without group names passed in`));
                return false;
            }
            if ('device_id' === flag.bucketing_identifier && (personProperties?.$device_id === void 0 || personProperties?.$device_id === null || personProperties?.$device_id === '')) this.logMsgIfDebug(()=>console.warn(`[FEATURE FLAGS] Ignoring bucketing_identifier for group flag: ${flag.key}`));
            const focusedGroupProperties = groupProperties[groupName];
            return await this.matchFeatureFlagProperties(flag, groups[groupName], focusedGroupProperties, evaluationContext);
        }
        {
            const bucketingValue = this.getBucketingValueForFlag(flag, distinctId, personProperties);
            if (void 0 === bucketingValue) {
                this.logMsgIfDebug(()=>console.warn(`[FEATURE FLAGS] Can't compute feature flag: ${flag.key} without $device_id, falling back to server evaluation`));
                throw new InconclusiveMatchError(`Can't compute feature flag: ${flag.key} without $device_id`);
            }
            return await this.matchFeatureFlagProperties(flag, bucketingValue, personProperties, evaluationContext);
        }
    }
    getBucketingValueForFlag(flag, distinctId, properties) {
        if (flag.filters?.aggregation_group_type_index != void 0) return distinctId;
        if ('device_id' === flag.bucketing_identifier) {
            const deviceId = properties?.$device_id;
            if (null == deviceId || '' === deviceId) return;
            return deviceId;
        }
        return distinctId;
    }
    getFeatureFlagPayload(key, flagValue) {
        let payload = null;
        if (false !== flagValue && null != flagValue) {
            if ('boolean' == typeof flagValue) payload = this.featureFlagsByKey?.[key]?.filters?.payloads?.[flagValue.toString()] || null;
            else if ('string' == typeof flagValue) payload = this.featureFlagsByKey?.[key]?.filters?.payloads?.[flagValue] || null;
            if (null != payload) {
                if ('object' == typeof payload) return payload;
                if ('string' == typeof payload) try {
                    return JSON.parse(payload);
                } catch  {}
                return payload;
            }
        }
        return null;
    }
    async evaluateFlagDependency(property, properties, evaluationContext) {
        const { evaluationCache } = evaluationContext;
        const targetFlagKey = property.key;
        if (!this.featureFlagsByKey) throw new InconclusiveMatchError('Feature flags not available for dependency evaluation');
        if (!('dependency_chain' in property)) throw new InconclusiveMatchError(`Flag dependency property for '${targetFlagKey}' is missing required 'dependency_chain' field`);
        const dependencyChain = property.dependency_chain;
        if (!Array.isArray(dependencyChain)) throw new InconclusiveMatchError(`Flag dependency property for '${targetFlagKey}' has an invalid 'dependency_chain' (expected array, got ${typeof dependencyChain})`);
        if (0 === dependencyChain.length) throw new InconclusiveMatchError(`Circular dependency detected for flag '${targetFlagKey}' (empty dependency chain)`);
        for (const depFlagKey of dependencyChain){
            if (!(depFlagKey in evaluationCache)) {
                const depFlag = this.featureFlagsByKey[depFlagKey];
                if (depFlag) if (depFlag.active) try {
                    const depResult = await this.computeFlagValueLocally(depFlag, evaluationContext);
                    evaluationCache[depFlagKey] = depResult;
                } catch (error) {
                    throw new InconclusiveMatchError(`Error evaluating flag dependency '${depFlagKey}' for flag '${targetFlagKey}': ${error}`);
                }
                else evaluationCache[depFlagKey] = false;
                else throw new InconclusiveMatchError(`Missing flag dependency '${depFlagKey}' for flag '${targetFlagKey}'`);
            }
            const cachedResult = evaluationCache[depFlagKey];
            if (null == cachedResult) throw new InconclusiveMatchError(`Dependency '${depFlagKey}' could not be evaluated`);
        }
        const targetFlagValue = evaluationCache[targetFlagKey];
        return this.flagEvaluatesToExpectedValue(property.value, targetFlagValue);
    }
    flagEvaluatesToExpectedValue(expectedValue, flagValue) {
        if ('boolean' == typeof expectedValue) return expectedValue === flagValue || 'string' == typeof flagValue && '' !== flagValue && true === expectedValue;
        if ('string' == typeof expectedValue) return flagValue === expectedValue;
        return false;
    }
    async matchFeatureFlagProperties(flag, bucketingValue, properties, evaluationContext) {
        const flagFilters = flag.filters || {};
        const flagConditions = flagFilters.groups || [];
        const flagAggregation = flagFilters.aggregation_group_type_index;
        const earlyExitEnabled = flagFilters.early_exit ?? false;
        const { groups, groupProperties } = evaluationContext;
        let isInconclusive = false;
        let result;
        for (const condition of flagConditions)try {
            const conditionAggregation = void 0 !== condition.aggregation_group_type_index ? condition.aggregation_group_type_index : flagAggregation;
            let effectiveProperties = properties;
            let effectiveBucketingValue = bucketingValue;
            if (conditionAggregation !== flagAggregation) {
                if (null != conditionAggregation) {
                    const groupName = this.groupTypeMapping[String(conditionAggregation)];
                    if (!groupName || !(groupName in groups)) {
                        this.logMsgIfDebug(()=>console.debug(`[FEATURE FLAGS] Skipping group condition for flag '${flag.key}': group type index ${conditionAggregation} not available`));
                        continue;
                    }
                    if (!(groupName in groupProperties)) {
                        isInconclusive = true;
                        continue;
                    }
                    effectiveProperties = groupProperties[groupName];
                    effectiveBucketingValue = groups[groupName];
                }
            }
            const matchResult = await this.isConditionMatch(flag, effectiveBucketingValue, condition, effectiveProperties, evaluationContext);
            if ('match' === matchResult) {
                const variantOverride = condition.variant;
                const flagVariants = flagFilters.multivariate?.variants || [];
                result = variantOverride && flagVariants.some((variant)=>variant.key === variantOverride) ? variantOverride : await this.getMatchingVariant(flag, effectiveBucketingValue) || true;
                break;
            }
            if (earlyExitEnabled && 'out_of_rollout_bound' === matchResult) return false;
        } catch (e) {
            if (e instanceof RequiresServerEvaluation) throw e;
            if (e instanceof InconclusiveMatchError) isInconclusive = true;
            else throw e;
        }
        if (void 0 !== result) return result;
        if (isInconclusive) throw new InconclusiveMatchError("Can't determine if feature flag is enabled or not with given properties");
        return false;
    }
    async isConditionMatch(flag, bucketingValue, condition, properties, evaluationContext) {
        const rolloutPercentage = condition.rollout_percentage;
        const warnFunction = (msg)=>{
            this.logMsgIfDebug(()=>console.warn(msg));
        };
        if ((condition.properties || []).length > 0) {
            for (const prop of condition.properties){
                const propertyType = prop.type;
                let matches = false;
                if ('cohort' === propertyType) {
                    const inCohort = await matchCohort(prop, properties, this.cohorts, this.debugMode, (depProp)=>this.evaluateFlagDependency(depProp, properties, evaluationContext));
                    matches = 'not_in' === prop.operator ? !inCohort : inCohort;
                } else matches = 'flag' === propertyType ? await this.evaluateFlagDependency(prop, properties, evaluationContext) : matchProperty(prop, properties, warnFunction);
                if (!matches) return 'no_match';
            }
            if (void 0 == rolloutPercentage) return 'match';
        }
        if (void 0 != rolloutPercentage && await _hash(flag.key, bucketingValue) > rolloutPercentage / 100.0) return 'out_of_rollout_bound';
        return 'match';
    }
    async getMatchingVariant(flag, bucketingValue) {
        const hashValue = await _hash(flag.key, bucketingValue, 'variant');
        const matchingVariant = this.variantLookupTable(flag).find((variant)=>hashValue >= variant.valueMin && hashValue < variant.valueMax);
        if (matchingVariant) return matchingVariant.key;
    }
    variantLookupTable(flag) {
        const lookupTable = [];
        let valueMin = 0;
        let valueMax = 0;
        const flagFilters = flag.filters || {};
        const multivariates = flagFilters.multivariate?.variants || [];
        multivariates.forEach((variant)=>{
            valueMax = valueMin + variant.rollout_percentage / 100.0;
            lookupTable.push({
                valueMin,
                valueMax,
                key: variant.key
            });
            valueMin = valueMax;
        });
        return lookupTable;
    }
    updateFlagState(flagData) {
        this.featureFlags = flagData.flags;
        this.featureFlagsByKey = flagData.flags.reduce((acc, curr)=>(acc[curr.key] = curr, acc), {});
        this.groupTypeMapping = flagData.groupTypeMapping;
        this.cohorts = flagData.cohorts;
        this.loadedSuccessfullyOnce = true;
    }
    warnAboutExperienceContinuityFlags(flags) {
        if (this.strictLocalEvaluation) return;
        const experienceContinuityFlags = flags.filter((f)=>f.ensure_experience_continuity);
        if (experienceContinuityFlags.length > 0) console.warn(`[PostHog] You are using local evaluation but ${experienceContinuityFlags.length} flag(s) have experience continuity enabled: ${experienceContinuityFlags.map((f)=>f.key).join(', ')}. Experience continuity is incompatible with local evaluation and will cause a server request on every flag evaluation, negating local evaluation cost savings. To avoid server requests and unexpected costs, either disable experience continuity on these flags in PostHog, use strictLocalEvaluation: true in client init, or pass onlyEvaluateLocally: true per flag call (flags that cannot be evaluated locally will return undefined).`);
    }
    async loadFromCache(debugMessage) {
        if (!this.cacheProvider) return false;
        try {
            const cached = await this.cacheProvider.getFlagDefinitions();
            if (cached) {
                this.updateFlagState(cached);
                this.logMsgIfDebug(()=>console.debug(`[FEATURE FLAGS] ${debugMessage} (${cached.flags.length} flags)`));
                this.onLoad?.(this.featureFlags.length);
                this.warnAboutExperienceContinuityFlags(cached.flags);
                return true;
            }
            return false;
        } catch (err) {
            this.onError?.(new Error(`Failed to load from cache: ${err}`));
            return false;
        }
    }
    async loadFeatureFlags(forceReload = false) {
        if (this.loadedSuccessfullyOnce && !forceReload) return;
        if (!forceReload && this.nextFetchAllowedAt && Date.now() < this.nextFetchAllowedAt) return void this.logMsgIfDebug(()=>console.debug('[FEATURE FLAGS] Skipping fetch, in backoff period'));
        if (!this.loadingPromise) this.loadingPromise = this._loadFeatureFlags().catch((err)=>this.logMsgIfDebug(()=>console.debug(`[FEATURE FLAGS] Failed to load feature flags: ${err}`))).finally(()=>{
            this.loadingPromise = void 0;
        });
        return this.loadingPromise;
    }
    isLocalEvaluationReady() {
        return (this.loadedSuccessfullyOnce ?? false) && (this.featureFlags?.length ?? 0) > 0;
    }
    getFlagDefinitionsLoadedAt() {
        return this.flagDefinitionsLoadedAt;
    }
    getPollingInterval() {
        if (!this.shouldBeginExponentialBackoff) return this.pollingInterval;
        return Math.min(SIXTY_SECONDS, this.pollingInterval * 2 ** this.backOffCount);
    }
    beginBackoff() {
        this.shouldBeginExponentialBackoff = true;
        this.backOffCount += 1;
        this.nextFetchAllowedAt = Date.now() + this.getPollingInterval();
    }
    clearBackoff() {
        this.shouldBeginExponentialBackoff = false;
        this.backOffCount = 0;
        this.nextFetchAllowedAt = void 0;
    }
    async _loadFeatureFlags() {
        if (this.poller) {
            clearTimeout(this.poller);
            this.poller = void 0;
        }
        this.poller = setTimeout(()=>this.loadFeatureFlags(true), this.getPollingInterval());
        try {
            let shouldFetch = true;
            if (this.cacheProvider) try {
                shouldFetch = await this.cacheProvider.shouldFetchFlagDefinitions();
            } catch (err) {
                this.onError?.(new Error(`Error in shouldFetchFlagDefinitions: ${err}`));
            }
            if (!shouldFetch) {
                const loaded = await this.loadFromCache('Loaded flags from cache (skipped fetch)');
                if (loaded) return;
                if (this.loadedSuccessfullyOnce) return;
            }
            const res = await this._requestFeatureFlagDefinitions();
            if (!res) return;
            switch(res.status){
                case 304:
                    this.logMsgIfDebug(()=>console.debug('[FEATURE FLAGS] Flags not modified (304), using cached data'));
                    this.flagsEtag = res.headers?.get('ETag') ?? this.flagsEtag;
                    this.loadedSuccessfullyOnce = true;
                    this.clearBackoff();
                    return;
                case 401:
                    this.beginBackoff();
                    throw new ClientError(`Your project key or secret key is invalid. Setting next polling interval to ${this.getPollingInterval()}ms. More information: https://posthog.com/docs/api#rate-limiting`);
                case 402:
                    console.warn('[FEATURE FLAGS] Feature flags quota limit exceeded - unsetting all local flags. Learn more about billing limits at https://posthog.com/docs/billing/limits-alerts');
                    this.featureFlags = [];
                    this.featureFlagsByKey = {};
                    this.groupTypeMapping = {};
                    this.cohorts = {};
                    return;
                case 403:
                    this.beginBackoff();
                    throw new ClientError(`Your secret key does not have permission to fetch feature flag definitions for local evaluation. Setting next polling interval to ${this.getPollingInterval()}ms. Are you sure you're using the correct secret and Project API key pair? More information: https://posthog.com/docs/api/overview`);
                case 429:
                    this.beginBackoff();
                    throw new ClientError(`You are being rate limited. Setting next polling interval to ${this.getPollingInterval()}ms. More information: https://posthog.com/docs/api#rate-limiting`);
                case 200:
                    {
                        const responseJson = await res.json() ?? {};
                        if (!('flags' in responseJson)) return void this.onError?.(new Error(`Invalid response when getting feature flags: ${JSON.stringify(responseJson)}`));
                        this.flagsEtag = res.headers?.get('ETag') ?? void 0;
                        const flagData = {
                            flags: responseJson.flags ?? [],
                            groupTypeMapping: responseJson.group_type_mapping || {},
                            cohorts: responseJson.cohorts || {}
                        };
                        this.updateFlagState(flagData);
                        this.flagDefinitionsLoadedAt = Date.now();
                        this.clearBackoff();
                        if (this.cacheProvider && shouldFetch) try {
                            await this.cacheProvider.onFlagDefinitionsReceived(flagData);
                        } catch (err) {
                            this.onError?.(new Error(`Failed to store in cache: ${err}`));
                        }
                        this.onLoad?.(this.featureFlags.length);
                        this.warnAboutExperienceContinuityFlags(flagData.flags);
                        break;
                    }
                default:
                    return;
            }
        } catch (err) {
            if (err instanceof ClientError) this.onError?.(err);
        }
    }
    getPersonalApiKeyRequestOptions(method = 'GET', etag) {
        const headers = {
            ...this.customHeaders,
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.personalApiKey}`
        };
        if (etag) headers['If-None-Match'] = etag;
        return {
            method,
            headers
        };
    }
    _requestFeatureFlagDefinitions() {
        const url = `${this.host}/flags/definitions?token=${this.projectApiKey}&send_cohorts`;
        const options = this.getPersonalApiKeyRequestOptions('GET', this.flagsEtag);
        let abortTimeout = null;
        if (this.timeout && 'number' == typeof this.timeout) {
            const controller = new AbortController();
            abortTimeout = safeSetTimeout(()=>{
                controller.abort();
            }, this.timeout);
            options.signal = controller.signal;
        }
        try {
            const fetch1 = this.fetch;
            return fetch1(url, options);
        } finally{
            clearTimeout(abortTimeout);
        }
    }
    async stopPoller(timeoutMs = 30000) {
        clearTimeout(this.poller);
        if (this.cacheProvider) try {
            const shutdownResult = this.cacheProvider.shutdown();
            if (shutdownResult instanceof Promise) await Promise.race([
                shutdownResult,
                new Promise((_, reject)=>setTimeout(()=>reject(new Error(`Cache shutdown timeout after ${timeoutMs}ms`)), timeoutMs))
            ]);
        } catch (err) {
            this.onError?.(new Error(`Error during cache shutdown: ${err}`));
        }
    }
}
async function _hash(key, bucketingValue, salt = '') {
    const hashString = await hashSHA1(`${key}.${bucketingValue}${salt}`);
    return parseInt(hashString.slice(0, 15), 16) / LONG_SCALE;
}
function matchProperty(property, propertyValues, warnFunction) {
    const key = property.key;
    const value = property.value;
    const operator = property.operator || 'exact';
    if (key in propertyValues) {
        if ('is_not_set' === operator) return false;
    } else {
        if ('is_not_set' === operator) return true;
        throw new InconclusiveMatchError(`Property ${key} not found in propertyValues`);
    }
    const overrideValue = propertyValues[key];
    if (null == overrideValue && !NULL_VALUES_ALLOWED_OPERATORS.includes(operator)) {
        if (warnFunction) warnFunction(`Property ${key} cannot have a value of null/undefined with the ${operator} operator`);
        return false;
    }
    function computeExactMatch(value, overrideValue) {
        if (Array.isArray(value)) return value.map((val)=>String(val).toLowerCase()).includes(String(overrideValue).toLowerCase());
        return String(value).toLowerCase() === String(overrideValue).toLowerCase();
    }
    function compare(lhs, rhs, operator) {
        if ('gt' === operator) return lhs > rhs;
        if ('gte' === operator) return lhs >= rhs;
        if ('lt' === operator) return lhs < rhs;
        if ('lte' === operator) return lhs <= rhs;
        throw new Error(`Invalid operator: ${operator}`);
    }
    switch(operator){
        case 'exact':
            return computeExactMatch(value, overrideValue);
        case 'is_not':
            return !computeExactMatch(value, overrideValue);
        case 'is_set':
            return key in propertyValues;
        case 'icontains':
            return String(overrideValue).toLowerCase().includes(String(value).toLowerCase());
        case 'not_icontains':
            return !String(overrideValue).toLowerCase().includes(String(value).toLowerCase());
        case 'regex':
            return isValidRegex(String(value)) && null !== String(overrideValue).match(String(value));
        case 'not_regex':
            return isValidRegex(String(value)) && null === String(overrideValue).match(String(value));
        case 'gt':
        case 'gte':
        case 'lt':
        case 'lte':
            {
                const parsedValue = 'number' == typeof value ? value : parseFloat(String(value));
                let parsedOverride;
                parsedOverride = 'number' == typeof overrideValue ? overrideValue : null != overrideValue ? parseFloat(String(overrideValue)) : NaN;
                if (Number.isFinite(parsedValue) && Number.isFinite(parsedOverride)) return compare(parsedOverride, parsedValue, operator);
                return compare(String(overrideValue), String(value), operator);
            }
        case 'is_date_after':
        case 'is_date_before':
            {
                if ('boolean' == typeof value) throw new InconclusiveMatchError("Date operations cannot be performed on boolean values");
                let parsedDate = relativeDateParseForFeatureFlagMatching(String(value));
                if (null == parsedDate) parsedDate = convertToDateTime(value);
                if (null == parsedDate) throw new InconclusiveMatchError(`Invalid date: ${value}`);
                const overrideDate = convertToDateTime(overrideValue);
                if ([
                    'is_date_before'
                ].includes(operator)) return overrideDate < parsedDate;
                return overrideDate > parsedDate;
            }
        case 'semver_eq':
            {
                const cmp = compareSemverTuples(parseSemver(String(overrideValue)), parseSemver(String(value)));
                return 0 === cmp;
            }
        case 'semver_neq':
            {
                const cmp = compareSemverTuples(parseSemver(String(overrideValue)), parseSemver(String(value)));
                return 0 !== cmp;
            }
        case 'semver_gt':
            {
                const cmp = compareSemverTuples(parseSemver(String(overrideValue)), parseSemver(String(value)));
                return cmp > 0;
            }
        case 'semver_gte':
            {
                const cmp = compareSemverTuples(parseSemver(String(overrideValue)), parseSemver(String(value)));
                return cmp >= 0;
            }
        case 'semver_lt':
            {
                const cmp = compareSemverTuples(parseSemver(String(overrideValue)), parseSemver(String(value)));
                return cmp < 0;
            }
        case 'semver_lte':
            {
                const cmp = compareSemverTuples(parseSemver(String(overrideValue)), parseSemver(String(value)));
                return cmp <= 0;
            }
        case 'semver_tilde':
            {
                const overrideParsed = parseSemver(String(overrideValue));
                const { lower, upper } = computeTildeBounds(String(value));
                return compareSemverTuples(overrideParsed, lower) >= 0 && compareSemverTuples(overrideParsed, upper) < 0;
            }
        case 'semver_caret':
            {
                const overrideParsed = parseSemver(String(overrideValue));
                const { lower, upper } = computeCaretBounds(String(value));
                return compareSemverTuples(overrideParsed, lower) >= 0 && compareSemverTuples(overrideParsed, upper) < 0;
            }
        case 'semver_wildcard':
            {
                const overrideParsed = parseSemver(String(overrideValue));
                const { lower, upper } = computeWildcardBounds(String(value));
                return compareSemverTuples(overrideParsed, lower) >= 0 && compareSemverTuples(overrideParsed, upper) < 0;
            }
        default:
            throw new InconclusiveMatchError(`Unknown operator: ${operator}`);
    }
}
function checkCohortExists(cohortId, cohortProperties) {
    if (!(cohortId in cohortProperties)) throw new RequiresServerEvaluation(`cohort ${cohortId} not found in local cohorts - likely a static cohort that requires server evaluation`);
}
async function matchCohort(property, propertyValues, cohortProperties, debugMode = false, flagDependencyEvaluator) {
    const cohortId = String(property.value);
    checkCohortExists(cohortId, cohortProperties);
    const propertyGroup = cohortProperties[cohortId];
    return matchPropertyGroup(propertyGroup, propertyValues, cohortProperties, debugMode, flagDependencyEvaluator);
}
async function matchPropertyGroup(propertyGroup, propertyValues, cohortProperties, debugMode = false, flagDependencyEvaluator) {
    if (!propertyGroup) return true;
    const propertyGroupType = propertyGroup.type;
    const properties = propertyGroup.values;
    if (!properties || 0 === properties.length) return true;
    let errorMatchingLocally = false;
    if ('values' in properties[0]) {
        for (const prop of properties)try {
            const matches = await matchPropertyGroup(prop, propertyValues, cohortProperties, debugMode, flagDependencyEvaluator);
            if ('AND' === propertyGroupType) {
                if (!matches) return false;
            } else if (matches) return true;
        } catch (err) {
            if (err instanceof RequiresServerEvaluation) throw err;
            if (err instanceof InconclusiveMatchError) {
                if (debugMode) console.debug(`Failed to compute property ${prop} locally: ${err}`);
                errorMatchingLocally = true;
            } else throw err;
        }
        if (errorMatchingLocally) throw new InconclusiveMatchError("Can't match cohort without a given cohort property value");
        return 'AND' === propertyGroupType;
    }
    for (const prop of properties)try {
        let matches;
        if ('cohort' === prop.type) matches = await matchCohort(prop, propertyValues, cohortProperties, debugMode, flagDependencyEvaluator);
        else if ('flag' === prop.type) {
            if (!flagDependencyEvaluator) throw new InconclusiveMatchError(`Flag dependency '${prop.key || 'unknown'}' cannot be evaluated without a flag dependency evaluator`);
            matches = await flagDependencyEvaluator(prop);
        } else matches = matchProperty(prop, propertyValues);
        const negation = prop.negation || false;
        if ('AND' === propertyGroupType) {
            if (!matches && !negation) return false;
            if (matches && negation) return false;
        } else {
            if (matches && !negation) return true;
            if (!matches && negation) return true;
        }
    } catch (err) {
        if (err instanceof RequiresServerEvaluation) throw err;
        if (err instanceof InconclusiveMatchError) {
            if (debugMode) console.debug(`Failed to compute property ${prop} locally: ${err}`);
            errorMatchingLocally = true;
        } else throw err;
    }
    if (errorMatchingLocally) throw new InconclusiveMatchError("can't match cohort without a given cohort property value");
    return 'AND' === propertyGroupType;
}
function isValidRegex(regex) {
    try {
        new RegExp(regex);
        return true;
    } catch (err) {
        return false;
    }
}
function parseSemverNumericIdentifier(part, raw) {
    if (!/^\d+$/.test(part)) throw new InconclusiveMatchError(`Invalid semver: ${raw}`);
    if (part.length > 1 && '0' === part[0]) throw new InconclusiveMatchError(`Invalid semver: ${raw}`);
    return parseInt(part, 10);
}
function parseSemver(value) {
    const text = String(value).trim().replace(/^[vV]/, '');
    const baseVersion = text.split('-')[0].split('+')[0];
    if (!baseVersion || baseVersion.startsWith('.')) throw new InconclusiveMatchError(`Invalid semver: ${value}`);
    const parts = baseVersion.split('.');
    const parsePart = (part)=>{
        if (void 0 === part || '' === part) return 0;
        return parseSemverNumericIdentifier(part, value);
    };
    const major = parsePart(parts[0]);
    const minor = parsePart(parts[1]);
    const patch = parsePart(parts[2]);
    return [
        major,
        minor,
        patch
    ];
}
function compareSemverTuples(a, b) {
    for(let i = 0; i < 3; i++){
        if (a[i] < b[i]) return -1;
        if (a[i] > b[i]) return 1;
    }
    return 0;
}
function computeTildeBounds(value) {
    const parsed = parseSemver(value);
    const lower = [
        parsed[0],
        parsed[1],
        parsed[2]
    ];
    const upper = [
        parsed[0],
        parsed[1] + 1,
        0
    ];
    return {
        lower,
        upper
    };
}
function computeCaretBounds(value) {
    const parsed = parseSemver(value);
    const [major, minor, patch] = parsed;
    const lower = [
        major,
        minor,
        patch
    ];
    let upper;
    upper = major > 0 ? [
        major + 1,
        0,
        0
    ] : minor > 0 ? [
        0,
        minor + 1,
        0
    ] : [
        0,
        0,
        patch + 1
    ];
    return {
        lower,
        upper
    };
}
function computeWildcardBounds(value) {
    const text = String(value).trim().replace(/^[vV]/, '');
    const cleanedText = text.replace(/\.\*$/, '').replace(/\*$/, '');
    if (!cleanedText) throw new InconclusiveMatchError(`Invalid wildcard semver: ${value}`);
    const parts = cleanedText.split('.');
    const parseWildcardPart = (part)=>{
        try {
            return parseSemverNumericIdentifier(part, value);
        } catch  {
            throw new InconclusiveMatchError(`Invalid wildcard semver: ${value}`);
        }
    };
    const major = parseWildcardPart(parts[0]);
    let lower;
    let upper;
    if (1 === parts.length) {
        lower = [
            major,
            0,
            0
        ];
        upper = [
            major + 1,
            0,
            0
        ];
    } else {
        const minor = parseWildcardPart(parts[1]);
        lower = [
            major,
            minor,
            0
        ];
        upper = [
            major,
            minor + 1,
            0
        ];
    }
    return {
        lower,
        upper
    };
}
function convertToDateTime(value) {
    if (value instanceof Date) return value;
    if ('string' == typeof value || 'number' == typeof value) {
        const date = new Date(value);
        if (!isNaN(date.valueOf())) return date;
        throw new InconclusiveMatchError(`${value} is in an invalid date format`);
    }
    throw new InconclusiveMatchError(`The date provided ${value} must be a string, number, or date object`);
}
function relativeDateParseForFeatureFlagMatching(value) {
    const regex = /^-?(?<number>[0-9]+)(?<interval>[a-z])$/;
    const match = value.match(regex);
    const parsedDt = new Date(new Date().toISOString());
    if (!match) return null;
    {
        if (!match.groups) return null;
        const number = parseInt(match.groups['number']);
        if (number >= 10000) return null;
        const interval = match.groups['interval'];
        if ('h' == interval) parsedDt.setUTCHours(parsedDt.getUTCHours() - number);
        else if ('d' == interval) parsedDt.setUTCDate(parsedDt.getUTCDate() - number);
        else if ('w' == interval) parsedDt.setUTCDate(parsedDt.getUTCDate() - 7 * number);
        else if ('m' == interval) parsedDt.setUTCMonth(parsedDt.getUTCMonth() - number);
        else {
            if ('y' != interval) return null;
            parsedDt.setUTCFullYear(parsedDt.getUTCFullYear() - number);
        }
        return parsedDt;
    }
}
export { ClientError, FeatureFlagsPoller, InconclusiveMatchError, RequiresServerEvaluation, matchProperty, parseSemver, relativeDateParseForFeatureFlagMatching };
