import { Injectable } from '@nitrostack/core';
import type { TrafficResult, ZoneCandidate } from '../../common/types.js';
import { fetchJsonWithRetry } from '../../common/http-utils.js';

const GEOAPIFY_PLACES_URL = 'https://api.geoapify.com/v2/places';

// Sampled around each zone centre — a realistic walk-in catchment for a
// neighbourhood retail site, and consistent with the radius the Places and
// Demographics tools already use.
export const CATCHMENT_RADIUS_METERS = 1500;
const REQUEST_TIMEOUT_MS = 10_000;
// Well above the number of facilities a dense catchment returns, so counts
// are not silently truncated by the page size (a limit of 100 was already
// being hit by the `commercial` category alone in Coimbatore).
const RESULT_LIMIT = 500;

/**
 * Footfall drivers, with the weight each contributes to the traffic index.
 *
 * Weights are OUR OWN judgement, not measured coefficients, and are stated
 * here so the score can be audited and retuned:
 *
 *   public_transport (4) — the strongest accessibility signal for retail;
 *                          stops and stations put people on the street.
 *   education        (3) — schools/colleges generate dense, repeating
 *                          daily pedestrian flows.
 *   entertainment    (3) — cinemas, venues; destination footfall.
 *   commercial       (2) — existing shops indicate an established retail
 *                          pitch that already pulls shoppers.
 *   catering         (2) — cafes/restaurants indicate active street life.
 *   healthcare       (1) — clinics/hospitals draw visitors, but the traffic
 *                          is less retail-oriented, so it is discounted.
 *
 * All category strings verified against the live Geoapify API. `tourism` was
 * deliberately excluded: including it in the combined query collapsed the
 * result set from 323 facilities to 2, so Geoapify does not union it with
 * these categories the way the others combine. Its footfall contribution is
 * minor and not worth a second request.
 */
export const FOOTFALL_WEIGHTS: { category: string; weight: number }[] = [
  { category: 'public_transport', weight: 4 },
  { category: 'education', weight: 3 },
  { category: 'entertainment', weight: 3 },
  { category: 'commercial', weight: 2 },
  { category: 'catering', weight: 2 },
  { category: 'healthcare', weight: 1 },
];

/**
 * Weighted total treated as the top of the scale.
 *
 * The curve below is a square root rather than linear: facility counts span
 * a very wide range between a quiet residential pocket and a city-centre
 * pitch, and a linear scale calibrated for the busy end leaves every ordinary
 * zone bunched near zero. A logarithmic curve was rejected for the opposite
 * reason — it lifted a near-empty outskirt to roughly a third of full score.
 */
export const FOOTFALL_SATURATION = 1200;
// The Opportunity Engine scores traffic as `footTraffic / 50000`, so the
// index is expressed on that same scale to stay contract-compatible.
export const FOOT_TRAFFIC_MAX = 50_000;

interface GeoapifyPlacesResponse {
  features?: { properties?: { categories?: string[] } }[];
}

/**
 * Process-lifetime cache keyed on ~110m precision. Traffic is genuinely
 * zone-specific, so unlike the demographics catchment this is NOT shared
 * between zones — it only avoids repeating an identical lookup for the same
 * point (e.g. when the same city is analysed again).
 */
const trafficCache = new Map<string, Promise<number>>();

function cacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

/**
 * Traffic Tool
 *
 * `footTraffic` is a DERIVED ACCESSIBILITY / FOOTFALL-POTENTIAL INDEX, not a
 * measured count of people. No free source publishes real pedestrian counts
 * for Indian localities, so rather than invent a number this counts real
 * facilities that actually exist around the zone — transit stops, schools,
 * shops, eateries, venues — weights them by how strongly each drives retail
 * footfall, and expresses the total on the 0-50,000 scale the Opportunity
 * Engine already uses.
 *
 * Directly measured  : the facility counts themselves (Geoapify/OpenStreetMap).
 * Derived            : the weighted index built from those counts.
 * Assumptions        : the weights in FOOTFALL_WEIGHTS and the saturation
 *                      constant, both documented above.
 *
 * No mock data and no seeded fallback: if the provider fails, this throws so
 * the failure is visible rather than silently reporting invented traffic.
 */
@Injectable()
export class TrafficService {
  async getTraffic(zone: ZoneCandidate): Promise<TrafficResult> {
    if (!Number.isFinite(zone.lat) || !Number.isFinite(zone.lng)) {
      throw new Error(
        `Invalid coordinates for zone "${zone.name}": lat=${zone.lat}, lng=${zone.lng}.`
      );
    }

    const key = cacheKey(zone.lat, zone.lng);
    let pending = trafficCache.get(key);

    if (!pending) {
      pending = this.computeFootTraffic(zone);
      trafficCache.set(key, pending);
      // Don't cache failures — a transient outage shouldn't poison the cache
      // for the rest of the process lifetime.
      pending.catch(() => trafficCache.delete(key));
    }

    const footTraffic = await pending;

    return { zone: zone.name, footTraffic: Math.round(footTraffic) };
  }

  private async computeFootTraffic(zone: ZoneCandidate): Promise<number> {
    const apiKey = process.env.GEOAPIFY_API_KEY;
    if (!apiKey) {
      throw new Error(
        'GEOAPIFY_API_KEY is not set. Get a free key at https://www.geoapify.com and add it to your .env file (see .env.example).'
      );
    }

    // All footfall drivers are requested in ONE call and classified from each
    // result's own categories, rather than one request per category.
    const url = new URL(GEOAPIFY_PLACES_URL);
    url.searchParams.set('categories', FOOTFALL_WEIGHTS.map((f) => f.category).join(','));
    url.searchParams.set('filter', `circle:${zone.lng},${zone.lat},${CATCHMENT_RADIUS_METERS}`);
    url.searchParams.set('limit', String(RESULT_LIMIT));
    url.searchParams.set('apiKey', apiKey);

    const response = await fetchJsonWithRetry<GeoapifyPlacesResponse>(
      url.toString(),
      `Geoapify footfall lookup for "${zone.name}"`,
      REQUEST_TIMEOUT_MS
    );

    if (!response || !Array.isArray(response.features)) {
      throw new Error(
        `Received malformed response from Geoapify for zone "${zone.name}" (traffic lookup).`
      );
    }

    let weightedTotal = 0;
    for (const feature of response.features) {
      const categories = feature?.properties?.categories ?? [];
      // A facility often carries several categories; count it once, at the
      // highest weight it qualifies for, so a single place cannot be counted
      // repeatedly across overlapping drivers.
      let best = 0;
      for (const { category, weight } of FOOTFALL_WEIGHTS) {
        if (categories.some((c) => c === category || c.startsWith(`${category}.`))) {
          best = Math.max(best, weight);
        }
      }
      weightedTotal += best;
    }

    const scaled = Math.sqrt(Math.min(1, weightedTotal / FOOTFALL_SATURATION));
    const footTraffic = scaled * FOOT_TRAFFIC_MAX;

    console.error(
      `[traffic] zone="${zone.name}" facilities=${response.features.length} ` +
        `weighted=${weightedTotal} footTraffic=${Math.round(footTraffic)}`
    );

    return footTraffic;
  }
}
