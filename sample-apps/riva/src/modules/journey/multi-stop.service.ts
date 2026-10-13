import { Injectable } from '@nitrostack/core';
import type { Logger } from '@nitrostack/core';
import { MapsService } from '../../services/maps.service.js';
import { RideSearchService } from '../../services/ride-search.service.js';
import { RankingService } from '../../services/ranking.service.js';
import type { MultiStopLeg, MultiStopPlan } from '../../domain/types.js';

@Injectable({ deps: [MapsService, RideSearchService, RankingService] })
export class MultiStopService {
  constructor(
    private readonly maps: MapsService,
    private readonly rideSearch: RideSearchService,
    private readonly ranking: RankingService
  ) {}

  async planTrip(stopQueries: string[], logger?: Logger): Promise<MultiStopPlan> {
    const stops = await Promise.all(stopQueries.map((q) => this.maps.resolveLocation(q, logger)));

    // Each leg's route/fare search is independent of the others, so run
    // them all in parallel rather than one-at-a-time — for a 3-stop trip
    // (2 legs) this roughly halves wall-clock time, and it grows worse
    // the more stops there are if done sequentially. Locations are already
    // resolved above, so searchResolved() skips re-geocoding entirely
    // (the previous version re-geocoded every stop a second time via its
    // formatted-address string, which was both wasteful and slow enough to
    // risk the caller's connection timing out on longer itineraries).
    const legResults = await Promise.all(
      stops.slice(0, -1).map(async (from, i) => {
        const to = stops[i + 1];
        const { context, filteredOptions } = await this.rideSearch.searchResolved(from, to, undefined, logger);
        const ranked = this.ranking.rank(filteredOptions, 'best_value');
        const legFare = ranked[0]?.fare ?? 0;

        const leg: MultiStopLeg = {
          from: from.formattedAddress,
          to: to.formattedAddress,
          distanceKm: context.route.distanceKm,
          durationMinutes: Math.round(context.route.durationMinutes),
          fare: legFare,
        };
        return { leg, distanceKm: context.route.distanceKm, durationMinutes: context.route.durationMinutes };
      })
    );

    const legs = legResults.map((r) => r.leg);
    const totalDistanceKm = legResults.reduce((sum, r) => sum + r.distanceKm, 0);
    const totalDurationMinutes = legResults.reduce((sum, r) => sum + r.durationMinutes, 0);
    const estimatedFare = legs.reduce((sum, leg) => sum + leg.fare, 0);

    const routeDisplay = stops.map((s) => s.formattedAddress).join(' → ');

    return {
      stops,
      legs,
      totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
      totalDurationMinutes: Math.round(totalDurationMinutes),
      estimatedFare: Math.round(estimatedFare),
      routeDisplay,
    };
  }
}
