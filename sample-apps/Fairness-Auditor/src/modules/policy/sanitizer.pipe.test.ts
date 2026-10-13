import { DynamicFieldSanitizerPipe } from './sanitizer.pipe.js';
import type { PolicyService } from './policy.service.js';
import type { ArgumentMetadata } from '@nitrostack/core';

// A minimal stub for the PolicyService — no DB, no network.
function makePolicy(redactFields: string[], neutralValue = 'REDACTED'): PolicyService {
  return {
    getActive: async () => ({
      redact_fields: redactFields,
      neutral_value: neutralValue,
      group_adjustments: {},
      rationale: null,
    }),
    getHistory: async () => [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const dummyMeta: ArgumentMetadata = { type: 'body' };

describe('DynamicFieldSanitizerPipe', () => {
  it('redacts only the fields listed in the active policy', async () => {
    const pipe = new DynamicFieldSanitizerPipe(makePolicy(['zip_code']));
    const result = await pipe.transform(
      { zip_code: '90210', income: 60000, credit_score: 720 },
      dummyMeta
    ) as Record<string, unknown>;

    expect(result.zip_code).toBe('REDACTED');
    expect(result.income).toBe(60000);
    expect(result.credit_score).toBe(720);
  });

  it('leaves input completely untouched when no fields are flagged', async () => {
    const pipe = new DynamicFieldSanitizerPipe(makePolicy([]));
    const input = { zip_code: '90210', income: 60000 };
    const result = await pipe.transform(input, dummyMeta);
    expect(result).toEqual(input);
  });

  it('uses the custom neutral_value from the policy, not a hardcoded string', async () => {
    const pipe = new DynamicFieldSanitizerPipe(makePolicy(['applicant_name'], '***'));
    const result = await pipe.transform(
      { applicant_name: 'Jane Doe', credit_score: 700 },
      dummyMeta
    ) as Record<string, unknown>;

    expect(result.applicant_name).toBe('***');
    expect(result.credit_score).toBe(700);
  });

  it('redacts multiple fields in a single pass', async () => {
    const pipe = new DynamicFieldSanitizerPipe(makePolicy(['zip_code', 'applicant_name']));
    const result = await pipe.transform(
      { zip_code: '10044', applicant_name: 'Test User', income: 80000 },
      dummyMeta
    ) as Record<string, unknown>;

    expect(result.zip_code).toBe('REDACTED');
    expect(result.applicant_name).toBe('REDACTED');
    expect(result.income).toBe(80000);
  });

  it('returns non-object input unchanged (null, string, number)', async () => {
    const pipe = new DynamicFieldSanitizerPipe(makePolicy(['zip_code']));
    expect(await pipe.transform(null, dummyMeta)).toBeNull();
    expect(await pipe.transform('raw string', dummyMeta)).toBe('raw string');
    expect(await pipe.transform(42, dummyMeta)).toBe(42);
  });

  it('returns array input unchanged — arrays are not loan application objects', async () => {
    const pipe = new DynamicFieldSanitizerPipe(makePolicy(['zip_code']));
    const arr = [{ zip_code: '90210' }];
    expect(await pipe.transform(arr, dummyMeta)).toEqual(arr);
  });

  it('does not mutate the original input object', async () => {
    const pipe = new DynamicFieldSanitizerPipe(makePolicy(['zip_code']));
    const original = { zip_code: '90210', income: 60000 };
    const frozen = Object.freeze({ ...original });
    const result = await pipe.transform(frozen, dummyMeta) as Record<string, unknown>;
    // Original frozen object is unchanged — result is a new copy
    expect(result.zip_code).toBe('REDACTED');
    expect(frozen.zip_code).toBe('90210');
  });
});
