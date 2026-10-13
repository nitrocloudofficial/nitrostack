import { Injectable } from '@nitrostack/core';
import type { AnalyzeInput, MapsResult, ZoneCandidate } from '../../common/types.js';
import { haversineDistanceKm } from '../../common/geo-utils.js';
import { fetchJsonWithRetry } from '../../common/http-utils.js';

const GEOAPIFY_GEOCODE_URL = 'https://api.geoapify.com/v1/geocode/search';
const GEOAPIFY_PLACES_URL = 'https://api.geoapify.com/v2/places';

const REQUEST_TIMEOUT_MS = 10_000;
// Six, not eight: each zone costs a Places call and a Traffic call, and dense
// metros (Mumbai, Pune) were landing at 9-11s — right on the edge of the MCP
// client's request timeout, which surfaces as an opaque "Tool execution
// failed". Six keeps the spread across the search area while leaving headroom.
const MAX_CANDIDATE_ZONES = 6;
// How many raw localities to pull before de-duplicating, distance-filtering
// and selecting MAX_CANDIDATE_ZONES. Must be well above MAX_CANDIDATE_ZONES:
// the API returns results in its own order, so a small limit silently
// truncates the pool to whatever happens to come back first, collapsing the
// geographic spread we sample from below.
const RESULT_LIMIT = 200;
// Geoapify's own taxonomy for named populated areas. Verified against the
// live API — these are the closest equivalent to the OSM
// suburb/neighbourhood place tags this tool previously queried.
const LOCALITY_CATEGORIES = [
  'populated_place.suburb',
  'populated_place.neighbourhood',
];

interface GeocodeResult {
  lat?: number;
  lon?: number;
}

interface GeocodeResponse {
  results?: GeocodeResult[];
}

interface PlacesFeature {
  properties?: {
    place_id?: string;
    name?: string;
    lat?: number;
    lon?: number;
  };
}

interface PlacesResponse {
  features?: PlacesFeature[];
}

/**
 * Maps Tool
 *
 * Finds real candidate localities/neighborhoods within `input.radius`
 * kilometers of `input.city`, using the Geoapify Geocoding + Places APIs
 * (free tier, requires GEOAPIFY_API_KEY — see .env.example). No mock data —
 * on any failure this throws rather than silently falling back to fake
 * zones, so problems are visible during development.
 */
@Injectable()
export class MapsService {
  async findCandidateZones(input: AnalyzeInput): Promise<MapsResult> {
    const apiKey = process.env.GEOAPIFY_API_KEY;
    if (!apiKey) {
      throw new Error(
        'GEOAPIFY_API_KEY is not set. Get a free key at https://www.geoapify.com and add it to your .env file (see .env.example).'
      );
    }

    const cityCenter = await this.geocodeCity(input.city, apiKey);
    const zones = await this.findLocalitiesNear(
      cityCenter,
      input.radius,
      input.city,
      apiKey
    );

    return { zones };
  }

  private async geocodeCity(
    city: string,
    apiKey: string
  ): Promise<{ lat: number; lng: number }> {
    const url = new URL(GEOAPIFY_GEOCODE_URL);
    url.searchParams.set('text', city);
    url.searchParams.set('type', 'city');
    url.searchParams.set('limit', '1');
    url.searchParams.set('format', 'json');
    url.searchParams.set('apiKey', apiKey);

    const response = await this.fetchJson<GeocodeResponse>(
      url.toString(),
      'Geoapify geocoding'
    );

    const first = response?.results?.[0];
    if (!first) {
      throw new Error(
        `Could not find city "${city}". Check the spelling or try a more specific name (e.g. include the state/country).`
      );
    }

    const lat = Number(first.lat);
    const lng = Number(first.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error(`Geoapify returned malformed coordinates for city "${city}".`);
    }

    return { lat, lng };
  }

  private async findLocalitiesNear(
    center: { lat: number; lng: number },
    radiusKm: number,
    city: string,
    apiKey: string
  ): Promise<ZoneCandidate[]> {
    const radiusMeters = Math.round(radiusKm * 1000);

    const url = new URL(GEOAPIFY_PLACES_URL);
    url.searchParams.set('categories', LOCALITY_CATEGORIES.join(','));
    url.searchParams.set('filter', `circle:${center.lng},${center.lat},${radiusMeters}`);
    // Deliberately NO proximity bias: biasing toward the centre makes the API
    // return only the nearest localities (all within ~2km of the city centre
    // for a dense city), which made the requested radius have no effect on
    // the result at all. Unbiased, the pool spans the whole search circle.
    url.searchParams.set('limit', String(RESULT_LIMIT));
    url.searchParams.set('apiKey', apiKey);

    const response = await this.fetchJson<PlacesResponse>(
      url.toString(),
      'Geoapify locality search'
    );

    if (!response || !Array.isArray(response.features)) {
      throw new Error('Received malformed response from Geoapify Places API (locality search).');
    }

    const seenNames = new Set<string>();
    const candidates: (ZoneCandidate & { distanceKm: number })[] = [];

    for (const feature of response.features) {
      const props = feature.properties;
      const name = props?.name?.trim();
      const lat = props?.lat;
      const lng = props?.lon;

      if (!name || lat === undefined || lng === undefined) continue;
      if (seenNames.has(name)) continue;

      // Verify independently of the provider's own filter.
      const distanceKm = haversineDistanceKm(center.lat, center.lng, lat, lng);
      if (distanceKm > radiusKm) continue;

      seenNames.add(name);
      candidates.push({ name, lat, lng, distanceKm });
    }

    if (candidates.length === 0) {
      throw new Error(
        `No candidate localities found within ${radiusKm}km of "${city}". Try increasing the radius.`
      );
    }

    candidates.sort((a, b) => a.distanceKm - b.distanceKm);

    return this.selectSpreadZones(candidates).map(({ name, lat, lng }) => ({
      name,
      lat,
      lng,
    }));
  }

  /**
   * Picks MAX_CANDIDATE_ZONES zones spread across the search area rather than
   * simply the nearest ones.
   *
   * Taking the closest N always returns the same tightly-clustered set of
   * city-centre localities no matter how large the requested radius is, which
   * makes the radius input meaningless. Sampling at even intervals across the
   * distance-sorted pool keeps the nearest zone, the farthest zone, and an
   * even spread between them — so a larger radius genuinely widens the search.
   */
  private selectSpreadZones<T>(sorted: T[]): T[] {
    if (sorted.length <= MAX_CANDIDATE_ZONES) return sorted;

    const step = (sorted.length - 1) / (MAX_CANDIDATE_ZONES - 1);
    const picked: T[] = [];

    for (let i = 0; i < MAX_CANDIDATE_ZONES; i++) {
      picked.push(sorted[Math.round(i * step)]);
    }

    return picked;
  }

  private fetchJson<T>(url: string, context: string): Promise<T> {
    return fetchJsonWithRetry<T>(url, context, REQUEST_TIMEOUT_MS);
  }
}
