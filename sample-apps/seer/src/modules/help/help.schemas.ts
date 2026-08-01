import { z } from 'zod';
import { taskTypeSchema } from '../analysis/analysis.schemas.js';

export const seerHelpResponseSchema = z.object({
  summary: z.string(),
  datasets: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    taskTypes: z.array(taskTypeSchema),
    rows: z.number().int().positive(),
    columns: z.number().int().positive(),
    exampleQuestion: z.string(),
  })),
  workflow: z.array(z.object({
    step: z.number().int().positive(),
    tool: z.string().nullable(),
    action: z.string(),
  })),
  capabilities: z.object({
    regression: z.string(),
    classification: z.string(),
    preprocessing: z.string(),
    evaluation: z.string(),
  }),
  limits: z.object({
    maxPredictionRows: z.number().int().positive(),
    minUsableRows: z.number().int().positive(),
    maxCategoricalValuesPerFeature: z.number().int().positive(),
    maxEncodedFeatures: z.number().int().positive(),
    maxClassificationClasses: z.number().int().positive(),
  }),
  outOfScope: z.array(z.string()),
  responsibleUse: z.array(z.string()),
});

export type SeerHelpResponse = z.infer<typeof seerHelpResponseSchema>;
