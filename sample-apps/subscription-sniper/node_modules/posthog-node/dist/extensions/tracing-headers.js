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
    POSTHOG_TRACING_HEADERS: ()=>POSTHOG_TRACING_HEADERS,
    addProperty: ()=>addProperty,
    getFirstHeaderValue: ()=>getFirstHeaderValue,
    getPostHogTracingHeaderValues: ()=>getPostHogTracingHeaderValues,
    sanitizeTracingHeaderValue: ()=>sanitizeTracingHeaderValue
});
const TRACING_HEADER_MAX_LENGTH = 1000;
const TRACING_HEADER_CONTROL_CHARS_REGEX = /[\x00-\x1f\x7f-\x9f]/g;
const POSTHOG_TRACING_HEADERS = {
    sessionId: 'x-posthog-session-id',
    distinctId: 'x-posthog-distinct-id'
};
function addProperty(properties, key, value) {
    if (null != value && '' !== value) properties[key] = value;
}
function getFirstHeaderValue(value) {
    return Array.isArray(value) ? value[0] : value;
}
function sanitizeTracingHeaderValue(value) {
    if (Array.isArray(value)) {
        for (const item of value){
            const sanitized = sanitizeTracingHeaderValue(item);
            if (void 0 !== sanitized) return sanitized;
        }
        return;
    }
    if ('string' != typeof value) return;
    const sanitized = value.replace(TRACING_HEADER_CONTROL_CHARS_REGEX, '').trim();
    if (!sanitized) return;
    return sanitized.length > TRACING_HEADER_MAX_LENGTH ? sanitized.slice(0, TRACING_HEADER_MAX_LENGTH) : sanitized;
}
function getPostHogTracingHeaderValues(headers) {
    if (!headers) return {};
    const sessionId = sanitizeTracingHeaderValue(headers[POSTHOG_TRACING_HEADERS.sessionId]);
    const distinctId = sanitizeTracingHeaderValue(headers[POSTHOG_TRACING_HEADERS.distinctId]);
    return {
        ...void 0 !== sessionId ? {
            sessionId
        } : {},
        ...void 0 !== distinctId ? {
            distinctId
        } : {}
    };
}
exports.POSTHOG_TRACING_HEADERS = __webpack_exports__.POSTHOG_TRACING_HEADERS;
exports.addProperty = __webpack_exports__.addProperty;
exports.getFirstHeaderValue = __webpack_exports__.getFirstHeaderValue;
exports.getPostHogTracingHeaderValues = __webpack_exports__.getPostHogTracingHeaderValues;
exports.sanitizeTracingHeaderValue = __webpack_exports__.sanitizeTracingHeaderValue;
for(var __webpack_i__ in __webpack_exports__)if (-1 === [
    "POSTHOG_TRACING_HEADERS",
    "addProperty",
    "getFirstHeaderValue",
    "getPostHogTracingHeaderValues",
    "sanitizeTracingHeaderValue"
].indexOf(__webpack_i__)) exports[__webpack_i__] = __webpack_exports__[__webpack_i__];
Object.defineProperty(exports, '__esModule', {
    value: true
});
