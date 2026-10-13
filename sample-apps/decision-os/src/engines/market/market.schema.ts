import { z } from 'zod';

export const AnalyzeMarketSchema = z.object({
  industry: z.string().describe('The industry to analyze.'),
  location: z.string().nullable().describe('The target geographical location, if any.'),
});

export const IdentifyCompetitorsSchema = z.object({
  industry: z.string().describe('The industry to analyze.'),
  location: z.string().nullable().describe('The target geographical location, if any.'),
});

export const EstimateDemandSchema = z.object({
  productType: z.string().describe('The type of product or service.'),
  targetDemographics: z.array(z.string()).describe('The intended audience.'),
});
