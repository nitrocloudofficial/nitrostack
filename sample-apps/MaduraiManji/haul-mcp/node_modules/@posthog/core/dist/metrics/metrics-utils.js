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
    bucketIndexFor: ()=>bucketIndexFor,
    buildMetricsResourceAttributes: ()=>buildMetricsResourceAttributes,
    buildOtlpMetricsPayload: ()=>buildOtlpMetricsPayload,
    msToUnixNano: ()=>msToUnixNano,
    seriesKey: ()=>seriesKey,
    DEFAULT_HISTOGRAM_BOUNDS: ()=>DEFAULT_HISTOGRAM_BOUNDS
});
const logs_utils_js_namespaceObject = require("../logs/logs-utils.js");
const DEFAULT_HISTOGRAM_BOUNDS = [
    0,
    5,
    10,
    25,
    50,
    75,
    100,
    250,
    500,
    750,
    1000,
    2500,
    5000,
    7500,
    10000
];
function msToUnixNano(ms) {
    return String(ms) + '000000';
}
function seriesKey(type, name, unit, attributes) {
    let attrsKey = '';
    if (attributes) {
        const keys = Object.keys(attributes).sort();
        attrsKey = keys.map((k)=>`${JSON.stringify(k)}:${JSON.stringify(attributes[k])}`).join(',');
    }
    return `${type}\u0000${name}\u0000${unit ?? ''}\u0000${attrsKey}`;
}
function bucketIndexFor(value, bounds) {
    for(let i = 0; i < bounds.length; i++)if (value <= bounds[i]) return i;
    return bounds.length;
}
function buildMetricsResourceAttributes(config, scopeName, scopeVersion) {
    return {
        ...config.resourceAttributes,
        'service.name': config.serviceName || 'unknown_service',
        ...config.environment && {
            'deployment.environment': config.environment
        },
        ...config.serviceVersion && {
            'service.version': config.serviceVersion
        },
        'telemetry.sdk.name': scopeName,
        'telemetry.sdk.version': scopeVersion
    };
}
function buildOtlpMetricsPayload(metrics, resourceAttributes, scopeName, scopeVersion) {
    return {
        resourceMetrics: [
            {
                resource: {
                    attributes: (0, logs_utils_js_namespaceObject.toOtlpKeyValueList)(resourceAttributes)
                },
                scopeMetrics: [
                    {
                        scope: {
                            name: scopeName,
                            version: scopeVersion
                        },
                        metrics
                    }
                ]
            }
        ]
    };
}
exports.DEFAULT_HISTOGRAM_BOUNDS = __webpack_exports__.DEFAULT_HISTOGRAM_BOUNDS;
exports.bucketIndexFor = __webpack_exports__.bucketIndexFor;
exports.buildMetricsResourceAttributes = __webpack_exports__.buildMetricsResourceAttributes;
exports.buildOtlpMetricsPayload = __webpack_exports__.buildOtlpMetricsPayload;
exports.msToUnixNano = __webpack_exports__.msToUnixNano;
exports.seriesKey = __webpack_exports__.seriesKey;
for(var __webpack_i__ in __webpack_exports__)if (-1 === [
    "DEFAULT_HISTOGRAM_BOUNDS",
    "bucketIndexFor",
    "buildMetricsResourceAttributes",
    "buildOtlpMetricsPayload",
    "msToUnixNano",
    "seriesKey"
].indexOf(__webpack_i__)) exports[__webpack_i__] = __webpack_exports__[__webpack_i__];
Object.defineProperty(exports, '__esModule', {
    value: true
});
