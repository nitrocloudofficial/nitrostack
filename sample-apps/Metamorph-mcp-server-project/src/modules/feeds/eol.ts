// endoflife.date release cycles. Used as an extra signal next to the checked-in EOL tables, which stay the offline fallback.
import { cleanText } from '../intake/advisory.js';
import { fetchJson, FeedError, TtlCache, SIX_HOURS_MS, type FetchOptions } from './http.js';

export const EOL_BASE = 'https://endoflife.date/api';
// Product slugs are never taken from the caller verbatim; they must be on this list.
export const EOL_PRODUCTS: readonly string[] = ['php', 'nodejs', 'laravel', 'symfony', 'python', 'ruby',
  // Cloud connector (src/modules/cloud): AWS runtimes and managed engines.
  'aws-lambda', 'amazon-eks', 'amazon-rds-mysql', 'amazon-rds-postgresql', 'amazon-rds-mariadb', 'amazon-linux'
];
// Cycles are release lines such as "8.1", "2018.03" or, for aws-lambda, runtime ids such as "nodejs20.x" or "java8.al2".
const CYCLE_RE = /^[0-9A-Za-z][0-9A-Za-z._-]{0,31}$/;

export interface EolCycle {
  product: string;
  cycle: string;
  eol: string | boolean; // ISO date, or false while still supported
  isEol: boolean;
  latest: string;
  // End of standard support / deprecation as some products define it (endoflife.date "support"); for aws-lambda this is the
  // runtime deprecation date, while "eol" is when function updates are blocked. Absent when the feed has none.
  support?: string;
  source: string;
  fetchedAt: string;
}

export interface EolClientOptions extends FetchOptions {
  now?: () => number;
  ttlMs?: number;
}

export function isEolProduct(p: string): boolean {
  return EOL_PRODUCTS.includes(p);
}

export function parseEol(product: string, data: unknown, nowMs: number, fetchedAt: string): EolCycle[] {
  if (!Array.isArray(data)) throw new FeedError('endoflife.date returned an unexpected shape.');
  const source = `${EOL_BASE}/${product}.json`;
  const out: EolCycle[] = [];
  for (const r of data as Array<Record<string, unknown>>) {
    const cycle = typeof r?.cycle === 'string' || typeof r?.cycle === 'number' ? String(r.cycle) : '';
    if (!CYCLE_RE.test(cycle)) continue;
    let eol: string | boolean;
    let isEol: boolean;
    if (typeof r.eol === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.eol)) {
      eol = r.eol;
      isEol = Date.parse(`${r.eol}T00:00:00Z`) <= nowMs;
    } else if (typeof r.eol === 'boolean') {
      eol = r.eol;
      isEol = r.eol;
    } else continue;
    const support = typeof r.support === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.support) ? r.support : undefined;
    out.push({ product, cycle, eol, isEol, latest: cleanText(r.latest, 32), ...(support ? { support } : {}), source, fetchedAt });
  }
  return out;
}

export class EolClient {
  private readonly cache: TtlCache<EolCycle[]>;
  private readonly now: () => number;

  constructor(private readonly opts: EolClientOptions = {}) {
    this.now = opts.now ?? Date.now;
    this.cache = new TtlCache(opts.ttlMs ?? SIX_HOURS_MS, 20, this.now);
  }

  // Newest first, as the API lists them. Throws FeedError on failure; callers fall back to their static tables.
  async cycles(product: string): Promise<EolCycle[]> {
    if (!isEolProduct(product)) throw new RangeError(`Unsupported product. Allowed: ${EOL_PRODUCTS.join(', ')}.`);
    const hit = this.cache.get(product);
    if (hit) return hit;
    const data = await fetchJson(`${EOL_BASE}/${product}.json`, this.opts);
    const out = parseEol(product, data, this.now(), new Date(this.now()).toISOString());
    this.cache.set(product, out);
    return out;
  }

  // product + cycle -> eol date / boolean and latest release; undefined when the cycle is unknown.
  async check(product: string, cycle: string): Promise<EolCycle | undefined> {
    if (!CYCLE_RE.test(cycle)) throw new RangeError('Invalid release cycle.');
    return (await this.cycles(product)).find((c) => c.cycle === cycle);
  }

  // Failure-tolerant variant for assessments: never throws.
  async tryCheck(product: string, cycle: string): Promise<EolCycle | undefined> {
    try {
      return await this.check(product, cycle);
    } catch {
      return undefined;
    }
  }
}
