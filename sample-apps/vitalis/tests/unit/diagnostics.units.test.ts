import { describe, expect, it } from 'vitest';
import { DiagnosticsService } from '../../src/modules/diagnostics/diagnostics.service.js';

describe('DiagnosticsService unit handling', () => {
  const service = new DiagnosticsService(null as any);

  it('converts glucose from mmol/L to canonical mg/dL before classification', () => {
    const result = service.interpretLabValue('glucose', 10, 'mmol/L');

    expect(result.unit).toBe('mg/dL');
    expect(result.original_unit).toBe('mmol/L');
    expect(result.value).toBeCloseTo(180.182, 2);
    expect(result.flag).toBe('high');
  });

  it('rejects unsupported unit mismatches', () => {
    expect(() => service.interpretLabValue('glucose', 100, 'kPa')).toThrow(
      'VALIDATION_ERROR',
    );
  });
});
