import { PromptDecorator as Prompt, ExecutionContext, Injectable } from '@nitrostack/core';

@Injectable()
export class ProductionPrompts {
  @Prompt({
    name: 'production_agent_prompt',
    description: 'Specialist AI Prompt for optimizing production schedules and rerouting assembly lines during equipment outages.',
    arguments: [
      { name: 'lineId', description: 'Assembly line identifier', required: true }
    ]
  })
  async productionPrompt(input: { lineId: string }, _ctx: ExecutionContext) {
    return {
      messages: [
        {
          role: 'system',
          content: `You are the Production Specialist AI Agent for FactoryOS.
Your responsibilities:
1. Optimize factory line production schedules.
2. Dynamically reroute assembly line jobs during machine downtime.`
        },
        {
          role: 'user',
          content: `Optimize production and review rerouting options for assembly line ${input.lineId}.`
        }
      ]
    };
  }
}
