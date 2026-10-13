import { Injectable, ConfigService } from '@nitrostack/core';
import type { Logger } from '@nitrostack/core';
import type { RideOption, RideProviderAdapter, RideSearchContext, VehicleType } from '../domain/types.js';
import { simulateProviderOptions, type ProviderPricingProfile } from './provider-sim.util.js';

// Approximate real-world Rapido India fare structure — the cheapest of the
// three platforms and bike-first, consistent with Rapido's actual market
// positioning. Used only to seed the simulation fallback.
const SIMULATION_PROFILE: ProviderPricingProfile = {
  providerId: 'rapido',
  providerName: 'Rapido',
  minPickupEta: 1,
  maxPickupEta: 7,
  rates: {
    bike: { baseFare: 15, perKm: 5, perMinute: 0.4, minimumFare: 20, ratingRange: [4.0, 4.7] },
    auto: { baseFare: 22, perKm: 9, perMinute: 0.9, minimumFare: 35, ratingRange: [4.0, 4.6] },
    mini: { baseFare: 38, perKm: 11, perMinute: 1.2, minimumFare: 65, ratingRange: [4.0, 4.6] },
  },
};

const APIFY_RUN_TIMEOUT_MS = 8000;

/**
 * RapidoHybridProvider
 *
 * Primary: Apify actor scrape of live Rapido fare/ETA data.
 * Fallback: deterministic simulation (same engine as Uber/Ola mocks).
 *
 * Per the reliability rules, this NEVER calls Apify during module
 * construction — only when getRideOptions() actually runs — and it must
 * never let an Apify failure surface as a raw error or break the overall
 * find_rides response. Any failure (missing token, timeout, non-OK
 * response, malformed data) transparently falls back to simulation and the
 * caller is told the data is estimated rather than seeing an internal
 * error.
 */
@Injectable({ deps: [ConfigService] })
export class RapidoHybridProvider implements RideProviderAdapter {
  readonly providerId = 'rapido' as const;
  readonly providerName = 'Rapido';

  constructor(private readonly config: ConfigService) {}

  async getRideOptions(context: RideSearchContext, logger?: Logger): Promise<RideOption[]> {
    const apifyToken = this.config.get<string>('APIFY_API_TOKEN');

    if (apifyToken) {
      try {
        const liveOptions = await this.fetchFromApify(context, apifyToken);
        if (liveOptions.length > 0) {
          return liveOptions;
        }
      } catch (error) {
        logger?.warn('Rapido pricing is estimated currently.', {
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return simulateProviderOptions(context, SIMULATION_PROFILE).map((option) => ({
      ...option,
      notes: 'Rapido pricing is estimated currently.',
    }));
  }

  /**
   * Calls an Apify actor configured via APIFY_RAPIDO_ACTOR_ID (defaults to a
   * generic Rapido-fare-scraper actor slug) using the "run actor
   * synchronously and get dataset items" endpoint, with a hard timeout so a
   * slow scrape never blocks the customer-facing tool response.
   */
  private async fetchFromApify(context: RideSearchContext, token: string): Promise<RideOption[]> {
    const actorId = this.config.get<string>('APIFY_RAPIDO_ACTOR_ID', 'rapido-fare-scraper');
    const url = `https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), APIFY_RUN_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: {
            address: context.origin.formattedAddress,
            lat: context.origin.coordinates.lat,
            lng: context.origin.coordinates.lng,
          },
          destination: {
            address: context.destination.formattedAddress,
            lat: context.destination.coordinates.lat,
            lng: context.destination.coordinates.lng,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Apify actor run responded with status ${response.status}`);
      }

      const items: unknown = await response.json();
      return this.normalizeApifyItems(items, context);
    } finally {
      clearTimeout(timeout);
    }
  }

  private normalizeApifyItems(items: unknown, context: RideSearchContext): RideOption[] {
    if (!Array.isArray(items)) return [];

    const validVehicleTypes: VehicleType[] = ['bike', 'auto', 'mini', 'sedan', 'suv'];

    return items
      .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
      .map((item, index) => {
        const vehicleTypeRaw = String(item.vehicleType ?? item.vehicle_type ?? 'auto').toLowerCase();
        const vehicleType = validVehicleTypes.includes(vehicleTypeRaw as VehicleType)
          ? (vehicleTypeRaw as VehicleType)
          : 'auto';

        const fare = Number(item.fare ?? item.price ?? NaN);
        const pickupEtaMinutes = Number(item.etaMinutes ?? item.pickup_eta ?? NaN);

        if (!Number.isFinite(fare) || !Number.isFinite(pickupEtaMinutes)) {
          throw new Error('Malformed Apify dataset item');
        }

        return {
          optionId: `rapido-${vehicleType}-${index}`,
          provider: 'rapido' as const,
          providerName: 'Rapido',
          vehicleType,
          fare,
          currency: 'INR' as const,
          pickupEtaMinutes,
          tripDurationMinutes: Math.round(context.route.durationMinutes),
          distanceKm: Math.round(context.route.distanceKm * 10) / 10,
          availability: Boolean(item.available ?? true),
          isSimulated: false,
          rating: Number(item.rating ?? 4.3),
          hasFemaleDriverOption: Boolean(item.femaleDriverOption ?? false),
          luggageFriendly: vehicleType === 'sedan' || vehicleType === 'suv',
          surgeMultiplier: Number(item.surgeMultiplier ?? 1),
          dataSource: 'apify_live',
        } satisfies RideOption;
      });
  }
}
