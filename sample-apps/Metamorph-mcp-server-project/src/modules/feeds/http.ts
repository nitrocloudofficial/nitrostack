// Shared, hardened GET for the read-only intelligence feeds. No secrets, no cookies, no caller-supplied URLs.
// Rules: https only, exact host allowlist, 8 s timeout, 2 MiB body cap, same-host redirects only (max 2).
export const FEED_HOSTS: readonly string[] = [
  'www.cisa.gov',
  'api.first.org',
  'endoflife.date',
  'www.php.net',
  'nodejs.org'
];

// Never fetched even though the host is allowed: CISA's advisories feed answers 403 to automated clients and we do not
// work around that.
const DENIED_PATH_PREFIXES = ['/cybersecurity-advisories'];

export const FEED_TIMEOUT_MS = 8000;
export const FEED_MAX_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 2;

export class FeedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FeedError';
  }
}

export interface FetchOptions {
  fetchFn?: typeof fetch;
  timeoutMs?: number;
  maxBytes?: number;
  allowedHosts?: readonly string[];
}

export function assertFeedUrl(raw: string, allowedHosts: readonly string[] = FEED_HOSTS): URL {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new FeedError('Feed URL is invalid.');
  }
  if (u.protocol !== 'https:' || u.username || u.password || u.port) throw new FeedError('Feed URL must be plain https.');
  if (!allowedHosts.includes(u.hostname)) throw new FeedError('Feed host is not on the allowlist.');
  if (DENIED_PATH_PREFIXES.some((p) => u.pathname.startsWith(p))) throw new FeedError('Feed path is not permitted.');
  return u;
}

// Returns the response body as text. Every failure becomes a FeedError with a short fixed message.
export async function fetchText(url: string, opts: FetchOptions = {}): Promise<string> {
  const fetchFn = opts.fetchFn ?? fetch;
  const timeoutMs = opts.timeoutMs ?? FEED_TIMEOUT_MS;
  const maxBytes = opts.maxBytes ?? FEED_MAX_BYTES;
  const allowed = opts.allowedHosts ?? FEED_HOSTS;
  const start = assertFeedUrl(url, allowed);
  const signal = AbortSignal.timeout(timeoutMs);

  let current = start;
  let res: Response | undefined;
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      res = await fetchFn(current.href, {
        method: 'GET',
        headers: { accept: 'application/json, application/xml, text/xml, */*;q=0.1' },
        redirect: 'manual',
        signal
      });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location');
        await res.body?.cancel().catch(() => undefined);
        if (!loc || hop === MAX_REDIRECTS) throw new FeedError('Feed redirected too many times.');
        let next: URL;
        try {
          next = new URL(loc, current);
        } catch {
          throw new FeedError('Feed redirect is invalid.');
        }
        assertFeedUrl(next.href, allowed);
        if (next.hostname !== start.hostname) throw new FeedError('Feed redirected to a different host.');
        current = next;
        continue;
      }
      break;
    }
    if (!res || res.status < 200 || res.status >= 300) throw new FeedError(`Feed returned HTTP ${res?.status ?? 0}.`);

    const declared = Number(res.headers.get('content-length'));
    if (Number.isFinite(declared) && declared > maxBytes) {
      await res.body?.cancel().catch(() => undefined);
      throw new FeedError('Feed response is too large.');
    }
    if (!res.body) throw new FeedError('Feed response has no body.');
    const reader = res.body.getReader();
    const chunks: Buffer[] = [];
    let total = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > maxBytes) throw new FeedError('Feed response is too large.'); // Content-Length may lie
        chunks.push(Buffer.from(value.buffer, value.byteOffset, value.byteLength));
      }
    } catch (e) {
      await reader.cancel().catch(() => undefined);
      throw e;
    }
    return Buffer.concat(chunks, total).toString('utf8');
  } catch (err) {
    if (err instanceof FeedError) throw err;
    const name = err instanceof Error ? err.name : '';
    if (name === 'TimeoutError' || name === 'AbortError') throw new FeedError(`Feed request timed out after ${timeoutMs} ms.`);
    throw new FeedError('Feed request failed.');
  }
}

export async function fetchJson(url: string, opts: FetchOptions = {}): Promise<unknown> {
  const text = await fetchText(url, opts);
  try {
    return JSON.parse(text);
  } catch {
    throw new FeedError('Feed returned unreadable JSON.');
  }
}

// Small bounded TTL cache for the clients (in memory).
export class TtlCache<T> {
  private readonly map = new Map<string, { at: number; value: T }>();
  constructor(
    private readonly ttlMs: number,
    private readonly max = 100,
    private readonly now: () => number = Date.now
  ) {}
  get(key: string): T | undefined {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    if (this.now() - hit.at >= this.ttlMs) {
      this.map.delete(key);
      return undefined;
    }
    return hit.value;
  }
  set(key: string, value: T): void {
    this.map.delete(key);
    while (this.map.size >= this.max) {
      const oldest = this.map.keys().next();
      if (oldest.done) break;
      this.map.delete(oldest.value);
    }
    this.map.set(key, { at: this.now(), value });
  }
}

export const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
