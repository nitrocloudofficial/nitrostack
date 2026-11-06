// Read-only OSV client. Hosts are fixed constants; callers never supply URLs (SSRF).
export type Ecosystem = 'npm' | 'Packagist';
export interface PackageRef {
  name: string;
  ecosystem: Ecosystem;
  version: string;
}

export interface OsvRange {
  events?: Array<{ introduced?: string; fixed?: string; last_affected?: string }>;
}
export interface OsvAffected {
  package?: { name?: string; ecosystem?: string };
  ranges?: OsvRange[];
}
export interface OsvVuln {
  id: string;
  modified?: string;
  aliases?: string[];
  summary?: string;
  severity?: Array<{ type?: string; score?: string }>;
  affected?: OsvAffected[];
  database_specific?: { severity?: string; cwe_ids?: unknown };
}

export interface OsvClientOptions {
  fetchFn?: typeof fetch;
  timeoutMs?: number;
  cacheTtlMs?: number;
  cacheMax?: number;
  now?: () => number;
  // Retry on HTTP 429, 5xx and network errors (default 0: fail at once). Waits retryBaseMs * 2^attempt, or Retry-After when given.
  retries?: number;
  retryBaseMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

export const OSV_HOST = 'api.osv.dev';
const OSV_BASE = `https://${OSV_HOST}/v1`;

const ID_PATTERNS = [
  /^CVE-\d{4}-\d{4,}$/,
  /^GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/,
  /^MAL-\d{4}-\d+$/
];

export function isValidAdvisoryId(id: string): boolean {
  return typeof id === 'string' && id.length <= 40 && ID_PATTERNS.some((re) => re.test(id));
}

const NAME_PATTERNS: Record<Ecosystem, RegExp> = {
  npm: /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/i,
  Packagist: /^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/i
};
const VERSION_PATTERN = /^[0-9A-Za-z][0-9A-Za-z.+_~-]*$/;
export const MAX_PACKAGES = 50;
// OSV accepts up to 1000 queries in one querybatch call (https://google.github.io/osv.dev/post-v1-querybatch/).
export const OSV_BATCH_MAX = 1000;
// Advisory ids that come back from OSV itself (any database: GHSA-, CVE-, MAL-, PYSEC-, OSV-, ...). Safe path characters only.
const OSV_RECORD_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/;

export function assertPackageRef(p: PackageRef): void {
  const pattern = p ? NAME_PATTERNS[p.ecosystem] : undefined;
  if (!pattern) throw new RangeError('Unsupported ecosystem: use "npm" or "Packagist".');
  if (typeof p.name !== 'string' || p.name.length === 0 || p.name.length > 214 || !pattern.test(p.name)) {
    throw new RangeError('Invalid package name for the given ecosystem (max 214 characters).');
  }
  if (typeof p.version !== 'string' || p.version.length === 0 || p.version.length > 64 || !VERSION_PATTERN.test(p.version)) {
    throw new RangeError('Invalid package version (max 64 characters).');
  }
}

export function assertPackageList(ps: PackageRef[]): void {
  if (!Array.isArray(ps)) throw new RangeError('packages must be an array.');
  if (ps.length > MAX_PACKAGES) throw new RangeError(`Too many packages: at most ${MAX_PACKAGES} per call.`);
  ps.forEach(assertPackageRef);
}

export class OsvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OsvError';
  }
}

interface CacheEntry {
  at: number;
  value: unknown;
}

export class OsvClient {
  private readonly fetchFn: typeof fetch;
  private readonly timeoutMs: number;
  private readonly ttl: number;
  private readonly max: number;
  private readonly now: () => number;
  private readonly retries: number;
  private readonly retryBaseMs: number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly cache = new Map<string, CacheEntry>();

