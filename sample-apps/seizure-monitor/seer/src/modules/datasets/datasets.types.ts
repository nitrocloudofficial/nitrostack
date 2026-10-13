import { z } from 'zod';

export const approvedDatasetIds = [
  'employee-compensation',
  'employee-attrition',
  'iris',
  'titanic',
  'wine',
  'auto-mpg',
] as const;

export const datasetIdSchema = z.enum(approvedDatasetIds);

/**
 * How a target column's values should be shown. Declared per dataset and never
 * inferred: a column named `annual_salary` says nothing about whether its
 * numbers are rupees, dollars or points, so an undeclared target stays a bare
 * number.
 */
export const targetDisplaySchema = z.object({
  column: z.string().min(1),
  unit: z.string().min(1),
  decimals: z.number().int().min(0).max(6),
});

export type TargetDisplay = z.infer<typeof targetDisplaySchema>;

export const datasetDefinitionSchema = z.object({
  id: datasetIdSchema,
  name: z.string().min(1),
  description: z.string().min(1),
  taskHints: z.array(z.enum(['regression', 'classification'])).min(1),
  rows: z.number().int().positive(),
  columns: z.number().int().positive(),
  fileName: z.string().regex(/^[a-z0-9-]+\.csv$/),
  targetDisplay: targetDisplaySchema.optional(),
});

export const datasetCatalogSchema = z.object({
  datasets: z.array(datasetDefinitionSchema).min(1),
});

export type DatasetDefinition = z.infer<typeof datasetDefinitionSchema>;
export type DatasetCatalog = z.infer<typeof datasetCatalogSchema>;
export type PublicDatasetDefinition = Omit<DatasetDefinition, 'fileName'>;
