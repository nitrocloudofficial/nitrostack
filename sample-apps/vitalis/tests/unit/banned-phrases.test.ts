import { describe, it, expect } from 'vitest';
import { rewriteBannedPhrases } from '../../src/gateway/banned-phrases.js';

describe('ClinicalSafetyInterceptor Banned Phrase Rewriter Tests', () => {
  it('rewrites "you have [condition]" phrasing', () => {
    const text = 'Based on symptoms, you have hypertension.';
    const rewritten = rewriteBannedPhrases(text);
    expect(rewritten).not.toContain('you have hypertension');
    expect(rewritten).toContain('your symptoms may be associated with hypertension');
  });

  it('rewrites "you are diagnosed with" phrasing', () => {
    const text = 'you are diagnosed with type 2 diabetes.';
    const rewritten = rewriteBannedPhrases(text);
    expect(rewritten).not.toContain('you are diagnosed with');
    expect(rewritten).toContain('discuss the possibility of');
  });

  it('rewrites prescriptive dosing language', () => {
    const text = 'you should take 500 mg of metformin daily.';
    const rewritten = rewriteBannedPhrases(text);
    expect(rewritten).toContain('dosing must be confirmed by a clinician or pharmacist');
  });

  it('handles nested objects and arrays recursively', () => {
    const obj = {
      title: 'Assessment',
      details: ['you have asthma.', 'this means you have bronchitis.'],
    };
    const rewritten = rewriteBannedPhrases(obj);
    expect(rewritten.details[0]).toContain('your symptoms may be associated with asthma');
    expect(rewritten.details[1]).toContain('this could indicate');
  });

  it.each([
    ['YOU HAVE pneumonia!', 'your symptoms may be associated with pneumonia'],
    ['This is appendicitis.', 'this could indicate appendicitis'],
    ['THIS MEANS YOU HAVE asthma.', 'this could indicate asthma'],
    ['This is definitely a diagnosis confirmed by testing.', 'evaluated by a clinician'],
    ['The report says diagnosed in the history.', 'evaluated by a clinician'],
    ['You should take 2.5 mg of the medication.', 'dosing must be confirmed by a clinician or pharmacist'],
  ])('rewrites the planned rule: %s', (input, expected) => {
    expect(rewriteBannedPhrases(input)).toContain(expected);
  });

  it('preserves benign text and non-string values', () => {
    const input = {
      note: 'The report describes a possible association; consult a clinician.',
      count: 4,
      active: false,
    };
    expect(rewriteBannedPhrases(input)).toEqual(input);
  });

  it('rewrites multiple phrases in one string without changing punctuation', () => {
    const rewritten = rewriteBannedPhrases(
      'You have asthma, and you are diagnosed with allergies; definitely seek review.',
    );
    expect(rewritten).toContain('your symptoms may be associated with asthma,');
    expect(rewritten).toContain('discuss the possibility of allergies;');
    expect(rewritten).not.toContain('definitely');
  });
});
