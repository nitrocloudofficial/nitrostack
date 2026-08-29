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
    resolveCaptureMode: ()=>resolveCaptureMode
});
function isCaptureMode(value) {
    return 'v0' === value || 'v1' === value;
}
function resolveCaptureMode() {
    const envMode = 'undefined' != typeof process ? process.env?.POSTHOG_CAPTURE_MODE : void 0;
    return isCaptureMode(envMode) ? envMode : 'v0';
}
exports.resolveCaptureMode = __webpack_exports__.resolveCaptureMode;
for(var __webpack_i__ in __webpack_exports__)if (-1 === [
    "resolveCaptureMode"
].indexOf(__webpack_i__)) exports[__webpack_i__] = __webpack_exports__[__webpack_i__];
Object.defineProperty(exports, '__esModule', {
    value: true
});
