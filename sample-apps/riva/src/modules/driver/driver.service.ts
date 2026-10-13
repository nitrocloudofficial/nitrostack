import { Injectable } from '@nitrostack/core';
import type { FuelType, ProviderId, VehicleType } from '../../domain/types.js';

/**
 * DriverService
 *
 * Holds the shared reference data behind the driver-side calculations —
 * fuel efficiency by vehicle/fuel type, fuel prices, per-provider platform
 * commission rates, and trip-time estimation. Centralizing these here
 * means ProfitabilityService, DemandService, and RecommendationService all
 * pull from one source instead of duplicating constants.
 *
 * All figures are illustrative, representative averages for simulation
 * purposes (this is an advisory tool, not a live pricing feed) — not
 * fetched from any live fuel-price or commission API.
 */
@Injectable()
export class DriverService {
  /** Approximate fuel efficiency: km per litre (petrol/diesel), km per kg (CNG), km per kWh (electric). */
  private readonly fuelEfficiency: Record<VehicleType, Record<FuelType, number>> = {
    bike: { petrol: 40, diesel: 40, cng: 45, electric: 60 },
    auto: { petrol: 32, diesel: 30, cng: 40, electric: 50 },
    mini: { petrol: 18, diesel: 22, cng: 24, electric: 6 },
    sedan: { petrol: 15, diesel: 19, cng: 20, electric: 5 },
    suv: { petrol: 12, diesel: 15, cng: 16, electric: 4 },
  };

  /** Approximate representative fuel prices in INR (per litre / per kg / per kWh). */
  private readonly fuelPrice: Record<FuelType, number> = {
    petrol: 103,
    diesel: 94,
    cng: 85,
    electric: 8,
  };

  private readonly fuelUnit: Record<FuelType, string> = {
    petrol: '₹/L',
    diesel: '₹/L',
    cng: '₹/kg',
    electric: '₹/kWh',
  };

  /** Approximate representative platform commission rates. */
  private readonly commissionRate: Record<ProviderId, number> = {
    uber: 0.25,
    ola: 0.22,
    rapido: 0.15,
  };

  /** Average effective city driving speed used for time estimates, km/h. */
  private readonly AVERAGE_SPEED_KMPH = 28;

  getFuelCost(vehicleType: VehicleType, fuelType: FuelType, distanceKm: number): { cost: number; explanation: string } {
    const efficiency = this.fuelEfficiency[vehicleType][fuelType];
    const price = this.fuelPrice[fuelType];
    const unitsConsumed = distanceKm / efficiency;
    const cost = Math.round(unitsConsumed * price);

    return {
      cost,
      explanation: `${distanceKm} km ÷ ${efficiency} km/unit × ${price} ${this.fuelUnit[fuelType]} ≈ ₹${cost}`,
    };
  }

  getCommissionRate(provider: ProviderId): number {
    return this.commissionRate[provider];
  }

  estimateTripMinutes(distanceKm: number): number {
    return Math.max(3, Math.round((distanceKm / this.AVERAGE_SPEED_KMPH) * 60));
  }
}
