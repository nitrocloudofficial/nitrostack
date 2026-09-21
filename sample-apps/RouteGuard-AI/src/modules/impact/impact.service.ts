import { Injectable } from '@nitrostack/core';
import { Impact } from '../../shared/domain/impact.js';
import { Threat } from '../../shared/domain/threat.js';
import { Shipment } from '../../shared/domain/shipment.js';
import { ERPService } from '../../shared/services/erp.service.js';
import { CacheService } from '../../shared/services/cache.service.js';
import { DatabaseService } from '../../shared/services/database.service.js';

const IMPACT_CACHE_TTL = 1800; // 30 minutes

/**
 * Impact Analysis Service
 * Evaluates which shipments/inventory/manufacturing lines are vulnerable to threats
 * and calculates financial/time-delay impact.
 *
 * Integrations:
 * - ERPService     — live shipment data (replaces raw MOCK_SHIPMENTS import)
 * - CacheService   — caches impact analyses to avoid re-computation
 * - DatabaseService — persists impact results for audit trail
 */
@Injectable({ deps: [ERPService, CacheService, DatabaseService] })
export class ImpactService {
  constructor(
    private erp: ERPService,
    private cache: CacheService,
    private db: DatabaseService,
  ) {}

  /**
   * Analyze the impact of a threat on all active shipments.
   * Result is cached per threat ID for IMPACT_CACHE_TTL seconds.
   */
  async analyzeSupplyChainImpact(threat: Threat): Promise<Impact> {
    const cacheKey = `impact:threat:${threat.id}`;

    // 1. Return cached result if available
    const cached = await this.cache.get<Impact>(cacheKey);
    if (cached) return cached;

    // 2. Fetch live shipments from ERP
    const shipments = await this.erp.getAllShipments();

    // 3. Find and score affected shipments
    const affectedShipments = this.findAffectedShipments(threat, shipments);

    const totalFinancialExposure = affectedShipments.reduce((s, a) => s + a.financialExposure, 0);
    const totalDelayHours       = affectedShipments.reduce((s, a) => s + a.delayHours, 0);
    const customerCount         = new Set(affectedShipments.map(a => a.shipmentId)).size;

    // SLA breach risk: blend of delay severity and financial exposure
    const slaBreachRisk = Math.min(
      (totalDelayHours / 168) * 0.5 + (totalFinancialExposure / 1_000_000) * 0.5,
      1
    );

    const impact: Impact = {
      id: `impact-${threat.id}-${Date.now()}`,
      threatId: threat.id,
      affectedShipments,
      totalFinancialExposure,
      totalDelayHours,
      customerCount,
      slaBreachRisk,
      calculatedAt: new Date().toISOString(),
      scenario: `Impact from ${threat.title}`,
    };

    // 4. Persist to database (non-fatal)
    try {
      for (const aff of affectedShipments) {
        await this.db.createImpact({
          threatId: threat.id,
          shipmentId: aff.shipmentId,
          affectedSkus: aff.skusAffected.length,
          financialExposure: aff.financialExposure,
          estimatedDelay: aff.delayHours,
          slaBreachRisk,
          vulnerabilityScore: Math.min(aff.financialExposure / 100_000, 1),
          mitigation: 'Pending contingency plan',
        });
      }
    } catch (_err) {
      // DB write failure is non-fatal
    }

    // 5. Cache result
    await this.cache.set(cacheKey, impact, IMPACT_CACHE_TTL);

    return impact;
  }

  /**
   * Find shipments affected by a threat based on route overlap.
   */
  private findAffectedShipments(
    threat: Threat,
    shipments: Shipment[],
  ): Array<{
    shipmentId: string;
    delayDays: number;
    delayHours: number;
    financialExposure: number;
    skusAffected: string[];
  }> {
    return shipments
      .filter(shipment =>
        threat.affectedRoutes.some(route =>
          route.includes(shipment.origin.port) || route.includes(shipment.destination.port)
        )
      )
      .map(shipment => {
        const delayDays = this.calculateDelayDays(shipment, threat);
        const delayHours = delayDays * 24;
        const financialExposure = shipment.totalValue * (delayDays / 30);
        return {
          shipmentId: shipment.id,
          delayDays,
          delayHours,
          financialExposure,
          skusAffected: shipment.skus.map(s => s.sku),
        };
      });
  }

  /**
   * Calculate estimated delay in days for a shipment due to a threat.
   */
  private calculateDelayDays(shipment: Shipment, threat: Threat): number {
    const threatStart   = new Date(threat.estimatedImpactStart);
    const threatEnd     = threat.estimatedImpactEnd ? new Date(threat.estimatedImpactEnd) : threatStart;
    const arrival       = new Date(shipment.estimatedArrival);

    if (threatEnd < arrival && threatStart > arrival) return 0;

    const threatDurationDays = (threatEnd.getTime() - threatStart.getTime()) / (1000 * 60 * 60 * 24);
    const multiplier: Record<string, number> = { low: 0.5, medium: 1.5, high: 3, critical: 7 };
    return Math.max(0, threatDurationDays * (multiplier[threat.severity] ?? 1));
  }

  /**
   * Get all DB-persisted impacts for a specific shipment.
   */
  async getImpactsForShipment(shipmentId: string): Promise<unknown[]> {
    try {
      return await this.db.getImpactsByShipment(shipmentId);
    } catch (_err) {
      return [];
    }
  }

  /**
   * Get all DB-persisted impacts for a specific threat.
   */
  async getImpactsForThreat(threatId: string): Promise<unknown[]> {
    try {
      return await this.db.getImpactsByThreat(threatId);
    } catch (_err) {
      return [];
    }
  }

  /**
   * Calculate vulnerability matrix — which SKUs are most exposed.
   */
  calculateVulnerabilityMatrix(impacts: Impact[]) {
    const skuRiskMap = new Map<string, { count: number; totalExposure: number }>();
    for (const impact of impacts) {
      for (const shipment of impact.affectedShipments) {
        for (const sku of shipment.skusAffected) {
          const current = skuRiskMap.get(sku) ?? { count: 0, totalExposure: 0 };
          skuRiskMap.set(sku, {
            count: current.count + 1,
            totalExposure: current.totalExposure + shipment.financialExposure,
          });
        }
      }
    }
    return Array.from(skuRiskMap.entries())
      .map(([sku, data]) => ({
        sku,
        riskCount: data.count,
        totalExposure: data.totalExposure,
        riskScore: Math.min((data.count / impacts.length) * (data.totalExposure / 100_000), 1),
      }))
      .sort((a, b) => b.riskScore - a.riskScore);
  }

  /** Invalidate cached impact for a specific threat */
  async invalidateImpactCache(threatId: string): Promise<void> {
    await this.cache.delete(`impact:threat:${threatId}`);
  }
}
