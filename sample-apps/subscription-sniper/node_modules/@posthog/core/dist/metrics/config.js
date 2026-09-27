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
    resolveMetricsConfig: ()=>resolveMetricsConfig
});
const DEFAULT_FLUSH_INTERVAL_MS = 10000;
const DEFAULT_MAX_SERIES_PER_FLUSH = 1000;
function resolveMetricsConfig(config) {
    const resourceAttributes = config?.resourceAttributes;
    return {
        serviceName: resourceAttributes?.['service.name'] ?? config?.serviceName,
        serviceVersion: resourceAttributes?.['service.version'] ?? config?.serviceVersion,
        environment: resourceAttributes?.['deployment.environment'] ?? config?.environment,
        resourceAttributes,
        beforeSend: config?.beforeSend,
        flushIntervalMs: config?.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS,
        maxSeriesPerFlush: config?.maxSeriesPerFlush ?? DEFAULT_MAX_SERIES_PER_FLUSH
    };
}
exports.resolveMetricsConfig = __webpack_exports__.resolveMetricsConfig;
for(var __webpack_i__ in __webpack_exports__)if (-1 === [
    "resolveMetricsConfig"
].indexOf(__webpack_i__)) exports[__webpack_i__] = __webpack_exports__[__webpack_i__];
Object.defineProperty(exports, '__esModule', {
    value: true
});
