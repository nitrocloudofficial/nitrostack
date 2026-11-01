import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import type { EpssScore } from '../../src/modules/feeds/epss.js';
import type { KevHit, KevResult } from '../../src/modules/feeds/kev.js';
import { KEV_URL } from '../../src/modules/feeds/kev.js';
import { EPSS_BASE } from '../../src/modules/feeds/epss.js';
import { enrichAnalyses, type EnrichClients } from '../../src/modules/scanners/enrich.js';
import { analyzeFindings, type MeasuredAnalysis } from '../../src/modules/scanners/measured.js';
import type { MeasuredFinding } from '../../src/modules/scanners/normalize.js';
import { attachRunnerResult } from '../../src/modules/report/report-data.js';
import { buildSarif } from '../../src/modules/report/sarif.js';
import { renderPdf } from '../../src/modules/report/pdf.js';
import { runnerResultToSummary } from '../../src/modules/verify/evaluate.js';
import { GithubRunner } from '../../src/modules/verify/github-runner.js';
import { parseRunnerResult } from '../../src/modules/verify/result.js';
import { verifyByDispatch } from '../../src/modules/verify/verify.js';
import { CONFIG, FakeGithub, resultZip } from '../helpers/fake-github.js';
import { dataOf, manyFindings } from '../helpers/report-fixtures.js';
import { sarif210 } from '../helpers/schemas.js';

const fixture = (n: string) => readFileSync(new URL(`../fixtures/runner/${n}`, import.meta.url), 'utf8');
const parse = (t: string) => {
  const r = parseRunnerResult(t);
  if (!r.ok) throw new Error(r.error);
  return r.result;
};
const BEFORE = parse(fixture('php-shop-before.json'));
const AFTER = parse(fixture('php-shop-after.json'));

const KEV_AT = '2026-10-31T10:00:00.000Z';
const EPSS_AT = '2026-10-31T10:05:00.000Z';
const cves = (f: MeasuredFinding) => f.aliases.filter((a) => a.startsWith('CVE-'));

interface Fakes extends EnrichClients {
  kevCalls: string[][];
  epssCalls: string[][];
}

function fakes(opts: { kev?: Set<string> | 'down'; epss?: Map<string, number> | 'down' } = {}): Fakes {
  const kevCalls: string[][] = [];
  const epssCalls: string[][] = [];
  return {
    kevCalls,
    epssCalls,
    kev: {
      async isKnownExploited(ids: string[]): Promise<KevResult> {
        kevCalls.push(ids);
        if (opts.kev === 'down') throw new Error('KEV down');
        const hits = ids.filter((i) => opts.kev?.has(i)).map((cveId) => ({ cveId, vendor: 'v', product: 'p', dateAdded: '2024-01-01', dueDate: '2024-02-01', ransomware: false, source: KEV_URL, fetchedAt: KEV_AT }) as KevHit);
        return { hits, source: KEV_URL, fetchedAt: KEV_AT };
      }
    },
    epss: {
      async getScores(ids: string[]): Promise<EpssScore[]> {
        epssCalls.push(ids);
        if (opts.epss === 'down') throw new Error('EPSS down');
        return ids.filter((i) => opts.epss?.has(i)).map((cve) => ({ cve, epss: opts.epss?.get(cve) as number, percentile: 0.5, date: '2026-10-31', source: EPSS_BASE, fetchedAt: EPSS_AT }));
      }
    }
  };
}

// A medium finding with a CVE id that is NOT among the CVEs of any high finding.
function pickMedium(a: MeasuredAnalysis): MeasuredFinding {
  const highCves = new Set(a.findings.filter((f) => f.severity === 'high').flatMap(cves));
  const m = a.findings.find((f) => f.severity === 'medium' && cves(f).length > 0 && !cves(f).some((c) => highCves.has(c)));
  if (!m) throw new Error('fixture has no medium finding with its own CVE id');
  return m;
}

