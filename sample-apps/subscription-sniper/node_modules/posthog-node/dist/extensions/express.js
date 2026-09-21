"use strict";
var __webpack_require__ = {};
(()=>{
    __webpack_require__.n = (module)=>{
        var getter = module && module.__esModule ? ()=>module['default'] : ()=>module;
        __webpack_require__.d(getter, {
            a: getter
        });
        return getter;
    };
})();
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
    setupExpressRequestContext: ()=>setupExpressRequestContext,
    setupExpressErrorHandler: ()=>setupExpressErrorHandler
});
const index_js_namespaceObject = require("./error-tracking/index.js");
var index_js_default = /*#__PURE__*/ __webpack_require__.n(index_js_namespaceObject);
const external_tracing_headers_js_namespaceObject = require("./tracing-headers.js");
const external_url_utils_js_namespaceObject = require("./url-utils.js");
function getClientIp(req) {
    const forwarded = (0, external_tracing_headers_js_namespaceObject.getFirstHeaderValue)(req.headers['x-forwarded-for']);
    if (forwarded) {
        const ip = forwarded.split(',')[0].trim();
        if (ip) return ip;
    }
    return req.socket?.remoteAddress;
}
function buildRequestContextData(posthog, req) {
    const { sessionId, distinctId } = (0, external_tracing_headers_js_namespaceObject.getPostHogTracingHeaderValues)(req.headers);
    const properties = {};
    const disableCaptureUrlHashes = true === posthog.options.disable_capture_url_hashes;
    (0, external_tracing_headers_js_namespaceObject.addProperty)(properties, '$current_url', (0, external_url_utils_js_namespaceObject.normalizeRequestCurrentUrl)(req.originalUrl || req.url, disableCaptureUrlHashes));
    (0, external_tracing_headers_js_namespaceObject.addProperty)(properties, '$request_method', req.method);
    (0, external_tracing_headers_js_namespaceObject.addProperty)(properties, '$request_path', (0, external_url_utils_js_namespaceObject.normalizeRequestPath)(req.path, disableCaptureUrlHashes));
    (0, external_tracing_headers_js_namespaceObject.addProperty)(properties, '$user_agent', (0, external_tracing_headers_js_namespaceObject.getFirstHeaderValue)(req.headers['user-agent']));
    (0, external_tracing_headers_js_namespaceObject.addProperty)(properties, '$ip', getClientIp(req));
    return {
        ...void 0 !== sessionId ? {
            sessionId
        } : {},
        ...void 0 !== distinctId ? {
            distinctId
        } : {},
        properties
    };
}
function setupExpressRequestContext(_posthog, app) {
    app.use(posthogRequestContext(_posthog));
}
function posthogRequestContext(posthog) {
    return (req, _res, next)=>{
        posthog.withContext(buildRequestContextData(posthog, req), ()=>next());
    };
}
function setupExpressErrorHandler(_posthog, app) {
    app.use(posthogErrorHandler(_posthog));
}
function posthogErrorHandler(posthog) {
    return (error, req, res, next)=>{
        if (index_js_default().isPreviouslyCapturedError(error)) return void next(error);
        const contextData = buildRequestContextData(posthog, req);
        const syntheticException = new Error('Synthetic exception');
        const hint = {
            mechanism: {
                type: 'middleware',
                handled: false
            },
            syntheticException
        };
        const additionalProperties = {
            ...void 0 !== contextData.sessionId ? {
                $session_id: contextData.sessionId
            } : {},
            ...contextData.properties || {},
            $response_status_code: res.statusCode
        };
        posthog.addPendingPromise(index_js_default().buildEventMessage(posthog.getErrorPropertiesBuilder(), error, hint, contextData.distinctId, additionalProperties).then((msg)=>posthog._capturePreparedEvent(msg, false)));
        next(error);
    };
}
exports.setupExpressErrorHandler = __webpack_exports__.setupExpressErrorHandler;
exports.setupExpressRequestContext = __webpack_exports__.setupExpressRequestContext;
for(var __webpack_i__ in __webpack_exports__)if (-1 === [
    "setupExpressErrorHandler",
    "setupExpressRequestContext"
].indexOf(__webpack_i__)) exports[__webpack_i__] = __webpack_exports__[__webpack_i__];
Object.defineProperty(exports, '__esModule', {
    value: true
});
