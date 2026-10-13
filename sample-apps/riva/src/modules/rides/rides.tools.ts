import { ToolDecorator as Tool, Widget, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { MapsService } from '../../services/maps.service.js';
import { RankingService } from '../../services/ranking.service.js';
import { PreferenceService } from '../../services/preference.service.js';
import { SearchStoreService } from '../../services/search-store.service.js';
import { ForecastService } from '../../services/forecast.service.js';
import { NearbyDriversService } from '../../services/nearby-drivers.service.js';
import { RideSearchService } from '../../services/ride-search.service.js';
import type {
  RankedRideOption,
  RankingMode,
  RiderPreferences,
  RideSearchContext,
  VehicleType,
} from '../../domain/types.js';

export const vehicleTypeSchema = z.enum(['bike', 'auto', 'mini', 'sedan', 'suv']);
export const rankingModeSchema = z.enum(['cheapest', 'fastest', 'instant_pickup', 'best_value']);

export const preferencesSchema = z
  .object({
    femaleDriverOnly: z.boolean().optional().describe('Only show rides with a female driver option'),
    budgetLimit: z.number().positive().optional().describe('Maximum fare in INR the rider is willing to pay'),
    luggageRequired: z.boolean().optional().describe('Only show vehicles with enough luggage space (sedan/SUV)'),
    excludeVehicleTypes: z.array(vehicleTypeSchema).optional().describe('Vehicle types to exclude from results'),
  })
  .describe('Rider preferences to apply to ride search and filtering');

@Injectable({
  deps: [
    MapsService,
    RankingService,
    PreferenceService,
    SearchStoreService,
    ForecastService,
    NearbyDriversService,
    RideSearchService,
  ],
})
export class RidesTools {
  constructor(
    private readonly maps: MapsService,
    private readonly ranking: RankingService,
    private readonly preferences: PreferenceService,
    private readonly searchStore: SearchStoreService,
    private readonly forecast: ForecastService,
    private readonly nearbyDrivers: NearbyDriversService,
    private readonly rideSearch: RideSearchService
  ) {}

  // ------------------------------------------------------------------
  // 1. find_rides — primary customer search tool
  // ------------------------------------------------------------------
  @Tool({
    name: 'find_rides',
    description:
      'Find and compare ride options from Uber, Ola, and Rapido between an origin and destination, with an intelligent recommendation.',
    inputSchema: z.object({
      origin: z.string().describe('Pickup location, e.g. "Amrita University Ettimadai"'),
      destination: z.string().describe('Drop-off location, e.g. "Coimbatore Airport"'),
      preferences: preferencesSchema.optional(),
      rankingMode: rankingModeSchema.optional().describe('How to rank results (default: best_value)'),
    }),
    examples: {
      request: { origin: 'Amrita University Ettimadai', destination: 'Coimbatore Airport' },
    },
  })
  @Widget('ride-comparison')
  async findRides(
    input: {
      origin: string;
      destination: string;
      preferences?: RiderPreferences;
      rankingMode?: RankingMode;
    },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('find_rides', { origin: input.origin, destination: input.destination });

    const rankingMode: RankingMode = input.rankingMode ?? 'best_value';
    const { context, rawOptions, filteredOptions } = await this.rideSearch.search(
      input.origin,
      input.destination,
      input.preferences,
      ctx.logger
    );
    const ranked = this.ranking.rank(filteredOptions, rankingMode);

    const search = this.searchStore.create({
      origin: context.origin,
      destination: context.destination,
      route: context.route,
      preferences: context.preferences,
      options: rawOptions,
      rankingMode,
    });

    return this.buildComparisonResponse(search.searchId, context, ranked, rankingMode, rawOptions.length);
  }

  // ------------------------------------------------------------------
  // 2. search_ride_options — refine an existing search
  // ------------------------------------------------------------------
  @Tool({
    name: 'search_ride_options',
    description:
      'Modify constraints on a previous find_rides search — e.g. "find cheaper options" or "show faster rides" — and re-rank/re-filter accordingly.',
    inputSchema: z.object({
      searchId: z.string().describe('The searchId returned by find_rides'),
      rankingMode: rankingModeSchema.optional().describe('New ranking mode to apply'),
      maxFare: z.number().positive().optional().describe('Only show options at or below this fare (INR)'),
      excludeVehicleTypes: z.array(vehicleTypeSchema).optional(),
    }),
  })
  @Widget('ride-comparison')
  async searchRideOptions(
    input: {
      searchId: string;
      rankingMode?: RankingMode;
      maxFare?: number;
      excludeVehicleTypes?: VehicleType[];
    },
    ctx: ExecutionContext
  ) {
    const search = this.searchStore.get(input.searchId);
    if (!search) {
      throw new Error(
        `No active search found for searchId "${input.searchId}". Please run find_rides again.`
      );
    }

    const mergedPreferences: RiderPreferences = {
      ...search.preferences,
      excludeVehicleTypes: input.excludeVehicleTypes ?? search.preferences.excludeVehicleTypes,
      budgetLimit: input.maxFare ?? search.preferences.budgetLimit,
    };

    const rankingMode: RankingMode = input.rankingMode ?? search.rankingMode;
    const filtered = this.rideSearch.applyPreferenceFilter(search.options, mergedPreferences);
    const ranked = this.ranking.rank(filtered, rankingMode);

    this.searchStore.update(input.searchId, { preferences: mergedPreferences, rankingMode });

    const context: RideSearchContext = {
      origin: search.origin,
      destination: search.destination,
      route: search.route,
      preferences: mergedPreferences,
    };

    return this.buildComparisonResponse(input.searchId, context, ranked, rankingMode, search.options.length);
  }

  // ------------------------------------------------------------------
  // 3. recommend_best_ride — ranking engine
  // ------------------------------------------------------------------
  @Tool({
    name: 'recommend_best_ride',
    description:
      'Recommend the single best ride from a previous search according to a chosen strategy: cheapest, fastest, instant pickup, or best overall value.',
    inputSchema: z.object({
      searchId: z.string().describe('The searchId returned by find_rides'),
      mode: rankingModeSchema.optional().describe('Ranking strategy (default: best_value)'),
    }),
  })
  @Widget('recommendation')
  async recommendBestRide(input: { searchId: string; mode?: RankingMode }, ctx: ExecutionContext) {
    const search = this.searchStore.get(input.searchId);
    if (!search) {
      throw new Error(
        `No active search found for searchId "${input.searchId}". Please run find_rides again.`
      );
    }

    const mode: RankingMode = input.mode ?? 'best_value';
    const filtered = this.rideSearch.applyPreferenceFilter(search.options, search.preferences);
    const ranked = this.ranking.rank(filtered, mode);

    if (ranked.length === 0) {
      return {
        searchId: input.searchId,
        recommendation: null,
        alternatives: [],
        message: 'No ride options matched the current preferences. Try relaxing a constraint.',
      };
    }

    const [recommended, ...alternatives] = ranked;

    return {
      searchId: input.searchId,
      mode,
      modeExplanation: this.ranking.explainMode(mode),
      selectedRide: recommended,
      reasoning: `Recommended because it ${recommended.scoreReason} — the strongest option for "${mode}" among ${ranked.length} available rides.`,
      alternatives: alternatives.slice(0, 3),
    };
  }

  // ------------------------------------------------------------------
  // 4. set_rider_preferences — stores customer preferences
  // ------------------------------------------------------------------
  @Tool({
    name: 'set_rider_preferences',
    description:
      'Store rider preferences (female driver preference, budget limit, luggage constraints, vehicle exclusions) applied to future ride searches.',
    inputSchema: preferencesSchema,
    examples: {
      request: { femaleDriverOnly: true, budgetLimit: 300 },
    },
  })
  async setRiderPreferences(input: RiderPreferences, ctx: ExecutionContext) {
    const stored = this.preferences.set(input);
    ctx.logger.info('Rider preferences updated', { ...stored });

    return {
      status: 'saved',
      preferences: stored,
      message: 'Preferences saved and will be applied to future ride searches.',
    };
  }

  // ------------------------------------------------------------------
  // 5. get_ride_option_details — explain a single selected ride
  // ------------------------------------------------------------------
  @Tool({
    name: 'get_ride_option_details',
    description: 'Get a detailed explanation of one specific ride option from a previous search.',
    inputSchema: z.object({
      searchId: z.string().describe('The searchId returned by find_rides'),
      optionId: z.string().describe('The optionId of the ride to explain'),
    }),
  })
  @Widget('recommendation')
  async getRideOptionDetails(input: { searchId: string; optionId: string }, ctx: ExecutionContext) {
    const search = this.searchStore.get(input.searchId);
    if (!search) {
      throw new Error(
        `No active search found for searchId "${input.searchId}". Please run find_rides again.`
      );
    }

    const option = search.options.find((o) => o.optionId === input.optionId);
    if (!option) {
      throw new Error(`No ride option "${input.optionId}" found in this search.`);
    }

    const ranked = this.ranking.rank(
      this.rideSearch.applyPreferenceFilter(search.options, search.preferences),
      search.rankingMode
    );
    const rankedMatch = ranked.find((o) => o.optionId === option.optionId);
    const others = ranked.filter((o) => o.optionId !== option.optionId).slice(0, 3);

    const perKmEquivalent = option.distanceKm > 0 ? Math.round((option.fare / option.distanceKm) * 100) / 100 : option.fare;

    return {
      searchId: input.searchId,
      mode: search.rankingMode,
      modeExplanation: this.ranking.explainMode(search.rankingMode),
      selectedRide: rankedMatch ?? { ...option, rank: 0, score: 0, scoreReason: 'Excluded by current preferences' },
      reasoning: rankedMatch
        ? `Ranked #${rankedMatch.rank} of ${ranked.length} for "${search.rankingMode}" — ${rankedMatch.scoreReason}. Approx. ₹${perKmEquivalent}/km.`
        : 'This option does not currently match the active rider preferences.',
      fareBreakdown: {
        totalFare: option.fare,
        currency: option.currency,
        distanceKm: option.distanceKm,
        approxPerKm: perKmEquivalent,
        surgeMultiplier: option.surgeMultiplier,
        dataSource: option.dataSource,
      },
      alternatives: others,
    };
  }

  // ------------------------------------------------------------------
  // 6. get_nearby_drivers_map — simulated nearby drivers
  // ------------------------------------------------------------------
  @Tool({
    name: 'get_nearby_drivers_map',
    description: 'Show simulated nearby Uber, Ola, and Rapido drivers around a pickup location.',
    inputSchema: z.object({
      origin: z.string().describe('Pickup location to search around'),
      radiusKm: z.number().positive().max(15).optional().describe('Search radius in km (default 3)'),
    }),
  })
  @Widget('nearby-drivers-map')
  async getNearbyDriversMap(input: { origin: string; radiusKm?: number }, ctx: ExecutionContext) {
    const resolved = await this.maps.resolveLocation(input.origin, ctx.logger);
    const radiusKm = input.radiusKm ?? 3;

    const drivers = this.nearbyDrivers.generate(resolved.coordinates, resolved.formattedAddress, radiusKm);

    const countsByProvider = drivers.reduce<Record<string, number>>((acc, driver) => {
      acc[driver.providerName] = (acc[driver.providerName] ?? 0) + 1;
      return acc;
    }, {});

    return {
      origin: resolved,
      radiusKm,
      driverCount: drivers.length,
      countsByProvider,
      drivers,
      note: 'Driver positions are simulated for demonstration purposes — no real driver tracking is used.',
    };
  }

  // ------------------------------------------------------------------
  // 7. plan_return_trip — future fare estimation
  // ------------------------------------------------------------------
  @Tool({
    name: 'plan_return_trip',
    description:
      'Estimate the fare for a future return trip at a given time of day, e.g. "What will my return fare be at 9 PM?"',
    inputSchema: z.object({
      searchId: z.string().optional().describe('A previous find_rides searchId to reuse the route (will be reversed)'),
      origin: z.string().optional().describe('Return trip pickup location (required if searchId is omitted)'),
      destination: z.string().optional().describe('Return trip drop-off location (required if searchId is omitted)'),
      returnTime: z.string().describe('Target return time, e.g. "9 PM", "21:00"'),
    }),
  })
  @Widget('return-fare-forecast')
  async planReturnTrip(
    input: { searchId?: string; origin?: string; destination?: string; returnTime: string },
    ctx: ExecutionContext
  ) {
    let originQuery: string;
    let destinationQuery: string;
    let preferences: RiderPreferences = this.preferences.get();

    if (input.searchId) {
      const search = this.searchStore.get(input.searchId);
      if (!search) {
        throw new Error(
          `No active search found for searchId "${input.searchId}". Please run find_rides again or provide origin/destination.`
        );
      }
      // Return trip is the reverse of the original trip.
      originQuery = search.destination.formattedAddress;
      destinationQuery = search.origin.formattedAddress;
      preferences = search.preferences;
    } else if (input.origin && input.destination) {
      originQuery = input.origin;
      destinationQuery = input.destination;
    } else {
      throw new Error('Provide either a searchId, or both origin and destination, for the return trip.');
    }

    const { context, filteredOptions } = await this.rideSearch.search(originQuery, destinationQuery, preferences, ctx.logger);
    const ranked = this.ranking.rank(filteredOptions, 'best_value');

    const currentBest = ranked[0];
    const forecast = this.forecast.forecast(input.returnTime);
    const forecastedFare = currentBest ? Math.round((currentBest.fare * forecast.forecastMultiplier) / 5) * 5 : null;

    return {
      origin: context.origin,
      destination: context.destination,
      returnTime: forecast.targetTimeLabel,
      demandLevel: forecast.demandLevel,
      currentFare: currentBest?.fare ?? null,
      currentBestOption: currentBest ?? null,
      estimatedFutureFare: forecastedFare,
      forecastMultiplier: forecast.forecastMultiplier,
      explanation: forecast.explanation,
      disclaimer: 'This is a heuristic time-of-day estimate, not a guaranteed fare.',
    };
  }

  // ------------------------------------------------------------------
  // Shared helpers
  // ------------------------------------------------------------------

  private buildComparisonResponse(
    searchId: string,
    context: RideSearchContext,
    ranked: RankedRideOption[],
    rankingMode: RankingMode,
    totalOptionsFound: number
  ) {
    return {
      searchId,
      origin: context.origin,
      destination: context.destination,
      route: context.route,
      rankingMode,
      rankingExplanation: this.ranking.explainMode(rankingMode),
      preferencesApplied: context.preferences,
      totalOptionsFound,
      options: ranked,
      recommendation: ranked[0] ?? null,
    };
  }
}
