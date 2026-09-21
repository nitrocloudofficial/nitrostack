import { ToolDecorator as Tool, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { erpStore } from '../lib/erp-store.js';

export const CreateItemSchema = z.object({
  name: z.string().describe('Item Name or Product Description (e.g. 100% Combed Cotton Yarn 30s)'),
  code: z.string().optional().describe('SKU / Item Code (e.g. YRN-30S)'),
  hsn: z.string().optional().default('5205').describe('HSN or SAC Code'),
  unit: z.string().optional().default('Kgs').describe('Unit of measurement (Kgs, Meters, Pcs, Bales)'),
  rate: z.number().positive().describe('Default Unit Price Rate in INR'),
  taxRatePct: z.number().min(0).max(100).optional().default(5).describe('GST Tax Rate Percentage (5, 12, 18, 28)'),
  initialStock: z.number().min(0).optional().default(0).describe('Initial opening stock quantity'),
  minStockWarning: z.number().min(0).optional().default(50).describe('Minimum stock warning threshold'),
});

export const ListItemsSchema = z.object({
  searchQuery: z.string().optional().describe('Search item by name, code, or HSN'),
  lowStockOnly: z.boolean().optional().default(false).describe('If true, filter to items below min stock threshold'),
});

export const UpdateStockSchema = z.object({
  itemId: z.string().describe('Item ID (e.g. ITM-001) or Item Name'),
  quantityChange: z.number().describe('Quantity to add (positive) or deduct (negative)'),
  reason: z.string().optional().describe('Reason for stock adjustment'),
});

@Injectable()
export class ItemTools {
  @Tool({
    name: 'create_item',
    description: 'Add a new product or raw material item to AlphaTex inventory with default price, HSN, and GST rate.',
    inputSchema: CreateItemSchema,
  })
  async createItem(args: z.infer<typeof CreateItemSchema>, ctx: ExecutionContext) {
    ctx.logger.info('Creating new item', { name: args.name, rate: args.rate });

    const newItem = erpStore.addItem({
      name: args.name,
      code: args.code || `SKU-${Date.now().toString().slice(-4)}`,
      hsn: args.hsn || '5205',
      unit: args.unit || 'Kgs',
      rate: args.rate,
      taxRatePct: args.taxRatePct ?? 5,
      currentStock: args.initialStock ?? 0,
      minStockWarning: args.minStockWarning ?? 50,
    });

    return {
      message: `Product '${newItem.name}' added successfully to stock inventory!`,
      item: newItem,
    };
  }

  @Tool({
    name: 'list_items',
    description: 'List products and check current stock levels, rates, HSN codes, and low stock warnings.',
    inputSchema: ListItemsSchema,
  })
  async listItems(args: z.infer<typeof ListItemsSchema>, ctx: ExecutionContext) {
    ctx.logger.info('Listing items', { query: args.searchQuery });

    let items = erpStore.getItems();

    if (args.searchQuery) {
      const q = args.searchQuery.toLowerCase();
      items = items.filter(
        i => i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q) || i.hsn.includes(q)
      );
    }

    if (args.lowStockOnly) {
      items = items.filter(i => i.currentStock <= i.minStockWarning);
    }

    return {
      totalItems: items.length,
      items: items.map(i => ({
        ...i,
        stockStatus: i.currentStock <= i.minStockWarning ? 'LOW STOCK WARNING' : 'OK',
      })),
    };
  }

  @Tool({
    name: 'update_item_stock',
    description: 'Adjust stock quantity for an item (add received goods or deduct samples).',
    inputSchema: UpdateStockSchema,
  })
  async updateStock(args: z.infer<typeof UpdateStockSchema>, ctx: ExecutionContext) {
    let item = erpStore.getItemByQuery(args.itemId);

    if (!item) {
      return { error: `Item matching '${args.itemId}' was not found in inventory.` };
    }

    const updated = erpStore.updateStock(item.id, args.quantityChange);

    return {
      message: `Stock updated for '${item.name}'!`,
      previousStock: item.currentStock - args.quantityChange,
      newStock: updated?.currentStock,
      reason: args.reason || 'Manual Adjustment',
    };
  }
}
