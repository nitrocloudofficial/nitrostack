import { Survey } from '../types';
type SurveyForRepeatActivation = Pick<Survey, 'schedule'> & {
    conditions?: {
        events?: {
            repeatedActivation?: boolean;
            values?: {
                name: string;
            }[];
        } | null;
    } | null;
};
export declare function doesSurveyActivateByEvent(survey: SurveyForRepeatActivation): boolean;
/**
 * Platform-independent part of "can this survey show again after being seen":
 * event-repeated activation or an 'always' schedule. SDKs may OR in
 * platform-specific state (e.g. the web SDK's in-progress partial responses).
 */
export declare function canSurveyActivateRepeatedly(survey: SurveyForRepeatActivation): boolean;
export {};
//# sourceMappingURL=activation.d.ts.map