import { Injectable } from '@nitrostack/core';
import type { Logger } from '@nitrostack/core';
import { RideSearchService } from '../../services/ride-search.service.js';
import { RankingService } from '../../services/ranking.service.js';
import { createSeededRandom, hashString, randomBetween } from '../../services/sim.util.js';
import type { PoolingAnalysis, PoolingMatch } from '../../domain/types.js';

/** Plausible nearby-route destination labels used only as simulation flavor text. */
const NEARBY_AREA_LABELS = [
  'a rider heading towards Gandhipuram',
  'a rider heading towards RS Puram',
  'a rider heading towards Peelamedu',
  'a rider heading towards the Race Course area',
  'a rider heading towards Saibaba Colony',
];

const DEFAULT_MAX_EXTRA_MINUTES = 15;

@Injectable({ deps: [RideSearchService, RankingService] })
export class PoolingService {
  constructor(
    private readonly rideSearch: RideSearchService,
    private readonly ranking: RankingService
  ) {}

  async analyzePooling(
    originQuery: string,
    destinationQuery: string,
    maxExtraMinutesInput: number | undefined,
    logger?: Logger
  ): Promise<PoolingAnalysis> {
    const maxExtraMinutes = maxExtraMinutesInput ?? DEFAULT_MAX_EXTRA_MINUTES;

    const { context, filteredOptions } = await this.rideSearch.search(originQuery, destinationQuery, undefined, logger);
    const ranked = this.ranking.rank(filteredOptions, 'best_value');
    const soloFare = ranked[0]?.fare ?? 0;

    const seedKey = `pool|${context.origin.formattedAddress}|${context.destination.formattedAddress}`;
    const rng = createSeededRandom(hashString(seedKey));

    const matchCount = Math.floor(randomBetween(rng, 1, 3.99));
    const matches: PoolingMatch[] = Array.from({ length: matchCount }, (_, i) => {
      const matchRng = createSeededRandom(hashString(`${seedKey}|${i}`));
      const routeOverlapPercent = Math.round(randomBetween(matchRng, 40, 92));
      const savingsInr = Math.round((soloFare * randomBetween(matchRng, 0.15, 0.35)) / 5) * 5;
      const extraMinutes = Math.round(randomBetween(matchRng, 3, 14));

      return {
        matchedRiderDestination: NEARBY_AREA_LABELS[Math.floor(randomBetween(matchRng, 0, NEARBY_AREA_LABELS.length - 0.01))],
        routeOverlapPercent,
        savingsInr,
        extraMinutes,
      };
    }).sort((a, b) => b.routeOverlapPercent - a.routeOverlapPercent);

    const [bestMatch, ...otherMatches] = matches;

    const shouldPool =
      !!bestMatch && bestMatch.routeOverlapPercent >= 60 && bestMatch.extraMinutes <= maxExtraMinutes && bestMatch.savingsInr >= 30;

    const reason = !bestMatch
      ? 'No compatible riders found on this route right now.'
      : shouldPool
        ? `${bestMatch.routeOverlapPercent}% route overlap with ${bestMatch.matchedRiderDestination} saves ₹${bestMatch.savingsInr} for only ${bestMatch.extraMinutes} extra minutes — a good trade.`
        : bestMatch.extraMinutes > maxExtraMinutes
          ? `The best match adds ${bestMatch.extraMinutes} minutes, more than your ${maxExtraMinutes}-minute limit.`
          : `The best match's route overlap (${bestMatch.routeOverlapPercent}%) or savings (₹${bestMatch.savingsInr}) aren't compelling enough to justify pooling.`;

    return {
      origin: context.origin,
      destination: context.destination,
      soloFare,
      bestMatch: bestMatch ?? null,
      otherMatches,
      recommendation: shouldPool ? 'POOL' : 'DO_NOT_POOL',
      reason,
    };
  }
}
