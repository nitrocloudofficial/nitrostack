import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { extractTarGz } from '../../src/common/safe-archive.js';
import { withRepo } from '../../src/modules/assessment/repo-source.js';
import { scoreFindings } from '../../src/modules/assessment/score.js';
import type { FullAssessment } from '../../src/modules/assessment/assess.js';
import { UNAVAILABLE, recordFeeds } from '../../src/modules/report/feed-sources.js';
import { attachRunnerResult, buildReportData, type ReportData, type RunnerSummary } from '../../src/modules/report/report-data.js';
import { collectReportData } from '../../src/modules/report/report.tools.js';
import { buildSarif } from '../../src/modules/report/sarif.js';
import { buildSbom } from '../../src/modules/report/sbom.js';
import { tgzOf, tgzWithGlobalHeader } from '../helpers/tar.js';

const SHA = '41d1c9784742b8b8903f4f4b67378c9f1e5c9a81';
const NOW = '2026-10-31T12:00:00.000Z';
const ctx = { logger: { info: () => undefined } } as unknown as Parameters<typeof withRepo>[2];
const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

const PKG = JSON.stringify({ name: 'legacy', version: '1.0.0', engines: { node: '>=10' }, dependencies: { lodash: '4.17.15' } });
const LOCK = JSON.stringify({ name: 'legacy', lockfileVersion: 3, packages: { '': { name: 'legacy' }, 'node_modules/lodash': { version: '4.17.15' } } });
const REPO_FILES = { 'legacy-main/package.json': PKG, 'legacy-main/package-lock.json': LOCK };
const serve = (body: Buffer): typeof fetch => (async () => new Response(body, { status: 200 })) as unknown as typeof fetch;

function emptyFull(): FullAssessment {
  return {
    assessment: {
      assessmentId: 't', stack: 'node', runtime: {}, frameworks: [], uiLibraries: [], hosting: [],
      dependencies: { total: 0, checked: 0, vulnerable: 0, urgent: 0, approximateVersions: false },
      score: scoreFindings([]), topFindings: [], findingCount: 0, truncated: false
    },
    findings: [], fixes: [], files: {}
  };
}

function baseData(meta: Partial<ReportData['meta']> = {}): ReportData {
  return buildReportData({ full: emptyFull(), meta: { repoUrl: 'https://github.com/o/r', generatedAt: NOW, ...meta } });
}

describe('1. commit sha from the archive', () => {
  it('reads the pax global header comment (as GitHub codeload writes it)', async () => {
    const dest = await mkdtemp(join(tmpdir(), 'mm-sha-'));
    dirs.push(dest);
    const r = await extractTarGz(tgzWithGlobalHeader(REPO_FILES, { comment: SHA }), dest);
    expect(r.commit).toBe(SHA);
    expect(r.files).toBe(2);
    expect(await readFile(join(dest, 'package.json'), 'utf8')).toBe(PKG);
  });

  it.each([
    ['too short', 'abc123'],
    ['uppercase', SHA.toUpperCase()],
    ['41 chars', SHA + '0'],
    ['non-hex', 'z'.repeat(40)]
  ])('ignores an invalid comment (%s)', async (_n, value) => {
    const dest = await mkdtemp(join(tmpdir(), 'mm-sha-'));
    dirs.push(dest);
    const r = await extractTarGz(tgzWithGlobalHeader(REPO_FILES, { comment: value }), dest);
    expect(r.commit).toBeUndefined();
    expect(r.files).toBe(2);
  });

  it('has no commit when there is no global header', async () => {
    const dest = await mkdtemp(join(tmpdir(), 'mm-sha-'));
    dirs.push(dest);
    expect((await extractTarGz(tgzOf(REPO_FILES), dest)).commit).toBeUndefined();
  });

  it('withRepo hands the sha to the callback', async () => {
    const commit = await withRepo('https://github.com/o/legacy', undefined, ctx, async (_dir, meta) => meta.commit, { fetchFn: serve(tgzWithGlobalHeader(REPO_FILES, { comment: SHA })) });
    expect(commit).toBe(SHA);
    const none = await withRepo('https://github.com/o/legacy', undefined, ctx, async (_dir, meta) => meta.commit, { fetchFn: serve(tgzOf(REPO_FILES)) });
    expect(none).toBeUndefined();
  });

  it('shows the sha in SARIF versionControlProvenance and the SBOM metadata', () => {
    const d = baseData({ commit: SHA, commitSha: SHA });
    expect(d.meta.commit).toBe(SHA);
    const sarif = buildSarif(d) as { runs: Array<{ versionControlProvenance?: Array<{ repositoryUri: string; revisionId: string }> }> };
    expect(sarif.runs[0].versionControlProvenance).toEqual([{ repositoryUri: 'https://github.com/o/r', revisionId: SHA }]);
    const sbom = buildSbom(d) as { metadata: { component: { version?: string; properties?: Array<{ name: string; value: string }> } } };
    expect(sbom.metadata.component.version).toBe(SHA);
    expect(sbom.metadata.component.properties).toContainEqual({ name: 'metamorph:commit-sha', value: SHA });
  });

  it('drops a malformed commitSha and omits provenance without one', () => {
    const d = baseData({ commit: 'ref main (branch or tag, not a commit sha)', commitSha: 'nope' });
    expect(d.meta.commitSha).toBeUndefined();
    expect((buildSarif(d) as { runs: Array<Record<string, unknown>> }).runs[0].versionControlProvenance).toBeUndefined();
  });
});

