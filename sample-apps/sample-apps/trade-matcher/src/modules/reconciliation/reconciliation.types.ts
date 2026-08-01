import { z } from '@nitrostack/core';

export const ReconciledBreak = z.object({
  breakId: z.string(),
  discrepancy: z.string(),
  explained: z.boolean(),
  reason: z.string(),
  confidence: z.enum(['low', 'medium', 'high']),
  status: z.enum(['resolved', 'escalated']),
  correction: z
    .object({
      hasProposal: z.boolean(),
      proposedField: z.string().nullable(),
      proposedValue: z.string().nullable(),
      proposedSystem: z.enum(['A', 'B']).nullable(),
      reasoning: z.string(),
      confidence: z.enum(['low', 'medium', 'high']),
    })
    .nullable()
    .describe('Only present for escalated breaks -- a proposed fix awaiting human approval'),
});

export type ReconciledBreak = z.infer<typeof ReconciledBreak>;

export const RunReconciliationOutput = z.object({
  breaks: z.array(ReconciledBreak),
  stats: z.object({
    totalProcessed: z.number(),
    resolvedCount: z.number(),
    escalatedCount: z.number(),
  }),
});

export type RunReconciliationOutput = z.infer<typeof RunReconciliationOutput>;