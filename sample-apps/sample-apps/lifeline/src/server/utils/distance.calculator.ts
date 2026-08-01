/**
 * Utility class for calculating geographic distances using the Haversine formula
 */
export class DistanceCalculator {
  private static readonly EARTH_RADIUS_KM = 6371;

  /**
   * Calculates the great-circle distance between two points on the Earth's surface in kilometers.
   *
   * @param lat1 Latitude of point 1 in degrees
   * @param lon1 Longitude of point 1 in degrees
   * @param lat2 Latitude of point 2 in degrees
   * @param lon2 Longitude of point 2 in degrees
   * @returns Distance in kilometers, rounded to 2 decimal places
   */
  public static calculateHaversineDistanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const radLat1 = this.toRadians(lat1);
    const radLat2 = this.toRadians(lat2);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(radLat1) * Math.cos(radLat2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = this.EARTH_RADIUS_KM * c;
    return Math.round(distance * 100) / 100;
  }

  /**
   * Estimates ambulance drive time in minutes based on distance in km and average urban emergency speed.
   *
   * @param distanceKm Distance in kilometers
   * @param avgSpeedKmh Average speed in km/h (default 50 km/h for emergency vehicle with sirens)
   * @returns Estimated travel time in minutes, rounded to nearest integer
   */
  public static estimateEtaMinutes(distanceKm: number, avgSpeedKmh = 50): number {
    if (distanceKm <= 0) return 1;
    const hours = distanceKm / avgSpeedKmh;
    const minutes = hours * 60;
    return Math.max(1, Math.round(minutes));
  }

  private static toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }
}
