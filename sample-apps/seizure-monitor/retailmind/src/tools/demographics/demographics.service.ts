import { Injectable } from '@nitrostack/core';
import type { DemographicsResult, ZoneCandidate } from '../../common/types.js';
import { fetchJsonWithRetry } from '../../common/http-utils.js';
import { haversineDistanceKm } from '../../common/geo-utils.js';

const WORLDPOP_STATS_URL = 'https://api.worldpop.org/v1/services/stats';
const GEOAPIFY_PLACES_URL = 'https://api.geoapify.com/v2/places';

// WorldPop's Global Project age/sex structure product. Chosen over the
// plain population product (wpgppop) because a single request returns the
// full age pyramid, from which BOTH population and the 18-35 share are
// derived — halving the number of slow WorldPop calls per zone.
export const WORLDPOP_DATASET = 'wpgpas';
export const WORLDPOP_YEAR = '2020';

// Catchment sampled around each zone centre. ~1.5km is a realistic local
// catchment for a neighbourhood retail site, and matches the granularity of
// the localities MapsService returns.
export const CATCHMENT_RADIUS_KM = 1.5;
const CIRCLE_STEPS = 12;

// WorldPop is slow (~6s/request, and the cost is fixed per request rather
// than proportional to polygon size). Retries are limited to 2 so a bad run
// can't stack three 20s timeouts.
const WORLDPOP_TIMEOUT_MS = 30_000;
const WORLDPOP_MAX_ATTEMPTS = 2;
// WorldPop serialises heavily server-side, so unbounded parallelism buys
// little and risks being throttled. This keeps a full 8-zone analysis to a
// predictable number of waves.
const WORLDPOP_MAX_CONCURRENT = 3;

const GEOAPIFY_TIMEOUT_MS = 10_000;
const AFFLUENCE_RADIUS_METERS = 1500;
const AFFLUENCE_FETCH_LIMIT = 100;

/**
 * Facility types used to build the purchasing-power proxy. Weights reflect
 * how strongly each signals concentrated consumer spending: a mall implies
 * far more commercial pull than a single ATM. All category strings verified
 * against the live Geoapify API.
 */
export const AFFLUENCE_WEIGHTS: { category: string; weight: number }[] = [
  { category: 'service.financial.bank', weight: 2 },
  { category: 'service.financial.atm', weight: 1 },
  { category: 'commercial.supermarket', weight: 3 },
  { category: 'commercial.department_store', weight: 5 },
  { category: 'commercial.shopping_mall', weight: 8 },
];

// Weighted score treated as the top of the scale. Facility counts span
// orders of magnitude between a quiet residential pocket and a dense city
// centre, so the index below is log-scaled — a linear scale calibrated to
// small numbers saturates instantly in Indian metros and stops
// differentiating zones at all.
export const AFFLUENCE_SATURATION = 500;
// The Opportunity Engine scores income as `medianIncome / 2000`, so the
// proxy is expressed on that same 0-2000 index to stay contract-compatible.
export const INCOME_INDEX_MAX = 2000;

interface AgeSexRow {
  class: string;
  age: string;
  male: number;
  female: number;
}

interface WorldPopResponse {
  error?: boolean;
  error_message?: string | null;
  data?: { agesexpyramid?: AgeSexRow[] };
}

interface GeoapifyPlacesResponse {
  features?: { properties?: { categories?: string[] } }[];
}

/** Diagnostic counter: how many WorldPop requests this process has issued. */
let worldPopRequestCount = 0;

/** Simple in-process concurrency gate for the slow WorldPop endpoint. */
let activeWorldPop = 0;
const worldPopQueue: (() => void)[] = [];

async function acquireWorldPopSlot(): Promise<void> {
  if (activeWorldPop < WORLDPOP_MAX_CONCURRENT) {
    activeWorldPop++;
    return;
  }
  await new Promise<void>((resolve) => worldPopQueue.push(resolve));
  activeWorldPop++;
}

