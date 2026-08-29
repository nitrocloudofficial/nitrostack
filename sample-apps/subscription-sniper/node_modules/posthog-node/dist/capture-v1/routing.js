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
    AI_ROUTE: ()=>AI_ROUTE,
    ANALYTICS_ROUTE: ()=>ANALYTICS_ROUTE,
    isLegacyOnlyEvent: ()=>isLegacyOnlyEvent
});
const AI_EVENT_PREFIX = '$ai_';
const ANALYTICS_ROUTE = 'analytics';
const AI_ROUTE = 'ai';
function isLegacyOnlyEvent(message) {
    return 'string' == typeof message.event && message.event.startsWith(AI_EVENT_PREFIX);
}
exports.AI_ROUTE = __webpack_exports__.AI_ROUTE;
exports.ANALYTICS_ROUTE = __webpack_exports__.ANALYTICS_ROUTE;
exports.isLegacyOnlyEvent = __webpack_exports__.isLegacyOnlyEvent;
for(var __webpack_i__ in __webpack_exports__)if (-1 === [
    "AI_ROUTE",
    "ANALYTICS_ROUTE",
    "isLegacyOnlyEvent"
].indexOf(__webpack_i__)) exports[__webpack_i__] = __webpack_exports__[__webpack_i__];
Object.defineProperty(exports, '__esModule', {
    value: true
});
