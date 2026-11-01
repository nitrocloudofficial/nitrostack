// CISA Known Exploited Vulnerabilities catalog. Read-only, cached in memory for 6 hours.
import { cleanText } from '../intake/advisory.js';
import { fetchJson, FeedError, SIX_HOURS_MS, type FetchOptions } from './http.js';

export const KEV_URL = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';
// The catalog is about 1.8 MiB today and grows, so it gets headroom above the 2 MiB default for other feeds.
export const KEV_MAX_BYTES = 4 * 1024 * 1024;
export const CVE_RE = /^CVE-\d{4}-\d{4,}$/;
export const MAX_CVES = 50;

export interface KevHit {
  cveId: string;
  vendor: string;
  product: string;
  dateAdded: string;
  dueDate: string;
  ransomware: boolean;
  source: string;
  fetchedAt: string;
}

export interface KevResult {
  hits: KevHit[];
  source: string;
  fetchedAt: string;
}

interface Catalog {
  byId: Map<string, Omit<KevHit, 'source' | 'fetchedAt'>>;
  fetchedAt: string;
}

export interface KevClientOptions extends FetchOptions {
  now?: () => number;
  ttlMs?: number;
}

function str(v: unknown, max: number): string {
  return cleanText(v, max);
}

export function parseKev(data: unknown): Map<string, Omit<KevHit, 'source' | 'fetchedAt'>> {
  const list = (data as { vulnerabilities?: unknown } | null)?.vulnerabilities;
  if (!Array.isArray(list)) throw new FeedError('KEV catalog has an unexpected shape.');
  const out = new Map<string, Omit<KevHit, 'source' | 'fetchedAt'>>();
  for (const v of list as Array<Record<string, unknown>>) {
    const id = typeof v?.cveID === 'string' ? v.cveID.trim().toUpperCase() : '';
    if (!CVE_RE.test(id)) continue;
    out.set(id, {
      cveId: id,
      vendor: str(v.vendorProject, 80),
      product: str(v.product, 80),
      dateAdded: str(v.dateAdded, 10),
      dueDate: str(v.dueDate, 10),
      ransomware: v.knownRansomwareCampaignUse === 'Known'
    });
  }
  return out;
}

export class KevClient {
  private catalog?: { at: number; value: Catalog };
  private inflight?: Promise<Catalog>;
  private readonly now: () => number;
  private readonly ttl: number;

  constructor(private readonly opts: KevClientOptions = {}) {
    this.now = opts.now ?? Date.now;
    this.ttl = opts.ttlMs ?? SIX_HOURS_MS;
  }

  private async load(): Promise<Catalog> {
    if (this.catalog && this.now() - this.catalog.at < this.ttl) return this.catalog.value;
    this.inflight ??= (async () => {
      try {
        const data = await fetchJson(KEV_URL, { maxBytes: KEV_MAX_BYTES, ...this.opts });
        const value: Catalog = { byId: parseKev(data), fetchedAt: new Date(this.now()).toISOString() };
        this.catalog = { at: this.now(), value };
        return value;
      } finally {
        this.inflight = undefined;
      }
    })();
    return this.inflight;
  }

  // Every CVE id in the catalog plus when it was fetched. Throws FeedError when the catalog cannot be had.
  async catalogIds(): Promise<{ ids: Set<string>; fetchedAt: string }> {
    const cat = await this.load();
    return { ids: new Set(cat.byId.keys()), fetchedAt: cat.fetchedAt };
  }

  // Throws FeedError when the catalog cannot be had; callers decide whether that is fatal (it never is for assessments).
  async isKnownExploited(cveIds: string[]): Promise<KevResult> {
    const ids = [...new Set(cveIds.map((c) => String(c).trim().toUpperCase()))];
    if (ids.length > MAX_CVES) throw new RangeError(`Too many CVE ids: at most ${MAX_CVES} per call.`);
    if (ids.some((c) => !CVE_RE.test(c))) throw new RangeError('Invalid CVE id: expected CVE-YYYY-N.');
    const cat = await this.load();
    const hits: KevHit[] = [];
    for (const id of ids) {
      const e = cat.byId.get(id);
      if (e) hits.push({ ...e, source: KEV_URL, fetchedAt: cat.fetchedAt });
    }
    return { hits, source: KEV_URL, fetchedAt: cat.fetchedAt };
  }
}
