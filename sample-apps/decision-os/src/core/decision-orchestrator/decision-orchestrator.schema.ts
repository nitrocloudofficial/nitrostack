import { z } from 'zod';

export const ClassifyDecisionSchema = z.object({
  request: z.string().describe('The decision request string to classify')
});

export const CreateExecutionPlanSchema = z.object({
  objective: z.string().describe('The decision objective'),
  domains: z.array(z.string()).optional().describe('Relevant decision domains')
});

export const ValidateExecutionPlanSchema = z.object({
  planId: z.string().describe('Execution plan ID'),
  steps: z.array(z.object({
    engineId: z.string(),
    dependsOn: z.array(z.string()).optional(),
    runInParallel: z.boolean().optional()
  })).describe('Steps in the execution plan')
});

export const ExecuteDecisionPipelineSchema = z.object({
  request: z.string().describe('The raw decision request string')
});

export const AnalyzeDecisionSchema = z.object({
  request: z
    .string()
    .min(1)
    .describe(
      'The full decision question to analyze, e.g. "Should I open a coffee shop near SRM Chennai with ₹15 lakh?"'
    ),
});
