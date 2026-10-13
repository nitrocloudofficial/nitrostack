import { Injectable, ConfigService } from '@nitrostack/core';
import type { Logger } from '@nitrostack/core';
import type { LatLng, ResolvedLocation, RouteInfo } from '../domain/types.js';
import { createSeededRandom, hashString, haversineDistanceKm, randomBetween } from './sim.util.js';

/**
 * A small local gazetteer, used ONLY as the last-resort fallback when no
 * Geoapify API key is configured (or a live call fails) — never used when
 * live geocoding succeeds. Coordinates are approximate landmark centers to
 * keep the offline demo experience believable.
 */
const KNOWN_LANDMARKS: Record<string, LatLng> = {
  'amrita university ettimadai': { lat: 10.9046, lng: 76.8993 },
  'amrita vishwa vidyapeetham': { lat: 10.9046, lng: 76.8993 },
  'amrita university': { lat: 10.9046, lng: 76.8993 },
  'amrita': { lat: 10.9046, lng: 76.8993 },
  'coimbatore airport': { lat: 11.03, lng: 77.0434 },
  'coimbatore international airport': { lat: 11.03, lng: 77.0434 },
  'coimbatore junction': { lat: 10.9966, lng: 76.9647 },
  'coimbatore': { lat: 11.0168, lng: 76.9558 },
  'gandhipuram': { lat: 11.0177, lng: 76.9674 },
  'rs puram': { lat: 11.0057, lng: 76.9498 },
  'kochi': { lat: 9.9312, lng: 76.2673 },
  'kochi airport': { lat: 10.152, lng: 76.4019 },
  'cochin international airport': { lat: 10.152, lng: 76.4019 },
  'ernakulam': { lat: 9.9816, lng: 76.2999 },
  'ernakulam junction': { lat: 9.9685, lng: 76.2894 },
  'kottayam': { lat: 9.5916, lng: 76.5222 },
  'kottayam railway station': { lat: 9.5947, lng: 76.5203 },
  'nuals kochi': { lat: 10.0523, lng: 76.3286 },
  'nuals': { lat: 10.0523, lng: 76.3286 },
  'madurai': { lat: 9.9252, lng: 78.1198 },
  'madurai junction': { lat: 9.9186, lng: 78.1179 },
  'madurai airport': { lat: 9.8345, lng: 78.0934 },
  'meenakshi temple': { lat: 9.9195, lng: 78.1193 },
  'chennai': { lat: 13.0827, lng: 80.2707 },
  'chennai airport': { lat: 12.9941, lng: 80.1709 },
  'chennai central': { lat: 13.0827, lng: 80.2755 },
  't nagar': { lat: 13.0418, lng: 80.2341 },
  'mumbai': { lat: 19.076, lng: 72.8777 },
  'marine drive': { lat: 18.9432, lng: 72.8235 },
  'juhu beach': { lat: 19.0968, lng: 72.8267 },
  'gateway of india': { lat: 18.922, lng: 72.8347 },
  'chhatrapati shivaji': { lat: 18.9398, lng: 72.8355 },
  'csmt': { lat: 18.9398, lng: 72.8355 },
  'mumbai airport': { lat: 19.0896, lng: 72.8656 },
  'chhatrapati shivaji maharaj international airport': { lat: 19.0896, lng: 72.8656 },
  'bandra': { lat: 19.0596, lng: 72.8295 },
  'andheri': { lat: 19.1136, lng: 72.8697 },
  'colaba': { lat: 18.9067, lng: 72.8147 },
};

/** Default country-code bias — this is an India-focused ride assistant. */
const DEFAULT_COUNTRY_CODE = 'in';

/** Hard timeout for any single Geoapify call — bounds worst-case latency so a slow/hanging API call can never stall a tool response (and, in turn, the MCP connection) indefinitely. */
const GEOAPIFY_TIMEOUT_MS = 6000;

