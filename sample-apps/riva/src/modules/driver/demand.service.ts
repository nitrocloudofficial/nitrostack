import { Injectable } from '@nitrostack/core';
import type { DemandLevel, DemandZoneProfile, DestinationDemand, ResolvedLocation } from '../../domain/types.js';
import { createSeededRandom, hashString, haversineDistanceKm, randomBetween } from '../../services/sim.util.js';

/**
 * Known demand zones around Coimbatore (coordinates reused/kept consistent
 * with MapsService's landmark gazetteer where they overlap). This list is
 * intentionally small and representative, matching the zone types named in
 * the plan: airport, railway, commercial hubs, IT parks, college areas.
 */
const ZONES: DemandZoneProfile[] = [
  { zoneKey: 'coimbatore_airport', displayName: 'Coimbatore Airport', coordinates: { lat: 11.03, lng: 77.0434 }, category: 'airport' },
  { zoneKey: 'coimbatore_railway_station', displayName: 'Coimbatore Railway Station', coordinates: { lat: 10.9966, lng: 76.9647 }, category: 'railway' },
  { zoneKey: 'gandhipuram', displayName: 'Gandhipuram', coordinates: { lat: 11.0177, lng: 76.9674 }, category: 'commercial' },
  { zoneKey: 'rs_puram', displayName: 'RS Puram', coordinates: { lat: 11.0057, lng: 76.9498 }, category: 'commercial' },
  { zoneKey: 'peelamedu_it_corridor', displayName: 'Peelamedu IT Corridor', coordinates: { lat: 11.0296, lng: 77.0193 }, category: 'it_park' },
  { zoneKey: 'college_area_ettimadai', displayName: 'Ettimadai College Area', coordinates: { lat: 10.9046, lng: 76.8993 }, category: 'college' },
];

/** Base demand-by-hour curve (0-100), one entry per category, indexed by hour of day (0-23). */
const CATEGORY_HOURLY_CURVE: Record<DemandZoneProfile['category'], number[]> = {
  // Airports: early-morning and late-night flight banks, steady midday, evening bump.
  airport: [55, 50, 45, 50, 70, 80, 65, 55, 50, 45, 45, 50, 55, 50, 45, 45, 50, 60, 70, 75, 70, 65, 60, 58],
  // Railway stations: morning and evening train arrival peaks.
  railway: [40, 30, 25, 30, 55, 75, 70, 55, 45, 40, 40, 45, 50, 45, 45, 50, 55, 70, 75, 65, 55, 50, 45, 42],
  // Commercial hubs: builds through the day, peaks at lunch and evening shopping hours.
  commercial: [15, 10, 8, 8, 10, 20, 35, 50, 55, 60, 65, 70, 72, 65, 60, 62, 68, 75, 80, 78, 65, 45, 30, 20],
  // IT parks: sharp weekday commute peaks, quiet overnight.
  it_park: [10, 8, 5, 5, 8, 15, 35, 65, 85, 55, 40, 45, 60, 45, 40, 45, 55, 80, 88, 60, 35, 20, 15, 12],
  // Residential: gentle morning and evening bumps as people head to/from home.
  residential: [20, 15, 10, 10, 20, 35, 55, 60, 45, 35, 30, 35, 40, 35, 35, 40, 50, 60, 65, 55, 45, 35, 28, 22],
  // College areas: quiet mornings, busy around class-end/afternoon and evening.
  college: [8, 5, 5, 5, 10, 20, 30, 40, 45, 40, 42, 55, 65, 60, 55, 58, 62, 58, 45, 35, 25, 18, 12, 10],
};

/** Weekend multiplier per category — some zones get busier, some quieter. */
const WEEKEND_MULTIPLIER: Record<DemandZoneProfile['category'], number> = {
  airport: 1.05,
  railway: 1.0,
  commercial: 1.25,
  it_park: 0.35,
  residential: 1.1,
  college: 0.2,
};

@Injectable()
export class DemandService {
  listZones(): DemandZoneProfile[] {
    return ZONES;
  }

  /** Fuzzy-matches free text against the known zone list, same pattern as MapsService's gazetteer lookup. */
  matchZone(query: string): DemandZoneProfile | null {
    const normalized = query.trim().toLowerCase();
    return (
      ZONES.find(
        (zone) =>
          normalized.includes(zone.displayName.toLowerCase()) ||
          zone.displayName.toLowerCase().includes(normalized) ||
          normalized.includes(zone.zoneKey.replace(/_/g, ' '))
      ) ?? null
    );
  }

