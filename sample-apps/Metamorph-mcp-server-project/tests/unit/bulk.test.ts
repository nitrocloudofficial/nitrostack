import { describe, expect, it } from 'vitest';
import { analyzePackagesBulk, packageKey } from '../../src/modules/intake/bulk.js';
import { OsvClient, type OsvVuln, type PackageRef } from '../../src/modules/intake/osv.client.js';

const pkg = (name: string, version = '1.0.0'): PackageRef => ({ name, ecosystem: 'npm', version });
const vuln = (id: string, extra: Partial<OsvVuln> = {}): OsvVuln => ({ id, summary: `summary ${id}`, database_specific: { severity: 'HIGH' }, ...extra });

// A fake OSV client: advisories by package name, counts every call, optional failures.
function fakeClient(advisories: Record<string, string[]>, opts: { failBatch?: boolean; failDetail?: string[]; delayMs?: number; clock?: { t: number } } = {}) {
  const calls = { batches: [] as number[], details: [] as string[], inFlight: 0, maxInFlight: 0 };
  const client = {
    async queryBatchLarge(ps: PackageRef[]) {
      calls.batches.push(ps.length);
      if (opts.failBatch) throw new Error('down');
      return ps.map((p) => ({ vulns: (advisories[p.name] ?? []).map((id) => ({ id, modified: '2024-01-01T00:00:00Z' })), more: false }));
    },
    async getVulnRecord(id: string) {
      calls.details.push(id);
      calls.inFlight++;
      calls.maxInFlight = Math.max(calls.maxInFlight, calls.inFlight);
      await new Promise((r) => setTimeout(r, opts.delayMs ?? 1));
      if (opts.clock) opts.clock.t += opts.delayMs ?? 1;
      calls.inFlight--;
      if (opts.failDetail?.includes(id)) throw new Error('boom');
      return vuln(id);
    }
  };
  return { client: client as unknown as OsvClient, calls };
}

describe('analyzePackagesBulk', () => {
  it('batches in chunks, fetches each advisory once and maps results to packages', async () => {
    const { client, calls } = fakeClient({ a: ['GHSA-1'], b: ['GHSA-1', 'GHSA-2'] });
    const pkgs = ['a', 'b', 'c', 'd', 'e'].map((n) => pkg(n));
    const r = await analyzePackagesBulk(pkgs, { client, chunkSize: 2, cache: new Map(), kevFetch: async () => new Set() });
    expect(calls.batches).toEqual([2, 2, 1]);
    expect([...calls.details].sort()).toEqual(['GHSA-1', 'GHSA-2']); // GHSA-1 shared by a and b: fetched once
    expect(r.unchecked).toEqual([]);
    expect(r.analyses.map((a) => [a.package.name, a.findings.length])).toEqual([['a', 1], ['b', 2], ['c', 0], ['d', 0], ['e', 0]]);
    expect(r.analyses[0].affected).toBe(true);
  });

  it('keeps advisory detail fetches within the concurrency limit', async () => {
    const ids = Array.from({ length: 30 }, (_, i) => `GHSA-${i}`);
    const { client, calls } = fakeClient({ a: ids }, { delayMs: 5 });
    await analyzePackagesBulk([pkg('a')], { client, cache: new Map(), detailConcurrency: 4, kevFetch: async () => new Set() });
    expect(calls.details).toHaveLength(30);
    expect(calls.maxInFlight).toBeLessThanOrEqual(4);
    expect(calls.maxInFlight).toBeGreaterThan(1);
  });

  it('answers repeats from the per-process cache without calling OSV', async () => {
    const cache = new Map();
    const first = fakeClient({ a: ['GHSA-1'] });
    await analyzePackagesBulk([pkg('a'), pkg('b')], { client: first.client, cache, kevFetch: async () => new Set() });
    const second = fakeClient({ a: ['GHSA-1'] });
    const r = await analyzePackagesBulk([pkg('a'), pkg('b')], { client: second.client, cache, kevFetch: async () => new Set() });
    expect(second.calls.batches).toEqual([]);
    expect(second.calls.details).toEqual([]);
    expect(r.cacheHits).toBe(2);
    expect(r.analyses[0].findings).toHaveLength(1);
  });

  it('expires cache entries after one hour', async () => {
    const cache = new Map();
    const t = { v: 1_000_000 };
    const a = fakeClient({});
    await analyzePackagesBulk([pkg('a')], { client: a.client, cache, now: () => t.v, kevFetch: async () => new Set() });
    t.v += 60 * 60 * 1000 + 1;
    const b = fakeClient({});
    await analyzePackagesBulk([pkg('a')], { client: b.client, cache, now: () => t.v, kevFetch: async () => new Set() });
    expect(b.calls.batches).toEqual([1]);
  });

  it('stops at the time budget, returns what it has and lists the rest as not checked (never as clean)', async () => {
    const clock = { t: 0 };
    const ids = Array.from({ length: 10 }, (_, i) => `GHSA-${i}`);
    // each package has one advisory; every detail fetch "takes" 100 ms of fake time; budget 250 ms; one worker
    const advisories = Object.fromEntries(ids.map((id, i) => [`p${i}`, [id]]));
    const { client } = fakeClient(advisories, { delayMs: 100, clock });
    const pkgs = ids.map((_, i) => pkg(`p${i}`));
    const r = await analyzePackagesBulk(pkgs, { client, cache: new Map(), now: () => clock.t, budgetMs: 250, detailConcurrency: 1, kevFetch: async () => new Set() });
    expect(r.analyses.length).toBeGreaterThan(0);
    expect(r.analyses.length).toBeLessThan(10);
    expect(r.unchecked.length + r.analyses.length).toBe(10);
    expect(r.unchecked.every((u) => u.reason === 'time_budget')).toBe(true);
    // production-first order is preserved: the checked ones are the first in the input
    expect(r.analyses.map((a) => a.package.name)).toEqual(pkgs.slice(0, r.analyses.length).map((p) => p.name));
  });

  it('reports a package as not checked when one of its advisory fetches fails', async () => {
    const { client } = fakeClient({ a: ['GHSA-1'], b: ['GHSA-2'] }, { failDetail: ['GHSA-2'] });
    const r = await analyzePackagesBulk([pkg('a'), pkg('b')], { client, cache: new Map(), kevFetch: async () => new Set() });
    expect(r.analyses.map((a) => a.package.name)).toEqual(['a']);
    expect(r.unchecked).toEqual([{ package: pkg('b'), reason: 'osv_error' }]);
  });

  it('marks every package not checked when OSV is down', async () => {
    const { client } = fakeClient({}, { failBatch: true });
    const r = await analyzePackagesBulk([pkg('a'), pkg('b')], { client, cache: new Map(), kevFetch: async () => new Set() });
    expect(r.analyses).toEqual([]);
    expect(r.unchecked.map((u) => u.reason)).toEqual(['osv_error', 'osv_error']);
  });

  it('deduplicates identical package@version inputs', async () => {
    const { client, calls } = fakeClient({});
    const r = await analyzePackagesBulk([pkg('a'), pkg('a'), pkg('a', '2.0.0')], { client, cache: new Map(), kevFetch: async () => new Set() });
    expect(calls.batches).toEqual([2]);
    expect(r.analyses.map((a) => packageKey(a.package))).toEqual(['npm:a@1.0.0', 'npm:a@2.0.0']);
  });

  it('checks more than 50 packages in a single call (no 50-package cap)', async () => {
    const pkgs = Array.from({ length: 120 }, (_, i) => pkg(`pkg${i}`));
    const { client } = fakeClient({});
    const r = await analyzePackagesBulk(pkgs, { client, cache: new Map(), kevFetch: async () => new Set() });
    expect(r.analyses).toHaveLength(120);
  });
});

