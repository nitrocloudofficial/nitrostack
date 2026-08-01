export interface RouteCalculationInput {
  origin_latitude: number;
  origin_longitude: number;
  destination_latitude: number;
  destination_longitude: number;
}

export interface GeoJSONGeometry {
  type: 'LineString';
  coordinates: [number, number][]; // [longitude, latitude]
}

export interface GeoJSONProperties {
  distanceKm: number;
  durationMinutes: number;
  summary?: string;
}

export interface GeoJSONRoute {
  type: 'Feature';
  geometry: GeoJSONGeometry;
  properties: GeoJSONProperties;
}

export interface RouteCalculationResult {
  distance_km: number;
  eta_minutes: number;
  route: GeoJSONRoute;
}
