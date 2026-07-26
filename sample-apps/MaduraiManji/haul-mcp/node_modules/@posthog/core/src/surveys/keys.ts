import { Survey } from '../types'

export type SurveyWithIteration = Pick<Survey, 'id' | 'current_iteration'>

/**
 * True when a stored display-state key belongs to the given survey: its bare id
 * or any iteration-qualified `id_n` key.
 */
export function isSurveyKeyForSurvey(key: string, surveyId: string): boolean {
  return key === surveyId || key.startsWith(`${surveyId}_`)
}

/**
 * Iteration-qualified survey identifier ('id' or 'id_iteration'), used to key
 * per-survey display state (seen, in-progress, ...). Keying by iteration lets a
 * repeating survey become visible again when a new iteration starts.
 */
export function getSurveyIterationKey(survey: SurveyWithIteration): string {
  if (survey.current_iteration && survey.current_iteration > 0) {
    return `${survey.id}_${survey.current_iteration}`
  }
  return survey.id
}
