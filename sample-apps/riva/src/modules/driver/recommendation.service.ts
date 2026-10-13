import { Injectable } from '@nitrostack/core';
import { DemandService } from './demand.service.js';
import type {
  DestinationDemand,
  DriverTripInput,
  DriverZoneRecommendation,
  TripProfitabilityBreakdown,
  TripRecommendation,
  VehicleType,
} from '../../domain/types.js';

/**
 * RecommendationService
 *
 * Decision logic layered on top of ProfitabilityService's math and
 * DemandService's demand model. Thresholds below are illustrative,
 * documented reference points for an advisory tool — not a claim about
 * real driver economics.
 */
@Injectable({ deps: [DemandService] })
export class RecommendationService {
  constructor(private readonly demand: DemandService) {}

  recommendTripAcceptance(
    input: DriverTripInput,
    breakdown: TripProfitabilityBreakdown,
    destinationDemand: DestinationDemand
  ): { recommendation: TripRecommendation; reason: string } {
    if (breakdown.netEarning <= 0) {
      return {
        recommendation: 'REJECT',
        reason: `This trip would net ₹${breakdown.netEarning} after fuel (₹${breakdown.fuelCost}) and platform commission (₹${breakdown.platformCommission}) — it's a loss at the offered fare.`,
      };
    }

    let score = 0;
    score += Math.min(60, breakdown.estimatedHourlyEarning / 5);
    score += destinationDemand.demandLevel === 'HIGH' ? 20 : destinationDemand.demandLevel === 'MEDIUM' ? 10 : 0;

    const pickupRatio = input.tripDistance > 0 ? input.pickupDistance / input.tripDistance : 1;
    const pickupPenalty = pickupRatio > 0.6 || input.pickupDistance > 5 ? 15 : input.pickupDistance > 3 ? 8 : 0;
    score -= pickupPenalty;

    const demandPhrase = destinationDemand.demandLevel === 'HIGH'
      ? 'strong return-ride demand at the destination'
      : destinationDemand.demandLevel === 'MEDIUM'
        ? 'moderate, somewhat uncertain return demand at the destination'
        : 'weak return-ride demand at the destination';

    const pickupPhrase = pickupPenalty > 0
      ? `a relatively long pickup distance (${input.pickupDistance} km for a ${input.tripDistance} km trip)`
      : `a reasonable pickup distance (${input.pickupDistance} km)`;

    if (score >= 55) {
      return {
        recommendation: 'ACCEPT',
        reason: `Net earning of ₹${breakdown.netEarning} (~₹${breakdown.estimatedHourlyEarning}/hr) is solid, with ${demandPhrase} and ${pickupPhrase}.`,
      };
    }

    if (score >= 30) {
      return {
        recommendation: 'CONSIDER',
        reason: `The fare is acceptable (₹${breakdown.netEarning} net, ~₹${breakdown.estimatedHourlyEarning}/hr), but ${pickupPhrase} and ${demandPhrase} make this a borderline call.`,
      };
    }

    return {
      recommendation: 'REJECT',
      reason: `Net earning of ₹${breakdown.netEarning} (~₹${breakdown.estimatedHourlyEarning}/hr) is low for ${pickupPhrase}, and ${demandPhrase} — likely not worth it unless nothing better is available nearby.`,
    };
  }

  recommendNextZones(
    currentCoordinates: { lat: number; lng: number },
    hour: number,
    isWeekend: boolean,
    vehicleType: VehicleType | undefined,
    limit = 3
  ): DriverZoneRecommendation[] {
    const scored = this.demand.scoreAllZones(currentCoordinates, hour, isWeekend);

    const ranked = scored
      .map((entry) => {
        // Balance demand against travel cost to reach the zone — a slightly
        // less busy zone nearby often beats a hotter zone that's far away.
        const distancePenalty = entry.distanceKm * 1.5;
        const rankScore = entry.score - distancePenalty;
        return { ...entry, rankScore };
      })
      .sort((a, b) => b.rankScore - a.rankScore)
      .slice(0, limit);

    return ranked.map((entry) => {
      const vehicleNote = vehicleType === 'suv' && entry.zone.category === 'college'
        ? ' Note: SUVs see fewer requests in college areas — demand there skews toward bikes/autos.'
        : '';

      return {
        zoneName: entry.zone.displayName,
        coordinates: entry.zone.coordinates,
        distanceFromCurrentKm: entry.distanceKm,
        demandLevel: entry.demandLevel,
        demandScore: entry.score,
        reasoning: `Move towards ${entry.zone.displayName} (${entry.distanceKm} km away). Demand there is currently ${entry.demandLevel.toLowerCase()} for this time of day.${vehicleNote}`,
      };
    });
  }
}
