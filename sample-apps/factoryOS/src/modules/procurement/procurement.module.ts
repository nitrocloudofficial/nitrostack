import { Module, ToolDecorator as Tool, Injectable, z } from '@nitrostack/core';
import { ProcurementResources } from './procurement.resources.js';
import { ProcurementPrompts } from './procurement.prompts.js';
import { StateService } from './state.service.js';
import { autonomyLedger } from './autonomy-ledger.service.js';

export interface LLMService {
  complete(prompt: string): Promise<string>;
}

@Injectable({ deps: [StateService] })
export class ProcurementTools {
  constructor(
    private state: StateService,
    private llm?: LLMService,
  ) {}

  @Tool({
    name: 'list_suppliers',
    description: 'Lists suppliers for a part, ranked by total cost of ownership (price + delivery_time × downtime_cost_per_hour).',
    inputSchema: z.object({ part: z.string() }),
  })
  async list_suppliers({ part }: { part: string }) {
    const state = this.state.getState();
    const downtimeCostPerHour = state.finance.downtime_cost_per_hour;

    const matches = state.suppliers
      .filter((s) => s.part === part)
      .map((s) => ({
        supplierId: s.id,
        name: s.name,
        price: s.price,
        deliveryTimeHrs: s.delivery_time_hrs,
        rating: s.rating,
        totalCostOfDelay: Math.round(s.price + s.delivery_time_hrs * downtimeCostPerHour),
      }))
      .sort((a, b) => a.totalCostOfDelay - b.totalCostOfDelay);

    autonomyLedger.recordAction({
      agentName: 'Procurement',
      actionType: 'list_suppliers',
      inputSummary: `List suppliers for ${part}`,
      decision: matches.length ? `Top match: ${matches[0].name} (total cost incl. downtime: $${matches[0].totalCostOfDelay})` : 'No suppliers found',
      confidence: 1,
      reasoning: 'Ranked by price + delivery-time-weighted downtime cost, not price alone.',
      policyParams: {},
    });

    return { part, suppliers: matches };
  }

  @Tool({
    name: 'negotiate_supplier',
    description: 'Selects and (simulated) negotiates with the best supplier for a part, explicitly weighing price against downtime cost.',
    inputSchema: z.object({ part: z.string(), quantity: z.number().min(1).default(1) }),
  })
  async negotiate_supplier({ part, quantity }: { part: string; quantity: number }) {
    const state = this.state.getState();
    const downtimeCostPerHour = state.finance.downtime_cost_per_hour;
    const candidates = state.suppliers
      .filter((s) => s.part === part)
      .map((s) => ({ ...s, totalCostOfDelay: s.price + s.delivery_time_hrs * downtimeCostPerHour }))
      .sort((a, b) => a.totalCostOfDelay - b.totalCostOfDelay);

    if (!candidates.length) return { error: `No suppliers found for ${part}` };

    const chosen = candidates[0];
    const runnerUp = candidates[1];

    let narrative =
      runnerUp && runnerUp.price < chosen.price
        ? `Selected ${chosen.name} — the ${chosen.delivery_time_hrs}hr delivery outweighs the $${chosen.price - runnerUp.price} premium over ${runnerUp.name}, given a downtime cost of $${downtimeCostPerHour}/hr.`
        : `Selected ${chosen.name} — best combination of price and delivery time among ${candidates.length} option(s).`;

    if (this.llm) {
      try {
        narrative = await this.llm.complete(
          `In 1-2 plain-language sentences, explain why we chose supplier "${chosen.name}" ` +
          `($${chosen.price}, ${chosen.delivery_time_hrs}hr delivery) over the alternatives for part ${part}, ` +
          `given a downtime cost of $${downtimeCostPerHour}/hour.`,
        );
      } catch {
        // fall back to deterministic narrative
      }
    }

    const entry = autonomyLedger.recordAction({
      agentName: 'Procurement',
      actionType: 'negotiate_supplier',
      inputSummary: `Negotiate ${quantity}x ${part}`,
      decision: `Selected ${chosen.name} at $${chosen.price}/unit, ETA ${chosen.delivery_time_hrs}hr`,
      confidence: 0.9,
      reasoning: narrative,
      policyParams: { finalPrice: chosen.price, budgetCap: Infinity },
    });

    return {
      part,
      supplierId: chosen.id,
      supplierName: chosen.name,
      pricePerUnit: chosen.price,
      deliveryTimeHrs: chosen.delivery_time_hrs,
      totalPrice: chosen.price * quantity,
      narrative,
      autonomyLevel: entry.autonomyLevel,
    };
  }

  @Tool({
    name: 'create_purchase_order',
    description: 'Generates a purchase order for a supplier, part, and quantity.',
    inputSchema: z.object({
      supplierId: z.string(),
      part: z.string(),
      quantity: z.number().min(1),
      pricePerUnit: z.number(),
    }),
  })
  async create_purchase_order({
    supplierId,
    part,
    quantity,
    pricePerUnit,
  }: {
    supplierId: string;
    part: string;
    quantity: number;
    pricePerUnit: number;
  }) {
    const state = this.state.getState();
    const supplier = state.suppliers.find((s) => s.id === supplierId);
    const amount = quantity * pricePerUnit;
    const poId = `PO-${5000 + Math.floor(Math.random() * 4000) + (Date.now() % 1000)}`;

    const entry = autonomyLedger.recordAction({
      agentName: 'Procurement',
      actionType: 'create_purchase_order',
      inputSummary: `PO for ${quantity}x ${part} from ${supplier?.name ?? supplierId}`,
      decision: `${poId} placed with ${supplier?.name ?? supplierId}, ETA ${supplier?.delivery_time_hrs ?? '?'} hours`,
      confidence: 0.9,
      reasoning: `${quantity} units at $${pricePerUnit}/unit = $${amount}.`,
      policyParams: { amount },
    });

    return {
      poId,
      supplierId,
      part,
      quantity,
      pricePerUnit,
      totalAmount: amount,
      etaHours: supplier?.delivery_time_hrs ?? null,
      autonomyLevel: entry.autonomyLevel,
    };
  }
}

@Module({
  name: 'procurement',
  description: 'FactoryOS Supplier Procurement & Negotiation Module',
  controllers: [ProcurementTools, ProcurementResources, ProcurementPrompts],
  providers: [StateService],
})
export class ProcurementModule {}
