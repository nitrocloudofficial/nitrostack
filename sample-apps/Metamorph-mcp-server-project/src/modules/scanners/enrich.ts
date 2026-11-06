// Feeds the "exploited now" ranking data (CISA KEV, FIRST EPSS) to runner findings. Runs after the findings are normalised and
// deduplicated, looks each distinct CVE id up once (batches of at most 50 for both feeds) and re-ranks with the shared ranking
// (assessment/rank.ts). A feed that is down, slow or answers badly is named in `unavailable` and the findings simply keep the
// data they had; nothing here ever throws. The whole step is capped by a time budget so callers with a deadline stay inside it.
import { rankFindings } from '../assessment/rank.js';
import { EPSS_BASE, EPSS_MAX_CVES, EpssClient } from '../feeds/epss.js';
import { CVE_RE, KEV_URL, MAX_CVES, KevClient } from '../feeds/kev.js';
import { enrichMeasured, type MeasuredAnalysis } from './measured.js';
import type { MeasuredFinding } from './normalize.js';

export const ENRICH_BUDGET_MS = 8000;
export const KEV_NAME = 'CISA KEV';
export const EPSS_NAME = 'first.org EPSS';

export interface EnrichClients {
  kev?: Pick<KevClient, 'isKnownExploited'>;
  epss?: Pick<EpssClient, 'getScores'>;
  now?: () => number;
  budgetMs?: number; // overall cap for both lookups together (default ENRICH_BUDGET_MS)
}

export interface EnrichSource {
  name: string;
  url: string;
  fetchedAt: string; // real fetch time reported by the feed client, or 'unavailable'
}

export interface EnrichmentInfo {
  /** One entry per feed that was asked: its fetch time, or fetchedAt 'unavailable'. Empty when no CVE id was involved. */
  sources: EnrichSource[];
  /** Feed names that could not be used (down, invalid answer or over the time budget). Ranking then uses what is left. */
  unavailable: string[];
  /** Distinct CVE ids looked up. */
  cves: number;
}

let shared: EnrichClients | undefined;
/** Live clients, kept for the life of the process so the KEV catalog and EPSS answers are cached for six hours. */
export function liveEnrichClients(): EnrichClients {
  shared ??= { kev: new KevClient(), epss: new EpssClient() };
  return shared;
}

function chunks<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

function deadline<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limit = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('time budget reached')), ms);
  });
  return Promise.race([p, limit]).finally(() => clearTimeout(timer));
}

export function distinctCves(analyses: MeasuredAnalysis[]): string[] {
  const out = new Set<string>();
  for (const a of analyses) for (const f of a.findings) for (const al of f.aliases) if (CVE_RE.test(al)) out.add(al);
  return [...out].sort();
}

/**
 * Enriches the given analyses with one pair of lookups (the union of their CVE ids), then re-ranks each. The scores do not
 * change: ranking never changes the score. Returns new analyses; the inputs are not modified.
 */
export async function enrichAnalyses(analyses: MeasuredAnalysis[], clients: EnrichClients = liveEnrichClients()): Promise<{ analyses: MeasuredAnalysis[]; info: EnrichmentInfo }> {
  const cves = distinctCves(analyses);
  const info: EnrichmentInfo = { sources: [], unavailable: [], cves: cves.length };
  if (cves.length === 0 || (!clients.kev && !clients.epss)) return { analyses, info };
  const now = clients.now ?? Date.now;
  const budget = clients.budgetMs ?? ENRICH_BUDGET_MS;

  const kevSet = new Set<string>();
  const epssMap = new Map<string, number>();

  const lookupKev = async (): Promise<string> => {
    const kev = clients.kev as NonNullable<EnrichClients['kev']>;
    const parts = await Promise.allSettled(chunks(cves, MAX_CVES).map((c) => kev.isKnownExploited(c)));
    let at: string | undefined;
    let failed = false;
    for (const p of parts) {
      if (p.status === 'rejected') {
        failed = true;
        continue;
      }
      at ??= p.value.fetchedAt;
      for (const h of p.value.hits) kevSet.add(h.cveId);
    }
    if (failed || !at) throw new Error('KEV lookup incomplete');
    return at;
  };

  const lookupEpss = async (): Promise<string> => {
    const epss = clients.epss as NonNullable<EnrichClients['epss']>;
    const parts = await Promise.allSettled(chunks(cves, EPSS_MAX_CVES).map((c) => epss.getScores(c)));
    let at: string | undefined;
    let failed = false;
    for (const p of parts) {
      if (p.status === 'rejected') {
        failed = true;
        continue;
      }
      at ??= p.value[0]?.fetchedAt ?? new Date(now()).toISOString();
      for (const s of p.value) epssMap.set(s.cve, s.epss);
    }
    if (failed || !at) throw new Error('EPSS lookup incomplete');
    return at;
  };

  const run = async (name: string, url: string, fn: () => Promise<string>) => {
    try {
      info.sources.push({ name, url, fetchedAt: await deadline(fn(), budget) });
    } catch {
      info.sources.push({ name, url, fetchedAt: 'unavailable' });
      info.unavailable.push(name);
    }
  };
  await Promise.all([clients.kev ? run(KEV_NAME, KEV_URL, lookupKev) : undefined, clients.epss ? run(EPSS_NAME, EPSS_BASE, lookupEpss) : undefined]);
  info.sources.sort((a, b) => a.name.localeCompare(b.name));
  info.unavailable.sort();

  // A timed-out lookup may still fill the sets later; use only what an answered lookup delivered.
  const kevUsed = new Set(kevSet);
  const epssUsed = new Map(epssMap);
  const out = analyses.map((a) => ({ ...a, findings: rankFindings(enrichMeasured(a.findings, { kev: kevUsed, epss: epssUsed })) as MeasuredFinding[] }));
  return { analyses: out, info };
}
