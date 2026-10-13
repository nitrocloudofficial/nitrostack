/**
 * types/location.types.ts
 *
 * Shared type definitions for RakshaNet's location-related features.
 * Keeping these in a dedicated file means the mock provider, a future
 * Google Maps / OSM provider, and any consumer (e.g. RakshaNetService)
 * all share a single source of truth for shapes.
 */

/** A raw lat/lng pair. Kept separate from SafeLocation so it can be reused
 *  anywhere a plain coordinate is needed (e.g. as a method parameter). */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * The categories of "safe place" RakshaNet knows about today.
 * Using a union of string literals (rather than a bare `string`) means
 * TypeScript will catch typos at compile time and autocomplete works
 * everywhere this type is used.
 */
export type LocationType =
  | 'Police Station'
  | 'Hospital'
  | 'Fire Station'
  | 'Safe Zone'
  | 'Women Help Center';

/**
 * A single nearby location returned to the caller.
 * This is the canonical shape RakshaNetService (and eventually the
 * frontend / MCP tool layer) can rely on regardless of which provider
 * (mock, Google Maps, OSM) produced it.
 */
export interface SafeLocation extends Coordinates {
  /** Stable identifier for the location (provider-specific format is fine). */
  id: string;
  /** Human-readable name, e.g. "Anna Nagar Police Station". */
  name: string;
  /** Category of the location. */
  type: LocationType;
  /** Straight-line distance from the query point, in kilometers, rounded to 1 decimal. */
  distance: number;
  /** Rough human-readable travel time estimate, e.g. "4 min". */
  estimatedTime: string;
}