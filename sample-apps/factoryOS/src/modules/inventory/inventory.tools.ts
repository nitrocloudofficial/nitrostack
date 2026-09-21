import { ToolDecorator as Tool, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { InventoryService } from '../../services/inventory.service.js';

@Injectable({ deps: [InventoryService] })
export class InventoryTools {
  constructor(private inventoryService: InventoryService) {}

  @Tool({
    name: 'check_inventory',
    description: 'Check Inventory Tool: Queries raw material & spare part stock levels, checks reorder points, and highlights shortages.',
    inputSchema: z.object({
      partNumber: z.string().optional().describe('Optional specific part SKU or component number. If omitted, returns all critical stock levels.')
    })
  })
  async checkInventory(input: { partNumber?: string }, _ctx: ExecutionContext) {
    if (input.partNumber) {
      return await this.inventoryService.checkStock(input.partNumber);
    }
    return await this.inventoryService.detectShortages();
  }

  @Tool({
    name: 'search_nearby_warehouse',
    description: 'Search Nearby Warehouse Tool: Searches regional sister warehouses for available stock of a specified component when local stock is exhausted.',
    inputSchema: z.object({
      partNumber: z.string().describe('The part SKU or component number to search for'),
      maxRadiusKm: z.number().optional().default(50).describe('Maximum search radius in kilometers (default: 50)')
    })
  })
  async searchNearbyWarehouse(input: { partNumber: string; maxRadiusKm?: number }, _ctx: ExecutionContext) {
    return await this.inventoryService.searchNearbyWarehouse(input.partNumber, input.maxRadiusKm);
  }
}
