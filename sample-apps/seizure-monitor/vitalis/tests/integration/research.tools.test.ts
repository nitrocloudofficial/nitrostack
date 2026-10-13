import { describe, expect, it, vi } from 'vitest';
import { PubMedService } from '../../src/integrations/pubmed.service.js';
import { ClinicalTrialsService } from '../../src/integrations/clinicaltrials.service.js';

describe('research integration mappings', () => {
  it('constructs PubMed queries and maps summary output fields', async () => {
    const getJson = vi.fn().mockResolvedValue({
      data: {
        esearchresult: { count: '1', idlist: ['123'] },
      },
    });
    const service = new PubMedService({ getJson } as any);

    const result = await service.search('diabetes', 1, 'guideline', 3);
    const url = new URL(getJson.mock.calls[0][0].url);
    expect(url.searchParams.get('db')).toBe('pubmed');
    expect(url.searchParams.get('retmax')).toBe('1');
    expect(url.searchParams.get('term')).toContain('guideline');
    expect(result).toEqual({ count: 1, pmids: ['123'] });
  });

  it('maps ClinicalTrials.gov v2 data and applies status/phase filters', async () => {
    const getJson = vi.fn().mockResolvedValue({
      data: {
        totalCount: 1,
        studies: [{ protocolSection: {
          identificationModule: { nctId: 'NCT00000001', briefTitle: 'Fixture trial' },
          statusModule: { overallStatus: 'RECRUITING', startDateStruct: { date: '2025-01-01' } },
          designModule: { phases: ['PHASE2'] },
          conditionsModule: { conditions: ['Diabetes'] },
          sponsorCollaboratorsModule: { leadSponsor: { name: 'Fixture sponsor' } },
          contactsLocationsModule: { locations: [{ city: 'Boston', country: 'United States' }] },
        } }],
      },
    });
    const service = new ClinicalTrialsService({ getJson } as any);

    const result = await service.searchTrials('diabetes', 'recruiting', '2', 1);
    const url = new URL(getJson.mock.calls[0][0].url);
    expect(url.searchParams.get('filter.overallStatus')).toBe('RECRUITING');
    expect(url.searchParams.get('filter.phase')).toBe('PHASE2');
    expect(result.trials[0]).toMatchObject({ nct_id: 'NCT00000001', overall_status: 'RECRUITING' });
  });
});
