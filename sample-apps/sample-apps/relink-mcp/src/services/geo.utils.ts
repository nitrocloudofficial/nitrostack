// ============================================================================
// CircuLink — Shared Geospatial Utilities
// Extracted from duplicated implementations across sourcing, matching, logistics
// ============================================================================

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface IndustrialZoneCenter extends GeoPoint {
  name: string;
}

/**
 * Haversine formula — great-circle distance between two lat/lng points in km.
 * Used across sourcing, matching, and logistics agents.
 */
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Filter items by geographic radius from a center point.
 * Returns items within maxRadiusKm, with computed distance attached.
 */
export function filterByRadius<T extends { lat: number; lng: number }>(
  items: T[],
  center: GeoPoint,
  maxRadiusKm: number,
): Array<T & { distance_km: number }> {
  return items
    .map((item) => ({
      ...item,
      distance_km: Math.round(haversineDistance(center.lat, center.lng, item.lat, item.lng) * 10) / 10,
    }))
    .filter((item) => item.distance_km <= maxRadiusKm)
    .sort((a, b) => a.distance_km - b.distance_km);
}

/**
 * Progressive radius steps for intelligent sourcing.
 * Agent expands search radius until sufficient quantity is found.
 */
export const PROGRESSIVE_RADIUS_STEPS_KM = [10, 25, 50, 75, 100] as const;

/**
 * Predefined Indian industrial zones — known manufacturing clusters.
 * These serve as seed centers for zone clustering. Dynamic zones discovered
 * from actual factory locations are merged with these.
 */
export function getPredefinedIndustrialZones(): IndustrialZoneCenter[] {
  return [
    // Pune automotive/industrial belt
    { name: 'Chakan MIDC', lat: 18.75, lng: 73.85 },
    { name: 'Pimpri-Chinchwad', lat: 18.62, lng: 73.80 },
    { name: 'Talegaon Industrial Area', lat: 18.72, lng: 73.68 },
    { name: 'Bhosari MIDC', lat: 18.64, lng: 73.84 },
    { name: 'Ranjangaon MIDC', lat: 18.76, lng: 74.24 },
    { name: 'Hinjawadi IT Park Area', lat: 18.59, lng: 73.68 },
    // Gujarat industrial belt
    { name: 'Sanand GIDC', lat: 22.99, lng: 72.48 },
    { name: 'Narol-Naroda GIDC', lat: 23.02, lng: 72.62 },
    // South India
    { name: 'Sriperumbudur Industrial Park', lat: 12.97, lng: 79.95 },
    { name: 'Peenya Industrial Area', lat: 13.03, lng: 77.52 },
    // Additional major clusters
    { name: 'Manesar Industrial Area', lat: 28.36, lng: 76.94 },
    { name: 'Noida-Greater Noida Industrial', lat: 28.57, lng: 77.35 },
    { name: 'Jamshedpur Industrial Zone', lat: 22.80, lng: 86.20 },
    { name: 'Hosur Industrial Area', lat: 12.73, lng: 77.83 },
    { name: 'Pithampur Industrial Area', lat: 22.61, lng: 75.69 },
  ];
}

/**
 * Discover industrial clusters dynamically from actual factory locations.
 * Uses a simplified DBSCAN-like approach: group factories within clusterRadiusKm
 * of each other, then name clusters by proximity to known industrial zones.
 */
export function discoverZonesFromFactories(
  factories: Array<{ lat: number; lng: number; factory_id: string }>,
  clusterRadiusKm: number = 15,
): Array<{ name: string; center: GeoPoint; factory_ids: string[] }> {
  const predefined = getPredefinedIndustrialZones();
  const assigned = new Set<string>();
  const zones: Array<{ name: string; center: GeoPoint; factory_ids: string[] }> = [];

  // Phase 1: Assign factories to nearest predefined zone within clusterRadiusKm
  for (const zone of predefined) {
    const members: string[] = [];
    let sumLat = 0;
    let sumLng = 0;

    for (const factory of factories) {
      if (assigned.has(factory.factory_id)) continue;
      const dist = haversineDistance(zone.lat, zone.lng, factory.lat, factory.lng);
      if (dist <= clusterRadiusKm) {
        members.push(factory.factory_id);
        assigned.add(factory.factory_id);
        sumLat += factory.lat;
        sumLng += factory.lng;
      }
    }

    if (members.length > 0) {
      zones.push({
        name: zone.name,
        center: {
          lat: sumLat / members.length,
          lng: sumLng / members.length,
        },
        factory_ids: members,
      });
    }
  }

  // Phase 2: Unassigned factories form ad-hoc clusters
  const unassigned = factories.filter((f) => !assigned.has(f.factory_id));
  let clusterIndex = 1;

  for (const factory of unassigned) {
    if (assigned.has(factory.factory_id)) continue;

    const clusterMembers = [factory.factory_id];
    assigned.add(factory.factory_id);
    let sumLat = factory.lat;
    let sumLng = factory.lng;

    for (const other of unassigned) {
      if (assigned.has(other.factory_id)) continue;
      const dist = haversineDistance(factory.lat, factory.lng, other.lat, other.lng);
      if (dist <= clusterRadiusKm) {
        clusterMembers.push(other.factory_id);
        assigned.add(other.factory_id);
        sumLat += other.lat;
        sumLng += other.lng;
      }
    }

    zones.push({
      name: `Industrial Cluster ${clusterIndex}`,
      center: {
        lat: sumLat / clusterMembers.length,
        lng: sumLng / clusterMembers.length,
      },
      factory_ids: clusterMembers,
    });
    clusterIndex++;
  }

  return zones;
}
