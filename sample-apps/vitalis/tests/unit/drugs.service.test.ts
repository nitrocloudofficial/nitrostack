import { describe, expect, it } from 'vitest';
import { DrugsService } from '../../src/modules/drugs/drugs.service.js';

describe('DrugsService clinical degradation and contracts', () => {
  it('degrades RxNorm properties/classes independently during drug search', async () => {
    const service = new DrugsService(
      {
        resolveName: async () => '123',
        getProperties: async () => {
          throw new Error('properties unavailable');
        },
        getDrugs: async () => [{ name: 'Metformin', tty: 'IN', synonym: 'metformin' }],
        getClasses: async () => {
          throw new Error('classes unavailable');
        },
        approximateMatch: async () => [],
      } as any,
      {} as any,
    );

    await expect(service.searchDrugs('metformin', false)).resolves.toEqual([
      {
        rxcui: '123',
        name: 'Metformin',
        tty: 'IN',
        synonyms: ['metformin'],
        classes: [],
      },
    ]);
  });

  it('normalizes FDA rxcui output to the documented scalar contract', async () => {
    const service = new DrugsService(
      {} as any,
      {
        getLabel: async () => ({
          openfda: {
            generic_name: ['metformin'],
            brand_name: ['Glucophage'],
            rxcui: ['6809', 'duplicate-value'],
          },
          indications_and_usage: ['For treatment.'],
        }),
      } as any,
    );

    const result = await service.getLabelInfo('metformin', ['indications_and_usage']);
    expect(result).toMatchObject({
      found: true,
      rxcui: '6809',
      sections: { indications_and_usage: 'For treatment.' },
    });
  });
});
