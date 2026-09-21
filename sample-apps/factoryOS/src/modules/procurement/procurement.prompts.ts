import { PromptDecorator as Prompt, ExecutionContext, Injectable } from '@nitrostack/core';

@Injectable()
export class ProcurementPrompts {
  @Prompt({
    name: 'procurement_agent_prompt',
    description: 'Specialist AI Prompt for vendor discovery, autonomous price/lead-time negotiations, and PO generation.',
    arguments: [
      { name: 'materialRequired', description: 'Description of material or component to source', required: true }
    ]
  })
  async procurementPrompt(input: { materialRequired: string }, _ctx: ExecutionContext) {
    return {
      messages: [
        {
          role: 'system',
          content: `You are the Procurement Specialist AI Agent for FactoryOS.
Your responsibilities:
1. Search registered vendor networks for required industrial components.
2. Automate terms and price negotiations with suppliers.
3. Generate formal purchase orders.`
        },
        {
          role: 'user',
          content: `Source and negotiate procurement for: ${input.materialRequired}`
        }
      ]
    };
  }
}
