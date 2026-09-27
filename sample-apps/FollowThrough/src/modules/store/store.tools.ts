import { ToolDecorator as Tool, Widget, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { StoreService } from './store.service.js';

const PersonSchema = z.object({
  name: z.string(),
  email: z.string().optional(),
  slack_id: z.string().optional(),
  manager_email: z.string().optional(),
});

const CommitmentSchema = z.object({
  commitment_id: z.string().optional(),
  meeting_id: z.string().optional(),
  text_raw: z.string().optional(),
  owner: PersonSchema.optional(),
  beneficiary: z
    .object({ name: z.string(), type: z.enum(['internal', 'external']) })
    .optional(),
  what: z.string().optional(),
  due_date: z.string().optional(),
  confidence_level: z.enum(['committed', 'hedged', 'aspirational']).optional(),
  confidence_phrase: z.string().optional(),
  status: z
    .enum(['open', 'nudged_1', 'nudged_2', 'escalated', 'done', 'expired'])
    .optional(),
  linked_ticket_id: z.string().nullable().optional(),
  evidence_log: z.array(z.any()).optional(),
  nudge_log: z.array(z.any()).optional(),
  escalation: z.any().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

@Injectable({ deps: [StoreService] })
export class StoreTools {
  constructor(private store: StoreService) {}

  @Tool({
    name: 'upsert_commitment',
    description:
      'Creates or updates a commitment record in the durable store. The store is the source of truth for every commitment lifecycle state.',
    inputSchema: z.object({
      commitment: CommitmentSchema,
    }),
    examples: {
      request: {
        commitment: {
          owner: { name: 'Priya Shah', email: 'priya@company.com' },
          beneficiary: { name: 'Acme Logistics', type: 'external' },
          what: 'Send the vendor report to Acme Logistics',
          text_raw: "I'll get the vendor report over to them by Friday",
          due_date: '2026-08-01',
          confidence_level: 'committed',
        },
      },
      response: {
        commitment: {
          commitment_id: 'cmt_abc123',
          status: 'open',
          created_at: '2026-07-29',
        },
      },
    },
  })
  async upsert(input: { commitment: any }, ctx: ExecutionContext) {
    ctx.logger.info('Upserting commitment', { id: input.commitment.commitment_id });
    const record = this.store.upsert(input.commitment);
    return { commitment: record };
  }

  @Tool({
    name: 'query_commitments',
    description:
      'Returns commitments matching a filter — used by the scheduler to find items due for a poll or nudge check. With no filters, returns every commitment.',
    inputSchema: z.object({
      status: z
        .union([
          z.enum(['open', 'nudged_1', 'nudged_2', 'escalated', 'done', 'expired']),
          z.array(z.enum(['open', 'nudged_1', 'nudged_2', 'escalated', 'done', 'expired'])),
        ])
        .optional()
        .describe('Only return commitments in these states'),
      due_before: z.string().optional().describe('YYYY-MM-DD — only commitments due on or before this date'),
      owner_email: z.string().optional().describe('Only commitments owned by this person'),
    }),
    examples: {
      request: { status: ['open', 'nudged_1'], due_before: '2026-08-04' },
      response: { commitments: [{ commitment_id: 'cmt_abc123', status: 'open' }] },
    },
  })
  @Widget('commitment-dashboard')
  async query(input: { status?: string | string[]; due_before?: string; owner_email?: string }, ctx: ExecutionContext) {
    ctx.logger.info('Querying commitments', input);
    const statuses = input.status === undefined ? undefined : Array.isArray(input.status) ? input.status : [input.status];
    const commitments = this.store.query({
      status: statuses,
      due_before: input.due_before,
      owner_email: input.owner_email,
    });
    return { count: commitments.length, commitments };
  }

  @Tool({
    name: 'promote_commitment',
    description:
      'Promotes a logged aspirational commitment ("we should probably...") so the scheduler starts actively chasing it. This is the human override that moves an idea into the follow-up loop.',
    inputSchema: z.object({
      commitment_id: z.string(),
      confidence_level: z.enum(['committed', 'hedged']).describe('New confidence to chase the item with'),
    }),
  })
  async promote(input: { commitment_id: string; confidence_level: 'committed' | 'hedged' }, ctx: ExecutionContext) {
    const existing = this.store.get(input.commitment_id);
    if (!existing) {
      throw new Error(`Commitment ${input.commitment_id} not found`);
    }
    const updated = this.store.setConfidence(input.commitment_id, input.confidence_level);
    return { promoted: true, commitment: updated };
  }
}
