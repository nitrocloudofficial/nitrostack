import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { TicketSchema } from '../../schemas/ticket.schema.js';
import type { Ticket } from '../../schemas/ticket.schema.js';
import {
  DEFAULT_TICKET_ID,
  MOCK_TICKETS,
  SHARED_FRAUDSTER_UPI_ID,
} from './mock-tickets.js';

const GetTicketInputSchema = z.object({
  ticket_id: z
    .string()
    .uuid()
    .describe('UUID of the fraud report ticket to fetch'),
});

const GetRelatedTicketsCriteriaSchema = z
  .object({
    upi_id: z
      .string()
      .optional()
      .describe('Match tickets sharing this fraudster UPI ID'),
    bank_account: z
      .string()
      .optional()
      .describe('Match tickets sharing this fraudster bank account number'),
    phone: z
      .string()
      .optional()
      .describe('Match tickets sharing this fraudster phone number'),
    ifsc: z
      .string()
      .optional()
      .describe('Match tickets sharing this fraudster IFSC code'),
    exclude_ticket_id: z
      .string()
      .uuid()
      .optional()
      .describe('Exclude this ticket ID from results (typically the ticket under triage)'),
  })
  .refine(
    (criteria) =>
      Boolean(criteria.upi_id || criteria.bank_account || criteria.phone || criteria.ifsc),
    { message: 'At least one of upi_id, bank_account, phone, or ifsc is required' },
  );

const GetRelatedTicketsInputSchema = z.object({
  criteria: GetRelatedTicketsCriteriaSchema.describe(
    'Fields to match against fraudster identifiers for organized-fraud pattern detection',
  ),
});

const GetRelatedTicketsOutputSchema = z.object({
  criteria: GetRelatedTicketsCriteriaSchema,
  match_count: z.number().int().nonnegative(),
  related_tickets: z.array(TicketSchema),
});

function matchesCriteria(ticket: Ticket, criteria: z.infer<typeof GetRelatedTicketsCriteriaSchema>): boolean {
  const fraudster = ticket.fraudster;
  if (!fraudster) {
    return false;
  }

  if (criteria.upi_id && fraudster.upi_id === criteria.upi_id) {
    return true;
  }
  if (criteria.bank_account && fraudster.bank_account === criteria.bank_account) {
    return true;
  }
  if (criteria.phone && fraudster.phone === criteria.phone) {
    return true;
  }
  if (criteria.ifsc && fraudster.ifsc === criteria.ifsc) {
    return true;
  }

  return false;
}

export class TicketTools {
  @Tool({
    name: 'get_ticket',
    description:
      'Fetch the raw fraud report ticket by ID. Used by Agent 1 (Triage) to load victim, fraud, fraudster, and region details for classification.',
    inputSchema: GetTicketInputSchema,
    outputSchema: TicketSchema,
    examples: {
      request: {
        ticket_id: DEFAULT_TICKET_ID,
      },
      response: MOCK_TICKETS[0],
    },
  })
  async getTicket(
    input: z.infer<typeof GetTicketInputSchema>,
    ctx: ExecutionContext,
  ): Promise<Ticket> {
    ctx.logger.info('Fetching ticket', { ticket_id: input.ticket_id });

    const ticket = MOCK_TICKETS.find((entry) => entry.ticket_id === input.ticket_id);
    if (!ticket) {
      throw new Error(`Ticket not found: ${input.ticket_id}`);
    }

    return ticket;
  }

  @Tool({
    name: 'get_related_tickets',
    description:
      'Find other tickets whose fraudster identifiers match the given criteria (e.g. same UPI ID or bank account). Used by Agent 1 to detect organized or repeat fraud patterns.',
    inputSchema: GetRelatedTicketsInputSchema,
    outputSchema: GetRelatedTicketsOutputSchema,
    examples: {
      request: {
        criteria: {
          upi_id: SHARED_FRAUDSTER_UPI_ID,
          exclude_ticket_id: DEFAULT_TICKET_ID,
        },
      },
      response: {
        criteria: {
          upi_id: SHARED_FRAUDSTER_UPI_ID,
          exclude_ticket_id: DEFAULT_TICKET_ID,
        },
        match_count: 2,
        related_tickets: MOCK_TICKETS.filter(
          (ticket) =>
            ticket.ticket_id !== DEFAULT_TICKET_ID &&
            ticket.fraudster?.upi_id === SHARED_FRAUDSTER_UPI_ID,
        ),
      },
    },
  })
  async getRelatedTickets(
    input: z.infer<typeof GetRelatedTicketsInputSchema>,
    ctx: ExecutionContext,
  ): Promise<z.infer<typeof GetRelatedTicketsOutputSchema>> {
    ctx.logger.info('Searching related tickets', { criteria: input.criteria });

    const relatedTickets = MOCK_TICKETS.filter((ticket) => {
      if (input.criteria.exclude_ticket_id && ticket.ticket_id === input.criteria.exclude_ticket_id) {
        return false;
      }
      return matchesCriteria(ticket, input.criteria);
    });

    return {
      criteria: input.criteria,
      match_count: relatedTickets.length,
      related_tickets: relatedTickets,
    };
  }
}
