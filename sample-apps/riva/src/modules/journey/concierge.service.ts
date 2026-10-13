import { Injectable } from '@nitrostack/core';
import type { Logger } from '@nitrostack/core';
import { RideSearchService } from '../../services/ride-search.service.js';
import { RankingService } from '../../services/ranking.service.js';
import { ForecastService } from '../../services/forecast.service.js';
import { formatDateTimeLabel, parseDateTimeLabel } from '../../services/time.util.js';
import type { TravelPlan } from '../../domain/types.js';

/** Destinations matching these keywords get a larger safety buffer (check-in, security, etc.). */
const HIGH_BUFFER_KEYWORDS: Array<{ pattern: RegExp; minutes: number; reason: string }> = [
  { pattern: /airport/i, minutes: 60, reason: 'Airports need extra time for check-in and security screening.' },
  { pattern: /railway|train station|junction/i, minutes: 20, reason: 'Trains depart on a fixed schedule, so a bit of extra buffer avoids missing it.' },
];

const DEFAULT_BUFFER_MINUTES = 15;
const DEFAULT_BUFFER_REASON = 'A general safety buffer for boarding, parking, or walking to the gate/entrance.';

@Injectable({ deps: [RideSearchService, RankingService, ForecastService] })
export class ConciergeService {
  constructor(
    private readonly rideSearch: RideSearchService,
    private readonly ranking: RankingService,
    private readonly forecast: ForecastService
  ) {}

  async planTravel(
    originQuery: string,
    destinationQuery: string,
    arriveByRaw: string,
    bufferOverride: number | undefined,
    logger?: Logger
  ): Promise<TravelPlan> {
    const arriveBy = parseDateTimeLabel(arriveByRaw);

    const { context, filteredOptions } = await this.rideSearch.search(originQuery, destinationQuery, undefined, logger);

    const { minutes: autoBuffer, reason: bufferReason } = this.resolveBuffer(destinationQuery, context.destination.formattedAddress);
    const bufferMinutes = bufferOverride ?? autoBuffer;

    // Traffic multiplier evaluated at the arrival hour, as a reasonable proxy
    // for the driving window (buffer + drive time are usually within an
    // hour or two of the arrival time for typical city trips).
    const trafficMultiplier = this.forecast.getTrafficMultiplier(arriveBy.hour);
    const trafficAdjustedTravelMinutes = Math.round(context.route.durationMinutes * trafficMultiplier);

    const pickupDate = new Date(arriveBy.date.getTime() - (trafficAdjustedTravelMinutes + bufferMinutes) * 60 * 1000);
    const recommendedPickupLabel = formatDateTimeLabel(pickupDate, new Date());

    const ranked = this.ranking.rank(filteredOptions, 'best_value');
    const [recommendation, ...alternatives] = ranked;

    const recommendationReason = recommendation
      ? `${recommendation.providerName} ${recommendation.vehicleType} gives the best balance of reliability and travel time for this trip — ${recommendation.scoreReason}.`
      : 'No ride options were available for this route.';

    return {
      origin: context.origin,
      destination: context.destination,
      arriveByLabel: arriveBy.label,
      arriveByHour: arriveBy.hour,
      recommendedPickupLabel,
      bufferMinutes,
      bufferReason,
      trafficAdjustedTravelMinutes,
      trafficMultiplier,
      route: context.route,
      recommendation: recommendation ?? null,
      recommendationReason,
      alternatives: alternatives.slice(0, 3),
    };
  }

  private resolveBuffer(query: string, formattedAddress: string): { minutes: number; reason: string } {
    const haystack = `${query} ${formattedAddress}`;
    for (const { pattern, minutes, reason } of HIGH_BUFFER_KEYWORDS) {
      if (pattern.test(haystack)) {
        return { minutes, reason };
      }
    }
    return { minutes: DEFAULT_BUFFER_MINUTES, reason: DEFAULT_BUFFER_REASON };
  }
}
