import { Injectable } from '@nitrostack/core';
import { z } from 'zod';

/**
 * Carrier Rate Quote Schema
 */
const CarrierRateSchema = z.object({
  id: z.string(),
  carrier: z.string(),
  origin: z.string(),
  destination: z.string(),
  transportMode: z.enum(['sea', 'air', 'truck', 'rail', 'multimodal']),
  costPerUnit: z.number().describe('Cost per kg or per container'),
  estimatedDays: z.number(),
  reliability: z.number().min(0).max(100).describe('On-time delivery %'),
  capacity: z.number().describe('Available capacity in units'),
  currency: z.string().default('USD'),
  validUntil: z.string().datetime(),
  notes: z.string().optional(),
});

export type CarrierRate = z.infer<typeof CarrierRateSchema>;

/**
 * Carrier Rates Service
 * Abstracts carrier rate lookups (mock now, real API later)
 */
@Injectable()
export class CarrierRatesService {
  private rates: CarrierRate[] = this.initializeMockRates();

  /**
   * Get rates for a route
   */
  async getRatesForRoute(
    origin: string,
    destination: string,
    transportMode?: string
  ): Promise<CarrierRate[]> {
    return this.rates.filter(
      (r) =>
        r.origin.toLowerCase().includes(origin.toLowerCase()) &&
        r.destination.toLowerCase().includes(destination.toLowerCase()) &&
        (!transportMode || r.transportMode === transportMode)
    );
  }

  /**
   * Get best rate by cost
   */
  async getBestRateByCost(origin: string, destination: string): Promise<CarrierRate | null> {
    const rates = await this.getRatesForRoute(origin, destination);
    if (rates.length === 0) return null;
    return rates.reduce((best, current) =>
      current.costPerUnit < best.costPerUnit ? current : best
    );
  }

  /**
   * Get best rate by reliability
   */
  async getBestRateByReliability(origin: string, destination: string): Promise<CarrierRate | null> {
    const rates = await this.getRatesForRoute(origin, destination);
    if (rates.length === 0) return null;
    return rates.reduce((best, current) =>
      current.reliability > best.reliability ? current : best
    );
  }

  /**
   * Get best rate by speed
   */
  async getBestRateBySpeed(origin: string, destination: string): Promise<CarrierRate | null> {
    const rates = await this.getRatesForRoute(origin, destination);
    if (rates.length === 0) return null;
    return rates.reduce((best, current) =>
      current.estimatedDays < best.estimatedDays ? current : best
    );
  }

  /**
   * Get rates by carrier
   */
  async getRatesByCarrier(carrier: string): Promise<CarrierRate[]> {
    return this.rates.filter((r) => r.carrier.toLowerCase().includes(carrier.toLowerCase()));
  }

  /**
   * Get rates by transport mode
   */
  async getRatesByMode(mode: string): Promise<CarrierRate[]> {
    return this.rates.filter((r) => r.transportMode === mode);
  }

  /**
   * Calculate total cost for shipment
   */
  async calculateShipmentCost(
    origin: string,
    destination: string,
    weight: number,
    transportMode?: string
  ): Promise<{ rate: CarrierRate; totalCost: number } | null> {
    const rate = await this.getBestRateByCost(origin, destination);
    if (!rate || (transportMode && rate.transportMode !== transportMode)) {
      return null;
    }
    return {
      rate,
      totalCost: rate.costPerUnit * weight,
    };
  }

  /**
   * Get all available carriers
   */
  async getAllCarriers(): Promise<string[]> {
    return [...new Set(this.rates.map((r) => r.carrier))];
  }

  /**
   * Get rates with available capacity
   */
  async getRatesWithCapacity(origin: string, destination: string, required: number): Promise<CarrierRate[]> {
    return this.rates.filter(
      (r) =>
        r.origin.toLowerCase().includes(origin.toLowerCase()) &&
        r.destination.toLowerCase().includes(destination.toLowerCase()) &&
        r.capacity >= required
    );
  }

  /**
   * Initialize mock carrier rates
   */
  private initializeMockRates(): CarrierRate[] {
    const now = new Date();
    const validUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    return [
      // Shanghai to Rotterdam (Sea)
      {
        id: 'rate-001',
        carrier: 'Maersk',
        origin: 'Shanghai',
        destination: 'Rotterdam',
        transportMode: 'sea',
        costPerUnit: 2.5,
        estimatedDays: 35,
        reliability: 94,
        capacity: 500,
        currency: 'USD',
        validUntil,
        notes: 'Standard service, weekly departures',
      },
      {
        id: 'rate-002',
        carrier: 'CMA CGM',
        origin: 'Shanghai',
        destination: 'Rotterdam',
        transportMode: 'sea',
        costPerUnit: 2.3,
        estimatedDays: 36,
        reliability: 91,
        capacity: 400,
        currency: 'USD',
        validUntil,
        notes: 'Competitive pricing',
      },
      {
        id: 'rate-003',
        carrier: 'Lufthansa Cargo',
        origin: 'Shanghai',
        destination: 'Rotterdam',
        transportMode: 'air',
        costPerUnit: 8.5,
        estimatedDays: 3,
        reliability: 98,
        capacity: 50,
        currency: 'USD',
        validUntil,
        notes: 'Express service, premium reliability',
      },

      // Shanghai to Los Angeles (Sea)
      {
        id: 'rate-004',
        carrier: 'Maersk',
        origin: 'Shanghai',
        destination: 'Los Angeles',
        transportMode: 'sea',
        costPerUnit: 1.8,
        estimatedDays: 12,
        reliability: 95,
        capacity: 600,
        currency: 'USD',
        validUntil,
        notes: 'Transpacific service',
      },
      {
        id: 'rate-005',
        carrier: 'FedEx',
        origin: 'Shanghai',
        destination: 'Los Angeles',
        transportMode: 'air',
        costPerUnit: 7.2,
        estimatedDays: 2,
        reliability: 99,
        capacity: 80,
        currency: 'USD',
        validUntil,
        notes: 'Premium express service',
      },

      // Singapore to Rotterdam (Sea)
      {
        id: 'rate-006',
        carrier: 'Sennder',
        origin: 'Singapore',
        destination: 'Rotterdam',
        transportMode: 'sea',
        costPerUnit: 2.4,
        estimatedDays: 32,
        reliability: 92,
        capacity: 350,
        currency: 'USD',
        validUntil,
        notes: 'Flexible scheduling',
      },

      // Rotterdam to Shanghai (Return)
      {
        id: 'rate-007',
        carrier: 'Maersk',
        origin: 'Rotterdam',
        destination: 'Shanghai',
        transportMode: 'sea',
        costPerUnit: 2.2,
        estimatedDays: 38,
        reliability: 93,
        capacity: 450,
        currency: 'USD',
        validUntil,
        notes: 'Backhaul service',
      },

      // Truck rates (Europe)
      {
        id: 'rate-008',
        carrier: 'Sennder',
        origin: 'Rotterdam',
        destination: 'Frankfurt',
        transportMode: 'truck',
        costPerUnit: 0.8,
        estimatedDays: 1,
        reliability: 96,
        capacity: 200,
        currency: 'USD',
        validUntil,
        notes: 'Same-day delivery available',
      },
      {
        id: 'rate-009',
        carrier: 'Flexport',
        origin: 'Los Angeles',
        destination: 'Chicago',
        transportMode: 'truck',
        costPerUnit: 0.6,
        estimatedDays: 3,
        reliability: 94,
        capacity: 300,
        currency: 'USD',
        validUntil,
        notes: 'Cross-country service',
      },
    ];
  }
}
