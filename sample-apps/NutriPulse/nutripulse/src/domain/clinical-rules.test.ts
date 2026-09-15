import { describe, it, expect } from 'vitest';
import { evaluateSafetyVerdicts } from './clinical-rules.js';
import { SafetyVerdict } from './types.js';

describe('Clinical Rules - SafetyVerdict Merging', () => {
  it('should return PASS when there are no verdicts', () => {
    const result = evaluateSafetyVerdicts([]);
    expect(result.status).toBe('PASS');
    expect(result.severity).toBe('none');
  });

  it('should return PASS when all verdicts are PASS', () => {
    const verdicts: SafetyVerdict[] = [
      { status: 'PASS', severity: 'none' },
      { status: 'PASS', severity: 'none' },
    ];
    const result = evaluateSafetyVerdicts(verdicts);
    expect(result.status).toBe('PASS');
  });

  it('should return WARN when there is at least one WARN and no BLOCK', () => {
    const verdicts: SafetyVerdict[] = [
      { status: 'PASS', severity: 'none' },
      { status: 'WARN', severity: 'moderate', rule_id: 'rule1' },
      { status: 'PASS', severity: 'none' },
    ];
    const result = evaluateSafetyVerdicts(verdicts);
    expect(result.status).toBe('WARN');
    expect(result.severity).toBe('moderate');
    expect(result.rule_id).toBe('rule1');
  });

  it('should strictly return BLOCK when any BLOCK verdict is present, regardless of other verdicts', () => {
    const verdicts: SafetyVerdict[] = [
      { status: 'PASS', severity: 'none' },
      { status: 'WARN', severity: 'moderate', rule_id: 'warn1' },
      { status: 'BLOCK', severity: 'severe', rule_id: 'block1' },
      { status: 'PASS', severity: 'none' },
      { status: 'WARN', severity: 'mild', rule_id: 'warn2' },
    ];
    const result = evaluateSafetyVerdicts(verdicts);
    expect(result.status).toBe('BLOCK');
    expect(result.severity).toBe('severe');
    expect(result.rule_id).toBe('block1');
  });

  it('should return the first BLOCK when multiple BLOCK verdicts exist', () => {
    const verdicts: SafetyVerdict[] = [
      { status: 'BLOCK', severity: 'critical', rule_id: 'block_critical' },
      { status: 'BLOCK', severity: 'severe', rule_id: 'block_severe' },
    ];
    const result = evaluateSafetyVerdicts(verdicts);
    expect(result.status).toBe('BLOCK');
    expect(result.severity).toBe('critical');
    expect(result.rule_id).toBe('block_critical');
  });
});
