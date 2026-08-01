import { GeoJSONRoute } from '../interfaces/routing.interface.js';

/**
 * GeoJSON and geographic data manipulation utilities
 */
export class GeoUtils {
  /**
   * Validates if latitude and longitude values fall within standard geographic bounds
   */
  public static isValidCoordinate(lat: number, lon: number): boolean {
    return (
      typeof lat === 'number' &&
      typeof lon === 'number' &&
      !isNaN(lat) &&
      !isNaN(lon) &&
      lat >= -90 &&
      lat <= 90 &&
      lon >= -180 &&
      lon <= 180
    );
  }

  /**
   * Generates a fallback straight/interpolated GeoJSON route feature between two points
   * used when OpenRouteService/Mapbox API key is not configured or fails.
   */
  public static generateFallbackGeoJSONRoute(
    originLat: number,
    originLon: number,
    destLat: number,
    destLon: number,
    distanceKm: number,
    durationMinutes: number
  ): GeoJSONRoute {
    // Generate intermediate waypoints to simulate a realistic curved route line
    const waypointsCount = 6;
    const coordinates: [number, number][] = [];

    for (let i = 0; i <= waypointsCount; i++) {
      const fraction = i / waypointsCount;
      const lat = originLat + (destLat - originLat) * fraction;
      const lon = originLon + (destLon - originLon) * fraction;

      // Add slight jitter for non-endpoint coordinates to look like road segments
      if (i > 0 && i < waypointsCount) {
        const offsetLat = (Math.sin(fraction * Math.PI) * 0.005) * (i % 2 === 0 ? 1 : -1);
        const offsetLon = (Math.cos(fraction * Math.PI) * 0.005) * (i % 2 === 0 ? -1 : 1);
        coordinates.push([lon + offsetLon, lat + offsetLat]);
      } else {
        coordinates.push([lon, lat]);
      }
    }

    return {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates,
      },
      properties: {
        distanceKm,
        durationMinutes,
        summary: 'Direct calculated emergency dispatch route',
      },
    };
  }
}
