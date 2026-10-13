import { describe, it, expect } from 'vitest';
import { panLastDigit, mobileSuffix, resolveBureau, resolveFraud, resolveCity } from '../src/lib/seeds.js';

describe('deterministic seed mapping (CLAUDE.md rule 5)', () => {
  it('demo PAN VITTA1235K → last digit 5 → CONDITIONAL bureau profile', () => {
    expect(panLastDigit('VITTA1235K')).toBe('5');
    const b = resolveBureau('VITTA1235K');
    // CONDITIONAL: passes hard negatives but carries high existing EMI
    expect(b.score).toBeGreaterThanOrEqual(680);
    expect(b.dpd_max_12m).toBeLessThanOrEqual(30);
    expect(b.writeoff_24m).toBe(false);
    expect(b.inquiries_6m).toBeLessThanOrEqual(6);
    expect(b.active_emi).toBeGreaterThan(20000);
  });

  it('demo mobile 9876543222 → suffix 22 (stable salaried band)', () => {
    expect(mobileSuffix('9876543222')).toBe(22);
  });

  it('PAN ending 0 → APPROVE profile (clean, high score)', () => {
    const b = resolveBureau('AAAPA1230A');
    expect(b.score).toBeGreaterThanOrEqual(760);
    expect(b.writeoff_24m).toBe(false);
  });

  it('PAN ending 9 → DECLINE profile (subprime + write-off + DPD)', () => {
    const b = resolveBureau('ZZZPZ1239Z');
    expect(b.score).toBeLessThan(680);
    expect(b.writeoff_24m).toBe(true);
    expect(b.dpd_max_12m).toBeGreaterThan(30);
  });

  it('fraud REVIEW at mobile suffix 99 (regression path E)', () => {
    expect(resolveFraud('9000000099').verdict).toBe('REVIEW');
    expect(resolveFraud('9876543222').verdict).toBe('CLEAR');
  });

  it('city serviceability', () => {
    expect(resolveCity('Kochi').served).toBe(true);
    expect(resolveCity('Atlantis').served).toBe(false);
  });
});
