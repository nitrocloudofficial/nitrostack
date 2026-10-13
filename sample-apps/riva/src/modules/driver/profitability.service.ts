import { Injectable } from '@nitrostack/core';
import { DriverService } from './driver.service.js';
import type { DriverEarningsInput, DriverProfitabilitySummary, DriverTripInput, TripProfitabilityBreakdown } from '../../domain/types.js';

/** Overhead time assumed between trips (searching for the next rider, idle time), in minutes. */
const INTER_TRIP_OVERHEAD_MINUTES = 6;

/**
 * ProfitabilityService
 *
 * Pure, transparent earnings/cost calculations — no ranking or accept/
 * reject decisions here (that's RecommendationService). Every number is
 * derived from a documented formula so the tool response can explain
 * itself to the driver, per the plan's "system should explain
 * calculations" requirement.
 */
@Injectable({ deps: [DriverService] })
export class ProfitabilityService {
  constructor(private readonly driver: DriverService) {}

  /**
   * Analyzes a single prospective trip. Fuel cost is charged against the
   * FULL distance the driver actually drives — pickup travel plus the paid
   * trip — since the vehicle burns fuel getting to the rider too, even
   * though that leg isn't paid.
   */
  analyzeTrip(input: DriverTripInput): TripProfitabilityBreakdown {
    const totalDrivingKm = input.tripDistance + input.pickupDistance;

    const grossEarning = input.offeredFare;
    const { cost: fuelCost, explanation: fuelCostExplanation } = this.driver.getFuelCost(
      input.vehicleType,
      input.fuelType,
      totalDrivingKm
    );

    const platformCommissionRate = this.driver.getCommissionRate(input.provider);
    const platformCommission = Math.round(grossEarning * platformCommissionRate);

    const netEarning = grossEarning - fuelCost - platformCommission;
    const costPerKm = input.tripDistance > 0 ? Math.round(((fuelCost + platformCommission) / input.tripDistance) * 100) / 100 : 0;

    const estimatedTripMinutes = this.driver.estimateTripMinutes(totalDrivingKm);
    const estimatedHourlyEarning = Math.round(netEarning / (estimatedTripMinutes / 60));

    return {
      grossEarning,
      fuelCost,
      fuelCostExplanation: `${fuelCostExplanation} (covers ${totalDrivingKm.toFixed(1)} km: ${input.pickupDistance} km to pickup + ${input.tripDistance} km trip)`,
      platformCommission,
      platformCommissionRate,
      netEarning,
      costPerKm,
      estimatedTripMinutes,
      estimatedHourlyEarning,
    };
  }

  /**
   * End-of-day/session earnings summary. Hours worked is used as given
   * when provided; otherwise it's estimated from total distance driven
   * plus a small per-trip overhead for idle/search time between rides.
   */
  summarize(input: DriverEarningsInput): DriverProfitabilitySummary {
    const AVERAGE_SPEED_KMPH = 28;
    const hoursWorkedIsEstimated = input.hoursWorked === undefined;

    const estimatedHoursWorked = hoursWorkedIsEstimated
      ? Math.max(
          0.1,
          Math.round(
            (input.totalDistance / AVERAGE_SPEED_KMPH + (input.tripsCompleted * INTER_TRIP_OVERHEAD_MINUTES) / 60) * 100
          ) / 100
        )
      : input.hoursWorked!;

    // Commission isn't separately tracked in the earnings input (it's
    // already netted out of driver payouts in real apps), but we estimate
    // it here using the average of the three providers' rates so the
    // expense breakdown is still informative rather than silently omitted.
    const AVERAGE_COMMISSION_RATE = 0.207; // avg of uber 0.25, ola 0.22, rapido 0.15
    const estimatedPlatformCommission = Math.round(input.totalRevenue * AVERAGE_COMMISSION_RATE);

    const totalExpenses = input.fuelCost + estimatedPlatformCommission;
    const netProfit = input.totalRevenue - totalExpenses;

    const averageEarningPerHour = estimatedHoursWorked > 0 ? Math.round(netProfit / estimatedHoursWorked) : 0;
    const averageEarningPerTrip = input.tripsCompleted > 0 ? Math.round(netProfit / input.tripsCompleted) : 0;
    const averageEarningPerKm = input.totalDistance > 0 ? Math.round((netProfit / input.totalDistance) * 100) / 100 : 0;

    const recommendations: string[] = [];
    if (averageEarningPerHour < 100) {
      recommendations.push('Hourly net earnings are on the low side — consider focusing on shorter, higher-frequency trips during peak hours.');
    }
    if (input.fuelCost / Math.max(input.totalRevenue, 1) > 0.35) {
      recommendations.push('Fuel cost is a large share of revenue — check for excessive deadhead (unpaid) driving between trips.');
    }
    if (input.tripsCompleted > 0 && input.totalDistance / input.tripsCompleted > 20) {
      recommendations.push('Average trip distance is high — long trips reduce ride frequency; mixing in short local trips can raise hourly earnings.');
    }
    if (recommendations.length === 0) {
      recommendations.push('Earnings look healthy for the day — keep up the current mix of trips and hours.');
    }

    return {
      totalEarnings: input.totalRevenue,
      expenses: {
        fuelCost: input.fuelCost,
        estimatedPlatformCommission,
        total: totalExpenses,
      },
      netProfit,
      estimatedHoursWorked,
      hoursWorkedIsEstimated,
      averageEarningPerHour,
      averageEarningPerTrip,
      averageEarningPerKm,
      recommendations,
    };
  }
}
