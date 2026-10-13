import { Module, ToolDecorator as Tool, Injectable, z } from '@nitrostack/core';
import { InventoryResources } from './inventory.resources.js';
import { InventoryPrompts } from './inventory.prompts.js';
import { StateService } from './state.service.js';
import { autonomyLedger } from './autonomy-ledger.service.js';

@Injectable({ deps: [StateService] })
export class InventoryTools {
  constructor(private state: StateService) {}

  @Tool({
    name: 'check_inventory',
    description: 'Checks stock level for a specific part, and flags whether it is shared with other machines (cross-machine risk).',
    inputSchema: z.object({ part: z.string() }),
  })
  async check_inventory({ part }: { part: string }) {
    const state = this.state.getState();
    const item = state.inventory[part];
    if (!item) return { error: `Part ${part} not found in inventory` };

    const sharedWith = Object.entries(state.machines)
      .filter(([, m]) => m.bearing_id === part)
      .map(([id]) => id);

    const shortage = item.on_hand < item.reorder_point;

    autonomyLedger.recordAction({
      agentName: 'Inventory',
      actionType: 'check_inventory',
      inputSummary: `Check inventory for ${part}`,
      decision: `${part} stock = ${item.on_hand}${shortage ? ' — SHORTAGE' : ''}${sharedWith.length > 1 ? `, shared by ${sharedWith.join(', ')} (cross-machine risk)` : ''}`,
      confidence: 1,
      reasoning: 'Direct lookup against inventory table.',
      policyParams: {},
    });

    return {
      part,
      onHand: item.on_hand,
      reorderPoint: item.reorder_point,
      unitCost: item.unit_cost,
      location: item.location,
      shortage,
      sharedWithMachines: sharedWith,
      crossMachineRisk: sharedWith.length > 1,
    };
  }

  @Tool({
    name: 'search_nearby_warehouse',
    description: 'Checks whether a part has stock at its tracked warehouse location.',
    inputSchema: z.object({ part: z.string() }),
  })
  async search_nearby_warehouse({ part }: { part: string }) {
    const state = this.state.getState();
    const item = state.inventory[part];
    if (!item) return { error: `Part ${part} not found in inventory` };

    const found = item.on_hand > 0;

    autonomyLedger.recordAction({
      agentName: 'Inventory',
      actionType: 'search_nearby_warehouse',
      inputSummary: `Search warehouses for ${part}`,
      decision: found
        ? `Found ${item.on_hand} units at ${item.location}`
        : `No stock at ${item.location}`,
      confidence: 1,
      reasoning: 'Direct lookup against tracked warehouse location.',
      policyParams: {},
    });

    return {
      part,
      warehouses: found ? [{ location: item.location, quantityAvailable: item.on_hand }] : [],
    };
  }
}

@Module({
  name: 'inventory',
  description: 'FactoryOS Inventory & Stock Management Module',
  controllers: [InventoryTools, InventoryResources, InventoryPrompts],
  providers: [StateService],
})
export class InventoryModule {}