describe('OsvClient retries and large batches', () => {
  const json = (body: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers });

  it('retries HTTP 429 and 5xx with backoff, honouring Retry-After, then succeeds', async () => {
    const waits: number[] = [];
    let n = 0;
    const fetchFn = (async () => (n++ === 0 ? json({}, 429, { 'retry-after': '2' }) : n === 2 ? json({}, 503) : json({ id: 'GHSA-1' }))) as unknown as typeof fetch;
    const client = new OsvClient({ fetchFn, retries: 3, retryBaseMs: 100, sleep: async (ms) => void waits.push(ms) });
    expect(await client.getVulnRecord('GHSA-1')).toEqual({ id: 'GHSA-1' });
    expect(waits).toEqual([2000, 200]);
  });

  it('gives up after the configured retries', async () => {
    const fetchFn = (async () => json({}, 500)) as unknown as typeof fetch;
    const client = new OsvClient({ fetchFn, retries: 2, sleep: async () => undefined });
    await expect(client.getVulnRecord('GHSA-1')).rejects.toThrow('OSV returned HTTP 500.');
  });

  it('sends up to 1000 queries in one querybatch call and flags paginated results', async () => {
    const bodies: Array<{ queries: unknown[] }> = [];
    const fetchFn = (async (_url: string, init: { body: string }) => {
      const body = JSON.parse(init.body) as { queries: unknown[] };
      bodies.push(body);
      return json({ results: body.queries.map((_, i) => (i === 1 ? { vulns: [{ id: 'GHSA-1', modified: 'x' }], next_page_token: 't' } : {})) });
    }) as unknown as typeof fetch;
    const client = new OsvClient({ fetchFn });
    const res = await client.queryBatchLarge(Array.from({ length: 1000 }, (_, i) => pkg(`p${i}`)));
    expect(bodies[0].queries).toHaveLength(1000);
    expect(res[1].more).toBe(true);
    expect(res[0].more).toBe(false);
    await expect(client.queryBatchLarge(Array.from({ length: 1001 }, (_, i) => pkg(`p${i}`)))).rejects.toThrow(/at most 1000/);
  });

  it('accepts advisory ids from any OSV database but not path tricks', async () => {
    const urls: string[] = [];
    const fetchFn = (async (url: string) => (urls.push(url), json({ id: 'PYSEC-2020-1' }))) as unknown as typeof fetch;
    const client = new OsvClient({ fetchFn });
    await client.getVulnRecord('PYSEC-2020-1');
    expect(urls[0]).toBe('https://api.osv.dev/v1/vulns/PYSEC-2020-1');
    await expect(client.getVulnRecord('../../etc/passwd')).rejects.toThrow(RangeError);
  });
});
