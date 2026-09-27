import { SurveySchedule } from "../types.mjs";
function doesSurveyActivateByEvent(survey) {
    return !!survey.conditions?.events?.values?.length;
}
function canSurveyActivateRepeatedly(survey) {
    return doesSurveyActivateByEvent(survey) && !!survey.conditions?.events?.repeatedActivation || survey.schedule === SurveySchedule.Always;
}
export { canSurveyActivateRepeatedly, doesSurveyActivateByEvent };
