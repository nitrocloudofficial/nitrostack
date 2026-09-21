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
    getSurveyInteractionProperty: ()=>getSurveyInteractionProperty,
    buildSurveyResponseProperties: ()=>buildSurveyResponseProperties,
    SURVEY_LANGUAGE_PROPERTY: ()=>SURVEY_LANGUAGE_PROPERTY,
    getSurveyOldResponseKey: ()=>getSurveyOldResponseKey,
    getSurveyResponseKey: ()=>getSurveyResponseKey,
    getSurveyResponseValue: ()=>getSurveyResponseValue,
    surveyHasResponses: ()=>surveyHasResponses
});
const index_js_namespaceObject = require("../utils/index.js");
const SURVEY_LANGUAGE_PROPERTY = '$survey_language';
function getSurveyResponseKey(questionId) {
    return `$survey_response_${questionId}`;
}
function getSurveyOldResponseKey(originalQuestionIndex) {
    return 0 === originalQuestionIndex ? '$survey_response' : `$survey_response_${originalQuestionIndex}`;
}
function getSurveyResponseValue(responses, questionId) {
    if (!questionId) return null;
    const response = responses[getSurveyResponseKey(questionId)];
    if ((0, index_js_namespaceObject.isArray)(response)) return [
        ...response
    ];
    return response;
}
function buildSurveyResponseProperties(responses = {}, survey) {
    const oldFormatResponses = {};
    survey.questions.forEach((question)=>{
        if ((0, index_js_namespaceObject.isUndefined)(question.originalQuestionIndex)) return;
        const oldResponseKey = getSurveyOldResponseKey(question.originalQuestionIndex);
        const response = getSurveyResponseValue(responses, question.id);
        if (!(0, index_js_namespaceObject.isUndefined)(response)) oldFormatResponses[oldResponseKey] = response;
    });
    return {
        $survey_questions: survey.questions.map((question)=>({
                id: question.id,
                question: question.question,
                response: getSurveyResponseValue(responses, question.id)
            })),
        ...responses,
        ...oldFormatResponses
    };
}
function surveyHasResponses(responses = {}) {
    return Object.values(responses).some((response)=>!(0, index_js_namespaceObject.isNullish)(response));
}
function getSurveyInteractionProperty(survey, action) {
    let surveyProperty = `$survey_${action}/${survey.id}`;
    if (survey.current_iteration && survey.current_iteration > 0) surveyProperty = `$survey_${action}/${survey.id}/${survey.current_iteration}`;
    return surveyProperty;
}
exports.SURVEY_LANGUAGE_PROPERTY = __webpack_exports__.SURVEY_LANGUAGE_PROPERTY;
exports.buildSurveyResponseProperties = __webpack_exports__.buildSurveyResponseProperties;
exports.getSurveyInteractionProperty = __webpack_exports__.getSurveyInteractionProperty;
exports.getSurveyOldResponseKey = __webpack_exports__.getSurveyOldResponseKey;
exports.getSurveyResponseKey = __webpack_exports__.getSurveyResponseKey;
exports.getSurveyResponseValue = __webpack_exports__.getSurveyResponseValue;
exports.surveyHasResponses = __webpack_exports__.surveyHasResponses;
for(var __webpack_i__ in __webpack_exports__)if (-1 === [
    "SURVEY_LANGUAGE_PROPERTY",
    "buildSurveyResponseProperties",
    "getSurveyInteractionProperty",
    "getSurveyOldResponseKey",
    "getSurveyResponseKey",
    "getSurveyResponseValue",
    "surveyHasResponses"
].indexOf(__webpack_i__)) exports[__webpack_i__] = __webpack_exports__[__webpack_i__];
Object.defineProperty(exports, '__esModule', {
    value: true
});
