import { z } from '@nitrostack/core';

export const InvestigateBreakOutput = z.object({
  breakId: z.string(),
  explained: z.boolean(),
  reason: z.string().describe('Explanation: FX timing, settlement window, or unexplained'),
  confidence: z.enum(['low', 'medium', 'high']),
});

export type InvestigateBreakOutput = z.infer<typeof InvestigateBreakOutput>;