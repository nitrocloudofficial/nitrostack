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
    resolveExceptionRateLimiterConfig: ()=>resolveExceptionRateLimiterConfig,
    DEFAULT_EXCEPTION_RATE_LIMITER_BUCKET_SIZE: ()=>DEFAULT_EXCEPTION_RATE_LIMITER_BUCKET_SIZE,
    DEFAULT_EXCEPTION_RATE_LIMITER_REFILL_RATE: ()=>DEFAULT_EXCEPTION_RATE_LIMITER_REFILL_RATE,
    BucketedRateLimiter: ()=>BucketedRateLimiter
});
const external_number_utils_js_namespaceObject = require("./number-utils.js");
const ONE_DAY_IN_MS = 86400000;
const DEFAULT_EXCEPTION_RATE_LIMITER_REFILL_RATE = 1;
const DEFAULT_EXCEPTION_RATE_LIMITER_BUCKET_SIZE = 10;
function resolveExceptionRateLimiterConfig(config = {}) {
    return {
        refillRate: config.exceptionRateLimiterRefillRate ?? config.__exceptionRateLimiterRefillRate ?? DEFAULT_EXCEPTION_RATE_LIMITER_REFILL_RATE,
        bucketSize: config.exceptionRateLimiterBucketSize ?? config.__exceptionRateLimiterBucketSize ?? DEFAULT_EXCEPTION_RATE_LIMITER_BUCKET_SIZE
    };
}
class BucketedRateLimiter {
    constructor(options){
        this._buckets = {};
        this._onBucketRateLimited = options._onBucketRateLimited;
        this._bucketSize = (0, external_number_utils_js_namespaceObject.clampToRange)(options.bucketSize, 0, 100, options._logger);
        this._refillRate = (0, external_number_utils_js_namespaceObject.clampToRange)(options.refillRate, 0, this._bucketSize, options._logger);
        this._refillInterval = (0, external_number_utils_js_namespaceObject.clampToRange)(options.refillInterval, 0, ONE_DAY_IN_MS, options._logger);
    }
    _applyRefill(bucket, now) {
        const elapsedMs = now - bucket.lastAccess;
        const refillIntervals = Math.floor(elapsedMs / this._refillInterval);
        if (refillIntervals > 0) {
            const tokensToAdd = refillIntervals * this._refillRate;
            bucket.tokens = Math.min(bucket.tokens + tokensToAdd, this._bucketSize);
            bucket.lastAccess = bucket.lastAccess + refillIntervals * this._refillInterval;
        }
    }
    consumeRateLimit(key) {
        const now = Date.now();
        const keyStr = String(key);
        let bucket = this._buckets[keyStr];
        if (bucket) this._applyRefill(bucket, now);
        else {
            bucket = {
                tokens: this._bucketSize,
                lastAccess: now
            };
            this._buckets[keyStr] = bucket;
        }
        if (0 === bucket.tokens) return true;
        bucket.tokens--;
        if (0 === bucket.tokens) this._onBucketRateLimited?.(key);
        return 0 === bucket.tokens;
    }
    stop() {
        this._buckets = {};
    }
}
exports.BucketedRateLimiter = __webpack_exports__.BucketedRateLimiter;
exports.DEFAULT_EXCEPTION_RATE_LIMITER_BUCKET_SIZE = __webpack_exports__.DEFAULT_EXCEPTION_RATE_LIMITER_BUCKET_SIZE;
exports.DEFAULT_EXCEPTION_RATE_LIMITER_REFILL_RATE = __webpack_exports__.DEFAULT_EXCEPTION_RATE_LIMITER_REFILL_RATE;
exports.resolveExceptionRateLimiterConfig = __webpack_exports__.resolveExceptionRateLimiterConfig;
for(var __webpack_i__ in __webpack_exports__)if (-1 === [
    "BucketedRateLimiter",
    "DEFAULT_EXCEPTION_RATE_LIMITER_BUCKET_SIZE",
    "DEFAULT_EXCEPTION_RATE_LIMITER_REFILL_RATE",
    "resolveExceptionRateLimiterConfig"
].indexOf(__webpack_i__)) exports[__webpack_i__] = __webpack_exports__[__webpack_i__];
Object.defineProperty(exports, '__esModule', {
    value: true
});
