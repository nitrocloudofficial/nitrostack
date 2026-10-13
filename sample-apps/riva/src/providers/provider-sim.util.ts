import type { ProviderId, RideOption, RideSearchContext, VehicleType } from '../domain/types.js';
import { createSeededRandom, hashString, randomBetween } from '../services/sim.util.js';

/** Fare structure for one vehicle type: base fare + per-km + per-minute, with a floor. */
export interface VehicleFareRate {
  baseFare: number;
  perKm: number;
  perMinute: number;
  /** Real ride-hailing apps enforce a minimum fare regardless of distance. */
  minimumFare: number;
  ratingRange: [number, number];
}

export interface ProviderPricingProfile {
  providerId: ProviderId;
  providerName: string;
  rates: Partial<Record<VehicleType, VehicleFareRate>>;
  minPickupEta: number;
  maxPickupEta: number;
}

/**
 * Deterministically simulates ride options for a provider given a route.
 *
 * Fare = max(minimumFare, baseFare + perKm × distance + perMinute × duration) × surge,
 * rounded to the nearest ₹5 — the same structure real Indian ride-hailing
 * apps use. Per-vehicle-type rate tables (rather than a single multiplier
 * applied uniformly) keep bike/auto/car pricing in believable proportion
 * to each other and to real-world fares for a given distance/duration.
 *
 * The seed is derived from origin+destination+provider so the *same* route
 * queried twice in the same search yields stable numbers (good for demo
 * reproducibility) while different routes/providers naturally diverge.
 */
export function simulateProviderOptions(
  context: RideSearchContext,
  profile: ProviderPricingProfile
): RideOption[] {
  const seedKey = `${profile.providerId}|${context.origin.formattedAddress}|${context.destination.formattedAddress}|${context.route.distanceKm.toFixed(2)}`;
  const vehicleTypes = Object.keys(profile.rates) as VehicleType[];

  return vehicleTypes.map((vehicleType, index) => {
    const rate = profile.rates[vehicleType]!;
    const jitterRng = createSeededRandom(hashString(`${seedKey}|${vehicleType}|${index}`));

    // Realistic surge band: most rides are 0.95x-1.15x, occasional peak
    // pricing up to ~1.3x — not the wild swings of a pure random roll.
    const surgeMultiplier = Math.round(randomBetween(jitterRng, 0.95, 1.15) * 100) / 100;

    const metered =
      rate.baseFare + rate.perKm * context.route.distanceKm + rate.perMinute * context.route.durationMinutes;
    const rawFare = Math.max(rate.minimumFare, metered) * surgeMultiplier;
    const fare = Math.round(rawFare / 5) * 5; // round to nearest ₹5, like real apps

    const pickupEtaMinutes = Math.round(randomBetween(jitterRng, profile.minPickupEta, profile.maxPickupEta));
    const tripDurationMinutes = Math.round(context.route.durationMinutes);
    const availability = randomBetween(jitterRng, 0, 1) > 0.06; // ~94% availability
    const rating = Math.round(randomBetween(jitterRng, rate.ratingRange[0], rate.ratingRange[1]) * 10) / 10;
    const hasFemaleDriverOption = vehicleType !== 'bike' ? randomBetween(jitterRng, 0, 1) > 0.3 : false;
    const luggageFriendly = vehicleType === 'sedan' || vehicleType === 'suv';

    return {
      optionId: `${profile.providerId}-${vehicleType}-${index}`,
      provider: profile.providerId,
      providerName: profile.providerName,
      vehicleType,
      fare,
      currency: 'INR',
      pickupEtaMinutes,
      tripDurationMinutes,
      distanceKm: Math.round(context.route.distanceKm * 10) / 10,
      availability,
      isSimulated: true,
      rating,
      hasFemaleDriverOption,
      luggageFriendly,
      surgeMultiplier,
      dataSource: 'simulation',
    } satisfies RideOption;
  });
}
