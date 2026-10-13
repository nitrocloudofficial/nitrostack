import { DecisionCalibratorInterceptor } from './calibrator.interceptor.js';
import type { PolicyService } from './policy.service.js';
import type { ExecutionContext } from '@nitrostack/core';

function makePolicy(groupAdjustments: Record<string, { threshold_delta: number }>): PolicyService {
  return {
    getActive: async () => ({
      redact_fields: [],
      neutral_value: 'REDACTED',
      group_adjustments: groupAdjustments,
      rationale: null,
    }),
    getHistory: async () => [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

function makeContext(zip_code?: string): ExecutionContext {
  return {
    params: zip_code ? { zip_code } : {},
  } as unknown as ExecutionContext;
}

describe('DecisionCalibratorInterceptor', () => {
  it('applies threshold_delta for the inferred group (zip_code)', async () => {
    const interceptor = new DecisionCalibratorInterceptor(
      makePolicy({ '90210': { threshold_delta: 0.06 } })
    );
    const result = await interceptor.intercept(
      makeContext('90210'),
      async () => ({ is_approved: false, score: 0.5 })
    ) as Record<string, unknown>;

    expect(result.score).toBeCloseTo(0.56);
    expect(result.is_approved).toBe(false); // pass-through unchanged
  });

  it('is a no-op when the group has no adjustment entry', async () => {
    const interceptor = new DecisionCalibratorInterceptor(makePolicy({}));
    const result = await interceptor.intercept(
      makeContext('99999'),
      async () => ({ is_approved: true, score: 0.75 })
    ) as Record<string, unknown>;

    expect(result.score).toBe(0.75);
  });

  it('is a no-op when group_adjustments is empty', async () => {
    const interceptor = new DecisionCalibratorInterceptor(makePolicy({}));
    const result = await interceptor.intercept(
      makeContext('10044'),
      async () => ({ score: 0.4 })
    ) as Record<string, unknown>;

    expect(result.score).toBe(0.4);
  });

  it('clamps adjusted score to max 1.0 — cannot exceed ceiling', async () => {
    const interceptor = new DecisionCalibratorInterceptor(
      makePolicy({ '10044': { threshold_delta: 0.5 } })
    );
    const result = await interceptor.intercept(
      makeContext('10044'),
      async () => ({ score: 0.9 })
    ) as Record<string, unknown>;

    expect(result.score).toBeLessThanOrEqual(1.0);
  });

  it('clamps adjusted score to min 0.0 — cannot go negative', async () => {
    const interceptor = new DecisionCalibratorInterceptor(
      makePolicy({ '10044': { threshold_delta: -0.5 } })
    );
    const result = await interceptor.intercept(
      makeContext('10044'),
      async () => ({ score: 0.1 })
    ) as Record<string, unknown>;

    expect(result.score).toBeGreaterThanOrEqual(0.0);
  });

  it('uses unknown group key when zip_code is absent from context', async () => {
    const interceptor = new DecisionCalibratorInterceptor(
      makePolicy({ unknown: { threshold_delta: 0.1 } })
    );
    const result = await interceptor.intercept(
      makeContext(undefined),
      async () => ({ score: 0.5 })
    ) as Record<string, unknown>;

    // 'unknown' key IS in policy so adjustment applies
    expect(result.score).toBeCloseTo(0.6);
  });

  it('preserves all other fields in the result object unchanged', async () => {
    const interceptor = new DecisionCalibratorInterceptor(
      makePolicy({ '90210': { threshold_delta: 0.06 } })
    );
    const result = await interceptor.intercept(
      makeContext('90210'),
      async () => ({ score: 0.5, is_approved: true, reason: 'Meets thresholds', extra: 42 })
    ) as Record<string, unknown>;

    expect(result.is_approved).toBe(true);
    expect(result.reason).toBe('Meets thresholds');
    expect(result.extra).toBe(42);
  });
});
