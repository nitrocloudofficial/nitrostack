/**
 * Capture sanitized public upstream fixtures for offline integration tests.
 * Run explicitly with a TypeScript runner (for example, `npx tsx scripts/record-fixtures.ts`).
 * This script never sends credentials and caps each response at 1 MiB.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const MAX_BYTES = 1_048_576;
const fixtures: Array<{ file: string; url: string; accept?: string }> = [
  {
    file: 'rxnorm/drugs-warfarin.json',
    url: 'https://rxnav.nlm.nih.gov/REST/drugs.json?name=warfarin',
  },
  {
    file: 'openfda/label-warfarin.json',
    url: 'https://api.fda.gov/drug/label.json?search=openfda.generic_name:%22warfarin%22&limit=1',
  },
  {
    file: 'pubmed/efetch.xml',
    url: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=12345678&rettype=abstract&retmode=xml&tool=vitalis&email=vitalis-test@example.com',
    accept: 'application/xml',
  },
  {
    file: 'trials/search.json',
    url: 'https://clinicaltrials.gov/api/v2/studies?query.cond=diabetes&pageSize=1',
  },
  {
    file: 'fhir/primary-patient.json',
    url: 'https://hapi.fhir.org/baseR4/Patient?_count=1',
  },
  {
    file: 'clinicaltables/icd10.json',
    url: 'https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?terms=hypertension&sf=code,name&df=code,name&maxList=1',
  },
];

for (const fixture of fixtures) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(fixture.url, {
      headers: {
        'User-Agent': 'vitalis-fixture-recorder/1.0 (public synthetic fixtures)',
        Accept: fixture.accept ?? 'application/json',
      },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength > MAX_BYTES) throw new Error('response exceeded 1 MiB');
    const destination = join(process.cwd(), 'tests/integration/fixtures', fixture.file);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, bytes);
    console.log(`Recorded ${fixture.file}`);
  } finally {
    clearTimeout(timer);
  }
}
