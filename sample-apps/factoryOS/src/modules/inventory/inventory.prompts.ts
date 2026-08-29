import { PromptDecorator as Prompt, ExecutionContext, Injectable } from '@nitrostack/core';

@Injectable()
export class InventoryPrompts {
  @Prompt({
    name: 'inventory_agent_prompt',
    description: 'Specialist AI Prompt for checking inventory levels, detecting shortages, and recommending material replenishment.',
    arguments: [
      { name: 'partNumber', description: 'Component or raw material part number', required: false }
    ]
  })
  async inventoryPrompt(input: { partNumber?: string }, _ctx: ExecutionContext) {
    return {
      messages: [
        {
          role: 'system',
          content: `You are the Inventory Specialist AI Agent for FactoryOS.
Your responsibilities:
1. Inspect inventory levels across plant warehouses.
2. Detect stock shortages and evaluate reorder points.
3. Recommend optimal replenishment quantities.`
        },
        {
          role: 'user',
          content: `Analyze inventory status for ${input.partNumber || 'all critical components'}.`
        }
      ]
    };
  }
}
