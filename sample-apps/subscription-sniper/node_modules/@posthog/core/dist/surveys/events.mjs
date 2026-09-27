import { isArray, isNullish, isUndefined } from "../utils/index.mjs";
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
    if (isArray(response)) return [
        ...response
    ];
    return response;
}
function buildSurveyResponseProperties(responses = {}, survey) {
    const oldFormatResponses = {};
    survey.questions.forEach((question)=>{
        if (isUndefined(question.originalQuestionIndex)) return;
        const oldResponseKey = getSurveyOldResponseKey(question.originalQuestionIndex);
        const response = getSurveyResponseValue(responses, question.id);
        if (!isUndefined(response)) oldFormatResponses[oldResponseKey] = response;
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
    return Object.values(responses).some((response)=>!isNullish(response));
}
function getSurveyInteractionProperty(survey, action) {
    let surveyProperty = `$survey_${action}/${survey.id}`;
    if (survey.current_iteration && survey.current_iteration > 0) surveyProperty = `$survey_${action}/${survey.id}/${survey.current_iteration}`;
    return surveyProperty;
}
export { SURVEY_LANGUAGE_PROPERTY, buildSurveyResponseProperties, getSurveyInteractionProperty, getSurveyOldResponseKey, getSurveyResponseKey, getSurveyResponseValue, surveyHasResponses };
