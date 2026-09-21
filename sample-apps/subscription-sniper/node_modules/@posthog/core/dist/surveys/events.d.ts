import { SurveyWithIteration } from './keys';
import { SurveyResponses, SurveyResponseValue } from '../types';
export declare const SURVEY_LANGUAGE_PROPERTY = "$survey_language";
export declare function getSurveyResponseKey(questionId: string): string;
export declare function getSurveyOldResponseKey(originalQuestionIndex: number): string;
export declare function getSurveyResponseValue(responses: SurveyResponses, questionId?: string): SurveyResponseValue | undefined;
export declare function buildSurveyResponseProperties(responses: SurveyResponses | undefined, survey: SurveyForResponses): Record<string, unknown>;
export declare function surveyHasResponses(responses?: SurveyResponses): boolean;
export declare function getSurveyInteractionProperty(survey: SurveyWithIteration, action: string): string;
type SurveyQuestionForResponses = {
    id?: string;
    question: string;
    originalQuestionIndex?: number;
};
type SurveyForResponses = {
    questions: SurveyQuestionForResponses[];
};
export {};
//# sourceMappingURL=events.d.ts.map