import { describe, it, expect } from 'vitest';
import { DiagnosticsService } from '../../src/modules/diagnostics/diagnostics.service.js';

describe('DiagnosticsService Lab Interpreter Tests (Safety Critical)', () => {
  const service = new DiagnosticsService(null as any);

  it('interprets normal HbA1c correctly', () => {
    const res = service.interpretLabValue('hba1c', 5.2, '%');
    expect(res.flag).toBe('normal');
    expect(res.reference_range?.low).toBe(4.0);
  });

  it('interprets high HbA1c correctly', () => {
    const res = service.interpretLabValue('hba1c', 8.2, '%');
    expect(res.flag).toBe('high');
    expect(res.possible_causes).toContain('Diabetes mellitus (>=6.5%)');
  });

  it('detects critical high glucose threshold', () => {
    const res = service.interpretLabValue('glucose', 450, 'mg/dL');
    expect(res.flag).toBe('critical_high');
  });

  it('detects critical low potassium threshold', () => {
    const res = service.interpretLabValue('potassium', 2.2, 'mEq/L');
    expect(res.flag).toBe('critical_low');
  });

  it('handles unknown analyte gracefully with suggestions and supported list', () => {
    const res = service.interpretLabValue('glucse', 10, 'mg/dL');
    expect(res.flag).toBe('unknown');
    expect(res.suggestions).toContain('glucose');
    expect(res.supported_analytes).toContain('potassium');
    expect(res.caveats).toContain('not in reference range table');
  });

  it('resolves safe analyte aliases and converts glucose units', () => {
    const res = service.interpretLabValue('blood glucose', 5.5, 'mmol/L');
    expect(res.analyte).toBe('Fasting Serum Glucose');
    expect(res.unit).toBe('mg/dL');
    expect(res.original_unit).toBe('mmol/L');
    expect(res.value).toBeCloseTo(99.1, 1);
  });

  it('rejects unsupported unit mismatches with a structured validation error', () => {
    expect(() => service.interpretLabValue('hemoglobin', 12, 'mg/dL')).toThrow('VALIDATION_ERROR');
  });

  it('suggests nearby lab explanations for unknown test names', () => {
    const result = service.explainLabTest('hbaic');
    expect(result.suggestions).toContain('hba1c');
  });
});
