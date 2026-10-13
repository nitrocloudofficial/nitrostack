import { Injectable } from '@nitrostack/core';
import type { RankedRideOption, RankingMode, RideOption } from '../domain/types.js';

/**
 * RankingService
 *
 * Pure, stateless ranking logic shared by find_rides, search_ride_options,
 * and recommend_best_ride. Kept independent of any provider or transport
 * concerns so it is trivially testable.
 */
@Injectable()
export class RankingService {
  rank(options: RideOption[], mode: RankingMode): RankedRideOption[] {
    const available = options.filter((o) => o.availability);
    // Normalize scores against the available pool (falling back to the full
    // set if nothing is available) so fare/ETA comparisons stay meaningful,
    // but always RETURN every option — including unavailable ones — so the
    // count the caller reports (e.g. totalOptionsFound) always matches the
    // length of the returned list. Unavailable rides are simply sorted last.
    const normalizationPool = available.length > 0 ? available : options;

    const scored = options.map((option) => {
      const entry = this.score(option, mode, normalizationPool);
      return option.availability ? entry : { ...entry, score: entry.score + 1_000_000 };
    });
    scored.sort((a, b) => a.score - b.score);

    return scored.map((entry, index) => ({
      ...entry.option,
      rank: index + 1,
      score: Math.round(entry.score * 100) / 100,
      scoreReason: entry.option.availability ? entry.reason : `Currently unavailable — ${entry.reason}`,
    }));
  }

  explainMode(mode: RankingMode): string {
    switch (mode) {
      case 'cheapest':
        return 'Sorted by lowest fare first.';
      case 'fastest':
        return 'Sorted by shortest total trip duration (pickup ETA + ride time).';
      case 'instant_pickup':
        return 'Sorted by shortest pickup ETA — best for riders who want the first available car.';
      case 'best_value':
      default:
        return 'Balanced across fare, pickup ETA, and rating for the best overall value.';
    }
  }

  private score(
    option: RideOption,
    mode: RankingMode,
    pool: RideOption[]
  ): { option: RideOption; score: number; reason: string } {
    switch (mode) {
      case 'cheapest':
        return { option, score: option.fare, reason: `₹${option.fare} fare` };

      case 'fastest': {
        const total = option.pickupEtaMinutes + option.tripDurationMinutes;
        return {
          option,
          score: total,
          reason: `${option.pickupEtaMinutes} min pickup + ${option.tripDurationMinutes} min ride = ${total} min total`,
        };
      }

      case 'instant_pickup':
        return {
          option,
          score: option.pickupEtaMinutes,
          reason: `${option.pickupEtaMinutes} min pickup ETA`,
        };

      case 'best_value':
      default: {
        const fares = pool.map((o) => o.fare);
        const etas = pool.map((o) => o.pickupEtaMinutes);
        const maxFare = Math.max(...fares, 1);
        const maxEta = Math.max(...etas, 1);

        // Weighted composite: fare (45%), pickup ETA (35%), rating (20%).
        // Lower is better, so rating is inverted.
        const fareNorm = option.fare / maxFare;
        const etaNorm = option.pickupEtaMinutes / maxEta;
        const ratingNorm = 1 - option.rating / 5;

        const score = fareNorm * 0.45 + etaNorm * 0.35 + ratingNorm * 0.2;
        return {
          option,
          score,
          reason: `Balances ₹${option.fare} fare, ${option.pickupEtaMinutes} min pickup, and ${option.rating}★ rating`,
        };
      }
    }
  }
}
