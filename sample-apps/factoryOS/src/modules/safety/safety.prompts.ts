import { PromptDecorator as Prompt, ExecutionContext, Injectable } from '@nitrostack/core';

@Injectable()
export class SafetyPrompts {
  @Prompt({
    name: 'safety_agent_prompt',
    description: 'Specialist AI Prompt for evaluating plant safety hazards, workplace compliance, and incident logging.',
    arguments: [
      { name: 'incidentDescription', description: 'Description of observed hazard or safety incident', required: true }
    ]
  })
  async safetyPrompt(input: { incidentDescription: string }, _ctx: ExecutionContext) {
    return {
      messages: [
        {
          role: 'system',
          content: `You are the Safety & EHS Specialist AI Agent for FactoryOS.
Your responsibilities:
1. Assess workplace safety hazards and environmental safety compliance.
2. Generate formal OSHA incident reports and mitigation protocols.`
        },
        {
          role: 'user',
          content: `Assess safety hazard: ${input.incidentDescription}`
        }
      ]
    };
  }
}
