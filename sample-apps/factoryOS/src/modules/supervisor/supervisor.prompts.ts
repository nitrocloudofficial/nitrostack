import { PromptDecorator as Prompt, ExecutionContext, Injectable } from '@nitrostack/core';

@Injectable()
export class SupervisorPrompts {
  @Prompt({
    name: 'supervisor_agent_prompt',
    description: 'System prompt for the FactoryOS Supervisor Agent to route user requests and consolidate specialist responses.',
    arguments: [
      {
        name: 'userQuery',
        description: 'Manufacturing query or operational incident statement',
        required: true
      }
    ]
  })
  async supervisorPrompt(input: { userQuery: string }, _ctx: ExecutionContext) {
    return {
      messages: [
        {
          role: 'system',
          content: `You are the Master Supervisor AI Agent for FactoryOS, an autonomous smart manufacturing platform.
Your responsibilities:
1. Receive incoming plant user requests and operational incident alerts.
2. Determine which specialist AI agents (Maintenance, Inventory, Procurement, Production, Safety) must handle sub-tasks.
3. Coordinate multi-agent responses and synthesize a unified, action-oriented executive summary.`
        },
        {
          role: 'user',
          content: input.userQuery
        }
      ]
    };
  }
}
