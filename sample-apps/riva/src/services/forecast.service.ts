import { Injectable } from '@nitrostack/core';
import { formatHourLabel, parseHourFromLabel } from './time.util.js';

export interface ForecastResult {
  targetTimeLabel: string;
  hour: number;
  demandLevel: 'low' | 'moderate' | 'high' | 'peak';
  forecastMultiplier: number;
  explanation: string;
}

/**
 * ForecastService
 *
 * Phase 1 has no access to real historical demand data, so future fares are
 * estimated with a transparent, documented time-of-day heuristic (typical
 * Indian metro commute patterns: morning + evening rush hours cost more,
 * late night costs a bit more due to lower driver availability, and
 * midday/off-peak is cheapest). This is clearly surfaced to the user as an
 * estimate, never presented as a guaranteed price.
 */
@Injectable()
export class ForecastService {
  forecast(targetTime: string): ForecastResult {
    const hour = parseHourFromLabel(targetTime);

    let demandLevel: ForecastResult['demandLevel'];
    let forecastMultiplier: number;
    let explanation: string;

    if (hour >= 8 && hour < 10) {
      demandLevel = 'peak';
      forecastMultiplier = 1.35;
      explanation = 'Morning office-commute rush typically drives higher demand and pricing.';
    } else if (hour >= 18 && hour < 21) {
      demandLevel = 'peak';
      forecastMultiplier = 1.4;
      explanation = 'Evening rush hour usually sees the highest demand of the day.';
    } else if ((hour >= 10 && hour < 18)) {
      demandLevel = 'moderate';
      forecastMultiplier = 1.05;
      explanation = 'Daytime off-peak hours usually have steady, near-normal pricing.';
    } else if (hour >= 21 || hour < 1) {
      demandLevel = 'high';
      forecastMultiplier = 1.2;
      explanation = 'Late evening sees fewer drivers on the road, nudging fares up slightly.';
    } else {
      demandLevel = 'low';
      forecastMultiplier = 1.1;
      explanation = 'Late night/early morning has low traffic but limited driver availability.';
    }

    return {
      targetTimeLabel: formatHourLabel(hour),
      hour,
      demandLevel,
      forecastMultiplier,
      explanation,
    };
  }

  /**
   * Traffic-aware travel-time multiplier for a given hour (0-23) — reused
   * by travel_concierge and multi_stop_trip_planner to inflate route
   * duration during peak windows, per the "traffic-aware route
   * optimization" requirement. Same peak windows as the fare forecast
   * above, since congestion and fare surge track the same rush-hour
   * pattern in practice.
   */
  getTrafficMultiplier(hour: number): number {
    if ((hour >= 8 && hour < 10) || (hour >= 18 && hour < 21)) return 1.35; // peak rush hour
    if (hour >= 10 && hour < 18) return 1.1; // daytime traffic
    if (hour >= 21 || hour < 1) return 1.05; // light evening traffic
    return 1.0; // late night / early morning, roads are clear
  }
}
