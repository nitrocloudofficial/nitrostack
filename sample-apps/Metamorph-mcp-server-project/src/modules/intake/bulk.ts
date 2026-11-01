// Bulk OSV check for assessments: querybatch in chunks, advisory details fetched in parallel with a concurrency limit, a
// per-process result cache, and a total time budget. It never drops a package silently: packages it could not finish are
// returned in `unchecked`, with the reason, and the caller reports them.
import { analysisFor, loadKev, type AdvisoryDeps, type PackageAnalysis } from './advisory.js';
import { OsvClient, OSV_BATCH_MAX, type OsvVuln, type PackageRef } from './osv.client.js';

export const DEFAULT_BUDGET_MS = 60_000;
export const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_MAX_PACKAGES = 5000;
const DEFAULT_CHUNK = 500; // well under OSV's 1000-query limit so one slow chunk does not hold the whole run
const BATCH_CONCURRENCY = 2;
const DETAIL_CONCURRENCY = 8;

export type UncheckedReason = 'time_budget' | 'osv_error' | 'incomplete_results';
export interface BulkResult {
  analyses: PackageAnalysis[];
  unchecked: Array<{ package: PackageRef; reason: UncheckedReason }>;
  elapsedMs: number;
  cacheHits: number;
  requests: { batches: number; details: number };
}

export interface BulkOptions extends AdvisoryDeps {
  budgetMs?: number;
  chunkSize?: number;
  detailConcurrency?: number;
  now?: () => number;
  cache?: Map<string, CacheEntry>;
}

interface CacheEntry {
  at: number;
  records: OsvVuln[];
}

export const packageKey = (p: PackageRef): string => `${p.ecosystem}:${p.name}@${p.version}`;

// Shared by every assessment in this process: repeated packages (and repeated runs on the same repo) skip the network for an hour.
const processCache = new Map<string, CacheEntry>();
let sharedClient: OsvClient | undefined;
function defaultClient(): OsvClient {
  sharedClient ??= new OsvClient({ retries: 3, timeoutMs: 15000, cacheTtlMs: CACHE_TTL_MS, cacheMax: 5000 });
  return sharedClient;
}

export function clearBulkCache(): void {
  processCache.clear();
}

// Runs `fn` over `items` with at most `limit` in flight. Items not started before `stop()` turns true are returned untouched.
async function pool<T>(items: T[], limit: number, stop: () => boolean, fn: (item: T) => Promise<void>): Promise<T[]> {
  let next = 0;
  const skipped: T[] = [];
  const worker = async (): Promise<void> => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      if (stop()) {
        skipped.push(items[i]);
        continue;
      }
      await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker));
  return skipped;
}

export async function analyzePackagesBulk(packages: PackageRef[], opts: BulkOptions = {}): Promise<BulkResult> {
  const now = opts.now ?? Date.now;
  const start = now();
  const deadline = start + (opts.budgetMs ?? DEFAULT_BUDGET_MS);
  const over = (): boolean => now() >= deadline;
  const client = opts.client ?? defaultClient();
  const cache = opts.cache ?? processCache;
  const chunk = Math.min(Math.max(1, opts.chunkSize ?? DEFAULT_CHUNK), OSV_BATCH_MAX);

  // Unique packages in the order given (callers put production dependencies first, so a budget cut drops dev ones first).
  const unique: PackageRef[] = [];
  const seen = new Set<string>();
  for (const p of packages) if (!seen.has(packageKey(p))) { seen.add(packageKey(p)); unique.push(p); }

  const kevPromise = loadKev(opts); // runs while OSV is queried
  const records = new Map<string, OsvVuln[]>();
  const unchecked = new Map<string, UncheckedReason>();
  let cacheHits = 0;
  const requests = { batches: 0, details: 0 };

  const misses: PackageRef[] = [];
  for (const p of unique) {
    const hit = cache.get(packageKey(p));
    if (hit && now() - hit.at < CACHE_TTL_MS) {
      records.set(packageKey(p), hit.records);
      cacheHits++;
    } else misses.push(p);
  }

  // 1. querybatch in chunks, a couple at a time.
  const ids = new Map<string, string[]>(); // package key -> advisory ids
  const chunks: PackageRef[][] = [];
  for (let i = 0; i < misses.length; i += chunk) chunks.push(misses.slice(i, i + chunk));
  const skippedChunks = await pool(chunks, BATCH_CONCURRENCY, over, async (c) => {
    try {
      requests.batches++;
      const res = await client.queryBatchLarge(c);
      c.forEach((p, i) => {
        if (res[i]?.more) unchecked.set(packageKey(p), 'incomplete_results'); // OSV paginated this one: the list is partial
        else ids.set(packageKey(p), res[i]?.vulns.map((v) => v.id) ?? []);
      });
    } catch {
      for (const p of c) unchecked.set(packageKey(p), 'osv_error');
    }
  });
  for (const c of skippedChunks) for (const p of c) unchecked.set(packageKey(p), 'time_budget');

  // 2. advisory details: each distinct id once, in package order, concurrently; batch results are reused as the id list.
  const order: string[] = [];
  const queued = new Set<string>();
  for (const p of misses) for (const id of ids.get(packageKey(p)) ?? []) if (!queued.has(id)) { queued.add(id); order.push(id); }
  const details = new Map<string, OsvVuln>();
  const failed = new Set<string>();
  const skippedIds = await pool(order, opts.detailConcurrency ?? DETAIL_CONCURRENCY, over, async (id) => {
    try {
      requests.details++;
      const v = await client.getVulnRecord(id);
      if (v) details.set(id, v);
      else failed.add(id);
    } catch {
      failed.add(id);
    }
  });
  const timedOut = new Set(skippedIds);

  // 3. a package is done only when all its advisories were fetched; otherwise it is reported as unchecked, never as clean.
  for (const p of misses) {
    const key = packageKey(p);
    const list = ids.get(key);
    if (!list) continue; // already unchecked in step 1
    const bad = list.find((id) => !details.has(id));
    if (bad !== undefined) {
      unchecked.set(key, timedOut.has(bad) ? 'time_budget' : 'osv_error');
      continue;
    }
    const recs = list.map((id) => details.get(id)!);
    records.set(key, recs);
    if (cache.size >= CACHE_MAX_PACKAGES) {
      const oldest = cache.keys().next();
      if (!oldest.done) cache.delete(oldest.value);
    }
    cache.set(key, { at: now(), records: recs });
  }

  const kev = await kevPromise;
  const analyses = unique.filter((p) => records.has(packageKey(p))).map((p) => analysisFor(p, records.get(packageKey(p)) ?? [], kev));
  const out = unique.filter((p) => !records.has(packageKey(p))).map((p) => ({ package: p, reason: unchecked.get(packageKey(p)) ?? ('osv_error' as UncheckedReason) }));
  return { analyses, unchecked: out, elapsedMs: now() - start, cacheHits, requests };
}