// ---- network fakes for generate_report ----
const OSV_VULN = {
  id: 'GHSA-test-0001',
  aliases: ['CVE-2021-23337'],
  summary: 'Command injection in lodash',
  database_specific: { severity: 'HIGH', cwe_ids: ['CWE-77'] },
  affected: [{ package: { name: 'lodash', ecosystem: 'npm' }, ranges: [{ type: 'SEMVER', events: [{ introduced: '0' }, { fixed: '4.17.21' }] }] }]
};
const osvClient = { queryPackage: async (p: { name: string; version: string }) => (p.name === 'lodash' && p.version === '4.17.15' ? [OSV_VULN] : []) } as never;
const json = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status });

function feedFetch(opts: { kevDown?: boolean; epssDown?: boolean } = {}): typeof fetch {
  return (async (url: string) => {
    if (url.includes('cisa.gov')) return opts.kevDown ? new Response('x', { status: 503 }) : json({ vulnerabilities: [{ cveID: 'CVE-2021-23337', vendorProject: 'v', product: 'p', dateAdded: '2022-01-01', dueDate: '2022-02-01' }] });
    if (url.includes('api.first.org')) return opts.epssDown ? new Response('x', { status: 503 }) : json({ data: [{ cve: 'CVE-2021-23337', epss: '0.5', percentile: '0.9', date: '2026-10-30' }] });
    return new Response('not found', { status: 404 });
  }) as unknown as typeof fetch;
}

describe('2. feed fetch times', () => {
  const t0 = Date.parse('2026-10-31T10:00:00.000Z');

  it('records name, url and fetchedAt for each feed used', async () => {
    const rec = recordFeeds({ fetchFn: feedFetch(), now: () => t0, osv: { client: osvClient } });
    await rec.options.analyze!([{ name: 'lodash', ecosystem: 'npm', version: '4.17.15' }]);
    await rec.options.epss!(['CVE-2021-23337']);
    const by = Object.fromEntries(rec.sources().map((s) => [s.name, s]));
    expect(by['CISA KEV']).toMatchObject({ url: expect.stringContaining('known_exploited_vulnerabilities.json'), fetchedAt: '2026-10-31T10:00:00.000Z' });
    expect(by['first.org EPSS']).toMatchObject({ url: 'https://api.first.org/data/v1/epss', fetchedAt: '2026-10-31T10:00:00.000Z' });
    expect(by['osv.dev'].fetchedAt).toBe('2026-10-31T10:00:00.000Z');
  });

  it('lists a down feed as unavailable and does not fail', async () => {
    const rec = recordFeeds({ fetchFn: feedFetch({ kevDown: true, epssDown: true }), now: () => t0, osv: { client: osvClient } });
    const r = await rec.options.analyze!([{ name: 'lodash', ecosystem: 'npm', version: '4.17.15' }]);
    expect(r[0].affected).toBe(true); // KEV down: still analysed, just no known_exploited flag
    await expect(rec.options.epss!(['CVE-2021-23337'])).rejects.toThrow();
    const by = Object.fromEntries(rec.sources().map((s) => [s.name, s.fetchedAt]));
    expect(by['CISA KEV']).toBe(UNAVAILABLE);
    expect(by['first.org EPSS']).toBe(UNAVAILABLE);
    expect(by['osv.dev']).toBe('2026-10-31T10:00:00.000Z');
  });

  it('feeds the report sources instead of "not recorded"', () => {
    const d = buildReportData({ full: emptyFull(), meta: { repoUrl: 'https://github.com/o/r', generatedAt: NOW }, feeds: { sources: [{ name: 'CISA KEV', url: 'https://www.cisa.gov/x.json', fetchedAt: NOW }, { name: 'first.org EPSS', url: 'https://api.first.org/x', fetchedAt: UNAVAILABLE }] } });
    expect(d.sources).toEqual([
      { name: 'CISA KEV', url: 'https://www.cisa.gov/x.json', fetchedAt: NOW },
      { name: 'first.org EPSS', url: 'https://api.first.org/x', fetchedAt: UNAVAILABLE }
    ]);
  });
});

