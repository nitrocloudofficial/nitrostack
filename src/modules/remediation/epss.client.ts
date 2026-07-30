/**
 * Client for FIRST's EPSS API (free, unauthenticated, batches by comma-
 * separated CVE list). https://api.first.org/data/v1/epss
 */

import { epssCache } from "../../data/cache.js";

const EPSS_BASE = "https://api.first.org/data/v1/epss";

export interface EpssScore {
  cve: string;
  epss: number | null;
  percentile: number | null;
}

export async function getEpssScores(cveIds: string[]): Promise<Map<string, EpssScore>> {
  const out = new Map<string, EpssScore>();
  const uncached = cveIds.filter((id) => !epssCache.get(id));
  for (const id of cveIds) {
    const cached = epssCache.get(id) as EpssScore | undefined;
    if (cached) out.set(id, cached);
  }
  if (uncached.length === 0) return out;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(`${EPSS_BASE}?cve=${uncached.map((c) => c.toUpperCase()).join(",")}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { data?: Array<{ cve: string; epss: string; percentile: string }> };
    for (const row of data.data ?? []) {
      const score: EpssScore = {
        cve: row.cve,
        epss: row.epss ? Number(row.epss) : null,
        percentile: row.percentile ? Number(row.percentile) : null,
      };
      out.set(row.cve.toUpperCase(), score);
      epssCache.set(row.cve.toUpperCase(), score);
    }
  } catch (e) {
    // Leave missing entries as null-score below; never throw.
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[warden] epss.client: fetch failed (${message})`);
  }

  for (const id of uncached) {
    if (!out.has(id.toUpperCase())) {
      out.set(id.toUpperCase(), { cve: id.toUpperCase(), epss: null, percentile: null });
    }
  }
  return out;
}
