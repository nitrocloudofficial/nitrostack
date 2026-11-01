import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assessFull, type Analyzer, type EolLookup } from '../../src/modules/assessment/assess.js';
import { rankFindings, rankReason, MAX_RANK_REASON } from '../../src/modules/assessment/rank.js';
import { scoreFindings, topFindings } from '../../src/modules/assessment/score.js';
import type { Finding } from '../../src/modules/assessment/types.js';
import { buildPlan } from '../../src/modules/planning/plan.js';
import { NOT_FETCHED_BUILT_IN, buildReportData } from '../../src/modules/report/report-data.js';
import { NOW, fullOf, manyFindings } from '../helpers/report-fixtures.js';
import { writePhpFixture } from '../helpers/fixtures.js';

const f = (id: string, severity: Finding['severity'], extra: Partial<Finding> = {}): Finding => ({ id, category: 'security', severity, title: id, recommendation: `fix ${id}`, ...extra });

const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});
async function tmp(): Promise<string> {
  const d = await mkdtemp(join(tmpdir(), 'metamorph-rank-'));
  dirs.push(d);
  return d;
}

describe('shared finding ranking', () => {
  it('puts known-exploited first, then severity, then EPSS, then a stable order', () => {
    const list = [f('b-high-low-epss', 'high', { epss: 0.1 }), f('a-critical', 'critical'), f('c-medium-kev', 'medium', { kev: true }), f('d-high-hi-epss', 'high', { epss: 0.72 }), f('e-high-none', 'high')];
    expect(rankFindings(list).map((x) => x.id)).toEqual(['c-medium-kev', 'a-critical', 'd-high-hi-epss', 'b-high-low-epss', 'e-high-none']);
  });

  it('writes a rankReason of at most 80 characters and does not change the score', () => {
    const list = [f('x', 'high', { kev: true, epss: 0.7234 }), f('y', 'low'), f('z', 'critical', { epss: 0.5 })];
    const ranked = rankFindings(list);
    expect(ranked[0].rankReason).toBe('listed as known exploited by CISA, severity high, EPSS 0.72');
    expect(ranked[1].rankReason).toBe('severity critical, EPSS 0.50');
    expect(ranked[2].rankReason).toBe('severity low');
    for (const r of ranked) expect((r.rankReason ?? '').length).toBeLessThanOrEqual(MAX_RANK_REASON);
    expect(rankReason(f('q', 'info'))).toBe('severity info');
    expect(scoreFindings(ranked)).toEqual(scoreFindings(list));
  });

  it('topFindings and the report use the same order as the assessment', async () => {
    const dir = await tmp();
    await writePhpFixture(dir);
    const osv: Analyzer = async (pkgs) =>
      pkgs.map((p) => ({ package: p, affected: true, truncated: false, findings: [{ id: 'CVE-2022-31042', aliases: [], severity: 'medium' as const, summary: 's', fixedVersions: ['6.5.8'], urgent: true, urgentReasons: ['known_exploited' as const], cvss: 5.5, cwes: ['CWE-200'] }] }));
    const full = await assessFull(dir, { analyze: osv, today: new Date('2026-10-31T00:00:00Z'), epss: async () => new Map([['CVE-2022-31042', 0.04]]) });
    // a medium dependency finding that is known exploited outranks the high and critical ones
    expect(full.findings[0].id).toMatch(/^dep-vulnerable:/);
    expect(full.findings[0].kev).toBe(true);
    expect(full.findings[0].rankReason).toBe('listed as known exploited by CISA, severity medium, EPSS 0.04');
    expect(full.findings.some((x) => x.severity === 'high' || x.severity === 'critical')).toBe(true);
    expect(full.assessment.topFindings[0].id).toBe(full.findings[0].id);
    expect(full.assessment.topFindings.map((x) => x.id)).toEqual(topFindings(full.findings, 10).map((x) => x.id));
    for (const x of full.findings) expect((x.rankReason ?? '').length).toBeLessThanOrEqual(MAX_RANK_REASON);
    const data = buildReportData({ full, meta: { repoUrl: 'https://github.com/o/r', generatedAt: NOW } });
    expect(data.findings.map((x) => x.id)).toEqual(full.findings.map((x) => x.id));
    expect(data.findings[0].rankReason).toBe(full.findings[0].rankReason);
  });

  it('the plan reads findings in the shared order', () => {
    const findings = [f('low-one', 'low', { recommendation: 'R-low' }), f('kev-medium', 'medium', { kev: true, recommendation: 'R-kev' }), f('crit', 'critical', { recommendation: 'R-crit' })];
    const plan = buildPlan({ stack: 'node', findings, fixes: [], goal: 'modernize_all' });
    const other = plan.stages.find((st) => st.id === 'other-findings');
    expect(other?.steps).toEqual(['R-kev', 'R-crit', 'R-low']);
    expect(rankFindings(findings).map((x) => x.recommendation)).toEqual(other?.steps);
  });

  it('keeps the report fixtures ordered by the shared ranking', () => {
    const ids = buildReportData({ full: fullOf(manyFindings(40)), meta: { repoUrl: 'https://github.com/o/r', generatedAt: NOW } }).findings;
    expect(ids[0].kev).toBe(true);
    for (let i = 1; i < ids.length; i++) expect(Number(ids[i - 1].kev) >= Number(ids[i].kev)).toBe(true);
  });
});

