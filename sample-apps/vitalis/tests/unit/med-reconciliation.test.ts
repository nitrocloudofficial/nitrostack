import { describe, expect, it } from 'vitest';
import { CareService } from '../../src/modules/care/care.service.js';

describe('CareService medication reconciliation', () => {
  function service(rxnorm: any = {}) {
    return new CareService(
      {} as any,
      {} as any,
      {
        resolveName: rxnorm.resolveName ?? (async () => null),
        getProperties: rxnorm.getProperties ?? (async () => null),
      } as any,
    );
  }

  it('reports continued, added, removed, and anticoagulant/NSAID risk', async () => {
    const result = await service().reconcileMedications(
      ['Warfarin 5 mg', 'Metformin 500 mg'],
      ['warfarin 5 mg', 'Metformin 500 mg', 'Ibuprofen 400 mg'],
      'EHR',
      'Patient',
    );

    expect(result.continued).toEqual(['Warfarin 5 mg', 'Metformin 500 mg']);
    expect(result.added).toEqual(['Ibuprofen 400 mg']);
    expect(result.removed).toEqual([]);
    expect(result.possible_duplicates).toEqual([
      expect.objectContaining({
        a: 'Warfarin 5 mg',
        b: 'Ibuprofen 400 mg',
      }),
    ]);
    expect(result.labels).toEqual({ list_a: 'EHR', list_b: 'Patient' });
  });

  it('uses RxNorm canonical names when available', async () => {
    const result = await service({
      resolveName: async () => '123',
      getProperties: async () => ({ name: 'Metformin' }),
    }).reconcileMedications(['metformin 500 mg'], ['Metformin'], 'A', 'B');

    expect(result.continued).toEqual(['metformin 500 mg']);
    expect(result.added).toEqual([]);
    expect(result.removed).toEqual([]);
  });

  it('uses an unavailable-context placeholder instead of fabricated referral demographics', async () => {
    const care = new CareService(
      { getPatientSummary: async () => { throw new Error('FHIR unavailable'); } } as any,
      {} as any,
      {} as any,
    );

    const result = await care.draftReferral('patient-1', 'Cardiology', 'Persistent symptoms need review.');
    expect(result.referral.patient_summary_block).toContain('[patient context unavailable]');
    expect(result.referral.relevant_conditions).toEqual([]);
    expect(result.referral.relevant_medications).toEqual([]);
    expect(result.referral.draft_text).toContain('RELEVANT ACTIVE CONDITIONS:\n[patient context unavailable]');
    expect(result.requires_clinician_review).toBe(true);
    expect(result.sections_failed).toContain('patient');
  });

  it('propagates partial FHIR summary status into handoff output', async () => {
    const care = new CareService(
      {
        getPatientSummary: async () => ({
          patient: { name: 'Synthetic Patient', age: 40, gender: 'female' },
          active_conditions: [],
          active_medications: [],
          recent_vitals: [],
          recent_encounters: [],
          allergy_note: 'Unavailable',
          generated_at: new Date().toISOString(),
          synthetic_data: true,
          sections_failed: ['medications'],
          server_used: 'https://fallback.fhir.test',
        }),
      } as any,
      {} as any,
      {} as any,
    );

    const result = await care.generateHandoff('patient-1');
    expect(result.sections_failed).toEqual(['medications']);
    expect(result.server_used).toBe('https://fallback.fhir.test');
  });
});
