import { z } from 'zod';
import { mlServiceClassificationAnalysisSchema, mlServiceRegressionAnalysisSchema } from '../ml-client/ml-client.schemas.js';
import { targetDisplaySchema } from '../datasets/datasets.types.js';

export const taskTypeSchema = z.enum(['regression', 'classification']);
export type TaskType = z.infer<typeof taskTypeSchema>;

const predictionValueSchema = z.union([z.string(), z.number().finite(), z.boolean()]);

export const createAnalysisPlanInputSchema = z.object({
  datasetId: z.string().regex(/^[a-z0-9-]+$/).describe('An approved dataset ID from seer://datasets.'),
  question: z.string().trim().min(1).max(2_000).describe('The user’s predictive question.'),
  targetColumn: z.string().trim().min(1).describe('The column to predict.'),
  featureColumns: z.array(z.string().trim().min(1)).min(1).max(49).describe('Columns used as model inputs.'),
  taskType: taskTypeSchema.describe('Use regression when estimating a number, and classification when choosing a category or yes/no answer.'),
  predictionRows: z.array(z.record(predictionValueSchema)).min(1).max(10).describe('One to ten complete feature-value rows to predict.'),
}).strict();

export type CreateAnalysisPlanInput = z.infer<typeof createAnalysisPlanInputSchema>;

const preprocessingSchema = z.object({
  numeric: z.array(z.string()),
  categorical: z.array(z.string()),
  numericImputer: z.literal('median'),
  numericScaler: z.literal('standard'),
  categoricalImputer: z.literal('most_frequent'),
  categoricalEncoder: z.literal('one_hot'),
});

export const analysisPlanSchema = z.object({
  datasetId: z.string(),
  question: z.string(),
  targetColumn: z.string(),
  featureColumns: z.array(z.string()).min(1),
  taskType: taskTypeSchema,
  predictionRows: z.array(z.record(predictionValueSchema)).min(1).max(10),
  preprocessing: preprocessingSchema,
  rows: z.object({
    dataset: z.number().int().positive(),
    missingTarget: z.number().int().nonnegative(),
    usable: z.number().int().positive(),
  }),
  excludedColumns: z.array(z.object({ name: z.string(), reason: z.string() })),
  assumptions: z.array(z.string()),
  warnings: z.array(z.string()),
  split: z.object({
    trainingPercent: z.literal(80),
    testPercent: z.literal(20),
    randomState: z.literal(42),
  }),
});

export type AnalysisPlan = z.infer<typeof analysisPlanSchema>;

export const createAnalysisPlanResponseSchema = z.object({
  plan: analysisPlanSchema,
  reviewToken: z.string().min(1),
  expiresAt: z.string().datetime(),
});

export type CreateAnalysisPlanResponse = z.infer<typeof createAnalysisPlanResponseSchema>;

export const confirmAnalysisPlanInputSchema = z.object({
  reviewToken: z.string().min(1),
}).strict();

export const confirmAnalysisPlanResponseSchema = z.object({
  approved: z.literal(true),
  plan: analysisPlanSchema,
  executionToken: z.string().min(1),
  expiresAt: z.string().datetime(),
});

export type ConfirmAnalysisPlanResponse = z.infer<typeof confirmAnalysisPlanResponseSchema>;

export const runAnalysisInputSchema = z.object({
  executionToken: z.string().min(1),
}).strict();

const runAnalysisContextSchema = {
  question: z.string().min(1),
  targetColumn: z.string().min(1),
  targetDisplay: targetDisplaySchema.optional(),
};

export const runAnalysisResponseSchema = z.discriminatedUnion('taskType', [
  mlServiceRegressionAnalysisSchema.extend(runAnalysisContextSchema),
  mlServiceClassificationAnalysisSchema.extend(runAnalysisContextSchema),
]);

export type RunAnalysisResponse = z.infer<typeof runAnalysisResponseSchema>;

export const signedAnalysisPlanSchema = z.object({
  version: z.literal(2),
  purpose: z.enum(['review', 'execution']),
  datasetHash: z.string().regex(/^[a-f0-9]{64}$/),
  issuedAt: z.number().int().nonnegative(),
  expiresAt: z.number().int().positive(),
  plan: analysisPlanSchema,
});

export type SignedAnalysisPlan = z.infer<typeof signedAnalysisPlanSchema>;
