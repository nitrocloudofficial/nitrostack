import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';
import {
  TRIAGE_AGENT_SYSTEM_PROMPT,
  buildTriageAgentUserMessage,
} from './triage-agent.system-prompt.js';
import { DEFAULT_TICKET_ID } from './mock-tickets.js';

export class TriageAgentPrompts {
  @Prompt({
    name: 'triage_agent',
    description:
      'System prompt and task message for Agent 1 (Triage & Classification). Instructs the model to use get_ticket and get_related_tickets, then output JSON matching Agent1TriageOutputSchema.',
    arguments: [
      {
        name: 'ticket_id',
        description: 'UUID of the fraud report ticket to triage',
        required: true,
      },
    ],
  })
  async getTriageAgentPrompt(
    args: { ticket_id: string },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('Generating triage agent prompt', { ticket_id: args.ticket_id });

    return {
      messages: [
        {
          role: 'system' as const,
          content: TRIAGE_AGENT_SYSTEM_PROMPT,
        },
        {
          role: 'user' as const,
          content: buildTriageAgentUserMessage(args.ticket_id),
        },
      ],
      meta: {
        agent: 'agent1_triage',
        ticket_id: args.ticket_id,
        output_schema: 'Agent1TriageOutputSchema',
        example_ticket_id: DEFAULT_TICKET_ID,
      },
    };
  }
}

export { TRIAGE_AGENT_SYSTEM_PROMPT, buildTriageAgentUserMessage };
