import { describe, it, expect } from 'vitest';
import { computeEmi, principalForEmi } from '../src/lib/emi.js';

describe('EMI math (reducing balance)', () => {
  it('pins ₹3,00,000 @ 15.99% for 36m (PLAN.md §5 Phase 2 range 10,545–10,650)', () => {
    const emi = computeEmi(300000, 15.99, 36);
    expect(emi).toBe(10546);
    expect(emi).toBeGreaterThanOrEqual(10545);
    expect(emi).toBeLessThanOrEqual(10650);
  });

  it('principalForEmi is the inverse of computeEmi (within rounding)', () => {
    const p = principalForEmi(10546, 15.99, 36);
    expect(Math.abs(p - 300000)).toBeLessThan(50);
  });

  it('zero interest → straight division', () => {
    expect(computeEmi(120000, 0, 12)).toBe(10000);
  });
});