describe('enrichAnalyses (runner findings get KEV and EPSS)', () => {
  it('a KEV hit moves a medium finding above a high one and says why', async () => {
    const a = analyzeFindings(BEFORE);
    expect(a.findings[0].severity).toBe('high');
    const med = pickMedium(a);
    const f = fakes({ kev: new Set(cves(med)) });
    const { analyses, info } = await enrichAnalyses([a], f);
    const top = analyses[0].findings[0];
    expect(top.id).toBe(med.id);
    expect(top.severity).toBe('medium');
    expect(top.kev).toBe(true);
    expect(top.rankReason).toMatch(/known exploited by CISA, severity medium/);
    expect(info.unavailable).toEqual([]);
    expect(analyses[0].score).toEqual(a.score); // ranking never changes the score
    expect(analyses[0].findings).toHaveLength(a.findings.length);
  });

  it('EPSS failing leaves the rest ranked by severity, names the feed, and keeps the KEV data', async () => {
    const a = analyzeFindings(BEFORE);
    const f = fakes({ kev: new Set(), epss: 'down' });
    const { analyses, info } = await enrichAnalyses([a], f);
    expect(info.unavailable).toEqual(['first.org EPSS']);
    expect(info.sources.find((s) => s.name === 'first.org EPSS')?.fetchedAt).toBe('unavailable');
    expect(info.sources.find((s) => s.name === 'CISA KEV')?.fetchedAt).toBe(KEV_AT);
    const sev = analyses[0].findings.map((x) => x.severity);
    const order = ['critical', 'high', 'medium', 'low', 'info'];
    expect(sev).toEqual([...sev].sort((x, y) => order.indexOf(x) - order.indexOf(y)));
    expect(analyses[0].findings.every((x) => x.epss === undefined)).toBe(true);
  });

  it('both feeds down: nothing throws, the order is the original severity order', async () => {
    const a = analyzeFindings(BEFORE);
    const { analyses, info } = await enrichAnalyses([a], fakes({ kev: 'down', epss: 'down' }));
    expect(info.unavailable).toEqual(['CISA KEV', 'first.org EPSS']);
    expect(analyses[0].findings.map((x) => x.id)).toEqual(a.findings.map((x) => x.id));
  });

  it('records each feed real fetch time, and EPSS orders equal severities', async () => {
    const a = analyzeFindings(BEFORE);
    const highs = a.findings.filter((f) => f.severity === 'high' && cves(f).length > 0);
    const last = highs[highs.length - 1];
    const f = fakes({ kev: new Set(), epss: new Map(cves(last).map((c) => [c, 0.97])) });
    const { analyses, info } = await enrichAnalyses([a], f);
    expect(info.sources).toEqual([
      { name: 'CISA KEV', url: KEV_URL, fetchedAt: KEV_AT },
      { name: 'first.org EPSS', url: EPSS_BASE, fetchedAt: EPSS_AT }
    ]);
    const first = analyses[0].findings[0];
    expect(first.id).toBe(last.id);
    expect(first.epss).toBe(0.97);
    expect(first.rankReason).toMatch(/EPSS 0\.97/);
  });

  it('looks each distinct CVE id up once across several analyses and never asks for more than 50', async () => {
    const mk = (from: number, to: number): MeasuredAnalysis => {
      const base = analyzeFindings(AFTER);
      const proto = base.findings[0];
      const findings = Array.from({ length: to - from }, (_, i): MeasuredFinding => ({ ...proto, id: `runner-x-${from + i}`, aliases: [`CVE-2024-${String(10000 + from + i)}`, `GHSA-aaaa-bbbb-${from + i}`] }));
      return { ...base, findings };
    };
    const f = fakes({ kev: new Set(), epss: new Map() });
    // 0..119 and 60..179: 180 distinct CVE ids, 60 of them in both analyses
    await enrichAnalyses([mk(0, 120), mk(60, 180)], f);
    for (const calls of [f.kevCalls, f.epssCalls]) {
      expect(calls.every((c) => c.length <= 50)).toBe(true);
      const all = calls.flat();
      expect(all).toHaveLength(180);
      expect(new Set(all).size).toBe(180);
      expect(calls).toHaveLength(4); // 50 + 50 + 50 + 30
    }
  });

  it('makes no calls when no finding has a CVE id', async () => {
    const a = analyzeFindings(AFTER);
    const none: MeasuredAnalysis = { ...a, findings: a.findings.map((x) => ({ ...x, aliases: x.aliases.filter((al) => !al.startsWith('CVE-')) })) };
    const f = fakes();
    const { info } = await enrichAnalyses([none], f);
    expect(f.kevCalls).toHaveLength(0);
    expect(f.epssCalls).toHaveLength(0);
    expect(info).toEqual({ sources: [], unavailable: [], cves: 0 });
  });

  it('a feed that does not answer within the budget is named unavailable and the call returns', async () => {
    const a = analyzeFindings(BEFORE);
    const f = fakes({ epss: new Map() });
    f.kev = { isKnownExploited: () => new Promise<KevResult>(() => undefined) };
    const t0 = Date.now();
    const { info } = await enrichAnalyses([a], { ...f, budgetMs: 30 });
    expect(Date.now() - t0).toBeLessThan(2000);
    expect(info.unavailable).toEqual(['CISA KEV']);
  });
});

