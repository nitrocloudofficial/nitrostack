import { Injectable } from '@nitrostack/core';
import { DemandService } from './demand.service.js';
import { DriverService } from './driver.service.js';
import { createSeededRandom, hashString, haversineDistanceKm, pick, randomBetween } from '../../services/sim.util.js';
import type { LatLng, NearbyRideRequest, ProviderId, VehicleType } from '../../domain/types.js';

const PROVIDERS: ProviderId[] = ['uber', 'ola', 'rapido'];
const VEHICLE_BY_PROVIDER: Record<ProviderId, VehicleType[]> = {
  uber: ['auto', 'mini', 'sedan'],
  ola: ['bike', 'auto', 'mini'],
  rapido: ['bike', 'auto'],
};

// Generic representative per-km/base rates for a simulated marketplace
// request — a blended average across providers, not tied to any specific
// platform's exact pricing (that lives in the rider-side provider adapters).
const BASE_FARE = 28;
const PER_KM = 11;

@Injectable({ deps: [DemandService, DriverService] })
export class NearbyRidesService {
  constructor(
    private readonly demand: DemandService,
    private readonly driver: DriverService
  ) {}

  generateRequests(currentLocation: LatLng, seedKey: string, radiusKm: number, count = 5): NearbyRideRequest[] {
    const zones = this.demand.listZones();
    const rng = createSeededRandom(hashString(`${seedKey}|${Date.now() >> 12}`));

    const requests: NearbyRideRequest[] = Array.from({ length: count }, (_, i) => {
      const reqRng = createSeededRandom(hashString(`${seedKey}|req|${i}|${Date.now() >> 12}`));
      const dropZone = pick(reqRng, zones);
      const provider = pick(reqRng, PROVIDERS);
      const vehicleType = pick(reqRng, VEHICLE_BY_PROVIDER[provider]);

      const pickupDistanceKm = Math.round(randomBetween(reqRng, 0.3, radiusKm) * 10) / 10;
      const straightLineKm = haversineDistanceKm(currentLocation, dropZone.coordinates);
      const tripDistanceKm = Math.max(1, Math.round(straightLineKm * 1.3 * 10) / 10);

      const fare = Math.round(((BASE_FARE + PER_KM * tripDistanceKm) * randomBetween(reqRng, 0.95, 1.15)) / 5) * 5;

      // Assume a generic auto+petrol vehicle for the net-earning estimate,
      // since the requesting driver's actual vehicle isn't known per-request.
      const { cost: fuelCost } = this.driver.getFuelCost('auto', 'petrol', pickupDistanceKm + tripDistanceKm);
      const commission = Math.round(fare * this.driver.getCommissionRate(provider));
      const estimatedNetEarning = fare - fuelCost - commission;

      return {
        requestId: `req-${i}-${dropZone.zoneKey}`,
        provider,
        pickupZone: 'Nearby pickup',
        pickupDistanceKm,
        dropZone: dropZone.displayName,
        tripDistanceKm,
        fare,
        estimatedNetEarning,
      } satisfies NearbyRideRequest;
    });

    return requests.sort((a, b) => b.estimatedNetEarning - a.estimatedNetEarning);
  }
}
