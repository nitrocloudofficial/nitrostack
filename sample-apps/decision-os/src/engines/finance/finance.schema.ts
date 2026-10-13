import { z } from 'zod';

export const EstimateCostSchema = z.object({
  projectScope: z.string().describe('The scope of the project.'),
  resourcesRequired: z.array(z.string()).describe('List of required resources.'),
});

export const CalculateROISchema = z.object({
  totalInvestment: z.number().positive().describe('The total capital investment.'),
  projectedRevenue: z.number().describe('The projected return or revenue.'),
});

export const EstimateRevenueSchema = z.object({
  marketSize: z.number().nonnegative().describe('The total addressable market size.'),
  expectedMarketShare: z.number().min(0).max(1).describe('The percentage of market share expected (0-1).'),
});
