import { describe, it, expect } from 'vitest';
import { TriageService } from '../../src/modules/triage/triage.service.js';

describe('TriageService Engine Tests (Safety Critical)', () => {
  const service = new TriageService();

  it('identifies emergency chest pain and radiating pain', () => {
    const result = service.assessSymptoms({
      symptoms: ['chest pain radiating to arm', 'sweating'],
      age: 50,
      sex: 'male',
      severity: 9,
    });
    expect(result.urgency_tier).toBe('emergency');
    expect(result.red_flags.length).toBeGreaterThan(0);
    expect(result.possible_conditions.some((condition) => condition.name === 'Acute Coronary Syndrome')).toBe(true);
    expect(result.guidance).toContain('Immediate clinical evaluation');
  });

  it('identifies emergency acute neurological stroke symptoms', () => {
    const screen = service.checkRedFlags(['facial drooping', 'slurred speech']);
    expect(screen.is_emergency).toBe(true);
    expect(screen.matched_red_flags.some((f) => f.flag.includes('Neurological'))).toBe(true);
  });

  it('identifies infant fever under 3 months as emergency', () => {
    const result = service.assessSymptoms({
      symptoms: ['fever'],
      age: 0.1, // ~1 month old
      sex: 'female',
    });
    expect(result.urgency_tier).toBe('emergency');
    expect(result.red_flags.some((r) => r.flag.includes('Infant Fever'))).toBe(true);
  });

  it('assigns urgent tier for severe non-emergency symptoms', () => {
    const result = service.assessSymptoms({
      symptoms: ['high fever', 'cough'],
      age: 30,
      sex: 'male',
      severity: 8,
    });
    expect(result.urgency_tier).toBe('urgent');
  });

  it('assigns routine tier for mild prolonged symptoms', () => {
    const result = service.assessSymptoms({
      symptoms: ['mild sore throat'],
      age: 25,
      sex: 'female',
      duration_hours: 48,
      severity: 3,
    });
    expect(result.urgency_tier).toBe('routine');
  });

  it('assigns self_care tier for mild acute symptoms', () => {
    const result = service.assessSymptoms({
      symptoms: ['runny nose'],
      age: 22,
      sex: 'male',
      duration_hours: 6,
      severity: 2,
    });
    expect(result.urgency_tier).toBe('self_care');
  });

  it('defaults to safe urgent tier on invalid input processing', () => {
    // Pass null/invalid array to test fail-safe posture
    const result = service.assessSymptoms({
      symptoms: null as any,
      age: 30,
      sex: 'other',
    });
    expect(result.urgency_tier).toBe('urgent');
  });
});
