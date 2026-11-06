// FIRST EPSS scores (probability of exploitation in the next 30 days). Public API, no key.
import { fetchJson, FeedError, TtlCache, SIX_HOURS_MS, type FetchOptions } from './http.js';
import { CVE_RE } from './kev.js';

export const EPSS_BASE = 'https://api.first.org/data/v1/epss';
export const EPSS_MAX_CVES = 50;

export interface EpssScore {
  cve: string;
  epss: number; // 0..1
  percentile: number; // 0..1
  date: string;
  source: string;
  fetchedAt: string;
}

export interface EpssClientOptions extends FetchOptions {
  now?: () => number;
  ttlMs?: number;
}

function unit(v: unknown): number | undefined {
  const n = typeof v === 'string' || typeof v === 'number' ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : undefined;
}

export class EpssClient {
  private readonly cache: TtlCache<EpssScore[]>;
  private readonly now: () => number;

  constructor(private readonly opts: EpssClientOptions = {}) {
    this.now = opts.now ?? Date.now;
    this.cache = new TtlCache(opts.ttlMs ?? SIX_HOURS_MS, 200, this.now);
  }

  // Unknown CVEs are simply absent from the result. Throws FeedError when the API is unavailable.
  async getScores(cveIds: string[]): Promise<EpssScore[]> {
    const ids = [...new Set(cveIds.map((c) => String(c).trim().toUpperCase()))];
    if (ids.length > EPSS_MAX_CVES) throw new RangeError(`Too many CVE ids: at most ${EPSS_MAX_CVES} per call.`);
    if (ids.some((c) => !CVE_RE.test(c))) throw new RangeError('Invalid CVE id: expected CVE-YYYY-N.');
    if (ids.length === 0) return [];
    const key = [...ids].sort().join(',');
    const hit = this.cache.get(key);
    if (hit) return hit;

    const url = `${EPSS_BASE}?cve=${ids.join(',')}`;
    const data = (await fetchJson(url, this.opts)) as { data?: unknown } | null;
    if (!data || !Array.isArray(data.data)) throw new FeedError('EPSS returned an unexpected shape.');
    const fetchedAt = new Date(this.now()).toISOString();
    const out: EpssScore[] = [];
    for (const row of data.data as Array<Record<string, unknown>>) {
      const cve = typeof row?.cve === 'string' ? row.cve.toUpperCase() : '';
      const epss = unit(row?.epss);
      const percentile = unit(row?.percentile);
      if (!ids.includes(cve) || epss === undefined || percentile === undefined) continue; // ignore rows we did not ask for
      out.push({ cve, epss, percentile, date: typeof row.date === 'string' ? row.date.slice(0, 10) : '', source: EPSS_BASE, fetchedAt });
    }
    this.cache.set(key, out);
    return out;
  }
}
