"use strict";
var __webpack_modules__ = {
    "./cookie": function(module) {
        module.exports = require("./cookie.js");
    },
    "./error-tracking": function(module) {
        module.exports = require("./error-tracking/index.js");
    },
    "./featureFlagUtils": function(module) {
        module.exports = require("./featureFlagUtils.js");
    },
    "./gzip": function(module) {
        module.exports = require("./gzip.js");
    },
    "./logs": function(module) {
        module.exports = require("./logs/index.js");
    },
    "./logs/logs-utils": function(module) {
        module.exports = require("./logs/logs-utils.js");
    },
    "./metrics": function(module) {
        module.exports = require("./metrics/index.js");
    },
    "./posthog-core-stateless": function(module) {
        module.exports = require("./posthog-core-stateless.js");
    },
    "./posthog-core": function(module) {
        module.exports = require("./posthog-core.js");
    },
    "./surveys/validation": function(module) {
        module.exports = require("./surveys/validation.js");
    },
    "./tracing-headers": function(module) {
        module.exports = require("./tracing-headers.js");
    },
    "./types": function(module) {
        module.exports = require("./types.js");
    },
    "./utils?637c": function(module) {
        module.exports = require("./utils/index.js");
    },
    "./vendor/uuidv7": function(module) {
        module.exports = require("./vendor/uuidv7.js");
    }
};
var __webpack_module_cache__ = {};
function __webpack_require__(moduleId) {
    var cachedModule = __webpack_module_cache__[moduleId];
    if (void 0 !== cachedModule) return cachedModule.exports;
    var module = __webpack_module_cache__[moduleId] = {
        exports: {}
    };
    __webpack_modules__[moduleId](module, module.exports, __webpack_require__);
    return module.exports;
}
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
(()=>{
    __webpack_require__.r(__webpack_exports__);
    __webpack_require__.d(__webpack_exports__, {
        DEFAULT_HISTOGRAM_BOUNDS: ()=>_metrics__WEBPACK_IMPORTED_MODULE_6__.DEFAULT_HISTOGRAM_BOUNDS,
        ErrorTracking: ()=>_error_tracking__WEBPACK_IMPORTED_MODULE_3__,
        PostHogLogs: ()=>_logs__WEBPACK_IMPORTED_MODULE_5__.PostHogLogs,
        PostHogMetrics: ()=>_metrics__WEBPACK_IMPORTED_MODULE_6__.PostHogMetrics,
        buildMetricsResourceAttributes: ()=>_metrics__WEBPACK_IMPORTED_MODULE_6__.buildMetricsResourceAttributes,
        buildOtlpLogRecord: ()=>_logs_logs_utils__WEBPACK_IMPORTED_MODULE_4__.buildOtlpLogRecord,
        buildOtlpLogsPayload: ()=>_logs_logs_utils__WEBPACK_IMPORTED_MODULE_4__.buildOtlpLogsPayload,
        buildOtlpMetricsPayload: ()=>_metrics__WEBPACK_IMPORTED_MODULE_6__.buildOtlpMetricsPayload,
        buildResourceAttributes: ()=>_logs_logs_utils__WEBPACK_IMPORTED_MODULE_4__.buildResourceAttributes,
        flagDetailsToResults: ()=>_featureFlagUtils__WEBPACK_IMPORTED_MODULE_0__.flagDetailsToResults,
        getEnabledFromValue: ()=>_featureFlagUtils__WEBPACK_IMPORTED_MODULE_0__.getEnabledFromValue,
        getFeatureFlagValue: ()=>_featureFlagUtils__WEBPACK_IMPORTED_MODULE_0__.getFeatureFlagValue,
        getLengthFromRules: ()=>_surveys_validation__WEBPACK_IMPORTED_MODULE_13__.getLengthFromRules,
        getOtlpSeverityNumber: ()=>_logs_logs_utils__WEBPACK_IMPORTED_MODULE_4__.getOtlpSeverityNumber,
        getOtlpSeverityText: ()=>_logs_logs_utils__WEBPACK_IMPORTED_MODULE_4__.getOtlpSeverityText,
        getRequirementsHint: ()=>_surveys_validation__WEBPACK_IMPORTED_MODULE_13__.getRequirementsHint,
        getValidationError: ()=>_surveys_validation__WEBPACK_IMPORTED_MODULE_13__.getValidationError,
        getVariantFromValue: ()=>_featureFlagUtils__WEBPACK_IMPORTED_MODULE_0__.getVariantFromValue,
        gzipCompress: ()=>_gzip__WEBPACK_IMPORTED_MODULE_1__.gzipCompress,
        isGzipData: ()=>_gzip__WEBPACK_IMPORTED_MODULE_1__.isGzipData,
        isGzipRequest: ()=>_gzip__WEBPACK_IMPORTED_MODULE_1__.isGzipRequest,
        isGzipSupported: ()=>_gzip__WEBPACK_IMPORTED_MODULE_1__.isGzipSupported,
        isNativeAsyncGzipError: ()=>_gzip__WEBPACK_IMPORTED_MODULE_1__.isNativeAsyncGzipError,
        isNativeAsyncGzipReadError: ()=>_gzip__WEBPACK_IMPORTED_MODULE_1__.isNativeAsyncGzipReadError,
        parsePayload: ()=>_featureFlagUtils__WEBPACK_IMPORTED_MODULE_0__.parsePayload,
        resolveMetricsConfig: ()=>_metrics__WEBPACK_IMPORTED_MODULE_6__.resolveMetricsConfig,
        toOtlpAnyValue: ()=>_logs_logs_utils__WEBPACK_IMPORTED_MODULE_4__.toOtlpAnyValue,
        toOtlpKeyValueList: ()=>_logs_logs_utils__WEBPACK_IMPORTED_MODULE_4__.toOtlpKeyValueList,
        uuidv7: ()=>_vendor_uuidv7__WEBPACK_IMPORTED_MODULE_7__.uuidv7
    });
    var _featureFlagUtils__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./featureFlagUtils");
    var _gzip__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./gzip");
    var _utils__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__("./utils?637c");
    var __WEBPACK_REEXPORT_OBJECT__ = {};
    for(var __WEBPACK_IMPORT_KEY__ in _utils__WEBPACK_IMPORTED_MODULE_2__)if ([
        "isNativeAsyncGzipError",
        "getOtlpSeverityText",
        "PostHogMetrics",
        "getEnabledFromValue",
        "isNativeAsyncGzipReadError",
        "getVariantFromValue",
        "gzipCompress",
        "uuidv7",
        "ErrorTracking",
        "buildMetricsResourceAttributes",
        "parsePayload",
        "getLengthFromRules",
        "isGzipSupported",
        "buildOtlpLogsPayload",
        "flagDetailsToResults",
        "toOtlpAnyValue",
        "DEFAULT_HISTOGRAM_BOUNDS",
        "PostHogLogs",
        "isGzipRequest",
        "getFeatureFlagValue",
        "getValidationError",
        "default",
        "resolveMetricsConfig",
        "getRequirementsHint",
        "isGzipData",
        "getOtlpSeverityNumber",
        "buildResourceAttributes",
        "buildOtlpMetricsPayload",
        "buildOtlpLogRecord",
        "toOtlpKeyValueList"
    ].indexOf(__WEBPACK_IMPORT_KEY__) < 0) __WEBPACK_REEXPORT_OBJECT__[__WEBPACK_IMPORT_KEY__] = (function(key) {
        return _utils__WEBPACK_IMPORTED_MODULE_2__[key];
    }).bind(0, __WEBPACK_IMPORT_KEY__);
    __webpack_require__.d(__webpack_exports__, __WEBPACK_REEXPORT_OBJECT__);
    var _error_tracking__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__("./error-tracking");
    var _logs_logs_utils__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__("./logs/logs-utils");
    var _logs__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__("./logs");
    var _metrics__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__("./metrics");
    var _vendor_uuidv7__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__("./vendor/uuidv7");
    var _cookie__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__("./cookie");
    var __WEBPACK_REEXPORT_OBJECT__ = {};
    for(var __WEBPACK_IMPORT_KEY__ in _cookie__WEBPACK_IMPORTED_MODULE_8__)if ([
        "isNativeAsyncGzipError",
        "getOtlpSeverityText",
        "PostHogMetrics",
        "getEnabledFromValue",
        "isNativeAsyncGzipReadError",
        "getVariantFromValue",
        "gzipCompress",
        "uuidv7",
        "ErrorTracking",
        "buildMetricsResourceAttributes",
        "parsePayload",
        "getLengthFromRules",
        "isGzipSupported",
        "buildOtlpLogsPayload",
        "flagDetailsToResults",
        "toOtlpAnyValue",
        "DEFAULT_HISTOGRAM_BOUNDS",
        "PostHogLogs",
        "isGzipRequest",
        "getFeatureFlagValue",
        "getValidationError",
        "default",
        "resolveMetricsConfig",
        "getRequirementsHint",
        "isGzipData",
        "getOtlpSeverityNumber",
        "buildResourceAttributes",
        "buildOtlpMetricsPayload",
        "buildOtlpLogRecord",
        "toOtlpKeyValueList"
    ].indexOf(__WEBPACK_IMPORT_KEY__) < 0) __WEBPACK_REEXPORT_OBJECT__[__WEBPACK_IMPORT_KEY__] = (function(key) {
        return _cookie__WEBPACK_IMPORTED_MODULE_8__[key];
    }).bind(0, __WEBPACK_IMPORT_KEY__);
    __webpack_require__.d(__webpack_exports__, __WEBPACK_REEXPORT_OBJECT__);
    var _posthog_core__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__("./posthog-core");
    var __WEBPACK_REEXPORT_OBJECT__ = {};
    for(var __WEBPACK_IMPORT_KEY__ in _posthog_core__WEBPACK_IMPORTED_MODULE_9__)if ([
        "isNativeAsyncGzipError",
        "getOtlpSeverityText",
        "PostHogMetrics",
        "getEnabledFromValue",
        "isNativeAsyncGzipReadError",
        "getVariantFromValue",
        "gzipCompress",
        "uuidv7",
        "ErrorTracking",
        "buildMetricsResourceAttributes",
        "parsePayload",
        "getLengthFromRules",
        "isGzipSupported",
        "buildOtlpLogsPayload",
        "flagDetailsToResults",
        "toOtlpAnyValue",
        "DEFAULT_HISTOGRAM_BOUNDS",
        "PostHogLogs",
        "isGzipRequest",
        "getFeatureFlagValue",
        "getValidationError",
        "default",
        "resolveMetricsConfig",
        "getRequirementsHint",
        "isGzipData",
        "getOtlpSeverityNumber",
        "buildResourceAttributes",
        "buildOtlpMetricsPayload",
        "buildOtlpLogRecord",
        "toOtlpKeyValueList"
    ].indexOf(__WEBPACK_IMPORT_KEY__) < 0) __WEBPACK_REEXPORT_OBJECT__[__WEBPACK_IMPORT_KEY__] = (function(key) {
        return _posthog_core__WEBPACK_IMPORTED_MODULE_9__[key];
    }).bind(0, __WEBPACK_IMPORT_KEY__);
    __webpack_require__.d(__webpack_exports__, __WEBPACK_REEXPORT_OBJECT__);
    var _posthog_core_stateless__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__("./posthog-core-stateless");
    var __WEBPACK_REEXPORT_OBJECT__ = {};
    for(var __WEBPACK_IMPORT_KEY__ in _posthog_core_stateless__WEBPACK_IMPORTED_MODULE_10__)if ([
        "isNativeAsyncGzipError",
        "getOtlpSeverityText",
        "PostHogMetrics",
        "getEnabledFromValue",
        "isNativeAsyncGzipReadError",
        "getVariantFromValue",
        "gzipCompress",
        "uuidv7",
        "ErrorTracking",
        "buildMetricsResourceAttributes",
        "parsePayload",
        "getLengthFromRules",
        "isGzipSupported",
        "buildOtlpLogsPayload",
        "flagDetailsToResults",
        "toOtlpAnyValue",
        "DEFAULT_HISTOGRAM_BOUNDS",
        "PostHogLogs",
        "isGzipRequest",
        "getFeatureFlagValue",
        "getValidationError",
        "default",
        "resolveMetricsConfig",
        "getRequirementsHint",
        "isGzipData",
        "getOtlpSeverityNumber",
        "buildResourceAttributes",
        "buildOtlpMetricsPayload",
        "buildOtlpLogRecord",
        "toOtlpKeyValueList"
    ].indexOf(__WEBPACK_IMPORT_KEY__) < 0) __WEBPACK_REEXPORT_OBJECT__[__WEBPACK_IMPORT_KEY__] = (function(key) {
        return _posthog_core_stateless__WEBPACK_IMPORTED_MODULE_10__[key];
    }).bind(0, __WEBPACK_IMPORT_KEY__);
    __webpack_require__.d(__webpack_exports__, __WEBPACK_REEXPORT_OBJECT__);
    var _tracing_headers__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__("./tracing-headers");
    var __WEBPACK_REEXPORT_OBJECT__ = {};
    for(var __WEBPACK_IMPORT_KEY__ in _tracing_headers__WEBPACK_IMPORTED_MODULE_11__)if ([
        "isNativeAsyncGzipError",
        "getOtlpSeverityText",
        "PostHogMetrics",
        "getEnabledFromValue",
        "isNativeAsyncGzipReadError",
        "getVariantFromValue",
        "gzipCompress",
        "uuidv7",
        "ErrorTracking",
        "buildMetricsResourceAttributes",
        "parsePayload",
        "getLengthFromRules",
        "isGzipSupported",
        "buildOtlpLogsPayload",
        "flagDetailsToResults",
        "toOtlpAnyValue",
        "DEFAULT_HISTOGRAM_BOUNDS",
        "PostHogLogs",
        "isGzipRequest",
        "getFeatureFlagValue",
        "getValidationError",
        "default",
        "resolveMetricsConfig",
        "getRequirementsHint",
        "isGzipData",
        "getOtlpSeverityNumber",
        "buildResourceAttributes",
        "buildOtlpMetricsPayload",
        "buildOtlpLogRecord",
        "toOtlpKeyValueList"
    ].indexOf(__WEBPACK_IMPORT_KEY__) < 0) __WEBPACK_REEXPORT_OBJECT__[__WEBPACK_IMPORT_KEY__] = (function(key) {
        return _tracing_headers__WEBPACK_IMPORTED_MODULE_11__[key];
    }).bind(0, __WEBPACK_IMPORT_KEY__);
    __webpack_require__.d(__webpack_exports__, __WEBPACK_REEXPORT_OBJECT__);
    var _types__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__("./types");
    var __WEBPACK_REEXPORT_OBJECT__ = {};
    for(var __WEBPACK_IMPORT_KEY__ in _types__WEBPACK_IMPORTED_MODULE_12__)if ([
        "isNativeAsyncGzipError",
        "getOtlpSeverityText",
        "PostHogMetrics",
        "getEnabledFromValue",
        "isNativeAsyncGzipReadError",
        "getVariantFromValue",
        "gzipCompress",
        "uuidv7",
        "ErrorTracking",
        "buildMetricsResourceAttributes",
        "parsePayload",
        "getLengthFromRules",
        "isGzipSupported",
        "buildOtlpLogsPayload",
        "flagDetailsToResults",
        "toOtlpAnyValue",
        "DEFAULT_HISTOGRAM_BOUNDS",
        "PostHogLogs",
        "isGzipRequest",
        "getFeatureFlagValue",
        "getValidationError",
        "default",
        "resolveMetricsConfig",
        "getRequirementsHint",
        "isGzipData",
        "getOtlpSeverityNumber",
        "buildResourceAttributes",
        "buildOtlpMetricsPayload",
        "buildOtlpLogRecord",
        "toOtlpKeyValueList"
    ].indexOf(__WEBPACK_IMPORT_KEY__) < 0) __WEBPACK_REEXPORT_OBJECT__[__WEBPACK_IMPORT_KEY__] = (function(key) {
        return _types__WEBPACK_IMPORTED_MODULE_12__[key];
    }).bind(0, __WEBPACK_IMPORT_KEY__);
    __webpack_require__.d(__webpack_exports__, __WEBPACK_REEXPORT_OBJECT__);
    var _surveys_validation__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__("./surveys/validation");
})();
exports.DEFAULT_HISTOGRAM_BOUNDS = __webpack_exports__.DEFAULT_HISTOGRAM_BOUNDS;
exports.ErrorTracking = __webpack_exports__.ErrorTracking;
exports.PostHogLogs = __webpack_exports__.PostHogLogs;
exports.PostHogMetrics = __webpack_exports__.PostHogMetrics;
exports.buildMetricsResourceAttributes = __webpack_exports__.buildMetricsResourceAttributes;
exports.buildOtlpLogRecord = __webpack_exports__.buildOtlpLogRecord;
exports.buildOtlpLogsPayload = __webpack_exports__.buildOtlpLogsPayload;
exports.buildOtlpMetricsPayload = __webpack_exports__.buildOtlpMetricsPayload;
exports.buildResourceAttributes = __webpack_exports__.buildResourceAttributes;
exports.flagDetailsToResults = __webpack_exports__.flagDetailsToResults;
exports.getEnabledFromValue = __webpack_exports__.getEnabledFromValue;
exports.getFeatureFlagValue = __webpack_exports__.getFeatureFlagValue;
exports.getLengthFromRules = __webpack_exports__.getLengthFromRules;
exports.getOtlpSeverityNumber = __webpack_exports__.getOtlpSeverityNumber;
exports.getOtlpSeverityText = __webpack_exports__.getOtlpSeverityText;
exports.getRequirementsHint = __webpack_exports__.getRequirementsHint;
exports.getValidationError = __webpack_exports__.getValidationError;
exports.getVariantFromValue = __webpack_exports__.getVariantFromValue;
exports.gzipCompress = __webpack_exports__.gzipCompress;
exports.isGzipData = __webpack_exports__.isGzipData;
exports.isGzipRequest = __webpack_exports__.isGzipRequest;
exports.isGzipSupported = __webpack_exports__.isGzipSupported;
exports.isNativeAsyncGzipError = __webpack_exports__.isNativeAsyncGzipError;
exports.isNativeAsyncGzipReadError = __webpack_exports__.isNativeAsyncGzipReadError;
exports.parsePayload = __webpack_exports__.parsePayload;
exports.resolveMetricsConfig = __webpack_exports__.resolveMetricsConfig;
exports.toOtlpAnyValue = __webpack_exports__.toOtlpAnyValue;
exports.toOtlpKeyValueList = __webpack_exports__.toOtlpKeyValueList;
exports.uuidv7 = __webpack_exports__.uuidv7;
for(var __webpack_i__ in __webpack_exports__)if (-1 === [
    "DEFAULT_HISTOGRAM_BOUNDS",
    "ErrorTracking",
    "PostHogLogs",
    "PostHogMetrics",
    "buildMetricsResourceAttributes",
    "buildOtlpLogRecord",
    "buildOtlpLogsPayload",
    "buildOtlpMetricsPayload",
    "buildResourceAttributes",
    "flagDetailsToResults",
    "getEnabledFromValue",
    "getFeatureFlagValue",
    "getLengthFromRules",
    "getOtlpSeverityNumber",
    "getOtlpSeverityText",
    "getRequirementsHint",
    "getValidationError",
    "getVariantFromValue",
    "gzipCompress",
    "isGzipData",
    "isGzipRequest",
    "isGzipSupported",
    "isNativeAsyncGzipError",
    "isNativeAsyncGzipReadError",
    "parsePayload",
    "resolveMetricsConfig",
    "toOtlpAnyValue",
    "toOtlpKeyValueList",
    "uuidv7"
].indexOf(__webpack_i__)) exports[__webpack_i__] = __webpack_exports__[__webpack_i__];
Object.defineProperty(exports, '__esModule', {
    value: true
});
