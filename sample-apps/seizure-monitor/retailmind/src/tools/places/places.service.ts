import { Injectable } from '@nitrostack/core';
import type { PlacesResult, ZoneCandidate } from '../../common/types.js';
import { haversineDistanceKm } from '../../common/geo-utils.js';
import { fetchJsonWithRetry } from '../../common/http-utils.js';

const GEOAPIFY_PLACES_URL = 'https://api.geoapify.com/v2/places';

// "Local" competitor search radius around each candidate zone. Deliberately
// independent of the top-level AnalyzeInput.radius (which governs how far
// Maps looks for candidate zones across the whole city) — this is a much
// tighter radius meant to capture "nearby, directly competing" businesses
// within realistic walking/local-commercial reach of a specific locality.
const SEARCH_RADIUS_METERS = 1000;
// This runs once per candidate zone (up to 8), so the per-call timeout
// multiplies across zones — but only by ceil(zones / MAX_CONCURRENT_REQUESTS)
// batches, not by the zone count. 12s leaves room for an occasional slow
// Geoapify response without pushing worst-case past a usable window.
const REQUEST_TIMEOUT_MS = 12_000;
// PlannerTools calls getCompetitors() once per zone via Promise.all, so up
// to 8 calls can start at once. Node's default HTTP agent caps concurrent
// connections per host, so "parallel" Promise.all calls don't actually run
// fully in parallel over the network — they queue invisibly, which silently
// multiplies real-world latency far beyond what REQUEST_TIMEOUT_MS alone
// would suggest. Throttling explicitly here makes worst-case latency
// predictable: ceil(zones / MAX_CONCURRENT_REQUESTS) * REQUEST_TIMEOUT_MS.
const MAX_CONCURRENT_REQUESTS = 4;
let activeRequests = 0;
const requestQueue: (() => void)[] = [];

async function acquireSlot(): Promise<void> {
  if (activeRequests < MAX_CONCURRENT_REQUESTS) {
    activeRequests++;
    return;
  }
  await new Promise<void>((resolve) => requestQueue.push(resolve));
  activeRequests++;
}

function releaseSlot(): void {
  activeRequests--;
  const next = requestQueue.shift();
  if (next) next();
}
// Competitors + all anchor categories share this one request's result
// budget. Set generously so a single dense anchor category (e.g. a
// hospital cluster) can't crowd out competitor results.
const RESULT_LIMIT = 60;
// Anchor list is capped independently after fetching/sorting — beyond this,
// OpportunityEngineService's scoring already treats anchor count as maxed
// out, so returning more just adds noise, not signal.
const MAX_ANCHOR_POINTS = 5;

interface CategoryMapping {
  keywords: string[];
  categories: string[];
}

// Small, maintainable keyword -> Geoapify category mapping (Geoapify's own
// documented taxonomy: https://apidocs.geoapify.com/docs/places/#categories).
// Geoapify requires businesses to be tagged from a controlled category list,
// so some translation is genuinely necessary — this covers the common
// categories a retail hackathon demo is likely to use. Anything unmatched
// falls back to a broad commercial/catering search (see resolveCategory).
const BUSINESS_TYPE_MAP: CategoryMapping[] = [
  { keywords: ['coffee', 'cafe', 'café'], categories: ['catering.cafe'] },
  { keywords: ['restaurant', 'dine', 'eatery', 'diner'], categories: ['catering.restaurant'] },
  { keywords: ['bakery', 'bake'], categories: ['commercial.food_and_drink.bakery'] },
  { keywords: ['gym', 'fitness'], categories: ['sport.fitness'] },
  { keywords: ['pharmacy', 'chemist', 'drug'], categories: ['healthcare.pharmacy'] },
  { keywords: ['cloth', 'apparel', 'fashion', 'boutique', 'garment'], categories: ['commercial.clothing'] },
  { keywords: ['supermarket', 'grocery', 'grocer'], categories: ['commercial.supermarket'] },
  { keywords: ['salon', 'hair', 'barber', 'beauty', 'spa'], categories: ['service.beauty'] },
  { keywords: ['bar', 'pub'], categories: ['catering.bar', 'catering.pub'] },
  { keywords: ['hotel', 'lodging'], categories: ['accommodation.hotel'] },
];

// Generic fallback used when businessType doesn't match any known category
// above — broad by category, narrowed afterward by keyword match against
// each result's own name.
const FALLBACK_CATEGORIES = ['commercial', 'catering'];

// Fixed set of "anchor" destination categories (malls, transit, institutions)
// searched alongside competitors in the same request, independent of
// businessType.
const ANCHOR_CATEGORIES = [
  'commercial.shopping_mall',
  'education.university',
  'education.college',
  'healthcare.hospital',
  'public_transport',
];

interface GeoapifyFeature {
  properties?: {
    place_id?: string;
    name?: string;
    categories?: string[];
    lat?: number;
    lon?: number;
  };
}

