import { z } from 'zod';

export const ResearchTopicSchema = z.object({
  topic: z.string().describe('The topic to research.'),
});

export const GatherEvidenceSchema = z.object({
  claim: z.string().describe('The claim to verify.'),
});

export const SummarizeResearchSchema = z.object({
  rawData: z.array(z.string()).describe('Array of raw data points to summarize.'),
});
