import { z } from '@nitrostack/core';
import {
  Agent1TriageOutputSchema,
  Agent2AssignmentOutputSchema,
  Agent3LegalOutputSchema,
} from '../schemas/agent-output.schema.js';
import { Iso8601TimestampSchema, TicketStatusSchema } from '../schemas/common.js';
import { TicketSchema } from '../schemas/ticket.schema.js';

export const MasterCasePacketSchema = z.object({
  ticket_id: z.string().uuid(),
  generated_at: Iso8601TimestampSchema,
  status: TicketStatusSchema,
  ticket: TicketSchema,
  agent_outputs: z.object({
    triage: Agent1TriageOutputSchema,
    assignment: Agent2AssignmentOutputSchema,
    legal: Agent3LegalOutputSchema,
  }),
  dashboard: z.object({
    title: z.string().min(1),
    priority: z.string().min(1),
    assigned_department_id: z.string().uuid(),
    assigned_personnel_count: z.number().int().nonnegative(),
    legal_citation_count: z.number().int().nonnegative(),
    escalation_flag: z.boolean(),
    legal_statutes_summary: z.string().min(1).describe(
      'Formatted LEGAL & COMPLIANCE STATUTES section listing all applicable laws, suggested actions, and citations',
    ),
  }),
});

export type MasterCasePacket = z.infer<typeof MasterCasePacketSchema>;

