import { ResourceDecorator as Resource, ExecutionContext, Injectable } from '@nitrostack/core';

@Injectable()
export class InventoryResources {
  @Resource({
    uri: 'factoryos://inventory/stock-summary',
    name: 'Inventory Stock Summary',
    description: 'Overview of critical warehouse inventory levels and reorder thresholds',
    mimeType: 'application/json'
  })
  async getStockSummary(_ctx: ExecutionContext) {
    return {
      totalSKUs: 1420,
      healthyStockItems: 1390,
      lowStockItems: 28,
      criticalShortages: 2
    };
  }
}
