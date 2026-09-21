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
    getSurveyIterationKey: ()=>getSurveyIterationKey,
    isSurveyKeyForSurvey: ()=>isSurveyKeyForSurvey
});
function isSurveyKeyForSurvey(key, surveyId) {
    return key === surveyId || key.startsWith(`${surveyId}_`);
}
function getSurveyIterationKey(survey) {
    if (survey.current_iteration && survey.current_iteration > 0) return `${survey.id}_${survey.current_iteration}`;
    return survey.id;
}
exports.getSurveyIterationKey = __webpack_exports__.getSurveyIterationKey;
exports.isSurveyKeyForSurvey = __webpack_exports__.isSurveyKeyForSurvey;
for(var __webpack_i__ in __webpack_exports__)if (-1 === [
    "getSurveyIterationKey",
    "isSurveyKeyForSurvey"
].indexOf(__webpack_i__)) exports[__webpack_i__] = __webpack_exports__[__webpack_i__];
Object.defineProperty(exports, '__esModule', {
    value: true
});