  /** Core deterministic demand score (0-100) for a category at a given hour/weekday, with small seeded jitter. */
  private computeDemandScore(category: DemandZoneProfile['category'], hour: number, isWeekend: boolean, seedKey: string): number {
    const base = CATEGORY_HOURLY_CURVE[category][hour] * (isWeekend ? WEEKEND_MULTIPLIER[category] : 1);

    // Small deterministic jitter (±6) so results aren't perfectly flat/robotic,
    // but stay stable for the same zone+hour+day (good for demo reproducibility).
    const rng = createSeededRandom(hashString(`${seedKey}|${hour}|${isWeekend}`));
    const jitter = randomBetween(rng, -6, 6);

    return Math.max(0, Math.min(100, Math.round(base + jitter)));
  }

  private classify(score: number): DemandLevel {
    if (score >= 62) return 'HIGH';
    if (score >= 38) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Estimate demand for a resolved destination. If the destination matches
   * a known zone, its category-specific curve is used; otherwise a
   * generic "residential" curve is applied as a reasonable default for an
   * arbitrary address.
   */
  getDemandForLocation(location: ResolvedLocation, hour: number, isWeekend: boolean, timeLabel: string): DestinationDemand {
    const matchedZone = this.matchZone(location.query) ?? this.matchZone(location.formattedAddress);
    const category = matchedZone?.category ?? 'residential';
    const seedKey = matchedZone?.zoneKey ?? location.formattedAddress;

    const score = this.computeDemandScore(category, hour, isWeekend, seedKey);
    const demandLevel = this.classify(score);

    const expectedRideAvailability: DestinationDemand['expectedRideAvailability'] =
      demandLevel === 'HIGH' ? 'PLENTY' : demandLevel === 'MEDIUM' ? 'MODERATE' : 'SCARCE';

    // Higher demand -> shorter expected wait for the next ride request.
    const expectedWaitingMinutes = Math.round(Math.max(2, 25 - score / 5));

    // Return-trip probability: airports/railway/commercial hubs have decent
    // return flow; college/residential areas are more one-directional
    // outside their peak windows.
    const returnBaseByCategory: Record<DemandZoneProfile['category'], number> = {
      airport: 0.55,
      railway: 0.5,
      commercial: 0.45,
      it_park: 0.35,
      residential: 0.3,
      college: 0.25,
    };
    const returnProbability = Math.round(Math.min(0.9, returnBaseByCategory[category] + score / 400) * 100) / 100;

    const zoneLabel = matchedZone?.displayName ?? location.formattedAddress;
    const categoryLabel = category.replace('_', ' ');
    const article = /^[aeiou]/i.test(categoryLabel) ? 'an' : 'a';
    const explanation = matchedZone
      ? `${zoneLabel} is ${article} ${categoryLabel} zone — demand is currently ${demandLevel.toLowerCase()} for ${timeLabel} (${isWeekend ? 'weekend' : 'weekday'} pattern).`
      : `${zoneLabel} isn't one of the well-known demand zones, so this uses a generic residential-area demand pattern for ${timeLabel}.`;

    return {
      destination: location,
      matchedZone: matchedZone?.displayName ?? null,
      time: timeLabel,
      demandLevel,
      expectedRideAvailability,
      expectedWaitingMinutes,
      returnProbability,
      explanation,
    };
  }

  /** Demand score + straight-line distance for every known zone, used by RecommendationService for zone ranking. */
  scoreAllZones(
    currentCoordinates: { lat: number; lng: number },
    hour: number,
    isWeekend: boolean
  ): Array<{ zone: DemandZoneProfile; score: number; demandLevel: DemandLevel; distanceKm: number }> {
    return ZONES.map((zone) => {
      const score = this.computeDemandScore(zone.category, hour, isWeekend, zone.zoneKey);
      const straightLineKm = haversineDistanceKm(currentCoordinates, zone.coordinates);
      const distanceKm = Math.round(straightLineKm * 1.3 * 10) / 10; // road-distance approximation
      return { zone, score, demandLevel: this.classify(score), distanceKm };
    });
  }
}
