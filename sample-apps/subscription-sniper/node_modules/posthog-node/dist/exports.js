"use strict";
var __webpack_modules__ = {
    "./extensions/express": function(module) {
        module.exports = require("./extensions/express.js");
    },
    "./extensions/sentry-integration": function(module) {
        module.exports = require("./extensions/sentry-integration.js");
    },
    "./feature-flag-evaluations": function(module) {
        module.exports = require("./feature-flag-evaluations.js");
    },
    "./types": function(module) {
        module.exports = require("./types.js");
    },
    "@posthog/core": function(module) {
        module.exports = require("@posthog/core");
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
        FeatureFlagError: ()=>_posthog_core__WEBPACK_IMPORTED_MODULE_4__.FeatureFlagError,
        FeatureFlagEvaluations: ()=>_feature_flag_evaluations__WEBPACK_IMPORTED_MODULE_3__.FeatureFlagEvaluations,
        cookieStateToProperties: ()=>_posthog_core__WEBPACK_IMPORTED_MODULE_4__.cookieStateToProperties,
        cookieStoreFromHeader: ()=>_posthog_core__WEBPACK_IMPORTED_MODULE_4__.cookieStoreFromHeader,
        getPostHogCookieName: ()=>_posthog_core__WEBPACK_IMPORTED_MODULE_4__.getPostHogCookieName,
        parsePostHogCookie: ()=>_posthog_core__WEBPACK_IMPORTED_MODULE_4__.parsePostHogCookie,
        readPostHogCookie: ()=>_posthog_core__WEBPACK_IMPORTED_MODULE_4__.readPostHogCookie,
        serializePostHogCookie: ()=>_posthog_core__WEBPACK_IMPORTED_MODULE_4__.serializePostHogCookie,
        uuidv7: ()=>_posthog_core__WEBPACK_IMPORTED_MODULE_4__.uuidv7
    });
    var _extensions_sentry_integration__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./extensions/sentry-integration");
    var __WEBPACK_REEXPORT_OBJECT__ = {};
    for(var __WEBPACK_IMPORT_KEY__ in _extensions_sentry_integration__WEBPACK_IMPORTED_MODULE_0__)if ([
        "cookieStoreFromHeader",
        "uuidv7",
        "parsePostHogCookie",
        "default",
        "readPostHogCookie",
        "serializePostHogCookie",
        "FeatureFlagEvaluations",
        "getPostHogCookieName",
        "FeatureFlagError",
        "cookieStateToProperties"
    ].indexOf(__WEBPACK_IMPORT_KEY__) < 0) __WEBPACK_REEXPORT_OBJECT__[__WEBPACK_IMPORT_KEY__] = (function(key) {
        return _extensions_sentry_integration__WEBPACK_IMPORTED_MODULE_0__[key];
    }).bind(0, __WEBPACK_IMPORT_KEY__);
    __webpack_require__.d(__webpack_exports__, __WEBPACK_REEXPORT_OBJECT__);
    var _extensions_express__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./extensions/express");
    var __WEBPACK_REEXPORT_OBJECT__ = {};
    for(var __WEBPACK_IMPORT_KEY__ in _extensions_express__WEBPACK_IMPORTED_MODULE_1__)if ([
        "cookieStoreFromHeader",
        "uuidv7",
        "parsePostHogCookie",
        "default",
        "readPostHogCookie",
        "serializePostHogCookie",
        "FeatureFlagEvaluations",
        "getPostHogCookieName",
        "FeatureFlagError",
        "cookieStateToProperties"
    ].indexOf(__WEBPACK_IMPORT_KEY__) < 0) __WEBPACK_REEXPORT_OBJECT__[__WEBPACK_IMPORT_KEY__] = (function(key) {
        return _extensions_express__WEBPACK_IMPORTED_MODULE_1__[key];
    }).bind(0, __WEBPACK_IMPORT_KEY__);
    __webpack_require__.d(__webpack_exports__, __WEBPACK_REEXPORT_OBJECT__);
    var _types__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__("./types");
    var __WEBPACK_REEXPORT_OBJECT__ = {};
    for(var __WEBPACK_IMPORT_KEY__ in _types__WEBPACK_IMPORTED_MODULE_2__)if ([
        "cookieStoreFromHeader",
        "uuidv7",
        "parsePostHogCookie",
        "default",
        "readPostHogCookie",
        "serializePostHogCookie",
        "FeatureFlagEvaluations",
        "getPostHogCookieName",
        "FeatureFlagError",
        "cookieStateToProperties"
    ].indexOf(__WEBPACK_IMPORT_KEY__) < 0) __WEBPACK_REEXPORT_OBJECT__[__WEBPACK_IMPORT_KEY__] = (function(key) {
        return _types__WEBPACK_IMPORTED_MODULE_2__[key];
    }).bind(0, __WEBPACK_IMPORT_KEY__);
    __webpack_require__.d(__webpack_exports__, __WEBPACK_REEXPORT_OBJECT__);
    var _feature_flag_evaluations__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__("./feature-flag-evaluations");
    var _posthog_core__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__("@posthog/core");
})();
exports.FeatureFlagError = __webpack_exports__.FeatureFlagError;
exports.FeatureFlagEvaluations = __webpack_exports__.FeatureFlagEvaluations;
exports.cookieStateToProperties = __webpack_exports__.cookieStateToProperties;
exports.cookieStoreFromHeader = __webpack_exports__.cookieStoreFromHeader;
exports.getPostHogCookieName = __webpack_exports__.getPostHogCookieName;
exports.parsePostHogCookie = __webpack_exports__.parsePostHogCookie;
exports.readPostHogCookie = __webpack_exports__.readPostHogCookie;
exports.serializePostHogCookie = __webpack_exports__.serializePostHogCookie;
exports.uuidv7 = __webpack_exports__.uuidv7;
for(var __webpack_i__ in __webpack_exports__)if (-1 === [
    "FeatureFlagError",
    "FeatureFlagEvaluations",
    "cookieStateToProperties",
    "cookieStoreFromHeader",
    "getPostHogCookieName",
    "parsePostHogCookie",
    "readPostHogCookie",
    "serializePostHogCookie",
    "uuidv7"
].indexOf(__webpack_i__)) exports[__webpack_i__] = __webpack_exports__[__webpack_i__];
Object.defineProperty(exports, '__esModule', {
    value: true
});
