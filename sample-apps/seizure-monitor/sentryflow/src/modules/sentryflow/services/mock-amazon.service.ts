/**
 * MockAmazonService
 * 
 * Simulates Amazon Seller Central API responses for dispatch/return logs and order metadata.
 * Includes 4 test cases: AirPods empty-box (fraud), clean order, ambiguous case, and COD chargeback.
 */

import { Injectable } from '@nitrostack/core';
import { PackageLog, OrderMeta } from '../sentryflow.types.js';

@Injectable()
export class MockAmazonService {
  private mockOrders: Map<string, { dispatch: PackageLog; returned: PackageLog; meta: OrderMeta }> = new Map();

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData() {
    // Case 1: AirPods Pro empty-box fraud (weight mismatch + high return rate)
    this.mockOrders.set('408-98213-1102', {
      dispatch: {
        orderId: '408-98213-1102',
        weightGrams: 250,
        courierNotes: 'Sealed box, weight verified at dispatch',
        timestamp: '2025-01-15T10:30:00Z',
      },
      returned: {
        orderId: '408-98213-1102',
        weightGrams: 45,
        courierNotes: 'seal_intact_but_light, buyer claims empty box received',
        timestamp: '2025-01-18T14:22:00Z',
      },
      meta: {
        orderId: '408-98213-1102',
        claimValueINR: 45000,
        accountReturnRate90d: 0.55,
        priorDamageComplaintsThisSku: 0,
        buyerName: 'Rajesh Kumar',
        buyerAddress: '123 MG Road, Bangalore 560001',
        sku: 'B0CHXSMR2L',
      },
    });

    // Case 2: Clean order (no fraud signals)
    this.mockOrders.set('408-98213-1103', {
      dispatch: {
        orderId: '408-98213-1103',
        weightGrams: 300,
        courierNotes: 'Sealed box, weight verified',
        timestamp: '2025-01-16T09:15:00Z',
      },
      returned: {
        orderId: '408-98213-1103',
        weightGrams: 295,
        courierNotes: 'Damaged in transit, buyer reports water damage',
        timestamp: '2025-01-19T11:45:00Z',
      },
      meta: {
        orderId: '408-98213-1103',
        claimValueINR: 8500,
        accountReturnRate90d: 0.05,
        priorDamageComplaintsThisSku: 3,
        buyerName: 'Priya Sharma',
        buyerAddress: '456 Park Street, Kolkata 700016',
        sku: 'B0CHXSMR2L',
      },
    });

    // Case 3: Ambiguous case (mid-value, borderline signals for confidence-gate demo)
    this.mockOrders.set('408-98213-1104', {
      dispatch: {
        orderId: '408-98213-1104',
        weightGrams: 200,
        courierNotes: 'Standard packaging',
        timestamp: '2025-01-17T08:00:00Z',
      },
      returned: {
        orderId: '408-98213-1104',
        weightGrams: 160,
        courierNotes: 'Buyer reports missing accessories',
        timestamp: '2025-01-20T16:30:00Z',
      },
      meta: {
        orderId: '408-98213-1104',
        claimValueINR: 12000,
        accountReturnRate90d: 0.35,
        priorDamageComplaintsThisSku: 1,
        buyerName: 'Amit Patel',
        buyerAddress: '789 Sector 5, Noida 201301',
        sku: 'B0CHXSMR2L',
      },
    });

    // Case 4: COD chargeback trace (for roadmap mention)
    this.mockOrders.set('408-98213-1105', {
      dispatch: {
        orderId: '408-98213-1105',
        weightGrams: 180,
        courierNotes: 'COD order, UPI trace available',
        timestamp: '2025-01-18T12:00:00Z',
      },
      returned: {
        orderId: '408-98213-1105',
        weightGrams: 175,
        courierNotes: 'Buyer initiated chargeback via UPI',
        timestamp: '2025-01-21T10:15:00Z',
      },
      meta: {
        orderId: '408-98213-1105',
        claimValueINR: 6500,
        accountReturnRate90d: 0.42,
        priorDamageComplaintsThisSku: 0,
        buyerName: 'Vikram Singh',
        buyerAddress: '321 Connaught Place, Delhi 110001',
        sku: 'B0CHXSMR2L',
      },
    });
  }

  async getDispatchLog(orderId: string): Promise<PackageLog> {
    const order = this.mockOrders.get(orderId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }
    return order.dispatch;
  }

  async getReturnLog(orderId: string): Promise<PackageLog> {
    const order = this.mockOrders.get(orderId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }
    return order.returned;
  }

  async getOrderMeta(orderId: string): Promise<OrderMeta> {
    const order = this.mockOrders.get(orderId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }
    return order.meta;
  }

  /**
   * Override return rate for live Q&A demo
   */
  async getOrderMetaWithOverride(orderId: string, returnRateOverride?: number): Promise<OrderMeta> {
    const meta = await this.getOrderMeta(orderId);
    if (returnRateOverride !== undefined) {
      return { ...meta, accountReturnRate90d: returnRateOverride };
    }
    return meta;
  }

  /**
   * List all available test order IDs
   */
  getAvailableOrderIds(): string[] {
    return Array.from(this.mockOrders.keys());
  }
}