interface GeoapifyResponse {
  features: GeoapifyFeature[];
}

interface ResolvedCategory {
  categories: string[];
  isFallback: boolean;
  keywords: string[];
}

function resolveCategory(businessType: string): ResolvedCategory {
  const normalized = businessType.toLowerCase();
  const match = BUSINESS_TYPE_MAP.find((m) => m.keywords.some((k) => normalized.includes(k)));

  if (match) {
    return { categories: match.categories, isFallback: false, keywords: match.keywords };
  }

  return {
    categories: FALLBACK_CATEGORIES,
    isFallback: true,
    keywords: normalized.split(/\s+/).filter((w) => w.length > 2),
  };
}

function isAnchorCategory(categories: string[] | undefined): boolean {
  if (!categories) return false;
  return categories.some((c) => ANCHOR_CATEGORIES.some((a) => c === a || c.startsWith(`${a}.`)));
}

function matchesFallbackKeywords(name: string | undefined, keywords: string[]): boolean {
  if (keywords.length === 0) return true;
  if (!name) return false;
  const haystack = name.toLowerCase();
  return keywords.some((k) => haystack.includes(k));
}

/**
 * Places Tool
 *
 * Finds real competing businesses and nearby anchor destinations around a
 * candidate zone, using the Geoapify Places API (free tier, requires
 * GEOAPIFY_API_KEY — see .env.example). No mock data — on failure this
 * throws rather than falling back to fake competitors. A real search that
 * legitimately finds no matches returns competitorCount: 0, which is a
 * valid result, not an error.
 */
@Injectable()
export class PlacesService {
  async getCompetitors(zone: ZoneCandidate, businessType: string): Promise<PlacesResult> {
    const apiKey = process.env.GEOAPIFY_API_KEY;
    if (!apiKey) {
      throw new Error(
        'GEOAPIFY_API_KEY is not set. Get a free key at https://www.geoapify.com and add it to your .env file (see .env.example).'
      );
    }

    console.error(
      `[places] zone="${zone.name}" businessType="${businessType}" — querying Geoapify...`
    );

    const category = resolveCategory(businessType);
    const allCategories = [...category.categories, ...ANCHOR_CATEGORIES];

    const url = new URL(GEOAPIFY_PLACES_URL);
    url.searchParams.set('categories', allCategories.join(','));
    url.searchParams.set('filter', `circle:${zone.lng},${zone.lat},${SEARCH_RADIUS_METERS}`);
    url.searchParams.set('bias', `proximity:${zone.lng},${zone.lat}`);
    url.searchParams.set('limit', String(RESULT_LIMIT));
    url.searchParams.set('apiKey', apiKey);

    const response = await this.fetchJson<GeoapifyResponse>(url.toString());

    if (!response || !Array.isArray(response.features)) {
      throw new Error('Received malformed response from Geoapify Places API.');
    }

    const seenAnchors = new Set<string>();
    const seenCompetitors = new Set<string>();
    const anchors: { name: string; distanceKm: number }[] = [];
    const competitors: { name: string; distanceKm: number }[] = [];

    for (const feature of response.features) {
      const props = feature.properties;
      const name = props?.name?.trim();
      const lat = props?.lat;
      const lng = props?.lon;

      if (!name || lat === undefined || lng === undefined) continue;

      const dedupeKey = props?.place_id ?? `${name}/${lat.toFixed(5)}/${lng.toFixed(5)}`;
      const distanceKm = haversineDistanceKm(zone.lat, zone.lng, lat, lng);

      if (isAnchorCategory(props?.categories)) {
        if (seenAnchors.has(dedupeKey)) continue;
        seenAnchors.add(dedupeKey);
        anchors.push({ name, distanceKm });
        continue;
      }

      if (category.isFallback && !matchesFallbackKeywords(name, category.keywords)) {
        continue;
      }

      if (seenCompetitors.has(dedupeKey)) continue;
      seenCompetitors.add(dedupeKey);
      competitors.push({ name, distanceKm });
    }

    competitors.sort((a, b) => a.distanceKm - b.distanceKm);
    anchors.sort((a, b) => a.distanceKm - b.distanceKm);
    const closestAnchors = anchors.slice(0, MAX_ANCHOR_POINTS);

    console.error(
      `[places] zone="${zone.name}" — found ${competitors.length} competitors, ` +
        `${anchors.length} anchor points (${closestAnchors.length} kept)`
    );

    return {
      zone: zone.name,
      competitorCount: competitors.length,
      competitors: competitors.map((c) => c.name),
      anchorPoints: closestAnchors.map((a) => a.name),
    };
  }

  private async fetchJson<T>(url: string): Promise<T> {
    await acquireSlot();
    try {
      return await this.doFetch<T>(url);
    } finally {
      releaseSlot();
    }
  }

  private doFetch<T>(url: string): Promise<T> {
    return fetchJsonWithRetry<T>(url, 'Geoapify Places', REQUEST_TIMEOUT_MS);
  }
}