function releaseWorldPopSlot(): void {
  activeWorldPop--;
  worldPopQueue.shift()?.();
}

/**
 * Radius within which an already-fetched WorldPop result is reused.
 *
 * A rounded coordinate grid was tried first and did not work: zones sitting
 * either side of a rounding boundary landed in different cells, so a single
 * city still triggered several WorldPop requests (four, measured, for
 * Hyderabad) and the analysis ran past the client's request timeout. Matching
 * on distance from an anchor point has no boundary artefact, so all zones in
 * one city reliably share ONE request.
 */
export const CATCHMENT_REUSE_RADIUS_KM = 30;

interface CatchmentPopulation {
  population: number;
  age18to35Pct: number;
}

interface CatchmentCacheEntry {
  anchorLat: number;
  anchorLng: number;
  value: Promise<CatchmentPopulation>;
}

/**
 * Process-lifetime cache of WorldPop catchment results, anchored at the first
 * zone that requested each area.
 *
 * WorldPop costs a fixed ~6s per request and serialises server-side, so one
 * request per zone puts an 8-zone analysis far past the point where an
 * interactive client gives up. Entries are registered synchronously, before
 * any await, so the concurrent burst of zone lookups that PlannerTools issues
 * collapses onto a single in-flight request rather than racing.
 *
 * The consequence, stated plainly: `population` and `age18to35Pct` are
 * broader-area (effectively city-level) indicators REUSED across the zones of
 * one analysis — they are real measured WorldPop values, but they are not
 * zone-specific and must not be read as such. No per-zone variation is
 * synthesised to disguise this. Zone-level differentiation comes from the
 * purchasing-power proxy, which is computed per zone from each zone's own
 * coordinates and is not shared.
 */
const catchmentCache: CatchmentCacheEntry[] = [];

/** GeoJSON polygon approximating a circle; WorldPop takes an area, not a point. */
function circlePolygon(lat: number, lng: number, radiusKm: number) {
  const coords: number[][] = [];
  const latRadius = radiusKm / 110.574;
  const lngRadius = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));

  for (let i = 0; i <= CIRCLE_STEPS; i++) {
    const theta = (i / CIRCLE_STEPS) * 2 * Math.PI;
    coords.push([
      Number((lng + lngRadius * Math.cos(theta)).toFixed(6)),
      Number((lat + latRadius * Math.sin(theta)).toFixed(6)),
    ]);
  }

  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [coords] },
    properties: {},
  };
}

/**
 * Share of population aged 18-35, from WorldPop's 5-year brackets.
 *
 * The brackets don't align to 18, so the "15 to 20" bracket is counted at
 * 2/5 (ages 18-19) assuming a uniform spread inside that bracket. Brackets
 * 20-25, 25-30 and 30-35 are counted in full. This is an interpolation of
 * real measured data, not an estimate of it.
 */
function computeAge18to35Pct(rows: AgeSexRow[]): { pct: number; total: number } {
  let total = 0;
  let youngAdults = 0;

  for (const row of rows) {
    const bracket = row.male + row.female;
    total += bracket;

    if (row.class === '15') youngAdults += bracket * (2 / 5);
    else if (row.class === '20' || row.class === '25' || row.class === '30') {
      youngAdults += bracket;
    }
  }

  if (total <= 0) return { pct: 0, total: 0 };
  return { pct: (youngAdults / total) * 100, total };
}

