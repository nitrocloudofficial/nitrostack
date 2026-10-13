/**
 * Client for OSV.dev (https://osv.dev) — replaces v1's NVD client. No API
 * key, free public tier, up to 1000 package queries per batch request.
 * OSV aggregates GitHub Advisory DB, npm, PyPI, RustSec, Go vulndb and
 * others, and every record's `aliases` field carries CVE ids — that's the
 * join key back to CISA KEV / FIRST EPSS in prioritise_findings.
 */

const OSV_API_BASE = "https://api.osv.dev/v1";
const BATCH_CHUNK_SIZE = 1000;
const VULN_CACHE_TTL_MS = 10 * 60 * 1000;

export interface OsvQuery {
  package: { name: string; ecosystem: string };
  version?: string;
}

export interface OsvBatchVulnRef {
  id: string;
  modified?: string;
}

export interface OsvBatchResult {
  vulns?: OsvBatchVulnRef[];
}

export interface OsvSeverity {
  type: string;
  score: string;
}

export interface OsvEvent {
  introduced?: string;
  fixed?: string;
  last_affected?: string;
  limit?: string;
}

export interface OsvRange {
  type: string;
  events: OsvEvent[];
}

export interface OsvAffected {
  package: { ecosystem: string; name: string; purl?: string };
  ranges?: OsvRange[];
  versions?: string[];
}

export interface OsvVulnRecord {
  id: string;
  summary?: string;
  details?: string;
  aliases?: string[];
  severity?: OsvSeverity[];
  affected?: OsvAffected[];
}

/** Queries OSV for known vulnerabilities affecting each (package, version) pair. Chunked to OSV's 1000-query batch limit. */
export async function queryBatch(queries: OsvQuery[]): Promise<OsvBatchResult[]> {
  const results: OsvBatchResult[] = [];
  for (let i = 0; i < queries.length; i += BATCH_CHUNK_SIZE) {
    const chunk = queries.slice(i, i + BATCH_CHUNK_SIZE);
    const res = await fetch(`${OSV_API_BASE}/querybatch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queries: chunk }),
    });
    if (!res.ok) {
      throw new Error(`OSV querybatch failed: HTTP ${res.status}`);
    }
    const data = (await res.json()) as { results?: OsvBatchResult[] };
    results.push(...(data.results ?? []));
  }
  return results;
}

const vulnCache = new Map<string, { data: OsvVulnRecord; expires: number }>();

/** Fetches one full vulnerability record (needed for `aliases`/`fixed` events — querybatch only returns bare ids). Cached. */
export async function getVuln(id: string): Promise<OsvVulnRecord | null> {
  const cached = vulnCache.get(id);
  if (cached && cached.expires > Date.now()) return cached.data;

  const res = await fetch(`${OSV_API_BASE}/vulns/${encodeURIComponent(id)}`);
  if (!res.ok) return null;
  const data = (await res.json()) as OsvVulnRecord;
  vulnCache.set(id, { data, expires: Date.now() + VULN_CACHE_TTL_MS });
  return data;
}

/** Fetches full records for a set of vuln ids, de-duplicated, dropping any that failed to fetch. */
export async function getVulns(ids: string[]): Promise<OsvVulnRecord[]> {
  const unique = [...new Set(ids)];
  const records = await Promise.all(unique.map((id) => getVuln(id)));
  return records.filter((v): v is OsvVulnRecord => v !== null);
}
