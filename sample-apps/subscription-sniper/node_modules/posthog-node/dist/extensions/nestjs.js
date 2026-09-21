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
    PostHogInterceptor: ()=>PostHogInterceptor
});
const external_rxjs_namespaceObject = require("rxjs");
const operators_namespaceObject = require("rxjs/operators");
const index_js_namespaceObject = require("./error-tracking/index.js");
var index_js_default = /*#__PURE__*/ __webpack_require__.n(index_js_namespaceObject);
const external_tracing_headers_js_namespaceObject = require("./tracing-headers.js");
const external_url_utils_js_namespaceObject = require("./url-utils.js");
function getClientIp(headers, request) {
    const forwarded = (0, external_tracing_headers_js_namespaceObject.getFirstHeaderValue)(headers['x-forwarded-for']);
    if (forwarded) {
        const ip = forwarded.split(',')[0].trim();
        if (ip) return ip;
    }
    return request?.socket?.remoteAddress;
}
function getExceptionStatus(exception) {
    if (exception && 'object' == typeof exception && 'getStatus' in exception && 'function' == typeof exception.getStatus) {
        const status = exception.getStatus();
        return 'number' == typeof status ? status : void 0;
    }
}
class PostHogInterceptor {
    constructor(posthog, options){
        this.posthog = posthog;
        const capture = options?.captureExceptions;
        this.captureExceptions = !!capture;
        this.minStatusToCapture = ('object' == typeof capture ? capture.minStatusToCapture : void 0) ?? 500;
    }
    intercept(context, next) {
        const httpHost = context.switchToHttp();
        const request = httpHost.getRequest();
        const response = httpHost.getResponse();
        const headers = request?.headers ?? {};
        const { sessionId, distinctId } = (0, external_tracing_headers_js_namespaceObject.getPostHogTracingHeaderValues)(headers);
        const properties = {};
        const disableCaptureUrlHashes = true === this.posthog.options.disable_capture_url_hashes;
        (0, external_tracing_headers_js_namespaceObject.addProperty)(properties, '$current_url', (0, external_url_utils_js_namespaceObject.normalizeRequestCurrentUrl)(request?.url, disableCaptureUrlHashes));
        (0, external_tracing_headers_js_namespaceObject.addProperty)(properties, '$request_method', request?.method);
        (0, external_tracing_headers_js_namespaceObject.addProperty)(properties, '$request_path', (0, external_url_utils_js_namespaceObject.normalizeRequestPath)(request?.path ?? request?.url, disableCaptureUrlHashes));
        (0, external_tracing_headers_js_namespaceObject.addProperty)(properties, '$user_agent', (0, external_tracing_headers_js_namespaceObject.getFirstHeaderValue)(headers['user-agent']));
        (0, external_tracing_headers_js_namespaceObject.addProperty)(properties, '$ip', getClientIp(headers, request));
        const contextData = {
            ...void 0 !== sessionId ? {
                sessionId
            } : {},
            ...void 0 !== distinctId ? {
                distinctId
            } : {},
            properties
        };
        this.posthog.enterContext(contextData);
        let source = next.handle();
        if (this.captureExceptions) source = source.pipe((0, operators_namespaceObject.catchError)((exception)=>{
            if (index_js_default().isPreviouslyCapturedError(exception)) return (0, external_rxjs_namespaceObject.throwError)(()=>exception);
            const status = getExceptionStatus(exception);
            if (void 0 !== status && status < this.minStatusToCapture) return (0, external_rxjs_namespaceObject.throwError)(()=>exception);
            const responseStatus = status ?? response?.statusCode;
            const additionalProperties = void 0 !== responseStatus ? {
                $response_status_code: responseStatus
            } : void 0;
            this.posthog.captureException(exception, distinctId, additionalProperties);
            return (0, external_rxjs_namespaceObject.throwError)(()=>exception);
        }));
        return source;
    }
}
exports.PostHogInterceptor = __webpack_exports__.PostHogInterceptor;
for(var __webpack_i__ in __webpack_exports__)if (-1 === [
    "PostHogInterceptor"
].indexOf(__webpack_i__)) exports[__webpack_i__] = __webpack_exports__[__webpack_i__];
Object.defineProperty(exports, '__esModule', {
    value: true
});
