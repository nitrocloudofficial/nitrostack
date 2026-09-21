"use strict";
var __webpack_require__ = {};
(()=>{
    __webpack_require__.d = (exports1, definition)=>{
        for(var key in definition)if (__webpack_require__.o(definition, key) && !__webpack_require__.o(exports1, key)) Object.defineProperty(exports1, key, {
            enumerable: true,
            get: definition[key]
        });
    };
})();
(()=>{
    __webpack_require__.o = (obj, prop)=>Object.prototype.hasOwnProperty.call(obj, prop);
})();
(()=>{
    __webpack_require__.r = (exports1)=>{
        if ('undefined' != typeof Symbol && Symbol.toStringTag) Object.defineProperty(exports1, Symbol.toStringTag, {
            value: 'Module'
        });
        Object.defineProperty(exports1, '__esModule', {
            value: true
        });
    };
})();
var __webpack_exports__ = {};
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
    V1CaptureSender: ()=>V1CaptureSender
});
const core_namespaceObject = require("@posthog/core");
const external_errors_js_namespaceObject = require("./errors.js");
const external_transform_js_namespaceObject = require("./transform.js");
const V1_ANALYTICS_PATH = '/i/v1/analytics/events';
const DEFAULT_MAX_BACKOFF_MS = 30000;
const RETRYABLE_STATUSES = new Set([
    408,
    500,
    502,
    503,
    504
]);
class V1CaptureSender {
    constructor(config, hooks){
        this.config = config;
        this.maxBackoffMs = config.maxBackoffMs ?? DEFAULT_MAX_BACKOFF_MS;
        this.fetchFn = hooks.fetch;
        this.onError = hooks.onError;
        this.now = hooks.now ?? Date.now;
        this.sleep = hooks.sleep ?? ((ms)=>new Promise((resolve)=>(0, core_namespaceObject.safeSetTimeout)(resolve, ms)));
        this.generateRequestId = hooks.generateRequestId ?? core_namespaceObject.uuidv7;
        this.compress = hooks.compress ?? core_namespaceObject.gzipCompress;
    }
    async sendV1Batch(messages) {
        if (0 === messages.length) return;
        const requestId = this.generateRequestId();
        const createdAt = new Date(this.now()).toISOString();
        const { batch } = (0, external_transform_js_namespaceObject.buildV1Batch)(messages, {
            createdAt,
            historicalMigration: this.config.historicalMigration
        });
        const url = `${this.config.host}${V1_ANALYTICS_PATH}`;
        const drops = [];
        let pending = batch;
        const maxAttempts = Math.max(1, this.config.maxAttempts);
        for(let attempt = 1; attempt <= maxAttempts; attempt++){
            const isLastAttempt = attempt === maxAttempts;
            const payload = (0, core_namespaceObject.safeJsonStringify)({
                created_at: createdAt,
                ...this.config.historicalMigration ? {
                    historical_migration: true
                } : {},
                batch: pending
            });
            let response;
            try {
                response = await this.sendOnce(url, payload, attempt, requestId);
            } catch (transportError) {
                if (isLastAttempt) return this.surfaceBatchFailure(requestId, drops, pending, transportError);
                await this.sleep(this.backoffDelay(attempt));
                continue;
            }
            const { status } = response;
            if (status < 200 || status >= 300) {
                if (!isLastAttempt && RETRYABLE_STATUSES.has(status)) {
                    const retryAfterMs = this.parseRetryAfter(response);
                    await this.cancelBody(response);
                    await this.sleep(this.backoffDelay(attempt, retryAfterMs));
                    continue;
                }
                const httpError = await this.buildHttpError(response, status);
                return this.surfaceBatchFailure(requestId, drops, pending, httpError);
            }
            let parsed;
            try {
                parsed = await this.parseResponse(response);
            } catch  {
                return this.surfaceBatchFailure(requestId, drops, pending, new Error(`Capture V1 returned an unparseable ${status} response body`));
            }
            const retryable = this.classify(pending, parsed, drops);
            if (0 === retryable.length) return this.surfacePartialDrops(requestId, drops);
            if (isLastAttempt) return void this.onError(new external_errors_js_namespaceObject.CaptureV1Error({
                requestId,
                drops,
                retryExhausted: retryable.map((event)=>event.uuid)
            }));
            pending = retryable;
            const retryAfterMs = this.parseRetryAfter(response);
            await this.sleep(this.backoffDelay(attempt, retryAfterMs));
        }
    }
    async sendOnce(url, payload, attempt, requestId) {
        const headers = this.buildHeaders(attempt, requestId);
        let body = payload;
        if (this.config.compressionEnabled) {
            const compressed = await this.compress(payload, this.config.isDebug);
            if (null !== compressed) {
                body = compressed;
                headers['Content-Encoding'] = 'gzip';
            }
        }
        const controller = new AbortController();
        const timer = (0, core_namespaceObject.safeSetTimeout)(()=>controller.abort(), this.config.requestTimeoutMs);
        try {
            return await this.fetchFn(url, {
                method: 'POST',
                headers,
                body,
                signal: controller.signal
            });
        } finally{
            clearTimeout(timer);
        }
    }
    buildHeaders(attempt, requestId) {
        const sdkInfo = `${this.config.libraryId}/${this.config.libraryVersion}`;
        const headers = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.apiKey}`,
            'PostHog-Sdk-Info': sdkInfo,
            'PostHog-Attempt': String(attempt),
            'PostHog-Request-Id': requestId,
            'PostHog-Request-Timestamp': new Date(this.now()).toISOString()
        };
        if (this.config.userAgent) headers['User-Agent'] = this.config.userAgent;
        return headers;
    }
    classify(pending, parsed, drops) {
        const results = parsed.results ?? {};
        const retryable = [];
        for (const event of pending){
            const result = results[event.uuid];
            if (result) {
                if ('drop' === result.result) drops.push({
                    uuid: event.uuid,
                    details: result.details ?? void 0
                });
                else if ('retry' === result.result) retryable.push(event);
            }
        }
        return retryable;
    }
    backoffDelay(attempt, retryAfterMs) {
        const exponential = Math.min(this.config.initialRetryDelayMs * 2 ** (attempt - 1), this.maxBackoffMs);
        if (void 0 === retryAfterMs) return exponential;
        return Math.max(exponential, Math.min(retryAfterMs, this.maxBackoffMs));
    }
    parseRetryAfter(response) {
        const raw = response.headers?.get('Retry-After');
        if (!raw) return;
        const trimmed = raw.trim();
        if (/^\d+$/.test(trimmed)) {
            const seconds = parseInt(trimmed, 10);
            return Number.isFinite(seconds) && seconds > 0 ? 1000 * seconds : void 0;
        }
        const dateMs = Date.parse(trimmed);
        if (Number.isNaN(dateMs)) return;
        const delta = dateMs - this.now();
        return delta > 0 ? delta : void 0;
    }
    async parseResponse(response) {
        const text = await response.text();
        const parsed = JSON.parse(text);
        if ('object' != typeof parsed || null === parsed || Array.isArray(parsed)) throw new Error('unexpected response shape');
        const results = parsed.results;
        if (void 0 !== results && ('object' != typeof results || null === results || Array.isArray(results))) throw new Error('unexpected results shape');
        return {
            results: results ?? {}
        };
    }
    async buildHttpError(response, status) {
        let bodyText = '';
        try {
            bodyText = (await response.text()).slice(0, 512);
        } catch  {}
        const suffix = bodyText ? `: ${bodyText}` : '';
        return new Error(`Capture V1 request failed with HTTP ${status}${suffix}`);
    }
    surfaceBatchFailure(requestId, drops, pending, cause) {
        this.onError(new external_errors_js_namespaceObject.CaptureV1Error({
            requestId,
            drops,
            retryExhausted: pending.map((event)=>event.uuid),
            cause
        }));
    }
    surfacePartialDrops(requestId, drops) {
        if (drops.length > 0) this.onError(new external_errors_js_namespaceObject.CaptureV1Error({
            requestId,
            drops,
            retryExhausted: []
        }));
    }
    async cancelBody(response) {
        await response.body?.cancel()?.catch(()=>{});
    }
}
exports.V1CaptureSender = __webpack_exports__.V1CaptureSender;
for(var __webpack_i__ in __webpack_exports__)if (-1 === [
    "V1CaptureSender"
].indexOf(__webpack_i__)) exports[__webpack_i__] = __webpack_exports__[__webpack_i__];
Object.defineProperty(exports, '__esModule', {
    value: true
});
