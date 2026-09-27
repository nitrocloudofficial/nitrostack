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
    isBoolean: ()=>isBoolean,
    isBuiltin: ()=>isBuiltin,
    isEmptyString: ()=>isEmptyString,
    isNullish: ()=>isNullish,
    isErrorEvent: ()=>isErrorEvent,
    isEmptyObject: ()=>isEmptyObject,
    isPrimitive: ()=>isPrimitive,
    isFunction: ()=>isFunction,
    isPositiveNumber: ()=>isPositiveNumber,
    isKnownUnsafeEditableEvent: ()=>isKnownUnsafeEditableEvent,
    noLikeValues: ()=>noLikeValues,
    isPlainObject: ()=>isPlainObject,
    isNoLike: ()=>isNoLike,
    isNumber: ()=>isNumber,
    isKnownUnsafeEditableEventProperty: ()=>isKnownUnsafeEditableEventProperty,
    isNull: ()=>isNull,
    isError: ()=>isError,
    isNativeFunction: ()=>isNativeFunction,
    hasOwnProperty: ()=>type_utils_hasOwnProperty,
    isPlainError: ()=>isPlainError,
    isUndefined: ()=>isUndefined,
    yesLikeValues: ()=>yesLikeValues,
    isObject: ()=>isObject,
    isArray: ()=>isArray,
    isString: ()=>isString,
    isEvent: ()=>isEvent,
    isFile: ()=>isFile,
    isYesLike: ()=>isYesLike,
    isFormData: ()=>isFormData
});
const external_types_js_namespaceObject = require("../types.js");
const external_string_utils_js_namespaceObject = require("./string-utils.js");
const nativeIsArray = Array.isArray;
const ObjProto = Object.prototype;
const type_utils_hasOwnProperty = ObjProto.hasOwnProperty;
const type_utils_toString = ObjProto.toString;
const isArray = nativeIsArray || function(obj) {
    return '[object Array]' === type_utils_toString.call(obj);
};
const isFunction = (x)=>'function' == typeof x;
const isNativeFunction = (x)=>isFunction(x) && -1 !== x.toString().indexOf('[native code]');
const isObject = (x)=>x === Object(x) && !isArray(x);
const isEmptyObject = (x)=>{
    if (isObject(x)) {
        for(const key in x)if (type_utils_hasOwnProperty.call(x, key)) return false;
        return true;
    }
    return false;
};
const isUndefined = (x)=>void 0 === x;
const isString = (x)=>'[object String]' == type_utils_toString.call(x);
const isEmptyString = (x)=>isString(x) && 0 === x.trim().length;
const isNull = (x)=>null === x;
const isNullish = (x)=>isUndefined(x) || isNull(x);
const isNumber = (x)=>'[object Number]' == type_utils_toString.call(x) && x === x;
const isPositiveNumber = (value)=>isNumber(value) && value > 0;
const isBoolean = (x)=>'[object Boolean]' === type_utils_toString.call(x);
const isFormData = (x)=>x instanceof FormData;
const isFile = (x)=>x instanceof File;
const isPlainError = (x)=>x instanceof Error;
const isKnownUnsafeEditableEvent = (x)=>(0, external_string_utils_js_namespaceObject.includes)(external_types_js_namespaceObject.knownUnsafeEditableEvent, x);
const isKnownUnsafeEditableEventProperty = (x)=>(0, external_string_utils_js_namespaceObject.includes)(external_types_js_namespaceObject.knownUnsafeEditableEventProperty, x);
function isPrimitive(value) {
    return null === value || 'object' != typeof value;
}
function isBuiltin(candidate, className) {
    return Object.prototype.toString.call(candidate) === `[object ${className}]`;
}
function isError(candidate) {
    switch(Object.prototype.toString.call(candidate)){
        case '[object Error]':
        case '[object Exception]':
        case '[object DOMException]':
        case '[object DOMError]':
        case '[object WebAssembly.Exception]':
            return true;
        default:
            return isInstanceOf(candidate, Error);
    }
}
function isErrorEvent(event) {
    return isBuiltin(event, 'ErrorEvent');
}
function isEvent(candidate) {
    return 'undefined' != typeof Event && isInstanceOf(candidate, Event);
}
function isPlainObject(candidate) {
    return isBuiltin(candidate, 'Object');
}
function isInstanceOf(candidate, base) {
    try {
        return candidate instanceof base;
    } catch  {
        return false;
    }
}
const yesLikeValues = [
    true,
    'true',
    1,
    '1',
    'yes'
];
const isYesLike = (val)=>(0, external_string_utils_js_namespaceObject.includes)(yesLikeValues, val);
const noLikeValues = [
    false,
    'false',
    0,
    '0',
    'no'
];
const isNoLike = (val)=>(0, external_string_utils_js_namespaceObject.includes)(noLikeValues, val);
exports.hasOwnProperty = __webpack_exports__.hasOwnProperty;
exports.isArray = __webpack_exports__.isArray;
exports.isBoolean = __webpack_exports__.isBoolean;
exports.isBuiltin = __webpack_exports__.isBuiltin;
exports.isEmptyObject = __webpack_exports__.isEmptyObject;
exports.isEmptyString = __webpack_exports__.isEmptyString;
exports.isError = __webpack_exports__.isError;
exports.isErrorEvent = __webpack_exports__.isErrorEvent;
exports.isEvent = __webpack_exports__.isEvent;
exports.isFile = __webpack_exports__.isFile;
exports.isFormData = __webpack_exports__.isFormData;
exports.isFunction = __webpack_exports__.isFunction;
exports.isKnownUnsafeEditableEvent = __webpack_exports__.isKnownUnsafeEditableEvent;
exports.isKnownUnsafeEditableEventProperty = __webpack_exports__.isKnownUnsafeEditableEventProperty;
exports.isNativeFunction = __webpack_exports__.isNativeFunction;
exports.isNoLike = __webpack_exports__.isNoLike;
exports.isNull = __webpack_exports__.isNull;
exports.isNullish = __webpack_exports__.isNullish;
exports.isNumber = __webpack_exports__.isNumber;
exports.isObject = __webpack_exports__.isObject;
exports.isPlainError = __webpack_exports__.isPlainError;
exports.isPlainObject = __webpack_exports__.isPlainObject;
exports.isPositiveNumber = __webpack_exports__.isPositiveNumber;
exports.isPrimitive = __webpack_exports__.isPrimitive;
exports.isString = __webpack_exports__.isString;
exports.isUndefined = __webpack_exports__.isUndefined;
exports.isYesLike = __webpack_exports__.isYesLike;
exports.noLikeValues = __webpack_exports__.noLikeValues;
exports.yesLikeValues = __webpack_exports__.yesLikeValues;
for(var __webpack_i__ in __webpack_exports__)if (-1 === [
    "hasOwnProperty",
    "isArray",
    "isBoolean",
    "isBuiltin",
    "isEmptyObject",
    "isEmptyString",
    "isError",
    "isErrorEvent",
    "isEvent",
    "isFile",
    "isFormData",
    "isFunction",
    "isKnownUnsafeEditableEvent",
    "isKnownUnsafeEditableEventProperty",
    "isNativeFunction",
    "isNoLike",
    "isNull",
    "isNullish",
    "isNumber",
    "isObject",
    "isPlainError",
    "isPlainObject",
    "isPositiveNumber",
    "isPrimitive",
    "isString",
    "isUndefined",
    "isYesLike",
    "noLikeValues",
    "yesLikeValues"
].indexOf(__webpack_i__)) exports[__webpack_i__] = __webpack_exports__[__webpack_i__];
Object.defineProperty(exports, '__esModule', {
    value: true
});
