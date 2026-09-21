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
    stripReservedExceptionStepFields: ()=>stripReservedExceptionStepFields,
    ExceptionStepsBuffer: ()=>ExceptionStepsBuffer,
    EXCEPTION_STEP_INTERNAL_FIELDS: ()=>EXCEPTION_STEP_INTERNAL_FIELDS,
    resolveExceptionStepsConfig: ()=>resolveExceptionStepsConfig,
    getUtf8ByteLength: ()=>getUtf8ByteLength,
    DEFAULT_EXCEPTION_STEPS_CONFIG: ()=>DEFAULT_EXCEPTION_STEPS_CONFIG
});
const index_js_namespaceObject = require("../utils/index.js");
const EXCEPTION_STEP_INTERNAL_FIELDS = {
    MESSAGE: '$message',
    TIMESTAMP: '$timestamp'
};
const RESERVED_EXCEPTION_STEP_KEYS = new Set([
    EXCEPTION_STEP_INTERNAL_FIELDS.MESSAGE,
    EXCEPTION_STEP_INTERNAL_FIELDS.TIMESTAMP
]);
const DEFAULT_EXCEPTION_STEPS_CONFIG = {
    enabled: true,
    max_bytes: 32768
};
function resolveExceptionStepsConfig(config) {
    if (!config) return {
        ...DEFAULT_EXCEPTION_STEPS_CONFIG
    };
    return {
        enabled: config.enabled ?? DEFAULT_EXCEPTION_STEPS_CONFIG.enabled,
        max_bytes: normalizePositiveInteger(config.max_bytes, DEFAULT_EXCEPTION_STEPS_CONFIG.max_bytes)
    };
}
function stripReservedExceptionStepFields(properties) {
    if (!properties) return {
        sanitizedProperties: {},
        droppedKeys: []
    };
    const droppedKeys = [];
    const sanitizedProperties = Object.keys(properties).reduce((acc, key)=>{
        if (RESERVED_EXCEPTION_STEP_KEYS.has(key)) {
            droppedKeys.push(key);
            return acc;
        }
        acc[key] = properties[key];
        return acc;
    }, {});
    return {
        sanitizedProperties,
        droppedKeys
    };
}
class ExceptionStepsBuffer {
    constructor(config){
        this._entries = [];
        this._totalBytes = 0;
        this._config = resolveExceptionStepsConfig(config);
    }
    setConfig(config) {
        this._config = resolveExceptionStepsConfig(config);
        this._trimToMaxBytes();
    }
    add(step) {
        const serialized = normalizeAndSerializeStep(step);
        if (!serialized) return;
        const bytes = getUtf8ByteLength(serialized.json);
        if (bytes > this._config.max_bytes) return;
        this._entries.push({
            step: serialized.step,
            bytes
        });
        this._totalBytes += bytes;
        this._trimToMaxBytes();
    }
    getAttachable() {
        return this._entries.map((e)=>e.step);
    }
    clear() {
        this._entries = [];
        this._totalBytes = 0;
    }
    size() {
        return this._entries.length;
    }
    _trimToMaxBytes() {
        while(this._totalBytes > this._config.max_bytes && this._entries.length > 0){
            const evicted = this._entries.shift();
            if (evicted) this._totalBytes -= evicted.bytes;
        }
    }
}
function normalizePositiveInteger(input, fallback) {
    if (!(0, index_js_namespaceObject.isNumber)(input) || input === 1 / 0 || input === -1 / 0) return fallback;
    const normalized = Math.floor(input);
    if (normalized < 0) return fallback;
    return normalized;
}
function normalizeAndSerializeStep(step) {
    let json;
    try {
        json = (0, index_js_namespaceObject.safeJsonStringify)(step);
    } catch  {
        return;
    }
    try {
        const parsed = JSON.parse(json);
        if (!(0, index_js_namespaceObject.isObject)(parsed)) return;
        const parsedStep = parsed;
        const message = parsedStep[EXCEPTION_STEP_INTERNAL_FIELDS.MESSAGE];
        const timestamp = parsedStep[EXCEPTION_STEP_INTERNAL_FIELDS.TIMESTAMP];
        if (!(0, index_js_namespaceObject.isString)(message) || 0 === message.trim().length) return;
        if (!(0, index_js_namespaceObject.isString)(timestamp) && !(0, index_js_namespaceObject.isNumber)(timestamp)) return;
        return {
            step: parsedStep,
            json
        };
    } catch  {
        return;
    }
}
function getUtf8ByteLength(value) {
    if ('undefined' != typeof TextEncoder) return new TextEncoder().encode(value).length;
    const encoded = encodeURIComponent(value);
    let byteLength = 0;
    for(let i = 0; i < encoded.length; i++)if ('%' === encoded[i]) {
        byteLength += 1;
        i += 2;
    } else byteLength += 1;
    return byteLength;
}
exports.DEFAULT_EXCEPTION_STEPS_CONFIG = __webpack_exports__.DEFAULT_EXCEPTION_STEPS_CONFIG;
exports.EXCEPTION_STEP_INTERNAL_FIELDS = __webpack_exports__.EXCEPTION_STEP_INTERNAL_FIELDS;
exports.ExceptionStepsBuffer = __webpack_exports__.ExceptionStepsBuffer;
exports.getUtf8ByteLength = __webpack_exports__.getUtf8ByteLength;
exports.resolveExceptionStepsConfig = __webpack_exports__.resolveExceptionStepsConfig;
exports.stripReservedExceptionStepFields = __webpack_exports__.stripReservedExceptionStepFields;
for(var __webpack_i__ in __webpack_exports__)if (-1 === [
    "DEFAULT_EXCEPTION_STEPS_CONFIG",
    "EXCEPTION_STEP_INTERNAL_FIELDS",
    "ExceptionStepsBuffer",
    "getUtf8ByteLength",
    "resolveExceptionStepsConfig",
    "stripReservedExceptionStepFields"
].indexOf(__webpack_i__)) exports[__webpack_i__] = __webpack_exports__[__webpack_i__];
Object.defineProperty(exports, '__esModule', {
    value: true
});
