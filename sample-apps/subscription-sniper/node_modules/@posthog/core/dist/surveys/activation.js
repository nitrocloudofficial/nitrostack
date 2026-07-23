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
    doesSurveyActivateByEvent: ()=>doesSurveyActivateByEvent,
    canSurveyActivateRepeatedly: ()=>canSurveyActivateRepeatedly
});
const external_types_js_namespaceObject = require("../types.js");
function doesSurveyActivateByEvent(survey) {
    return !!survey.conditions?.events?.values?.length;
}
function canSurveyActivateRepeatedly(survey) {
    return doesSurveyActivateByEvent(survey) && !!survey.conditions?.events?.repeatedActivation || survey.schedule === external_types_js_namespaceObject.SurveySchedule.Always;
}
exports.canSurveyActivateRepeatedly = __webpack_exports__.canSurveyActivateRepeatedly;
exports.doesSurveyActivateByEvent = __webpack_exports__.doesSurveyActivateByEvent;
for(var __webpack_i__ in __webpack_exports__)if (-1 === [
    "canSurveyActivateRepeatedly",
    "doesSurveyActivateByEvent"
].indexOf(__webpack_i__)) exports[__webpack_i__] = __webpack_exports__[__webpack_i__];
Object.defineProperty(exports, '__esModule', {
    value: true
});
