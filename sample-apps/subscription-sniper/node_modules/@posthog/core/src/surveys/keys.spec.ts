import { describe, expect, it } from '@jest/globals'
import { getSurveyIterationKey, isSurveyKeyForSurvey } from './keys'

describe('getSurveyIterationKey', () => {
  const cases: [number | null | undefined, string][] = [
    [2, 'survey-1_2'],
    [1, 'survey-1_1'],
    [0, 'survey-1'],
    [null, 'survey-1'],
    [undefined, 'survey-1'],
  ]

  it.each(cases)('current_iteration %p produces key %p', (currentIteration, expected) => {
    expect(getSurveyIterationKey({ id: 'survey-1', current_iteration: currentIteration })).toBe(expected)
  })
})

describe('isSurveyKeyForSurvey', () => {
  it.each([
    ['bare id', 'abc', 'abc', true],
    ['first iteration', 'abc_1', 'abc', true],
    ['later iteration', 'abc_12', 'abc', true],
    ['different survey id', 'def_1', 'abc', false],
    ['prefix collision with bare id', 'abcd', 'abc', false],
    ['prefix collision with iteration key', 'abcd_1', 'abc', false],
  ])('%s: key %p for survey %p returns %p', (_name, key, surveyId, expected) => {
    expect(isSurveyKeyForSurvey(key, surveyId)).toBe(expected)
  })
})