const REQ = { repoUrl: 'https://github.com/o/r', getPatch: async () => ({ patch: 'x', stage: { id: 's', title: 'S' }, notes: [] as string[] }) };
function fakeRunner(): GithubRunner {
  const g = new FakeGithub();
  g.scriptFor = (inputs) => ({ states: [{ status: 'completed', conclusion: 'success' }], artifact: resultZip((inputs.patch_gz_b64 ? fixture('php-shop-after.json') : fixture('php-shop-before.json')) as unknown as object) });
  return new GithubRunner(CONFIG, { fetchFn: g.fetch, sleep: async () => undefined });
}

describe('where enriched runner findings are shown', () => {
  async function enrichedSummary() {
    const summary = runnerResultToSummary({ patched: AFTER, baseline: BEFORE, patchedRunId: '2', baselineRunId: '1' });
    const a = summary.measured!.analysis;
    const med = a.findings.find((f) => cves(f).length > 0 && f.severity !== 'high') ?? a.findings[0];
    const { analyses, info } = await enrichAnalyses([a], fakes({ kev: new Set(cves(med)), epss: new Map(cves(med).map((c) => [c, 0.42])) }));
    return { summary: { ...summary, measured: { ...summary.measured!, analysis: analyses[0], enrichment: info } }, id: med.id };
  }

  it('the report data, sources, SARIF properties and PDF carry kev, epss and rankReason', async () => {
    const { summary, id } = await enrichedSummary();
    const data = attachRunnerResult(dataOf(manyFindings(2)), summary);
    const f = data.measured!.findings.find((x) => x.id === id)!;
    expect(f.kev).toBe(true);
    expect(f.epss?.value).toBe(0.42);
    expect(f.rankReason).toMatch(/known exploited/);
    expect(data.measured!.findings[0].id).toBe(id);
    expect(data.sources).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'CISA KEV', fetchedAt: KEV_AT }), expect.objectContaining({ name: 'first.org EPSS', fetchedAt: EPSS_AT })]));
    expect(data.measured!.enrichment?.unavailable).toEqual([]);

    const sarif = JSON.parse(JSON.stringify(buildSarif(data)));
    expect(sarif210()(sarif).valid).toBe(true);
    const r = sarif.runs[0].results.find((x: { ruleId: string }) => x.ruleId === id);
    expect(r.properties).toMatchObject({ kev: true, epss: 0.42, rankReason: expect.stringMatching(/known exploited/) });

    const pdf = await renderPdf(data);
    expect(pdf.pages).toBeGreaterThan(1);
  });

  it('a feed outage is named in the sources and in the report data, and never fails', async () => {
    const summary = runnerResultToSummary({ patched: AFTER });
    const { analyses, info } = await enrichAnalyses([summary.measured!.analysis], fakes({ kev: 'down', epss: 'down' }));
    const data = attachRunnerResult(dataOf(manyFindings(1)), { ...summary, measured: { ...summary.measured!, analysis: analyses[0], enrichment: info } });
    expect(data.sources.filter((s) => s.fetchedAt === 'unavailable').map((s) => s.name).sort()).toEqual(['CISA KEV', 'first.org EPSS']);
    expect(data.measured!.enrichment?.unavailable).toEqual(['CISA KEV', 'first.org EPSS']);
    await renderPdf(data);
  });

  it('verify_patch: the measured block carries the feed outcome and the top findings, KEV first', async () => {
    const afterIds = analyzeFindings(AFTER).findings.flatMap(cves);
    expect(afterIds.length).toBeGreaterThan(0);
    const f = fakes({ kev: new Set([afterIds[0]]), epss: 'down' });
    const out = await verifyByDispatch(fakeRunner(), REQ, 10_000, f);
    expect(out.measured?.feeds.unavailable).toEqual(['first.org EPSS']);
    expect(out.measured?.feeds.sources.find((x) => x.name === 'CISA KEV')?.fetchedAt).toBe(KEV_AT);
    const top = out.measured!.topFindings;
    expect(top.length).toBeLessThanOrEqual(3);
    expect(top[0].kev).toBe(true);
    expect(top[0].rankReason).toMatch(/known exploited/);
    expect(out.measured?.patched.knownExploited).toBeGreaterThan(0);
    // one lookup for the union of both runs' CVE ids
    expect(f.kevCalls.flat().length).toBe(new Set(f.kevCalls.flat()).size);
    expect(JSON.stringify(out).length).toBeLessThan(5000);
  });

  it('verify_patch without clients still returns the measured block with an empty feed outcome', async () => {
    const out = await verifyByDispatch(fakeRunner(), REQ, 10_000, {});
    expect(out.measured?.feeds.sources).toEqual([]);
    expect(out.measured?.feeds.unavailable).toEqual([]);
  });
});
