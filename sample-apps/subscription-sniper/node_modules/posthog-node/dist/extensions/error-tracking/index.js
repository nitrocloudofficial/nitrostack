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
    default: ()=>ErrorTracking
});
const external_autocapture_js_namespaceObject = require("./autocapture.js");
const core_namespaceObject = require("@posthog/core");
const SHUTDOWN_TIMEOUT = 2000;
class ErrorTracking {
    constructor(client, options, _logger){
        this.client = client;
        this._exceptionAutocaptureEnabled = options.enableExceptionAutocapture || false;
        this._logger = _logger;
        this._rateLimiter = new core_namespaceObject.BucketedRateLimiter({
            ...(0, core_namespaceObject.resolveExceptionRateLimiterConfig)(options),
            refillInterval: 10000,
            _logger: this._logger
        });
        this.startAutocaptureIfEnabled();
    }
    static isPreviouslyCapturedError(x) {
        return (0, core_namespaceObject.isObject)(x) && '__posthog_previously_captured_error' in x && true === x.__posthog_previously_captured_error;
    }
    static async buildEventMessage(builder, error, hint, distinctId, additionalProperties) {
        const properties = {
            ...additionalProperties
        };
        const exceptionProperties = builder.buildFromUnknown(error, hint);
        exceptionProperties.$exception_list = await builder.modifyFrames(exceptionProperties.$exception_list);
        return {
            event: '$exception',
            distinctId: distinctId,
            properties: {
                ...exceptionProperties,
                ...properties
            },
            _originatedFromCaptureException: true
        };
    }
    startAutocaptureIfEnabled() {
        if (this.isEnabled()) {
            (0, external_autocapture_js_namespaceObject.addUncaughtExceptionListener)(this.onException.bind(this), this.onFatalError.bind(this));
            (0, external_autocapture_js_namespaceObject.addUnhandledRejectionListener)(this.onException.bind(this));
        }
    }
    onException(exception, hint) {
        this.client.addPendingPromise((async ()=>{
            if (!ErrorTracking.isPreviouslyCapturedError(exception)) {
                const eventMessage = await ErrorTracking.buildEventMessage(this.client.getErrorPropertiesBuilder(), exception, hint);
                const exceptionProperties = eventMessage.properties;
                const exceptionType = exceptionProperties?.$exception_list[0]?.type ?? 'Exception';
                const isRateLimited = this._rateLimiter.consumeRateLimit(exceptionType);
                if (isRateLimited) return void this._logger.info('Skipping exception capture because of client rate limiting.', {
                    exception: exceptionType
                });
                return this.client._capturePreparedEvent(eventMessage, false);
            }
        })());
    }
    async onFatalError(exception) {
        console.error(exception);
        await this.client.shutdown(SHUTDOWN_TIMEOUT);
        globalThis.process.exit(1);
    }
    isEnabled() {
        return !this.client.isDisabled && this._exceptionAutocaptureEnabled;
    }
    shutdown() {
        this._rateLimiter.stop();
    }
}
exports["default"] = __webpack_exports__["default"];
for(var __webpack_i__ in __webpack_exports__)if (-1 === [
    "default"
].indexOf(__webpack_i__)) exports[__webpack_i__] = __webpack_exports__[__webpack_i__];
Object.defineProperty(exports, '__esModule', {
    value: true
});
