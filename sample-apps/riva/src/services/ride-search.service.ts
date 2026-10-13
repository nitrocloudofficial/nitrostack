import { Injectable } from '@nitrostack/core';
import type { Logger } from '@nitrostack/core';
import { MapsService } from './maps.service.js';
import { PreferenceService } from './preference.service.js';
import { UberMockProvider } from '../providers/uber-mock.provider.js';
import { OlaMockProvider } from '../providers/ola-mock.provider.js';
import { RapidoHybridProvider } from '../providers/rapido-hybrid.provider.js';
import type { ResolvedLocation, RideOption, RiderPreferences, RideSearchContext } from '../domain/types.js';

/**
 * RideSearchService
 *
 * Extracted from RidesTools so every feature that needs "resolve a route,
 * ask all three providers for options, apply preference filters" — not
 * just find_rides itself — can reuse the exact same logic instead of
 * re-implementing it. Used by RidesTools (find_rides, search_ride_options,
 * plan_return_trip) and the Phase 3 journey tools (travel_concierge,
 * ride_later_forecast, multi_stop_trip_planner, car_pooling_assistant,
 * booking_simulation).
 */
@Injectable({ deps: [MapsService, PreferenceService, UberMockProvider, OlaMockProvider, RapidoHybridProvider] })
export class RideSearchService {
  constructor(
    private readonly maps: MapsService,
    private readonly preferences: PreferenceService,
    private readonly uber: UberMockProvider,
    private readonly ola: OlaMockProvider,
    private readonly rapido: RapidoHybridProvider
  ) {}

  async buildSearchContext(
    originQuery: string,
    destinationQuery: string,
    preferencesOverride: RiderPreferences | undefined,
    logger?: Logger
  ): Promise<RideSearchContext> {
    const [origin, destination] = await Promise.all([
      this.maps.resolveLocation(originQuery, logger),
      this.maps.resolveLocation(destinationQuery, logger),
    ]);

    const route = await this.maps.calculateRoute(origin, destination, logger);
    const preferences = this.preferences.merge(preferencesOverride);

    return { origin, destination, route, preferences };
  }

  async queryAllProviders(context: RideSearchContext, logger?: Logger): Promise<RideOption[]> {
    const results = await Promise.allSettled([
      this.uber.getRideOptions(context),
      this.ola.getRideOptions(context),
      this.rapido.getRideOptions(context, logger),
    ]);

    const options: RideOption[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        options.push(...result.value);
      } else {
        // A single provider failure must never break the overall comparison —
        // the app should not know or care whether data is live or simulated.
        logger?.warn('Provider query failed', {
          reason: result.reason instanceof Error ? result.reason.message : String(result.reason),
        });
      }
    }
    return options;
  }

  applyPreferenceFilter(options: RideOption[], preferences: RiderPreferences): RideOption[] {
    let filtered = options;

    if (preferences.excludeVehicleTypes?.length) {
      filtered = filtered.filter((o) => !preferences.excludeVehicleTypes!.includes(o.vehicleType));
    }
    if (preferences.budgetLimit) {
      filtered = filtered.filter((o) => o.fare <= preferences.budgetLimit!);
    }
    if (preferences.luggageRequired) {
      filtered = filtered.filter((o) => o.luggageFriendly);
    }
    if (preferences.femaleDriverOnly) {
      filtered = filtered.filter((o) => o.hasFemaleDriverOption);
    }

    // If preferences eliminate everything, fall back to the unfiltered set
    // rather than showing the rider nothing — better UX for a demo/MVP.
    return filtered.length > 0 ? filtered : options;
  }

  /**
   * Same pipeline as search(), but for when the origin/destination are
   * already resolved (e.g. multi-stop trip legs, where each stop was
   * geocoded once up front). Skips MapsService.resolveLocation entirely —
   * re-geocoding an already-resolved location by its formatted-address
   * string is both wasteful (extra Geoapify calls) and slightly risky
   * (a second lookup isn't guaranteed to land on the exact same
   * coordinates as the first).
   */
  async searchResolved(
    origin: ResolvedLocation,
    destination: ResolvedLocation,
    preferencesOverride: RiderPreferences | undefined,
    logger?: Logger
  ): Promise<{ context: RideSearchContext; rawOptions: RideOption[]; filteredOptions: RideOption[] }> {
    const route = await this.maps.calculateRoute(origin, destination, logger);
    const preferences = this.preferences.merge(preferencesOverride);
    const context: RideSearchContext = { origin, destination, route, preferences };

    const rawOptions = await this.queryAllProviders(context, logger);
    const filteredOptions = this.applyPreferenceFilter(rawOptions, context.preferences);
    return { context, rawOptions, filteredOptions };
  }

  /** Convenience: full pipeline — resolve route, query all providers, apply preference filter. */
  async search(
    originQuery: string,
    destinationQuery: string,
    preferencesOverride: RiderPreferences | undefined,
    logger?: Logger
  ): Promise<{ context: RideSearchContext; rawOptions: RideOption[]; filteredOptions: RideOption[] }> {
    const context = await this.buildSearchContext(originQuery, destinationQuery, preferencesOverride, logger);
    const rawOptions = await this.queryAllProviders(context, logger);
    const filteredOptions = this.applyPreferenceFilter(rawOptions, context.preferences);
    return { context, rawOptions, filteredOptions };
  }
}
