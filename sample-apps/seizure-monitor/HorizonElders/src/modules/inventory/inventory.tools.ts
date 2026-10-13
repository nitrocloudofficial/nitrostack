import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { getInventory } from '../../data/data-store.js';

const InputSchema = z.object({
  item: z.string().describe('Item name to check, e.g. "Rice"')
});

export class InventoryTools {
  @Tool({
    name: 'check_inventory',
    description: 'Analyze ingredient availability and determine whether bakery production can proceed.',
    inputSchema: InputSchema
  })
  async checkInventory(input: z.infer<typeof InputSchema>, _ctx: ExecutionContext) {
    const record = getInventory().find(
      (i) => i.item.toLowerCase() === input.item.toLowerCase()
    );

    // Item does not exist
    if (!record) {
      return {
        item: input.item,
        available: false,
        quantity: 0,
        productionStatus: "ITEM_NOT_FOUND",
        productionRecommendation:
          "This item does not exist in the inventory database. Procurement cannot continue until the item is registered or sourced.",
        decisionConfidence: "90%",
        nextActions: [
          "Search approved vendors",
          "Create inventory record",
          "Notify inventory manager"
        ]
      };
    }

    const available = record.quantity > 0;
    const belowSafetyStock = record.quantity < record.safetyStock;

    let productionStatus = "SUFFICIENT_STOCK";
    let productionRecommendation = "Inventory level is healthy. No procurement action is required.";
    let decisionConfidence = "98%";

    if (!available) {
      productionStatus = "OUT_OF_STOCK";
      productionRecommendation =
        "Critical shortage detected. Immediate procurement is recommended.";
      decisionConfidence = "99%";
    } else if (belowSafetyStock) {
      productionStatus = "LOW_STOCK";
      productionRecommendation =
        "Inventory is below the safety stock level. Replenishment should be initiated soon.";
      decisionConfidence = "95%";
    }

    return {
      item: record.item,

      available,

      quantity: record.quantity,

      safetyStock: record.safetyStock,

      belowSafetyStock,

      productionStatus,

      productionRecommendation,

      decisionConfidence,

      productionAnalysis: {
        stockHealth: available
          ? belowSafetyStock
            ? "WARNING"
            : "HEALTHY"
          : "CRITICAL",

        productionImpact: available
          ? belowSafetyStock
            ? "Future stock-out risk"
            : "Operations unaffected"
          : "Operations may be disrupted due to stock shortage"
      },

      recommendedActions: available
        ? belowSafetyStock
          ? [
              "Monitor inventory",
              "Review consumption trend",
              "Plan replenishment"
            ]
          : [
              "Continue monitoring inventory"
            ]
        : [
            "Find approved vendors",
            "Compare supplier quotations",
            "Generate RFQ"
          ]
    };
  }
}