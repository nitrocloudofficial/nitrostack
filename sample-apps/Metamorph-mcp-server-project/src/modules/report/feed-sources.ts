// Runs the assessment's outside lookups (OSV, CISA KEV, FIRST EPSS, endoflife.date) through the feeds layer and
// remembers, per source, its URL and when the data was fetched. A feed that is down is listed as unavailable; it never
// fails the report (the assessment already tolerates missing feed data).
import { EOL_BASE, EolClient } from '../feeds/eol.js';
import { EPSS_BASE, EpssClient } from '../feeds/epss.js';
import { KEV_URL, KevClient } from '../feeds/kev.js';
import { analyzePackages, type AdvisoryDeps } from '../intake/advisory.js';
import type { AssessOptions, EolLookup, EpssLookup } from '../assessment/assess.js';
import type { EnrichClients } from '../scanners/enrich.js';
import type { FeedsData } from './report-data.js';

export const UNAVAILABLE = 'unavailable';
const OSV_URL = 'https://api.osv.dev/v1';

export interface FeedRecorder {
  options: Pick<AssessOptions, 'analyze' | 'epss' | 'eol'>;
  sources(): FeedsData['sources'];
  /** The same KEV and EPSS clients (and their caches) for enriching runner findings, so each feed is fetched once per report. */
  enrich: EnrichClients;
}

export function recordFeeds(deps: { fetchFn?: typeof fetch; now?: () => number; osv?: AdvisoryDeps } = {}): FeedRecorder {
  const now = deps.now ?? Date.now;
  const iso = () => new Date(now()).toISOString();
  const fo = { fetchFn: deps.fetchFn, now };
  const kev = new KevClient(fo);
  const epss = new EpssClient(fo);
  const eol = new EolClient(fo);
  const seen = new Map<string, { name: string; url: string; fetchedAt: string }>();
  // The first successful fetch time wins; "unavailable" is only kept while no fetch has succeeded.
  const ok = (name: string, url: string, fetchedAt: string) => {
    const cur = seen.get(name);
    if (!cur || cur.fetchedAt === UNAVAILABLE) seen.set(name, { name, url, fetchedAt });
  };
  const down = (name: string, url: string) => {
    if (!seen.has(name)) seen.set(name, { name, url, fetchedAt: UNAVAILABLE });
  };

  const kevFetch = async (): Promise<Set<string>> => {
    try {
      const c = await kev.catalogIds();
      ok('CISA KEV', KEV_URL, c.fetchedAt);
      return c.ids;
    } catch (e) {
      down('CISA KEV', KEV_URL);
      throw e;
    }
  };

  const epssLookup: EpssLookup = async (cves) => {
    try {
      const scores = await epss.getScores(cves);
      ok('first.org EPSS', EPSS_BASE, scores[0]?.fetchedAt ?? iso());
      return new Map(scores.map((s) => [s.cve, s.epss]));
    } catch (e) {
      down('first.org EPSS', EPSS_BASE);
      throw e;
    }
  };

  const eolLookup: EolLookup = async (product, cycle) => {
    try {
      const cycles = await eol.cycles(product);
      ok('endoflife.date', EOL_BASE, cycles[0]?.fetchedAt ?? iso());
      const c = cycles.find((x) => x.cycle === cycle);
      return c && c.isEol && typeof c.eol === 'string' ? { eolDate: c.eol, latest: c.latest } : undefined;
    } catch {
      down('endoflife.date', EOL_BASE);
      return undefined;
    }
  };

  return {
    options: {
      analyze: async (pkgs) => {
        try {
          const r = await analyzePackages(pkgs, { kevFetch, ...(deps.osv ?? {}) });
          ok('osv.dev', OSV_URL, iso());
          return r;
        } catch (e) {
          down('osv.dev', OSV_URL);
          throw e;
        }
      },
      epss: epssLookup,
      eol: eolLookup
    },
    sources: () => [...seen.values()],
    enrich: { kev, epss, now }
  };
}
