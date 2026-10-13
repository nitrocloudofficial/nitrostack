import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import {
  pharmacyService,
  recommendationService,
} from "./pharmacy.instance.js";

import { GetPharmacyStatusInputSchema } from "./pharmacy.types.js";

import {
  RecommendPharmacyReorderInputSchema,  
} from "./pharmacy.recommendations.js";

/** MCP tools for the Pharmacy module. */
export class PharmacyTools {
  @Tool({
    name: 'get_pharmacy_status',
    description:
      'Get the current status of pharmacy inventory, including stock levels ' +
      '(critical/low/normal/overstocked) and items expiring soon. This is a ' +
      'READ-ONLY monitoring tool used by the Hospital Operations Agent to ' +
      'observe pharmacy state before making any recommendation. It never ' +
      'modifies data and requires no administrator approval to call.',
    inputSchema: GetPharmacyStatusInputSchema,
    examples: {
      request: {
        category: 'antibiotics',
        includeNormal: true,
        expiringWithinDays: 30
      },
      response: {
        summary: {
          totalItems: 1,
          criticalCount: 1,
          lowCount: 0,
          normalCount: 0,
          overstockedCount: 0,
          expiringSoonCount: 1,
          generatedAt: '2026-07-31T00:00:00.000Z'
        },
        items: [
          {
            id: 'PH-001',
            name: 'Amoxicillin 500mg',
            category: 'antibiotics',
            currentStock: 40,
            reorderThreshold: 100,
            maxCapacity: 1000,
            unit: 'capsules',
            expiryDate: '2026-08-20T00:00:00.000Z',
            lastRestockedAt: '2026-06-16T00:00:00.000Z',
            status: 'critical',
            daysUntilExpiry: 20,
            isExpiringSoon: true
          }
        ]
      }
    }
  })
  async getPharmacyStatus(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Executing get_pharmacy_status', {
      category: input?.category,
      includeNormal: input?.includeNormal,
      expiringWithinDays: input?.expiringWithinDays
    });

    const parsedInput = GetPharmacyStatusInputSchema.parse(input);
    const result = await pharmacyService.getStatus(parsedInput);

    ctx.logger.info('Completed get_pharmacy_status', {
      totalItems: result.summary.totalItems,
      criticalCount: result.summary.criticalCount,
      lowCount: result.summary.lowCount,
      expiringSoonCount: result.summary.expiringSoonCount
    });

    return result;
  }
    @Tool({
    name: "recommend_pharmacy_reorder",
    description:
      "Generate AI-driven pharmacy inventory recommendations based on current stock levels and expiry information. " +
      "This tool is read-only and provides recommended actions such as reordering, quarantining expired stock, " +
      "or delaying purchases. It never modifies inventory.",
    inputSchema: RecommendPharmacyReorderInputSchema,
  })
  async recommendPharmacyReorder(input: any, ctx: ExecutionContext) {
    ctx.logger.info("Executing recommend_pharmacy_reorder", {
      category: input?.category,
      includeLowPriority: input?.includeLowPriority,
      expiringWithinDays: input?.expiringWithinDays,
    });

    const parsedInput =
      RecommendPharmacyReorderInputSchema.parse(input);

    const result =
      await recommendationService.recommendReorders(parsedInput);

    ctx.logger.info("Completed recommend_pharmacy_reorder", {
      recommendations: result.recommendations.length,
    });

    return result;
  }
}