import { z } from 'zod';
import { ThreatSchema } from './threat.js';
import { ShipmentSchema } from './shipment.js';

/**
 * Impact Analysis Domain Types
 * Quantifies business damage from threats
 */

export const ImpactSchema = z.object({
  id: z.string().describe('Impact analysis ID'),
  threatId: z.string().describe('Associated threat'),
  affectedShipments: z.array(z.object({
    shipmentId: z.string(),
    delayDays: z.number().describe('Estimated delay in days'),
    delayHours: z.number().describe('Estimated delay in hours'),
    financialExposure: z.number().describe('Revenue at risk in USD'),
    skusAffected: z.array(z.string()).describe('SKUs impacted'),
  })).describe('Shipments vulnerable to this threat'),
  affectedInventory: z.array(z.object({
    sku: z.string(),
    warehouseId: z.string(),
    quantityAtRisk: z.number(),
    value: z.number(),
  })).optional().describe('Inventory components at risk'),
  affectedManufacturingLines: z.array(z.object({
    lineId: z.string(),
    productionStopDays: z.number(),
    downstreamImpact: z.string().describe('Which products affected'),
  })).optional().describe('Manufacturing lines that will halt'),
  totalFinancialExposure: z.number().describe('Total USD at risk'),
  totalDelayHours: z.number().describe('Aggregate delay hours'),
  customerCount: z.number().describe('Number of customers affected'),
  slaBreachRisk: z.number().min(0).max(1).describe('Probability of SLA breach'),
  calculatedAt: z.string().datetime(),
  scenario: z.string().optional().describe('Scenario name for tracking'),
});

export type Impact = z.infer<typeof ImpactSchema>;

/**
 * Impact Radar Resource
 * Aggregated view of all active impacts
 */
export const ImpactRadarSchema = z.object({
  id: z.string(),
  impacts: z.array(ImpactSchema),
  totalExposure: z.number().describe('Sum of all financial exposure'),
  criticalCount: z.number().describe('Number of critical impacts'),
  lastUpdated: z.string().datetime(),
});

export type ImpactRadar = z.infer<typeof ImpactRadarSchema>;