/**
 * Demographics Tool
 *
 * Real demographic signals for a candidate zone.
 *
 *   population     — REAL measured WorldPop gridded population (age/sex
 *                    product, 2020) over a ~1.5km catchment. BROADER-AREA
 *                    INDICATOR: fetched once per analysis and reused across
 *                    that analysis's zones, so it describes the city area
 *                    rather than the individual zone. Not zone-specific.
 *   age18to35Pct   — REAL, interpolated from the same WorldPop age bands
 *                    (see computeAge18to35Pct). Reused across zones on the
 *                    same basis as population above.
 *   medianIncome   — PROXY, NOT measured income. No free, reliable,
 *                    locality-level income data exists for Indian
 *                    neighbourhoods, so rather than fabricate a figure this
 *                    carries a purchasing-power index built from the real
 *                    density of banks, ATMs, supermarkets and malls actually
 *                    present around the zone. See computePurchasingPower.
 *
 * No mock data and no seeded fallback: if a source fails, this throws so the
 * failure is visible rather than silently presenting invented demographics.
 */
@Injectable()
export class DemographicsService {
  async getDemographics(zone: ZoneCandidate): Promise<DemographicsResult> {
    if (!Number.isFinite(zone.lat) || !Number.isFinite(zone.lng)) {
      throw new Error(
        `Invalid coordinates for zone "${zone.name}": lat=${zone.lat}, lng=${zone.lng}.`
      );
    }

    // The slow WorldPop lookup is shared across every zone in the same ~11km
    // cell; the fast per-zone purchasing-power proxy is not, so zones still
    // differ from one another. Both run concurrently.
    //
    // WorldPop is allowed to fail WITHOUT failing the whole analysis: it is a
    // single upstream that has gone fully offline before, and losing it should
    // cost us population and age only, not the entire report. The purchasing
    // power proxy comes from a different provider and is unaffected.
    //
    // Nothing is estimated to fill the gap — an absent measurement is
    // returned as null and reported as unavailable all the way to the UI.
    const [catchment, purchasingPowerIndex] = await Promise.all([
      this.getCachedCatchmentPopulation(zone).catch((err: unknown) => {
        console.error(
          `[demographics] WorldPop unavailable for "${zone.name}": ` +
            `${err instanceof Error ? err.message : String(err)}. ` +
            `Continuing without population and age.`
        );
        return null;
      }),
      this.computePurchasingPower(zone),
    ]);

    console.error(
      `[demographics] zone="${zone.name}" ` +
        `population=${catchment ? Math.round(catchment.population) : 'UNAVAILABLE'} ` +
        `age18to35=${catchment ? `${catchment.age18to35Pct.toFixed(1)}%` : 'UNAVAILABLE'} ` +
        `purchasingPowerIndex=${Math.round(purchasingPowerIndex)}`
    );

    return {
      zone: zone.name,
      population: catchment ? Math.round(catchment.population) : null,
      medianIncome: Math.round(purchasingPowerIndex),
      age18to35Pct: catchment ? Math.round(catchment.age18to35Pct) : null,
    };
  }

  private getCachedCatchmentPopulation(zone: ZoneCandidate): Promise<CatchmentPopulation> {
    const existing = catchmentCache.find(
      (entry) =>
        haversineDistanceKm(entry.anchorLat, entry.anchorLng, zone.lat, zone.lng) <=
        CATCHMENT_REUSE_RADIUS_KM
    );
    if (existing) return existing.value;

    // Registered synchronously so the concurrent burst of zone lookups that
    // follows collapses onto this single in-flight request.
    const entry: CatchmentCacheEntry = {
      anchorLat: zone.lat,
      anchorLng: zone.lng,
      value: this.loadCatchmentPopulation(zone),
    };
    catchmentCache.push(entry);

    // Don't cache failures — a transient outage shouldn't poison the cache
    // for the rest of the process lifetime.
    entry.value.catch(() => {
      const i = catchmentCache.indexOf(entry);
      if (i !== -1) catchmentCache.splice(i, 1);
    });

    return entry.value;
  }

  private async loadCatchmentPopulation(zone: ZoneCandidate): Promise<CatchmentPopulation> {
    const pyramid = await this.fetchAgePyramid(zone);
    const { pct, total } = computeAge18to35Pct(pyramid);

    if (total <= 0) {
      throw new Error(
        `WorldPop returned no population for zone "${zone.name}" — cannot derive demographics.`
      );
    }

    return { population: total, age18to35Pct: pct };
  }