  constructor(opts: OsvClientOptions = {}) {
    this.fetchFn = opts.fetchFn ?? fetch;
    this.timeoutMs = opts.timeoutMs ?? 10000;
    this.ttl = opts.cacheTtlMs ?? 60000;
    this.max = opts.cacheMax ?? 500;
    this.now = opts.now ?? Date.now;
    this.retries = Math.max(0, opts.retries ?? 0);
    this.retryBaseMs = opts.retryBaseMs ?? 500;
    this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  // Record by id as returned by OSV itself (batch results). Same fetch, cache and retry rules as getVuln, but accepts any
  // database's id format, because a batch result can name PYSEC-, OSV- or other ids that getVuln's user-input check refuses.
  async getVulnRecord(id: string): Promise<OsvVuln | null> {
    if (typeof id !== 'string' || !OSV_RECORD_ID.test(id)) throw new RangeError('Invalid advisory id in OSV response.');
    const res = await this.request<OsvVuln | null>(`GET:${id}`, `${OSV_BASE}/vulns/${encodeURIComponent(id)}`, undefined, true);
    return res && typeof res === 'object' ? res : null;
  }

  // One querybatch call for up to OSV_BATCH_MAX packages (not cached: callers keep their own per-package cache).
  // `more` is true for a query whose result OSV paginated: its list is incomplete and the caller must say so.
  async queryBatchLarge(ps: PackageRef[]): Promise<Array<{ vulns: Array<{ id: string; modified: string }>; more: boolean }>> {
    if (!Array.isArray(ps)) throw new RangeError('packages must be an array.');
    if (ps.length > OSV_BATCH_MAX) throw new RangeError(`Too many packages: at most ${OSV_BATCH_MAX} per batch.`);
    ps.forEach(assertPackageRef);
    if (ps.length === 0) return [];
    const body = { queries: ps.map((p) => ({ package: { name: p.name, ecosystem: p.ecosystem }, version: p.version })) };
    const res = await this.request<{ results?: Array<{ vulns?: Array<{ id: string; modified: string }>; next_page_token?: string }> }>(`B:${this.now()}:${Math.random()}`, `${OSV_BASE}/querybatch`, body, false, false);
    const results = Array.isArray(res?.results) ? res.results : [];
    return ps.map((_, i) => ({ vulns: results[i]?.vulns ?? [], more: typeof results[i]?.next_page_token === 'string' }));
  }

  async getVuln(id: string): Promise<OsvVuln | null> {
    if (!isValidAdvisoryId(id)) throw new RangeError('Invalid advisory id: expected CVE-YYYY-N, GHSA-xxxx-xxxx-xxxx or MAL-YYYY-N.');
    const res = await this.request<OsvVuln | null>(`GET:${id}`, `${OSV_BASE}/vulns/${id}`, undefined, true);
    return res && typeof res === 'object' ? res : null;
  }

  async queryPackage(p: PackageRef): Promise<OsvVuln[]> {
    assertPackageRef(p);
    const body = { package: { name: p.name, ecosystem: p.ecosystem }, version: p.version };
    const res = await this.request<{ vulns?: OsvVuln[] }>(`Q:${JSON.stringify(body)}`, `${OSV_BASE}/query`, body);
    return Array.isArray(res?.vulns) ? res.vulns : [];
  }

  async queryBatch(ps: PackageRef[]): Promise<Array<{ id: string; modified: string }[]>> {
    assertPackageList(ps);
    if (ps.length === 0) return [];
    const body = {
      queries: ps.map((p) => ({ package: { name: p.name, ecosystem: p.ecosystem }, version: p.version }))
    };
    const res = await this.request<{ results?: Array<{ vulns?: Array<{ id: string; modified: string }> }> }>(
      `B:${JSON.stringify(body)}`,
      `${OSV_BASE}/querybatch`,
      body
    );
    const results = Array.isArray(res?.results) ? res.results : [];
    return ps.map((_, i) => results[i]?.vulns ?? []);
  }

  private async request<T>(key: string, url: string, body?: unknown, nullOn404 = false, useCache = true): Promise<T> {
    const hit = useCache ? this.cache.get(key) : undefined;
    if (hit && this.now() - hit.at < this.ttl) return hit.value as T;
    if (hit) this.cache.delete(key);

    let res!: Response;
    for (let attempt = 0; ; attempt++) {
      let failure: OsvError | undefined;
      let wait = this.retryBaseMs * 2 ** attempt;
      try {
        res = await this.fetchFn(url, {
          method: body === undefined ? 'GET' : 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: body === undefined ? undefined : JSON.stringify(body),
          redirect: 'error',
          signal: AbortSignal.timeout(this.timeoutMs)
        });
        if (res.status !== 429 && res.status < 500) break;
        failure = new OsvError(`OSV returned HTTP ${res.status}.`);
        const ra = Number(res.headers?.get?.('retry-after'));
        if (Number.isFinite(ra) && ra > 0) wait = Math.min(ra * 1000, 10000);
      } catch (err) {
        const name = err instanceof Error ? err.name : '';
        failure =
          name === 'TimeoutError' || name === 'AbortError'
            ? new OsvError(`OSV request timed out after ${this.timeoutMs} ms. Try again later.`)
            : new OsvError('OSV request failed. Try again later.');
      }
      if (attempt >= this.retries) throw failure;
      await this.sleep(wait);
    }
    if (nullOn404 && res.status === 404) {
      this.store(key, null);
      return null as T;
    }
    if (!res.ok) throw new OsvError(`OSV returned HTTP ${res.status}.`);
    let value: unknown;
    try {
      value = await res.json();
    } catch {
      throw new OsvError('OSV returned an unreadable response.');
    }
    if (useCache) this.store(key, value);
    return value as T;
  }

  private store(key: string, value: unknown): void {
    if (this.max <= 0) return;
    this.cache.delete(key);
    while (this.cache.size >= this.max) {
      const oldest = this.cache.keys().next();
      if (oldest.done) break;
      this.cache.delete(oldest.value);
    }
    this.cache.set(key, { at: this.now(), value });
  }
}
