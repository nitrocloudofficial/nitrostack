import { Injectable } from '@nitrostack/core';
import { ContingencyPlan, RerouteOption, RerouteStatus } from '../../shared/domain/reroute.js';
import { Shipment } from '../../shared/domain/shipment.js';
import { Threat } from '../../shared/domain/threat.js';
import { Impact } from '../../shared/domain/impact.js';
import { CarrierRatesService } from '../../shared/services/carrier-rates.service.js';
import { CacheService } from '../../shared/services/cache.service.js';

const REROUTE_CACHE_TTL = 3600; // 1 hour

/**
 * Brokerage Service
 * Generates contingency reroute plans using live carrier rates.
 *
 * Integrations:
 * - CarrierRatesService — real (mock-backed) rate lookups per route and mode
 * - CacheService        — caches generated plans to avoid redundant computation
 */
@Injectable({ deps: [CarrierRatesService, CacheService] })
export class BrokerageService {
  constructor(
    private carrierRates: CarrierRatesService,
    private cache: CacheService,
  ) {}

  /**
   * Generate a contingency plan for an affected shipment.
   * Fetches real carrier rates and ranks options by cost-effectiveness.
   */
  async generateContingencyPlan(
    shipment: Shipment,
    threat: Threat,
    impact: Impact,
  ): Promise<ContingencyPlan> {
    const cacheKey = `brokerage:plan:${shipment.id}:${threat.id}`;
    const cached = await this.cache.get<ContingencyPlan>(cacheKey);
    if (cached) return cached;

    const options = await this.generateRerouteOptions(shipment, threat);

    // Rank by delay-reduction per dollar (cost-effectiveness)
    const ranked = options.sort((a, b) => {
      const scoreA = a.delayReduction / Math.max(a.additionalCost, 1);
      const scoreB = b.delayReduction / Math.max(b.additionalCost, 1);
      return scoreB - scoreA;
    });

    const best = ranked[0];
    const recommendation = best
      ? {
          optionId: best.id,
          rationale: `${best.carrier} via ${best.transportMode} saves ${(best.delayReduction / 24).toFixed(1)} days for $${best.additionalCost.toFixed(0)}`,
          expectedOutcome: `Shipment arrives ${(best.delayReduction / 24).toFixed(1)} days earlier with ${(best.carrierReliability * 100).toFixed(0)}% on-time reliability`,
        }
      : {
          optionId: '',
          rationale: 'No viable alternatives found in carrier network',
          expectedOutcome: 'Recommend accepting delay or manual negotiation with current carrier',
        };

    const plan: ContingencyPlan = {
      id: `plan-${shipment.id}-${threat.id}`,
      shipmentId: shipment.id,
      threatId: threat.id,
      options: ranked,
      recommendation,
      approvalRequired: ranked.length > 0 && ranked[0].additionalCost > 50_000,
      approvalThreshold: 50_000,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    await this.cache.set(cacheKey, plan, REROUTE_CACHE_TTL);
    return plan;
  }

  /**
   * Generate reroute options by querying CarrierRatesService per mode.
   */
  private async generateRerouteOptions(shipment: Shipment, threat: Threat): Promise<RerouteOption[]> {
    const options: RerouteOption[] = [];

    // Option 1: Air freight upgrade (skip if already air)
    if (shipment.transportMode !== 'air') {
      const airOption = await this.buildAirFreightOption(shipment, threat);
      if (airOption) options.push(airOption);
    }

    // Option 2: Alternative sea route via different hub
    const altSeaOption = await this.buildAlternativeSeaOption(shipment, threat);
    if (altSeaOption) options.push(altSeaOption);

    // Option 3: Truck/rail for last-mile (EU destinations)
    const truckOption = await this.buildTruckOption(shipment, threat);
    if (truckOption) options.push(truckOption);

    return options;
  }

  /**
   * Build air freight reroute — uses CarrierRatesService to find the fastest air rate.
   */
  private async buildAirFreightOption(shipment: Shipment, threat: Threat): Promise<RerouteOption | null> {
    // Fetch air rates for this route from CarrierRatesService
    const rates = await this.carrierRates.getRatesForRoute(
      shipment.origin.port,
      shipment.destination.port,
      'air',
    );

    // Fall back to any air rate if no direct route found
    const airRates = rates.length > 0
      ? rates
      : await this.carrierRates.getRatesByMode('air');

    if (airRates.length === 0) {
      // Hard-coded fallback when no rates exist at all
      return this.fallbackAirOption(shipment, threat);
    }

    // Pick fastest air carrier
    const best = airRates.reduce((a, b) => a.estimatedDays < b.estimatedDays ? a : b);
    const additionalCost = best.costPerUnit * shipment.weight;
    const delayReduction = 20 * 24; // Save ~20 days vs sea

    return {
      id: `reroute-air-${shipment.id}`,
      shipmentId: shipment.id,
      threatId: threat.id,
      transportMode: 'air',
      carrier: best.carrier,
      origin: { port: shipment.origin.port, lat: shipment.origin.lat, lng: shipment.origin.lng },
      destination: { port: shipment.destination.port, lat: shipment.destination.lat, lng: shipment.destination.lng },
      estimatedDeparture: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
      estimatedArrival: new Date(Date.now() + best.estimatedDays * 24 * 60 * 60 * 1000).toISOString(),
      delayReduction,
      additionalCost,
      costPerDay: additionalCost / (delayReduction / 24),
      riskScore: 0.05,
      carrierReliability: best.reliability / 100,
      capacity: best.capacity,
      spotRate: best.costPerUnit,
      validUntil: best.validUntil,
      status: RerouteStatus.PROPOSED,
    };
  }

  /**
   * Build alternative sea route via a hub port.
   */
  private async buildAlternativeSeaOption(shipment: Shipment, threat: Threat): Promise<RerouteOption | null> {
    // Try to find sea rates via Singapore as an intermediate hub
    const hubPort = 'Singapore';
    const rates = await this.carrierRates.getRatesForRoute(hubPort, shipment.destination.port, 'sea');
    const seaRates = rates.length > 0
      ? rates
      : await this.carrierRates.getRatesForRoute(shipment.origin.port, shipment.destination.port, 'sea');

    if (seaRates.length === 0) return this.fallbackSeaOption(shipment, threat);

    const best = seaRates.reduce((a, b) => a.costPerUnit < b.costPerUnit ? a : b);
    const additionalCost = best.costPerUnit * shipment.weight * 0.05; // ~5% cost premium
    const delayReduction = -5 * 24; // Alternative sea adds ~5 days

    return {
      id: `reroute-sea-alt-${shipment.id}`,
      shipmentId: shipment.id,
      threatId: threat.id,
      transportMode: 'sea',
      carrier: best.carrier,
      origin: { port: hubPort, lat: 1.35, lng: 103.82 },
      destination: { port: shipment.destination.port, lat: shipment.destination.lat, lng: shipment.destination.lng },
      estimatedDeparture: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      estimatedArrival: new Date(Date.now() + (best.estimatedDays + 5) * 24 * 60 * 60 * 1000).toISOString(),
      delayReduction,
      additionalCost,
      costPerDay: Math.abs(additionalCost / (delayReduction / 24)),
      riskScore: 0.15,
      carrierReliability: best.reliability / 100,
      capacity: best.capacity,
      spotRate: best.costPerUnit,
      validUntil: best.validUntil,
      status: RerouteStatus.PROPOSED,
    };
  }

  /**
   * Build truck/rail reroute for European destinations.
   */
  private async buildTruckOption(shipment: Shipment, threat: Threat): Promise<RerouteOption | null> {
    const euCountries = ['Netherlands', 'Germany', 'Belgium', 'France', 'Poland'];
    if (!euCountries.includes(shipment.destination.country)) return null;

    const rates = await this.carrierRates.getRatesForRoute(
      'Rotterdam',
      shipment.destination.port,
      'truck',
    );
    if (rates.length === 0) return this.fallbackTruckOption(shipment, threat);

    const best = rates.reduce((a, b) => a.reliability > b.reliability ? a : b);
    const additionalCost = best.costPerUnit * shipment.weight;
    const delayReduction = 2 * 24;

    return {
      id: `reroute-truck-${shipment.id}`,
      shipmentId: shipment.id,
      threatId: threat.id,
      transportMode: 'truck',
      carrier: best.carrier,
      origin: { port: 'Rotterdam', lat: 51.95, lng: 4.1 },
      destination: { port: shipment.destination.port, lat: shipment.destination.lat, lng: shipment.destination.lng },
      estimatedDeparture: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      estimatedArrival: new Date(Date.now() + (best.estimatedDays + 1) * 24 * 60 * 60 * 1000).toISOString(),
      delayReduction,
      additionalCost,
      costPerDay: additionalCost / (delayReduction / 24),
      riskScore: 0.1,
      carrierReliability: best.reliability / 100,
      capacity: best.capacity,
      spotRate: best.costPerUnit,
      validUntil: best.validUntil,
      status: RerouteStatus.PROPOSED,
    };
  }

  // ── Hardcoded fallbacks (when carrier API returns no rates) ──────────────

  private fallbackAirOption(shipment: Shipment, threat: Threat): RerouteOption {
    const additionalCost = shipment.totalValue * 0.15;
    return {
      id: `reroute-air-${shipment.id}`,
      shipmentId: shipment.id, threatId: threat.id,
      transportMode: 'air', carrier: 'Lufthansa Cargo',
      origin: { port: shipment.origin.port, lat: shipment.origin.lat, lng: shipment.origin.lng },
      destination: { port: shipment.destination.port, lat: shipment.destination.lat, lng: shipment.destination.lng },
      estimatedDeparture: new Date(Date.now() + 6 * 3600_000).toISOString(),
      estimatedArrival:   new Date(Date.now() + 3 * 86400_000).toISOString(),
      delayReduction: 480, additionalCost,
      costPerDay: additionalCost / 20,
      riskScore: 0.05, carrierReliability: 0.98, capacity: 50,
      spotRate: additionalCost / shipment.containerCount,
      validUntil: new Date(Date.now() + 2 * 3600_000).toISOString(),
      status: RerouteStatus.PROPOSED,
    };
  }

  private fallbackSeaOption(shipment: Shipment, threat: Threat): RerouteOption {
    const additionalCost = shipment.totalValue * 0.05;
    return {
      id: `reroute-sea-alt-${shipment.id}`,
      shipmentId: shipment.id, threatId: threat.id,
      transportMode: 'sea', carrier: 'CMA CGM',
      origin: { port: 'Singapore', lat: 1.35, lng: 103.82 },
      destination: { port: shipment.destination.port, lat: shipment.destination.lat, lng: shipment.destination.lng },
      estimatedDeparture: new Date(Date.now() + 12 * 3600_000).toISOString(),
      estimatedArrival:   new Date(Date.now() + 35 * 86400_000).toISOString(),
      delayReduction: -120, additionalCost,
      costPerDay: additionalCost / 5,
      riskScore: 0.15, carrierReliability: 0.91, capacity: 300,
      spotRate: additionalCost / shipment.containerCount,
      validUntil: new Date(Date.now() + 4 * 3600_000).toISOString(),
      status: RerouteStatus.PROPOSED,
    };
  }

  private fallbackTruckOption(shipment: Shipment, threat: Threat): RerouteOption {
    const additionalCost = shipment.totalValue * 0.08;
    return {
      id: `reroute-truck-${shipment.id}`,
      shipmentId: shipment.id, threatId: threat.id,
      transportMode: 'truck', carrier: 'Sennder',
      origin: { port: 'Rotterdam', lat: 51.95, lng: 4.1 },
      destination: { port: shipment.destination.port, lat: shipment.destination.lat, lng: shipment.destination.lng },
      estimatedDeparture: new Date(Date.now() + 24 * 3600_000).toISOString(),
      estimatedArrival:   new Date(Date.now() + 26 * 3600_000).toISOString(),
      delayReduction: 48, additionalCost,
      costPerDay: additionalCost / 2,
      riskScore: 0.1, carrierReliability: 0.93, capacity: 200,
      spotRate: additionalCost / shipment.containerCount,
      validUntil: new Date(Date.now() + 6 * 3600_000).toISOString(),
      status: RerouteStatus.PROPOSED,
    };
  }

  /** Execute booking — marks option as EXECUTED with a booking reference */
  executeBooking(option: RerouteOption): RerouteOption {
    return {
      ...option,
      status: RerouteStatus.EXECUTED,
      executedAt: new Date().toISOString(),
      bookingReference: `BK-${Date.now().toString(36).toUpperCase()}`,
    };
  }

  /** Approve reroute — marks option as APPROVED */
  approveReroute(option: RerouteOption, approvedBy: string): RerouteOption {
    return {
      ...option,
      status: RerouteStatus.APPROVED,
      approvedBy,
      approvedAt: new Date().toISOString(),
    };
  }
}
