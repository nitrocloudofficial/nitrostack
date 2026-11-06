// check_watch orchestration: KEV + EPSS + EOL + release/security feeds. Each source fails soft and is reported in
// `unavailable`; nothing here throws because a feed is down.
import { EolClient, EOL_PRODUCTS, type EolCycle } from './eol.js';
import { EpssClient, type EpssScore } from './epss.js';
import { fetchText, TtlCache, type FetchOptions } from './http.js';
import { CVE_RE, KevClient, type KevHit } from './kev.js';
import { parseFeed, type FeedItem } from './rss.js';

export const FEED_SOURCES: Array<{ name: string; url: string }> = [
  { name: 'php.net releases', url: 'https://www.php.net/releases/feed.php' },
  { name: 'Node.js vulnerability reports', url: 'https://nodejs.org/en/feed/vulnerability.xml' },
  { name: 'Node.js blog', url: 'https://nodejs.org/en/feed/blog.xml' }
];

const MAX_CVES = 20;
const MAX_PRODUCTS = 5;
const MAX_ITEMS = 10;
const MAX_EOL_CYCLES = 4;
const FEED_TTL_MS = 30 * 60 * 1000;

export interface WatchInput {
  cve_ids?: string[];
  products?: string[]; // "php" or "php@8.1"
  since?: string;
}

export interface WatchFeedItem extends FeedItem {
  feed: string;
  source: string;
  fetchedAt: string;
}

export interface WatchOutput {
  kevHits: KevHit[];
  epss: EpssScore[];
  eol: EolCycle[];
  feedItems: WatchFeedItem[];
  unavailable: string[];
  fetchedAt: string;
}

export interface FeedHubOptions extends FetchOptions {
  now?: () => number;
}

export function parseProductSpec(spec: string): { product: string; cycle?: string } {
  const m = String(spec).trim().toLowerCase().match(/^([a-z]+)(?:@([0-9][0-9a-z.-]{0,15}))?$/);
  if (!m || !EOL_PRODUCTS.includes(m[1])) throw new RangeError(`Unsupported product. Allowed: ${EOL_PRODUCTS.join(', ')} (optionally name@cycle, e.g. php@8.1).`);
  return { product: m[1], cycle: m[2] };
}

export class FeedHub {
  readonly kev: KevClient;
  readonly epss: EpssClient;
  readonly eol: EolClient;
  private readonly feedCache: TtlCache<{ items: FeedItem[]; fetchedAt: string }>;
  private readonly now: () => number;

  constructor(private readonly opts: FeedHubOptions = {}) {
    this.now = opts.now ?? Date.now;
    this.kev = new KevClient(opts);
    this.epss = new EpssClient(opts);
    this.eol = new EolClient(opts);
    this.feedCache = new TtlCache(FEED_TTL_MS, 10, this.now);
  }

  private async feed(url: string): Promise<{ items: FeedItem[]; fetchedAt: string }> {
    const hit = this.feedCache.get(url);
    if (hit) return hit;
    const items = parseFeed(await fetchText(url, this.opts));
    const value = { items, fetchedAt: new Date(this.now()).toISOString() };
    this.feedCache.set(url, value);
    return value;
  }

  async checkWatch(input: WatchInput): Promise<WatchOutput> {
    const cves = [...new Set((input.cve_ids ?? []).map((c) => c.trim().toUpperCase()))];
    if (cves.length > MAX_CVES) throw new RangeError(`Too many CVE ids: at most ${MAX_CVES}.`);
    if (cves.some((c) => !CVE_RE.test(c))) throw new RangeError('Invalid CVE id: expected CVE-YYYY-N.');
    const products = (input.products ?? []).map(parseProductSpec);
    if (products.length > MAX_PRODUCTS) throw new RangeError(`Too many products: at most ${MAX_PRODUCTS}.`);
    let sinceMs: number | undefined;
    if (input.since !== undefined) {
      sinceMs = input.since.length <= 40 ? Date.parse(input.since) : NaN;
      if (Number.isNaN(sinceMs)) throw new RangeError('Invalid since: expected an ISO 8601 date.');
    }

    const unavailable: string[] = [];
    const guard = async <T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> => {
      try {
        return await fn();
      } catch {
        unavailable.push(label);
        return fallback;
      }
    };

    const [kevHits, epss, eol, feedItems] = await Promise.all([
      cves.length ? guard('cisa-kev', async () => (await this.kev.isKnownExploited(cves)).hits, [] as KevHit[]) : [],
      cves.length ? guard('first-epss', () => this.epss.getScores(cves), [] as EpssScore[]) : [],
      products.length
        ? Promise.all(
            products.map((p) =>
              guard(`endoflife-${p.product}`, async () => {
                const all = await this.eol.cycles(p.product);
                return p.cycle ? all.filter((c) => c.cycle === p.cycle) : all.slice(0, MAX_EOL_CYCLES);
              }, [] as EolCycle[])
            )
          ).then((r) => r.flat())
        : [],
      this.collectItems(sinceMs, unavailable)
    ]);

    return { kevHits, epss, eol, feedItems, unavailable: [...new Set(unavailable)], fetchedAt: new Date(this.now()).toISOString() };
  }

  private async collectItems(sinceMs: number | undefined, unavailable: string[]): Promise<WatchFeedItem[]> {
    const results = await Promise.all(
      FEED_SOURCES.map(async (f) => {
        try {
          const { items, fetchedAt } = await this.feed(f.url);
          return items.map((i): WatchFeedItem => ({ ...i, feed: f.name, source: f.url, fetchedAt }));
        } catch {
          unavailable.push(f.url.includes('php.net') ? 'php-releases-feed' : f.url.includes('vulnerability') ? 'node-vulnerability-feed' : 'node-blog-feed');
          return [] as WatchFeedItem[];
        }
      })
    );
    return results
      .flat()
      .filter((i) => {
        if (sinceMs === undefined) return true;
        return i.published !== undefined && Date.parse(i.published) >= sinceMs; // undated items cannot be shown to be new
      })
      .sort((a, b) => Date.parse(b.published ?? '') - Date.parse(a.published ?? '') || 0)
      .slice(0, MAX_ITEMS);
  }
}
