import { Injectable, ConfigService } from '@nitrostack/core';
import type { Logger } from '@nitrostack/core';
import { RouteCalculationInput, RouteCalculationResult, GeoJSONRoute } from '../interfaces/index.js';
import { InvalidCoordinatesError } from '../shared/app-error.js';
import { GeoUtils } from '../utils/geo.utils.js';
import { DistanceCalculator } from '../utils/distance.calculator.js';
import { DEFAULT_AMBULANCE_SPEED_KMH } from '../shared/constants.js';

const ORS_DIRECTIONS_URL = 'https://api.openrouteservice.org/v2/directions/driving-car/geojson';

interface OrsFeatureCollection {
  features: Array<{
    geometry: { type: 'LineString'; coordinates: [number, number][] };
    properties: { summary: { distance: number; duration: number } };
  }>;
}

/**
 * Calculates ambulance ETA/distance/route geometry via OpenRouteService.
 * A missing API key or a failed request never blocks emergency dispatch: both
 * degrade to a haversine-distance estimate flagged as such in the response.
 */
/**
 * `deps` is required (not just the constructor's TS type) because `tsx`
 * (esbuild) — used by `nitrostack-cli dev` — does not emit TypeScript's
 * `emitDecoratorMetadata` output. Without it the DI container has no
 * `design:paramtypes` to resolve from and silently injects `undefined` in
 * dev mode, even though the equivalent `tsc`-compiled production build
 * resolves it correctly via reflection alone.
 */
@Injectable({ deps: [ConfigService] })
export class RoutingService {
  constructor(private readonly config: ConfigService) {}

  async calculateRoute(input: RouteCalculationInput, logger?: Logger): Promise<RouteCalculationResult> {
    const { origin_latitude, origin_longitude, destination_latitude, destination_longitude } = input;

    if (
      !GeoUtils.isValidCoordinate(origin_latitude, origin_longitude) ||
      !GeoUtils.isValidCoordinate(destination_latitude, destination_longitude)
    ) {
      throw new InvalidCoordinatesError();
    }

    const apiKey = this.config.get<string>('ORS_API_KEY');

    if (apiKey) {
      try {
        return await this.calculateViaOpenRouteService(apiKey, input);
      } catch (error) {
        logger?.warn('OpenRouteService request failed, falling back to estimated route', {
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    } else {
      logger?.warn('ORS_API_KEY not configured, using estimated route');
    }

    return this.calculateFallbackRoute(input);
  }

  private async calculateViaOpenRouteService(
    apiKey: string,
    input: RouteCalculationInput
  ): Promise<RouteCalculationResult> {
    const response = await fetch(ORS_DIRECTIONS_URL, {
      method: 'POST',
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        coordinates: [
          [input.origin_longitude, input.origin_latitude],
          [input.destination_longitude, input.destination_latitude],
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouteService responded with status ${response.status}`);
    }

    const geojson = (await response.json()) as OrsFeatureCollection;
    const feature = geojson.features?.[0];

    if (!feature) {
      throw new Error('OpenRouteService returned no route features');
    }

    const distanceKm = Math.round((feature.properties.summary.distance / 1000) * 100) / 100;
    const etaMinutes = Math.max(1, Math.round(feature.properties.summary.duration / 60));

    const route: GeoJSONRoute = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: feature.geometry.coordinates,
      },
      properties: {
        distanceKm,
        durationMinutes: etaMinutes,
        summary: 'Live route via OpenRouteService',
      },
    };

    return { distance_km: distanceKm, eta_minutes: etaMinutes, route };
  }

  private calculateFallbackRoute(input: RouteCalculationInput): RouteCalculationResult {
    const distanceKm = DistanceCalculator.calculateHaversineDistanceKm(
      input.origin_latitude,
      input.origin_longitude,
      input.destination_latitude,
      input.destination_longitude
    );
    const etaMinutes = DistanceCalculator.estimateEtaMinutes(distanceKm, DEFAULT_AMBULANCE_SPEED_KMH);
    const route = GeoUtils.generateFallbackGeoJSONRoute(
      input.origin_latitude,
      input.origin_longitude,
      input.destination_latitude,
      input.destination_longitude,
      distanceKm,
      etaMinutes
    );

    return { distance_km: distanceKm, eta_minutes: etaMinutes, route };
  }
}
