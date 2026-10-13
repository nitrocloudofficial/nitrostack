import { z } from '@nitrostack/core';

export const ProposeCorrectionOutput = z.object({
  breakId: z.string(),
  hasProposal: z.boolean().describe('Whether the agent could confidently propose a specific fix'),
  proposedField: z.string().nullable().describe('Which field is likely wrong, e.g. "price" or "quantity"'),
  proposedValue: z.string().nullable().describe('The value the agent believes is correct'),
  proposedSystem: z.enum(['A', 'B']).nullable().describe('Which system (A or B) likely has the wrong value'),
  reasoning: z.string().describe('Why the agent believes this, citing specific evidence'),
  confidence: z.enum(['low', 'medium', 'high']),
});

export type ProposeCorrectionOutput = z.infer<typeof ProposeCorrectionOutput>;