describe('collectReportData (1, 2 and 3 end to end with fakes)', () => {
  it('carries the commit sha, feed times and projected stage results', async () => {
    const data = await collectReportData({ repo_url: 'https://github.com/o/legacy/tree/main' }, ctx, {
      archiveFetch: serve(tgzWithGlobalHeader(REPO_FILES, { comment: SHA })),
      feeds: { fetchFn: feedFetch({ epssDown: true }), osv: { client: osvClient } },
      now: () => new Date(NOW)
    });
    // 1
    expect(data.meta.commit).toBe(SHA);
    expect(data.meta.commitSha).toBe(SHA);
    // 2
    const kev = data.sources.find((s) => s.name === 'CISA KEV');
    expect(kev?.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(data.sources.find((s) => s.name === 'first.org EPSS')?.fetchedAt).toBe(UNAVAILABLE);
    expect(data.findings.find((f) => f.id === 'dep-vulnerable:lodash')?.kev).toBe(true);
    // 3
    const p = data.patches.find((x) => x.stageId === 'patch-dependencies');
    expect(p).toBeDefined();
    expect(p!.scoreAfter.origin).toBe('projected');
    expect(p!.scoreAfter.value).toBeGreaterThan(p!.scoreBefore.value);
    expect(p!.findingsFixed).toBeGreaterThan(0);
    expect(p!.files.map((f) => f.path)).toContain('package.json');
  });

  it('falls back to the ref text when the archive has no sha', async () => {
    const data = await collectReportData({ repo_url: 'https://github.com/o/legacy/tree/main' }, ctx, {
      archiveFetch: serve(tgzOf(REPO_FILES)),
      feeds: { fetchFn: feedFetch(), osv: { client: osvClient } }
    });
    expect(data.meta.commitSha).toBeUndefined();
    expect(data.meta.commit).toBe('ref main (branch or tag, not a commit sha)');
  });
});

describe('include_cloud (AWS is reached only when asked)', () => {
  const account = '1'.repeat(12);
  const aws = { METAMORPH_AWS_ROLE_ARN: `arn:aws:iam::${account}:role/ReadOnly`, METAMORPH_AWS_EXTERNAL_ID: ['ext', 'id', 'abcdef0123'].join('-'), METAMORPH_AWS_REGIONS: 'eu-west-1' };
  const run = (input: { include_cloud?: boolean }, cloud: Parameters<typeof collectReportData>[2] = {}) =>
    collectReportData({ repo_url: 'https://github.com/o/legacy/tree/main', ...input }, ctx, {
      archiveFetch: serve(tgzOf(REPO_FILES)),
      feeds: { fetchFn: feedFetch(), osv: { client: osvClient } },
      ...cloud
    });

  it('without include_cloud the inventory is never called and there is no cloud section', async () => {
    let called = 0;
    const data = await run({}, { cloud: { env: aws, inventory: async () => ((called += 1), undefined as never) } });
    expect(called).toBe(0);
    expect(data.cloud).toBeUndefined();
    const flagOff = await run({ include_cloud: false }, { cloud: { env: aws, inventory: async () => ((called += 1), undefined as never) } });
    expect(called).toBe(0);
    expect(flagOff.cloud).toBeUndefined();
  });

  it('with include_cloud but no AWS setup: a short section, no variable names, generation continues', async () => {
    let called = 0;
    const data = await run({ include_cloud: true }, { cloud: { env: {}, inventory: async () => ((called += 1), undefined as never) } });
    expect(called).toBe(0);
    expect(data.cloud?.status).toBe('not-configured');
    expect(JSON.stringify(data.cloud)).not.toMatch(/METAMORPH_|_ARN|EXTERNAL_ID|AWS_REGION/);
    expect(data.findings.length).toBeGreaterThan(0);
  });

  it('with include_cloud and AWS set up: the section is added, the repository score is untouched', async () => {
    const plain = await run({});
    const withCloud = await run({ include_cloud: true }, {
      cloud: {
        env: aws,
        inventory: async () => ({
          provider: 'aws', account: '****1111', regions: ['eu-west-1'], services: ['lambda'], counts: { lambda: 2 }, limits: [], severityCounts: { critical: 0, high: 1, medium: 0, low: 0, info: 0 }, findingsTotal: 1, moreFindings: 0,
          findings: [{ id: 'aws-lambda-runtime-eol:old', category: 'cloud', severity: 'high', title: 'Lambda function old runs nodejs18.x', evidence: 'lambda eu-west-1 old runtime=nodejs18.x', recommendation: 'Move it.', source: 'endoflife.date/aws-lambda', rankReason: 'severity high' }],
          notChecked: [{ service: 'beanstalk', code: 'NoVerifiedEolSource' }], generatedAt: NOW, note: 'Read-only: nothing was changed in your AWS account.'
        })
      }
    });
    expect(withCloud.cloud?.status).toBe('scanned');
    expect(withCloud.cloud?.findings[0]).toMatchObject({ service: 'lambda', region: 'eu-west-1', resource: 'old', source: 'aws-readonly' });
    expect(withCloud.score).toEqual(plain.score);
    expect(withCloud.findings).toEqual(plain.findings);
    expect(withCloud.counts).toEqual(plain.counts);
    expect(withCloud.measured).toBeUndefined();
    expect(withCloud.sources.map((x) => x.name)).toContain('AWS read-only inventory (assumed role)');
  });
});

describe('4. attachRunnerResult', () => {
  const summary: RunnerSummary = {
    runner: 'docker',
    startedAt: NOW,
    finishedAt: NOW,
    checks: [{ name: 'npm test', status: 'passed', durationMs: 1200 }, { name: 'lint\u0000', status: 'failed', detail: 'boom\nline' }],
    tools: [{ name: 'npm', version: '10.8.0' }],
    scoreBefore: 40,
    scoreAfter: 70
  };

  it('fills verification (measured), adds tools and leaves the input unchanged', () => {
    const d = baseData();
    const out = attachRunnerResult(d, summary);
    expect(d.verification).toBeUndefined();
    expect(out.verification?.runner).toBe('docker');
    expect(out.verification?.scoreAfter).toMatchObject({ value: 70, origin: 'measured' });
    expect(out.verification?.checks.map((c) => c.name)).toEqual(['npm test', 'lint']);
    expect(out.verification?.checks[1].detail).toBe('boom line');
    expect(out.tools).toContainEqual({ name: 'npm', version: '10.8.0' });
    expect(out.tools.length).toBe(d.tools.length + 1);
  });

  it('matches buildReportData with the runner passed in directly', () => {
    const viaBuild = buildReportData({ full: emptyFull(), meta: { repoUrl: 'https://github.com/o/r', generatedAt: NOW }, runner: summary });
    expect(attachRunnerResult(baseData(), summary)).toEqual(viaBuild);
  });

  it('rejects malformed summaries', () => {
    expect(() => attachRunnerResult(baseData(), { runner: 'x', checks: [{ name: 'a', status: 'weird' }] } as never)).toThrow(TypeError);
    expect(() => attachRunnerResult(baseData(), { runner: 'x' } as never)).toThrow(TypeError);
    expect(() => attachRunnerResult(baseData(), null as never)).toThrow(TypeError);
  });
});
