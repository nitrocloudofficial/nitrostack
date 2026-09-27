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
    getRemoteConfigBool: ()=>getRemoteConfigBool,
    clampToRange: ()=>clampToRange,
    getRemoteConfigNumber: ()=>getRemoteConfigNumber,
    isValidSampleRate: ()=>isValidSampleRate
});
const external_type_utils_js_namespaceObject = require("./type-utils.js");
function clampToRange(value, min, max, logger, fallbackValue) {
    if (min > max) {
        logger.warn('min cannot be greater than max.');
        min = max;
    }
    if ((0, external_type_utils_js_namespaceObject.isNumber)(value)) if (value > max) {
        logger.warn(' cannot be  greater than max: ' + max + '. Using max value instead.');
        return max;
    } else {
        if (!(value < min)) return value;
        logger.warn(' cannot be less than min: ' + min + '. Using min value instead.');
        return min;
    }
    logger.warn(' must be a number. using max or fallback. max: ' + max + ', fallback: ' + fallbackValue);
    return clampToRange(fallbackValue || max, min, max, logger);
}
function getRemoteConfigBool(field, key, defaultValue = true) {
    if (null == field) return defaultValue;
    if ('boolean' == typeof field) return field;
    if ('object' == typeof field) {
        const value = field[key];
        return 'boolean' == typeof value ? value : defaultValue;
    }
    return defaultValue;
}
function getRemoteConfigNumber(field, key) {
    if (null == field || 'object' != typeof field) return;
    const value = field[key];
    if ('number' == typeof value && Number.isFinite(value)) return value;
    if ('string' == typeof value) {
        const trimmed = value.trim();
        if ('' === trimmed) return;
        const parsed = Number(trimmed);
        return Number.isFinite(parsed) ? parsed : void 0;
    }
}
function isValidSampleRate(value) {
    return 'number' == typeof value && Number.isFinite(value) && value >= 0 && value <= 1;
}
exports.clampToRange = __webpack_exports__.clampToRange;
exports.getRemoteConfigBool = __webpack_exports__.getRemoteConfigBool;
exports.getRemoteConfigNumber = __webpack_exports__.getRemoteConfigNumber;
exports.isValidSampleRate = __webpack_exports__.isValidSampleRate;
for(var __webpack_i__ in __webpack_exports__)if (-1 === [
    "clampToRange",
    "getRemoteConfigBool",
    "getRemoteConfigNumber",
    "isValidSampleRate"
].indexOf(__webpack_i__)) exports[__webpack_i__] = __webpack_exports__[__webpack_i__];
Object.defineProperty(exports, '__esModule', {
    value: true
});
