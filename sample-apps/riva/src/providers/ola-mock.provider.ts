import { Injectable } from '@nitrostack/core';
import type { RideOption, RideProviderAdapter, RideSearchContext } from '../domain/types.js';
import { simulateProviderOptions, type ProviderPricingProfile } from './provider-sim.util.js';

// Approximate real-world Ola India fare structure — slightly below Uber's,
// consistent with Ola's typical market positioning. Simulation seed only.
const PROFILE: ProviderPricingProfile = {
  providerId: 'ola',
  providerName: 'Ola',
  minPickupEta: 2,
  maxPickupEta: 11,
  rates: {
    bike: { baseFare: 20, perKm: 6, perMinute: 0.5, minimumFare: 25, ratingRange: [4.0, 4.7] },
    auto: { baseFare: 28, perKm: 10, perMinute: 1.0, minimumFare: 40, ratingRange: [4.0, 4.7] },
    mini: { baseFare: 42, perKm: 12, perMinute: 1.4, minimumFare: 75, ratingRange: [4.0, 4.8] },
    sedan: { baseFare: 60, perKm: 15, perMinute: 1.8, minimumFare: 110, ratingRange: [4.1, 4.8] },
  },
};

/**
 * OlaMockProvider — Phase 1 implements Ola as simulation-only, per the
 * scope freeze (no real Ola API integration in this phase).
 */
@Injectable()
export class OlaMockProvider implements RideProviderAdapter {
  readonly providerId = 'ola' as const;
  readonly providerName = 'Ola';

  async getRideOptions(context: RideSearchContext): Promise<RideOption[]> {
    return simulateProviderOptions(context, PROFILE);
  }
}
