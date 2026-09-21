import { ToolDecorator as Tool, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { LinearService } from './linear.service.js';
import { todayISO } from '../../common/dates.js';

@Injectable({ deps: [LinearService] })
export class LinearTools {
  constructor(private linear: LinearService) {}

  @Tool({
    name: 'linear_create_ticket',
    description:
      "Creates a Linear ticket for a newly extracted commitment so it's never lost \u2014 even commitments nobody manually ticketed. Keys stay server-side in the Linear service; this tool never exposes them to the model.",
    inputSchema: z.object({
      title: z.string(),
      description: z.string().optional().describe('Quote the original spoken commitment here'),
      assignee_email: z.string().optional(),
      due_date: z.string().optional().describe('YYYY-MM-DD'),
      labels: z.array(z.string()).optional(),
    }),
    examples: {
      request: {
        title: 'Send vendor report to Acme Logistics',
        description: 'Spoken commitment: "I\'ll get the vendor report over to Acme Logistics by Aug 1"',
        assignee_email: 'priya@company.com',
        due_date: '2026-08-01',
      },
      response: { ticket_id: 'LIN-481' },
    },
  })
  async createTicket(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Creating Linear ticket', { title: input.title });
    const ticket = await this.linear.createTicket(input);
    return { ticket_id: ticket.ticket_id, status: ticket.status, ...input };
  }

  @Tool({
    name: 'linear_get_status',
    description: 'Reads the current status of a Linear ticket \u2014 used by the scheduler to verify work marked Done in Linear, not just in Slack/email.',
    inputSchema: z.object({ ticket_id: z.string() }),
  })
  async getStatus(input: { ticket_id: string }, ctx: ExecutionContext) {
    const ticket = await this.linear.getTicket(input.ticket_id);
    if (!ticket) {
      return { ticket_id: input.ticket_id, status: null, watchers: [], escalation_comment: null, as_of: todayISO() };
    }
    return {
      ticket_id: input.ticket_id,
      status: ticket.status,
      watchers: ticket.watchers,
      escalation_comment: ticket.escalation_comment ?? null,
      as_of: todayISO(),
    };
  }

  @Tool({
    name: 'linear_update_status',
    description: 'Updates the status of a Linear ticket. Lets the scheduler pick up a ticket manually marked Done.',
    inputSchema: z.object({
      ticket_id: z.string(),
      status: z.enum(['Todo', 'In Progress', 'Done', 'Cancelled', 'Escalated']),
    }),
  })
  async updateStatus(input: { ticket_id: string; status: string }, ctx: ExecutionContext) {
    const ticket = await this.linear.updateStatus(input.ticket_id, input.status);
    if (!ticket) {
      throw new Error(`Ticket ${input.ticket_id} not found`);
    }
    return { ticket_id: ticket.ticket_id, status: ticket.status };
  }

  @Tool({
    name: 'linear_escalate',
    description:
      'Adds a manager as a watcher on the ticket with a supportive, context-rich comment explaining what was promised, what has been tried, and why it is being surfaced now.',
    inputSchema: z.object({
      ticket_id: z.string(),
      manager_email: z.string(),
      context_comment: z.string().describe('Full history: what was promised, nudges sent, evidence checked'),
    }),
    examples: {
      request: {
        ticket_id: 'LIN-482',
        manager_email: 'raj.patel@company.com',
        context_comment: 'Marcus committed to the pricing API migration plan by Aug 1. Two reminders were sent with no evidence of progress. Flagging in case there is a blocker.',
      },
    },
  })
  async escalate(input: { ticket_id: string; manager_email: string; context_comment: string }, ctx: ExecutionContext) {
    ctx.logger.info('Escalating ticket', { ticket_id: input.ticket_id, manager: input.manager_email });
    const ticket = await this.linear.escalate(input.ticket_id, input.manager_email, input.context_comment);
    if (!ticket) {
      throw new Error(`Ticket ${input.ticket_id} not found`);
    }
    return {
      escalated: true,
      ticket_id: ticket.ticket_id,
      status: ticket.status,
      watchers: ticket.watchers,
      context_comment: input.context_comment,
    };
  }
}