async function fetchWithTimeout(url: string, timeoutMs: number = GEOAPIFY_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * MapsService
 *
 * Resolves rider-typed pickup/drop text (which is usually an informal
 * landmark name — "Amrita University Ettimadai", "Coimbatore Airport" —
 * not a structured postal address) and calculates route distance/duration,
 * using the Geoapify API suite:
 *
 *   - Geocoding API  (/v1/geocode/search)  — location resolution
 *   - Routing API    (/v1/routing)         — distance/duration/geometry
 *   - Static Maps API (maps.geoapify.com/v1/staticmap) — map image
 *
 * Resolution order, per location:
 *   1. Geoapify Geocoding — handles both structured addresses and named
 *      places/landmarks reasonably well (it's backed by OpenStreetMap data,
 *      which has good POI coverage for exactly the kind of landmark names
 *      riders type).
 *   2. Deterministic local estimate — last resort, clearly flagged as such
 *      in the response so the caller/UI never presents a guess as a
 *      confirmed location.
 *
 * Per the reliability rules: no network calls happen at construction or
 * startup — the API key is read lazily on first use, and every live call
 * degrades gracefully to the next tier on any failure instead of throwing.
 *
 * Note: Geoapify does not offer a place-photos API (unlike Google Places),
 * so `ResolvedLocation.photoUrl` is never populated by this service.
 */
@Injectable({ deps: [ConfigService] })
export class MapsService {
  private apiKey: string | undefined;
  private apiKeyChecked = false;
  private countryCode: string = DEFAULT_COUNTRY_CODE;

  constructor(private readonly config: ConfigService) {}

  private getApiKey(): string | undefined {
    if (!this.apiKeyChecked) {
      this.apiKey = this.config.get<string>('GEOAPIFY_API_KEY');
      this.countryCode = this.config.get<string>('GEOAPIFY_COUNTRY_CODE', DEFAULT_COUNTRY_CODE);
      this.apiKeyChecked = true;
    }
    return this.apiKey;
  }

  isLiveConfigured(): boolean {
    return Boolean(this.getApiKey());
  }

  async resolveLocation(query: string, logger?: Logger): Promise<ResolvedLocation> {
    const apiKey = this.getApiKey();

    if (!apiKey) {
      return this.estimateLocation(
        query,
        'GEOAPIFY_API_KEY is not configured — using an approximate demo location. Set GEOAPIFY_API_KEY for exact geocoding.'
      );
    }

    try {
      return await this.geocodeLive(query, apiKey);
    } catch (error) {
      logger?.warn('Geoapify geocoding failed, falling back to estimate', {
        query,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return this.estimateLocation(
      query,
      'Geoapify lookup failed for this query — using an approximate demo location.'
    );
  }

  async calculateRoute(
    origin: ResolvedLocation,
    destination: ResolvedLocation,
    logger?: Logger
  ): Promise<RouteInfo> {
    const apiKey = this.getApiKey();

    if (apiKey && origin.source === 'live' && destination.source === 'live') {
      try {
        return await this.routeLive(origin, destination, apiKey);
      } catch (error) {
        logger?.warn('Geoapify route calculation failed, falling back to estimate', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return this.estimateRoute(origin, destination);
  }

  // ---- Live Geoapify calls -------------------------------------------

  /**
   * Geoapify Geocoding API — resolves free-text input (address or named
   * place) to coordinates. `type=amenity` isn't forced since riders mix
   * addresses and landmark names; a plain text search with a light
   * country-code bias covers both reasonably well.
   */
  private async geocodeLive(query: string, apiKey: string): Promise<ResolvedLocation> {
    const url = new URL('https://api.geoapify.com/v1/geocode/search');
    url.searchParams.set('text', query);
    url.searchParams.set('filter', `countrycode:${this.countryCode}`);
    url.searchParams.set('bias', `countrycode:${this.countryCode}`);
    url.searchParams.set('limit', '1');
    url.searchParams.set('format', 'json');
    url.searchParams.set('apiKey', apiKey);

    const response = await fetchWithTimeout(url.toString());
    if (!response.ok) {
      throw new Error(`Geoapify Geocoding API responded with status ${response.status}`);
    }
    const data: any = await response.json();
    const result = data.results?.[0];
    if (!result) {
      throw new Error('Geoapify Geocoding API returned no results');
    }

    return {
      query,
      formattedAddress: result.formatted ?? query,
      coordinates: {
        lat: result.lat,
        lng: result.lon,
      },
      source: 'live',
      placeId: result.place_id,
    };
  }

  private async routeLive(
    origin: ResolvedLocation,
    destination: ResolvedLocation,
    apiKey: string
  ): Promise<RouteInfo> {
    const url = new URL('https://api.geoapify.com/v1/routing');
    url.searchParams.set(
      'waypoints',
      `${origin.coordinates.lat},${origin.coordinates.lng}|${destination.coordinates.lat},${destination.coordinates.lng}`
    );
    url.searchParams.set('mode', 'drive');
    url.searchParams.set('apiKey', apiKey);

    const response = await fetchWithTimeout(url.toString());
    if (!response.ok) {
      throw new Error(`Geoapify Routing API responded with status ${response.status}`);
    }
    const data: any = await response.json();
    const feature = data.features?.[0];
    const properties = feature?.properties;
    if (!properties || typeof properties.distance !== 'number' || typeof properties.time !== 'number') {
      throw new Error('Geoapify Routing API returned no usable route');
    }

    // Route geometry can be a LineString (single array of [lng,lat]) or a
    // MultiLineString (array of arrays) depending on the route; flatten to
    // one array of points either way. Never let a geometry-parsing issue
    // break the core distance/duration result.
    let polyline: Array<[number, number]> | undefined;
    try {
      polyline = this.flattenRouteGeometry(feature.geometry);
    } catch {
      polyline = undefined;
    }

    return {
      distanceKm: properties.distance / 1000,
      durationMinutes: properties.time / 60,
      source: 'live',
      staticMapUrl: this.buildStaticMapUrl(origin, destination, apiKey, polyline),
      polyline,
    };
  }

  private flattenRouteGeometry(geometry: any): Array<[number, number]> | undefined {
    if (!geometry) return undefined;
    if (geometry.type === 'LineString') {
      return geometry.coordinates as Array<[number, number]>;
    }
    if (geometry.type === 'MultiLineString') {
      return (geometry.coordinates as Array<Array<[number, number]>>).flat();
    }
    return undefined;
  }

  /**
   * Builds a Geoapify Static Maps URL with pickup/destination markers and,
   * when available, the actual route path overlaid. Points are decimated
   * to keep the URL a sane length — a static map only needs enough points
   * to look like a road, not every raw coordinate.
   */
  private buildStaticMapUrl(
    origin: ResolvedLocation,
    destination: ResolvedLocation,
    apiKey: string,
    polyline?: Array<[number, number]>
  ): string {
    const url = new URL('https://maps.geoapify.com/v1/staticmap');
    url.searchParams.set('style', 'osm-carto');
    url.searchParams.set('width', '600');
    url.searchParams.set('height', '300');
    url.searchParams.append('marker', `lonlat:${origin.coordinates.lng},${origin.coordinates.lat};type:awesome;color:#219653;icon:play`);
    url.searchParams.append('marker', `lonlat:${destination.coordinates.lng},${destination.coordinates.lat};type:awesome;color:#e63946;icon:stop`);

    if (polyline && polyline.length > 1) {
      const decimated = this.decimatePoints(polyline, 60);
      const coordPairs = decimated.map(([lng, lat]) => `${lng},${lat}`).join(',');
      url.searchParams.append('geometry', `polyline:${coordPairs};linecolor:#3388ff;linewidth:3`);
    }

    url.searchParams.set('apiKey', apiKey);
    return url.toString();
  }

  private decimatePoints(points: Array<[number, number]>, maxPoints: number): Array<[number, number]> {
    if (points.length <= maxPoints) return points;
    const step = points.length / maxPoints;
    const result: Array<[number, number]> = [];
    for (let i = 0; i < maxPoints; i++) {
      result.push(points[Math.floor(i * step)]);
    }
    result.push(points[points.length - 1]);
    return result;
  }

  // ---- Deterministic fallback (no API key / API failure) ------------

  private estimateLocation(query: string, note: string): ResolvedLocation {
    const normalized = query.trim().toLowerCase();

    // Bidirectional, longest-match-first: handles both a longer query
    // containing a landmark name ("...Amrita University Ettimadai...")
    // and a shorter query that IS a prefix/substring of a landmark name
    // ("Amrita University" should still match "amrita university ettimadai").
    const sortedLandmarks = Object.entries(KNOWN_LANDMARKS).sort((a, b) => b[0].length - a[0].length);
    for (const [landmark, coords] of sortedLandmarks) {
      if (normalized.includes(landmark) || landmark.includes(normalized)) {
        return {
          query,
          formattedAddress: query,
          coordinates: coords,
          source: 'estimated',
          estimationNote: note,
        };
      }
    }

    // No known landmark matched: derive stable pseudo-coordinates from the
    // query text so the same input always estimates to the same point,
    // anchored near South India so distances stay plausible for the demo.
    const rng = createSeededRandom(hashString(normalized));
    const coordinates: LatLng = {
      lat: 10.5 + randomBetween(rng, -1.5, 1.5),
      lng: 77.0 + randomBetween(rng, -1.5, 1.5),
    };

    return {
      query,
      formattedAddress: query,
      coordinates,
      source: 'estimated',
      estimationNote: note,
    };
  }

  private estimateRoute(origin: ResolvedLocation, destination: ResolvedLocation): RouteInfo {
    const straightLineKm = haversineDistanceKm(origin.coordinates, destination.coordinates);
    // Real road distance is longer than straight-line distance; apply a
    // typical detour factor for Indian urban/interurban roads.
    const distanceKm = Math.max(1, straightLineKm * 1.3);
    // Assume an average ~28 km/h effective city speed including traffic.
    const durationMinutes = Math.max(3, (distanceKm / 28) * 60);

    return {
      distanceKm: Math.round(distanceKm * 10) / 10,
      durationMinutes: Math.round(durationMinutes),
      source: 'estimated',
    };
  }
}
