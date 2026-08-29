import { Survey, SurveySchedule } from '../types'

// conditions is narrowed to the fields these predicates actually read, so both SDKs'
// Survey shapes (which still drift in nested condition types) satisfy it structurally.
type SurveyForRepeatActivation = Pick<Survey, 'schedule'> & {
  conditions?: {
    events?: {
      repeatedActivation?: boolean
      values?: { name: string }[]
    } | null
  } | null
}

export function doesSurveyActivateByEvent(survey: SurveyForRepeatActivation): boolean {
  return !!survey.conditions?.events?.values?.length
}

/**
 * Platform-independent part of "can this survey show again after being seen":
 * event-repeated activation or an 'always' schedule. SDKs may OR in
 * platform-specific state (e.g. the web SDK's in-progress partial responses).
 */
export function canSurveyActivateRepeatedly(survey: SurveyForRepeatActivation): boolean {
  return (
    (doesSurveyActivateByEvent(survey) && !!survey.conditions?.events?.repeatedActivation) ||
    survey.schedule === SurveySchedule.Always
  )
}
