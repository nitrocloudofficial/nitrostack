import { z } from 'zod';

export const IdentifyRisksSchema = z.object({
  domain: z.string().describe('The domain to analyze for risks.'),
  factors: z.array(z.string()).describe('The key factors to consider.'),
});

export const CalculateRiskScoreSchema = z.object({
  identifiedRisks: z.array(z.string()).describe('List of identified risks.'),
  severityWeights: z.record(z.number().min(0).max(5)).optional().describe('Optional 0-5 severity weights keyed by risk name.'),
});

export const GenerateMitigationPlanSchema = z.object({
  risks: z.array(z.string()).describe('The risks to mitigate.'),
});
