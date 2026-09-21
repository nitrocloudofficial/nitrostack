function isSurveyKeyForSurvey(key, surveyId) {
    return key === surveyId || key.startsWith(`${surveyId}_`);
}
function getSurveyIterationKey(survey) {
    if (survey.current_iteration && survey.current_iteration > 0) return `${survey.id}_${survey.current_iteration}`;
    return survey.id;
}
export { getSurveyIterationKey, isSurveyKeyForSurvey };
