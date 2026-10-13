import { describe, expect, it } from 'vitest';
import { HttpClientService } from '../../src/integrations/http-client.service.js';

const liveEnabled = process.env.LIVE_API_TESTS === 'true';
const liveIt = liveEnabled ? it : it.skip;
const ncbiEmail = process.env.NCBI_EMAIL ?? 'vitalis-test@example.com';
const http = new HttpClientService();

async function getJson(api: string, url: string): Promise<any> {
  const response = await http.getJson({
    api,
    url,
    timeoutMs: 8_000,
    deadlineMs: 20_000,
    maxRetries: 2,
  });
  return response.data;
}

describe('Live upstream smoke tests', () => {
  liveIt('responds with the expected shape from all required upstreams', async () => {
    const rxnorm = await getJson(
      'rxnorm',
      'https://rxnav.nlm.nih.gov/REST/rxcui.json?name=metformin',
    );
    expect(rxnorm.idGroup?.rxnormId?.length).toBeGreaterThan(0);

    const openFda = await getJson(
      'openfda',
      'https://api.fda.gov/drug/label.json?search=openfda.generic_name:%22warfarin%22&limit=1',
    );
    expect(openFda.results?.[0]?.openfda).toBeDefined();

    const pubmed = await getJson(
      'pubmed',
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=diabetes&retmode=json&retmax=1&tool=vitalis&email=${encodeURIComponent(ncbiEmail)}`,
    );
    expect(Number(pubmed.esearchresult?.count)).toBeGreaterThan(0);

    const trials = await getJson(
      'clinicaltrials',
      'https://clinicaltrials.gov/api/v2/studies?query.cond=diabetes&pageSize=1',
    );
    expect(trials.studies?.length).toBeGreaterThan(0);

    const fhir = await getJson('fhir', 'https://hapi.fhir.org/baseR4/Patient?_count=1');
    expect(fhir.resourceType).toBe('Bundle');

    const clinicalTables = await getJson(
      'clinicaltables',
      'https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?terms=diabetes&sf=code,name&df=code,name&maxList=1',
    );
    expect(Array.isArray(clinicalTables)).toBe(true);
    expect(clinicalTables[0]).toBeGreaterThan(0);
  });
});
