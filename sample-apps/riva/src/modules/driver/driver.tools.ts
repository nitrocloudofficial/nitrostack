import { ToolDecorator as Tool, Widget, ExecutionContext, Injectable } from '@nitrostack/core';
import { MapsService } from '../../services/maps.service.js';
import { DriverService } from './driver.service.js';
import { ProfitabilityService } from './profitability.service.js';
import { DemandService } from './demand.service.js';
import { RecommendationService } from './recommendation.service.js';
import { NearbyRidesService } from './nearby-rides.service.js';
import {
  analyseDriverTripSchema,
  getDestinationDemandSchema,
  suggestNextDriverZoneSchema,
  driverProfitabilitySummarySchema,
  searchNearbyRidesSchema,
} from './driver.schemas.js';
import { formatHourLabel, isWeekend, parseHourFromLabel } from '../../services/time.util.js';
import type {
  DriverEarningsInput,
  DriverTripAnalysis,
  DriverTripInput,
  VehicleType,
} from '../../domain/types.js';

/**
 * DriverTools
 *
 * Phase 2 — Driver Intelligence Module. Advisory only: no bookings, no
 * real driver accounts. Reuses MapsService (same lazy-init, graceful
 * fallback Geoapify integration as the rider side) for location
 * resolution rather than duplicating geocoding logic.
 */
@Injectable({
  deps: [MapsService, DriverService, ProfitabilityService, DemandService, RecommendationService, NearbyRidesService],
})
export class DriverTools {
  constructor(
    private readonly maps: MapsService,
    private readonly driver: DriverService,
    private readonly profitability: ProfitabilityService,
    private readonly demand: DemandService,
    private readonly recommendation: RecommendationService,
    private readonly nearbyRides: NearbyRidesService
  ) {}

  // ------------------------------------------------------------------
  // 1. analyse_driver_trip
  // ------------------------------------------------------------------
  @Tool({
    name: 'analyse_driver_trip',
    description:
      'Analyze whether a driver should accept an offered ride: gross/net earnings, fuel cost, platform commission, cost per km, hourly earning, destination demand, and an ACCEPT/CONSIDER/REJECT recommendation.',
    inputSchema: analyseDriverTripSchema,
    examples: {
      request: {
        provider: 'uber',
        offeredFare: 310,
        tripDistance: 14,
        pickupDistance: 2.3,
        vehicleType: 'sedan',
        fuelType: 'petrol',
        currentLocation: 'Gandhipuram',
        destination: 'Coimbatore Airport',
      },
    },
  })
  @Widget('driver-trip-analysis')
  async analyseDriverTrip(input: DriverTripInput, ctx: ExecutionContext) {
    ctx.logger.info('analyse_driver_trip', { provider: input.provider, offeredFare: input.offeredFare });

    const [currentLocation, destination] = await Promise.all([
      this.maps.resolveLocation(input.currentLocation, ctx.logger),
      this.maps.resolveLocation(input.destination, ctx.logger),
    ]);

    const breakdown = this.profitability.analyzeTrip(input);

    const hour = new Date().getHours();
    const weekend = isWeekend();
    const demandResult = this.demand.getDemandForLocation(destination, hour, weekend, formatHourLabel(hour));

    const { recommendation, reason } = this.recommendation.recommendTripAcceptance(input, breakdown, demandResult);

    const analysis: DriverTripAnalysis = {
      provider: input.provider,
      vehicleType: input.vehicleType,
      currentLocation,
      destination,
      totalDistanceKm: Math.round((input.tripDistance + input.pickupDistance) * 10) / 10,
      breakdown,
      destinationAttractiveness: {
        demandLevel: demandResult.demandLevel,
        returnProbability: demandResult.returnProbability,
        explanation: demandResult.explanation,
      },
      recommendation,
      reason,
    };

    return analysis;
  }

  // ------------------------------------------------------------------
  // 2. get_destination_demand
  // ------------------------------------------------------------------
  @Tool({
    name: 'get_destination_demand',
    description:
      'Estimate ride demand around a destination: demand level, expected ride availability, expected waiting time, and return-trip probability. Uses simulated demand data.',
    inputSchema: getDestinationDemandSchema,
    examples: {
      request: { destination: 'Whitefield', time: '6 PM' },
    },
  })
  @Widget('demand-map')
  async getDestinationDemand(input: { destination: string; time?: string }, ctx: ExecutionContext) {
    const resolved = await this.maps.resolveLocation(input.destination, ctx.logger);
    const hour = parseHourFromLabel(input.time ?? 'now');
    const weekend = isWeekend();

    return this.demand.getDemandForLocation(resolved, hour, weekend, input.time ? formatHourLabel(hour) : 'now');
  }

  // ------------------------------------------------------------------
  // 3. suggest_next_driver_zone
  // ------------------------------------------------------------------
  @Tool({
    name: 'suggest_next_driver_zone',
    description:
      'Recommend where a driver should move next based on simulated demand, time of day, and historical patterns.',
    inputSchema: suggestNextDriverZoneSchema,
    examples: {
      request: { currentLocation: 'RS Puram', time: 'now' },
    },
  })
  @Widget('demand-map')
  async suggestNextDriverZone(
    input: { currentLocation: string; time?: string; vehicleType?: VehicleType },
    ctx: ExecutionContext
  ) {
    const resolved = await this.maps.resolveLocation(input.currentLocation, ctx.logger);
    const hour = parseHourFromLabel(input.time ?? 'now');
    const weekend = isWeekend();

    const zones = this.recommendation.recommendNextZones(resolved.coordinates, hour, weekend, input.vehicleType);

    return {
      currentLocation: resolved,
      time: input.time ? formatHourLabel(hour) : 'now',
      topRecommendation: zones[0] ?? null,
      alternatives: zones.slice(1),
    };
  }

  // ------------------------------------------------------------------
  // 4. get_driver_profitability_summary
  // ------------------------------------------------------------------
  @Tool({
    name: 'get_driver_profitability_summary',
    description:
      'Summarize a driver\'s earnings for a session or day: total earnings, expenses, net profit, average earning per hour/trip/km, and recommendations.',
    inputSchema: driverProfitabilitySummarySchema,
    examples: {
      request: { tripsCompleted: 12, totalRevenue: 3200, totalDistance: 145, fuelCost: 620 },
    },
  })
  @Widget('driver-summary')
  async getDriverProfitabilitySummary(input: DriverEarningsInput, ctx: ExecutionContext) {
    ctx.logger.info('get_driver_profitability_summary', { trips: input.tripsCompleted });
    return this.profitability.summarize(input);
  }

  // ------------------------------------------------------------------
  // 5. search_nearby_rides — simulated ride-request marketplace
  // ------------------------------------------------------------------
  @Tool({
    name: 'search_nearby_rides',
    description: 'Show simulated incoming ride requests near the driver\'s current location, ranked by estimated net earning.',
    inputSchema: searchNearbyRidesSchema,
    examples: {
      request: { currentLocation: 'Gandhipuram' },
    },
  })
  @Widget('nearby-drivers-map')
  async searchNearbyRides(input: { currentLocation: string; radiusKm?: number }, ctx: ExecutionContext) {
    const resolved = await this.maps.resolveLocation(input.currentLocation, ctx.logger);
    const radiusKm = input.radiusKm ?? 5;

    const rides = this.nearbyRides.generateRequests(resolved.coordinates, resolved.formattedAddress, radiusKm);

    return {
      currentLocation: resolved,
      radiusKm,
      rideCount: rides.length,
      rides,
      note: 'Ride requests are simulated for demonstration purposes — no real ride marketplace data is used.',
    };
  }
}
