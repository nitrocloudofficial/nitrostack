import { Injectable } from '@nitrostack/core';
import type { RideOption, RideProviderAdapter, RideSearchContext } from '../domain/types.js';
import { simulateProviderOptions, type ProviderPricingProfile } from './provider-sim.util.js';

// Approximate real-world Uber India fare structure (base + per-km + per-min,
// with a minimum fare floor), used only to seed believable simulation —
// not fetched from a live pricing API in Phase 1.
const PROFILE: ProviderPricingProfile = {
  providerId: 'uber',
  providerName: 'Uber',
  minPickupEta: 2,
  maxPickupEta: 9,
  rates: {
    auto: { baseFare: 30, perKm: 11, perMinute: 1.0, minimumFare: 45, ratingRange: [4.3, 4.9] },
    mini: { baseFare: 45, perKm: 13, perMinute: 1.5, minimumFare: 80, ratingRange: [4.2, 4.9] },
    sedan: { baseFare: 65, perKm: 16, perMinute: 2.0, minimumFare: 120, ratingRange: [4.3, 4.9] },
    suv: { baseFare: 100, perKm: 20, perMinute: 2.5, minimumFare: 180, ratingRange: [4.4, 4.9] },
  },
};

/**
 * UberMockProvider — Phase 1 implements Uber as simulation-only, per the
 * scope freeze (no real Uber API integration in this phase).
 */
@Injectable()
export class UberMockProvider implements RideProviderAdapter {
  readonly providerId = 'uber' as const;
  readonly providerName = 'Uber';

  async getRideOptions(context: RideSearchContext): Promise<RideOption[]> {
    return simulateProviderOptions(context, PROFILE);
  }
}