describe('runtime end-of-life sources', () => {
  it('lists the built-in PHP table (no fetch time) when it decided the runtime verdict, even with a live lookup', async () => {
    const dir = await tmp();
    await writePhpFixture(dir); // requires php >=7.2, which the built-in table knows
    let calls = 0;
    const eol: EolLookup = async () => {
      calls++;
      return { supported: true, fetchedAt: '2026-10-31T10:00:00.000Z' };
    };
    const full = await assessFull(dir, { analyze: async () => [], today: new Date('2026-10-31T00:00:00Z'), eol });
    expect(calls).toBe(0);
    expect(full.sources).toEqual([expect.objectContaining({ name: expect.stringContaining('PHP end-of-life table'), url: 'https://www.php.net/supported-versions.php', builtIn: true })]);
    const data = buildReportData({ full, meta: { repoUrl: 'https://github.com/o/r', generatedAt: NOW } });
    const row = data.sources.find((s) => s.name.includes('built-in'));
    expect(row).toMatchObject({ url: 'https://www.php.net/supported-versions.php', fetchedAt: NOT_FETCHED_BUILT_IN });
    expect(data.sources.some((s) => s.name === 'endoflife.date')).toBe(false);
  });

  it('records endoflife.date with its real fetch time when it was queried, and never when it gave no answer', async () => {
    const dir = await tmp();
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'x', engines: { node: '>=99' } }));
    const today = new Date('2026-10-31T00:00:00Z');
    const answered = await assessFull(dir, { analyze: async () => [], today, eol: async () => ({ supported: true, fetchedAt: '2026-10-31T10:00:00.000Z', url: 'https://endoflife.date/api/nodejs.json' }) });
    expect(answered.sources).toEqual([{ name: 'endoflife.date', url: 'https://endoflife.date/api/nodejs.json', fetchedAt: '2026-10-31T10:00:00.000Z' }]);
    const data = buildReportData({ full: answered, meta: { repoUrl: 'https://github.com/o/r', generatedAt: NOW } });
    expect(data.sources.find((s) => s.name === 'endoflife.date')?.fetchedAt).toBe('2026-10-31T10:00:00.000Z');

    const silent = await assessFull(dir, { analyze: async () => [], today, eol: async () => undefined });
    expect(silent.sources).toEqual([]);
    const thrown = await assessFull(dir, { analyze: async () => [], today, eol: async () => { throw new Error('down'); } });
    expect(thrown.sources).toEqual([]);

    const past = await assessFull(dir, { analyze: async () => [], today, eol: async () => ({ eolDate: '2020-01-01', latest: '99.0.0', fetchedAt: '2026-10-31T10:00:00.000Z' }) });
    expect(past.findings.some((x) => x.id === 'node-runtime-eol' && x.source === 'endoflife.date')).toBe(true);
    expect(past.sources[0]).toMatchObject({ name: 'endoflife.date', fetchedAt: '2026-10-31T10:00:00.000Z' });
  });
});
