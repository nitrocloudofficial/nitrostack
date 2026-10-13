/**
 * Resolves nearby real-world safety locations from OpenStreetMap.
 * Set LOCATION_PROVIDER=mock to return the old demo-only locations instead.
 */
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Coordinates, LocationType, SafeLocation } from '../types/location.types';

type RawLocation = Omit<SafeLocation, 'distance' | 'estimatedTime'>;

interface LocationProvider {
  fetchLocations(coordinates: Coordinates): Promise<RawLocation[]>;
}

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements?: OverpassElement[];
}

interface NominatimResult {
  osm_type: 'node' | 'way' | 'relation';
  osm_id: number;
  lat: string;
  lon: string;
  name?: string;
}

/** Fetches mapped facilities from the public OpenStreetMap Overpass API. */
class OpenStreetMapLocationProvider implements LocationProvider {
  private readonly endpoints = process.env.OVERPASS_API_URL
    ? [process.env.OVERPASS_API_URL]
    : [
        'https://overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter',
      ];
  private readonly radiusMeters = this.readRadius();
  private readonly cache = new Map<string, { expiresAt: number; locations: RawLocation[] }>();

  async fetchLocations(coordinates: Coordinates): Promise<RawLocation[]> {
    const cacheKey = `${coordinates.latitude.toFixed(4)},${coordinates.longitude.toFixed(4)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.locations;

    const query = this.buildQuery(coordinates);
    let lastError: unknown;
    for (const endpoint of this.endpoints) {
      try {
        const payload = await this.fetchFromEndpoint(endpoint, query);
        const locations = this.toSafeLocations(payload.elements ?? []);
        this.cache.set(cacheKey, { expiresAt: Date.now() + 60_000, locations });
        return locations;
      } catch (error) {
        lastError = error;
      }
    }

    try {
      const locations = await this.fetchFromNominatim(coordinates);
      this.cache.set(cacheKey, { expiresAt: Date.now() + 60_000, locations });
      return locations;
    } catch (fallbackError) {
      throw fallbackError instanceof Error ? fallbackError : lastError ?? new Error('All location providers failed.');
    }
  }

  private async fetchFromEndpoint(endpoint: string, query: string): Promise<OverpassResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
          accept: 'application/json',
          // Overpass rejects anonymous automated requests; identify this
          // backend so the public service can apply its usage policy.
          'user-agent': 'RakshaNet/1.0 (safe-location lookup)',
        },
        body: new URLSearchParams({ data: query }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`${endpoint} responded with HTTP ${response.status}.`);
      return (await response.json()) as OverpassResponse;
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildQuery({ latitude, longitude }: Coordinates): string {
    const around = `${this.radiusMeters},${latitude},${longitude}`;
    return `[out:json][timeout:10];(
      nwr["amenity"="police"](around:${around});
      nwr["amenity"="hospital"](around:${around});
      nwr["healthcare"="hospital"](around:${around});
      nwr["amenity"="fire_station"](around:${around});
      nwr["social_facility"]["social_facility:for"="women"](around:${around});
    );out center tags;`;
  }

  /**
   * Nominatim is only used if every Overpass endpoint is unavailable. Its
   * public policy requires one request per second, so these fallback queries
   * are deliberately sequential.
   */
  private async fetchFromNominatim(coordinates: Coordinates): Promise<RawLocation[]> {
    const searchTypes: Array<{ query: string; type: LocationType }> = [
      { query: 'police', type: 'Police Station' },
      { query: 'hospital', type: 'Hospital' },
      { query: 'fire station', type: 'Fire Station' },
    ];
    const bounds = this.nominatimViewBox(coordinates);
    const locations: RawLocation[] = [];

    for (const [index, search] of searchTypes.entries()) {
      if (index > 0) await new Promise((resolve) => setTimeout(resolve, 1100));
      const url = new URL('https://nominatim.openstreetmap.org/search');
      url.search = new URLSearchParams({
        format: 'jsonv2',
        q: search.query,
        viewbox: bounds,
        bounded: '1',
        limit: '10',
      }).toString();
      const response = await fetch(url, {
        headers: { accept: 'application/json', 'user-agent': 'RakshaNet/1.0 (safe-location lookup)' },
      });
      if (!response.ok) throw new Error(`Nominatim responded with HTTP ${response.status}.`);
      const results = (await response.json()) as NominatimResult[];
      locations.push(...results
        .filter((result) => Number.isFinite(Number(result.lat)) && Number.isFinite(Number(result.lon)))
        .map((result) => ({
          id: `osm-${result.osm_type}-${result.osm_id}`,
          name: result.name?.trim() || this.defaultName(search.type),
          type: search.type,
          latitude: Number(result.lat),
          longitude: Number(result.lon),
        })));
    }
    return locations;
  }

  private nominatimViewBox({ latitude, longitude }: Coordinates): string {
    const latitudeDelta = this.radiusMeters / 111_320;
    const longitudeDelta = this.radiusMeters / (111_320 * Math.max(Math.cos(this.toRadians(latitude)), 0.01));
    return [
      longitude - longitudeDelta,
      latitude + latitudeDelta,
      longitude + longitudeDelta,
      latitude - latitudeDelta,
    ].join(',');
  }

  private toSafeLocations(elements: OverpassElement[]): RawLocation[] {
    const locations = new Map<string, RawLocation>();

    for (const element of elements) {
      const latitude = element.lat ?? element.center?.lat;
      const longitude = element.lon ?? element.center?.lon;
      const type = this.getLocationType(element.tags);
      if (latitude === undefined || longitude === undefined || !type) continue;

      const key = `${element.type}/${element.id}`;
      locations.set(key, {
        id: `osm-${element.type}-${element.id}`,
        name: element.tags?.name?.trim() || this.defaultName(type),
        type,
        latitude,
        longitude,
      });
    }

    return [...locations.values()];
  }

  private getLocationType(tags?: Record<string, string>): LocationType | null {
    if (!tags) return null;
    if (tags.amenity === 'police') return 'Police Station';
    if (tags.amenity === 'hospital' || tags.healthcare === 'hospital') return 'Hospital';
    if (tags.amenity === 'fire_station') return 'Fire Station';
    if (tags.social_facility && tags['social_facility:for'] === 'women') {
      return 'Women Help Center';
    }
    return null;
  }

  private defaultName(type: LocationType): string {
    return type;
  }

  private readRadius(): number {
    const configured = Number(process.env.SAFE_LOCATION_RADIUS_METERS ?? 5000);
    return Number.isFinite(configured) ? Math.min(Math.max(configured, 500), 20_000) : 5000;
  }

  private toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }
}

/** Retained only as a reversible, offline demo mode. */
class MockLocationProvider implements LocationProvider {
  async fetchLocations(coordinates: Coordinates): Promise<RawLocation[]> {
    const facilities: Array<{ name: string; type: LocationType }> = [
      { name: 'Demo Police Station', type: 'Police Station' },
      { name: 'Demo Hospital', type: 'Hospital' },
      { name: 'Demo Fire Station', type: 'Fire Station' },
    ];

    return facilities.map((facility, index) => ({
      id: `mock-${index + 1}`,
      name: facility.name,
      type: facility.type,
      latitude: coordinates.latitude + (index + 1) * 0.002,
      longitude: coordinates.longitude + (index + 1) * 0.002,
    }));
  }
}

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);
  private readonly provider: LocationProvider;

  constructor() {
    const providerName = process.env.LOCATION_PROVIDER?.toLowerCase() ?? 'osm';
    this.provider = providerName === 'mock'
      ? new MockLocationProvider()
      : new OpenStreetMapLocationProvider();
    this.logger.log(`Location provider: ${providerName === 'mock' ? 'mock' : 'OpenStreetMap'}`);
  }

  async findSafeLocations(latitude: number, longitude: number, limit?: number): Promise<SafeLocation[]> {
    const coordinates = this.assertValidCoordinates(latitude, longitude);
    try {
      const locations = await this.fetchAndEnrich(coordinates);
      return typeof limit === 'number' ? locations.slice(0, limit) : locations;
    } catch (error) {
      this.logger.error('Failed to fetch safe locations', error as Error);
      throw new Error('Unable to retrieve real nearby safe locations at this time.');
    }
  }

  async findNearestPoliceStation(latitude: number, longitude: number): Promise<SafeLocation> {
    return this.findNearestOfType(latitude, longitude, 'Police Station');
  }

  async findNearestHospital(latitude: number, longitude: number): Promise<SafeLocation> {
    return this.findNearestOfType(latitude, longitude, 'Hospital');
  }

  private async findNearestOfType(latitude: number, longitude: number, type: LocationType): Promise<SafeLocation> {
    const locations = await this.findSafeLocations(latitude, longitude);
    const location = locations.find((candidate) => candidate.type === type);
    if (!location) throw new Error(`No ${type.toLowerCase()} found within the configured search radius.`);
    return location;
  }

  private async fetchAndEnrich(coordinates: Coordinates): Promise<SafeLocation[]> {
    const rawLocations = await this.provider.fetchLocations(coordinates);
    return rawLocations
      .map((location) => {
        const distance = this.calculateHaversineDistance(coordinates, location);
        return {
          ...location,
          distance: Math.round(distance * 10) / 10,
          estimatedTime: this.estimateTravelTime(distance),
        };
      })
      .sort((a, b) => a.distance - b.distance);
  }

  private calculateHaversineDistance(from: Coordinates, to: Coordinates): number {
    const earthRadiusKm = 6371;
    const dLat = this.toRadians(to.latitude - from.latitude);
    const dLon = this.toRadians(to.longitude - from.longitude);
    const lat1 = this.toRadians(from.latitude);
    const lat2 = this.toRadians(to.latitude);
    const a = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  private estimateTravelTime(distanceKm: number): string {
    return `${Math.max(1, Math.round((distanceKm / 20) * 60))} min`;
  }

  private assertValidCoordinates(latitude: number, longitude: number): Coordinates {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new BadRequestException('Latitude and longitude must be valid numbers.');
    }
    if (latitude < -90 || latitude > 90) throw new BadRequestException('Latitude must be between -90 and 90.');
    if (longitude < -180 || longitude > 180) throw new BadRequestException('Longitude must be between -180 and 180.');
    return { latitude, longitude };
  }
}
