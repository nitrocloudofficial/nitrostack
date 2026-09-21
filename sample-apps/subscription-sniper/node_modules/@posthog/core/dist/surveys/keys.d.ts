import { Survey } from '../types';
export type SurveyWithIteration = Pick<Survey, 'id' | 'current_iteration'>;
/**
 * True when a stored display-state key belongs to the given survey: its bare id
 * or any iteration-qualified `id_n` key.
 */
export declare function isSurveyKeyForSurvey(key: string, surveyId: string): boolean;
/**
 * Iteration-qualified survey identifier ('id' or 'id_iteration'), used to key
 * per-survey display state (seen, in-progress, ...). Keying by iteration lets a
 * repeating survey become visible again when a new iteration starts.
 */
export declare function getSurveyIterationKey(survey: SurveyWithIteration): string;
//# sourceMappingURL=keys.d.ts.map