  private async fetchAgePyramid(zone: ZoneCandidate): Promise<AgeSexRow[]> {
    const url = new URL(WORLDPOP_STATS_URL);
    url.searchParams.set('dataset', WORLDPOP_DATASET);
    url.searchParams.set('year', WORLDPOP_YEAR);
    url.searchParams.set(
      'geojson',
      JSON.stringify(circlePolygon(zone.lat, zone.lng, CATCHMENT_RADIUS_KM))
    );
    url.searchParams.set('runasync', 'false');

    worldPopRequestCount++;
    console.error(
      `[demographics] WorldPop request #${worldPopRequestCount} (anchor zone "${zone.name}")`
    );

    await acquireWorldPopSlot();
    let response: WorldPopResponse;
    try {
      response = await fetchJsonWithRetry<WorldPopResponse>(
        url.toString(),
        `WorldPop demographics for "${zone.name}"`,
        WORLDPOP_TIMEOUT_MS,
        WORLDPOP_MAX_ATTEMPTS
      );
    } finally {
      releaseWorldPopSlot();
    }

    if (response.error) {
      throw new Error(
        `WorldPop returned an error for zone "${zone.name}": ${
          response.error_message ?? 'unknown error'
        }`
      );
    }

    const rows = response.data?.agesexpyramid;
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error(
        `WorldPop returned no age structure for zone "${zone.name}" (malformed or empty response).`
      );
    }

    return rows;
  }

  /**
   * Purchasing-power proxy — explicitly NOT measured income.
   *
   * Counts real consumer-finance and retail facilities around the zone,
   * weights them by how strongly each indicates concentrated spending, and
   * expresses the weighted total on the 0-2000 index the Opportunity Engine
   * already uses for income. Every input is an observed facility; only the
   * weighting and scaling are our own, and both are stated here.
   */
  private async computePurchasingPower(zone: ZoneCandidate): Promise<number> {
    const apiKey = process.env.GEOAPIFY_API_KEY;
    if (!apiKey) {
      throw new Error(
        'GEOAPIFY_API_KEY is not set. Get a free key at https://www.geoapify.com and add it to your .env file (see .env.example).'
      );
    }

    // All facility types are requested in ONE call and classified from each
    // result's own categories. Querying them separately meant five requests
    // per zone (forty per analysis), which was both slow and a needless drain
    // on the free-tier request quota.
    const url = new URL(GEOAPIFY_PLACES_URL);
    url.searchParams.set('categories', AFFLUENCE_WEIGHTS.map((a) => a.category).join(','));
    url.searchParams.set('filter', `circle:${zone.lng},${zone.lat},${AFFLUENCE_RADIUS_METERS}`);
    url.searchParams.set('limit', String(AFFLUENCE_FETCH_LIMIT));
    url.searchParams.set('apiKey', apiKey);

    const response = await fetchJsonWithRetry<GeoapifyPlacesResponse>(
      url.toString(),
      `Geoapify affluence lookup for "${zone.name}"`,
      GEOAPIFY_TIMEOUT_MS
    );

    const features = Array.isArray(response.features) ? response.features : [];

    let weightedTotal = 0;
    for (const feature of features) {
      const categories = feature?.properties?.categories ?? [];
      // A facility can carry several categories; count it once, at the
      // highest weight it qualifies for, so a mall isn't also counted as a
      // department store.
      let best = 0;
      for (const { category, weight } of AFFLUENCE_WEIGHTS) {
        if (categories.some((c) => c === category || c.startsWith(`${category}.`))) {
          best = Math.max(best, weight);
        }
      }
      weightedTotal += best;
    }
    const scaled = Math.log(1 + weightedTotal) / Math.log(1 + AFFLUENCE_SATURATION);

    return Math.min(1, scaled) * INCOME_INDEX_MAX;
  }
}
