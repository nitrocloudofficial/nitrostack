// Builds a REAL-shaped assess_project result offline: the real assessment code runs over the test fixture projects
// (a PHP shop and a Node orders service, side by side as a monorepo) with a stand-in for OSV/EPSS/KEV, so no network.
// Output: tests/fixtures/widget/assess_project.monorepo.json (NitroStack result envelope with structuredContent).
// Usage: node scripts/make-widget-fixture.mjs
import { build } from 'esbuild';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const entry = `
import { assessRepository } from ${JSON.stringify(join(root, 'src/modules/assessment/assess.ts'))};
import { writeNodeFixture, writePhpFixture } from ${JSON.stringify(join(root, 'tests/helpers/fixtures.ts'))};
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
const ADV = {
  lodash: { id: 'GHSA-35jh-r3h4-6jhm', aliases: ['CVE-2021-23337'], severity: 'critical', urgentReasons: ['known_exploited', 'high_severity'], fixed: '4.17.21' },
  'guzzlehttp/guzzle': { id: 'GHSA-25mq-v84q-4j7r', aliases: ['CVE-2022-29248'], severity: 'high', urgentReasons: ['high_severity'], fixed: '6.5.8' },
  'symfony/http-kernel': { id: 'GHSA-q847-2q57-wmr3', aliases: ['CVE-2022-24894'], severity: 'high', urgentReasons: [], fixed: '4.4.50' },
  request: { id: 'GHSA-p8p7-x288-28g6', aliases: ['CVE-2023-28155'], severity: 'medium', urgentReasons: [], fixed: undefined },
};
const analyze = async (pkgs) => pkgs.map((p) => {
  const a = ADV[p.name];
  if (!a) return { package: p, affected: false, findings: [], truncated: false };
  return { package: p, affected: true, truncated: false, findings: [{ id: a.id, aliases: a.aliases, severity: a.severity, summary: 'advisory', fixedVersions: a.fixed ? [a.fixed] : [], urgent: a.urgentReasons.length > 0, urgentReasons: a.urgentReasons }] };
});
const epss = async (cves) => new Map(cves.map((c) => [c, c === 'CVE-2021-23337' ? 0.31 : c === 'CVE-2022-29248' ? 0.02 : 0.004]));
export default async function (dir) {
  await mkdir(join(dir, 'services/shop'), { recursive: true });
  await mkdir(join(dir, 'services/orders'), { recursive: true });
  await writePhpFixture(join(dir, 'services/shop'));
  await writeNodeFixture(join(dir, 'services/orders'));
  const r = await assessRepository(dir, { analyze, epss, today: new Date('2026-10-30T00:00:00Z') });
  return r.assessment;
}`;

const out = await mkdtemp(join(tmpdir(), 'metamorph-fixture-'));
const bundle = join(out, 'run.mjs');
await build({ stdin: { contents: entry, resolveDir: root, loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', outfile: bundle, logLevel: 'error', external: ['pdfmake'] });
const work = join(out, 'repo');
await mkdir(work);
const assessment = await (await import(pathToFileURL(bundle).href)).default(work);
await rm(out, { recursive: true, force: true });
const text = JSON.stringify({ ...assessment, nextStep: 'Call plan_modernization with the same repo_url to get ordered stages, or generate_report for a PDF, SARIF and SBOM.' }, null, 2);
const env = { content: [{ type: 'text', text }], structuredContent: JSON.parse(text) };
const file = join(root, 'tests/fixtures/widget/assess_project.monorepo.json');
await writeFile(file, JSON.stringify(env, null, 2) + '\n');
console.log('wrote', file, 'score', assessment.score.overall, 'findings', assessment.findingCount);
