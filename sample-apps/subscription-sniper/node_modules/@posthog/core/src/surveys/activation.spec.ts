import { describe, expect, it } from '@jest/globals'
import { SurveySchedule } from '../types'
import { canSurveyActivateRepeatedly, doesSurveyActivateByEvent } from './activation'

describe('doesSurveyActivateByEvent', () => {
  const cases: [string, Parameters<typeof doesSurveyActivateByEvent>[0], boolean][] = [
    ['non-empty event values', { conditions: { events: { values: [{ name: 'event' }] } } }, true],
    ['empty event values', { conditions: { events: { values: [] } } }, false],
    ['undefined conditions', { conditions: undefined }, false],
    ['null conditions', { conditions: null }, false],
    ['null events', { conditions: { events: null } }, false],
  ]

  it.each(cases)('%s returns %p', (_name, survey, expected) => {
    expect(doesSurveyActivateByEvent(survey)).toBe(expected)
  })
})

describe('canSurveyActivateRepeatedly', () => {
  const cases: [string, Parameters<typeof canSurveyActivateRepeatedly>[0], boolean][] = [
    ['always schedule without events', { schedule: SurveySchedule.Always }, true],
    [
      'events with repeated activation enabled',
      {
        schedule: SurveySchedule.Once,
        conditions: { events: { repeatedActivation: true, values: [{ name: 'event' }] } },
      },
      true,
    ],
    [
      'events with repeated activation disabled',
      {
        schedule: SurveySchedule.Once,
        conditions: { events: { repeatedActivation: false, values: [{ name: 'event' }] } },
      },
      false,
    ],
    [
      'events without repeated activation',
      {
        schedule: SurveySchedule.Once,
        conditions: { events: { values: [{ name: 'event' }] } },
      },
      false,
    ],
    [
      'repeated activation without event values',
      {
        schedule: SurveySchedule.Once,
        conditions: { events: { repeatedActivation: true, values: [] } },
      },
      false,
    ],
    ['undefined schedule without events', { schedule: undefined }, false],
    ['null schedule without events', { schedule: null }, false],
  ]

  it.each(cases)('%s returns %p', (_name, survey, expected) => {
    expect(canSurveyActivateRepeatedly(survey)).toBe(expected)
  })
})
