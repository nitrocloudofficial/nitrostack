import { describe, expect, it } from 'vitest';
import { DrugsService } from '../../src/modules/drugs/drugs.service.js';

describe('drugs integration mapping', () => {
  it('maps RxNorm and FDA label data into the public interaction contract', async () => {
    const service = new DrugsService(
      {
        resolveName: async (name: string) => (name === 'warfarin' ? '11289' : null),
        getProperties: async () => ({ name: 'Warfarin Sodium', tty: 'IN', synonym: 'warfarin' }),
        getDrugs: async () => [{ name: 'Warfarin Sodium', tty: 'IN', synonym: 'warfarin' }],
        getClasses: async () => ['Anticoagulants'],
      } as any,
      {
        getLabel: async (name: string) =>
          name === 'warfarin'
            ? { openfda: { generic_name: ['warfarin'], rxcui: ['11289'] }, drug_interactions: ['Aspirin may increase the risk of bleeding; avoid combination.'] }
            : { openfda: { generic_name: ['aspirin'] }, drug_interactions: [] },
      } as any,
    );

    const search = await service.searchDrugs('warfarin', false);
    expect(search[0]).toMatchObject({ rxcui: '11289', classes: ['Anticoagulants'] });

    const result = await service.checkInteractions(['warfarin', 'aspirin']);
    expect(result.interactions[0]).toMatchObject({
      pair: ['warfarin', 'aspirin'],
      severity_band: 'major',
      source: 'fda_label',
    });
    expect(result.drugs_without_labels).toEqual([]);
  });
});
