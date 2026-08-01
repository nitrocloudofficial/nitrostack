import { z } from 'zod';

export const mlServiceHealthSchema = z.object({
  status: z.literal('healthy'),
  service: z.literal('seer-ml'),
  version: z.string().min(1),
});

export type MlServiceHealth = z.infer<typeof mlServiceHealthSchema>;

const profileScalarSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

const numericSummarySchema = z.object({
  min: z.number(),
  max: z.number(),
  mean: z.number(),
  median: z.number(),
  standardDeviation: z.number(),
  q1: z.number(),
  q3: z.number(),
});

const categoryFrequencySchema = z.object({
  value: z.string(),
  count: z.number().int().nonnegative(),
  percentage: z.number().min(0).max(100),
});

const histogramBinSchema = z.object({
  start: z.number(),
  end: z.number(),
  count: z.number().int().nonnegative(),
});

export const mlServiceProfileSchema = z.object({
  datasetId: z.string().min(1),
  dimensions: z.object({
    rows: z.number().int().positive(),
    columns: z.number().int().positive(),
  }),
  columns: z.array(z.object({
    name: z.string().min(1),
    type: z.enum(['boolean', 'numeric', 'categorical', 'datetime', 'text', 'empty']),
    missingCount: z.number().int().nonnegative(),
    missingPercent: z.number().min(0).max(100),
    uniqueCount: z.number().int().nonnegative(),
    numericSummary: numericSummarySchema.nullable(),
    categories: z.array(categoryFrequencySchema),
  })).min(1),
  duplicateRowCount: z.number().int().nonnegative(),
  targetCandidates: z.array(z.string()),
  identifierCandidates: z.array(z.string()),
  constantColumns: z.array(z.string()),
  unsupportedColumns: z.array(z.object({
    name: z.string(),
    reason: z.string(),
  })),
  sampleRows: z.array(z.record(profileScalarSchema)).max(10),
  warnings: z.array(z.string()),
  charts: z.object({
    missingValues: z.array(z.object({ column: z.string(), count: z.number().int().nonnegative() })),
    numericDistributions: z.array(z.object({
      column: z.string(),
      bins: z.array(histogramBinSchema),
    })),
    categoryFrequencies: z.array(z.object({
      column: z.string(),
      values: z.array(categoryFrequencySchema),
    })),
  }),
});

export type MlServiceProfile = z.infer<typeof mlServiceProfileSchema>;

const analysisInputValueSchema = z.union([z.string(), z.number().finite(), z.boolean()]);

const regressionMetricSchema = z.object({
  mae: z.number().finite().nonnegative(),
  rmse: z.number().finite().nonnegative(),
  r2: z.number().finite(),
});

export const mlServiceRegressionAnalysisSchema = z.object({
  analysisId: z.string().uuid(),
  taskType: z.literal('regression'),
  model: z.object({ name: z.literal('LinearRegression') }),
  baseline: z.object({ name: z.literal('DummyRegressor (mean)') }),
  quality: z.enum(['useful_signal', 'weak_signal', 'no_demonstrated_signal']),
  metrics: z.object({
    model: regressionMetricSchema,
    baseline: regressionMetricSchema,
    improvement: z.object({
      maeAbsolute: z.number().finite(),
      maePercent: z.number().finite(),
      rmseAbsolute: z.number().finite(),
      rmsePercent: z.number().finite(),
      r2Absolute: z.number().finite(),
    }),
  }),
  predictions: z.array(z.object({
    input: z.record(analysisInputValueSchema),
    estimatedValue: z.number().finite(),
    coverage: z.object({
      outsideNumericRanges: z.array(z.string()),
      unseenCategoricalValues: z.array(z.string()),
    }),
  })).min(1).max(10),
  charts: z.object({
    actualVsPredicted: z.array(z.object({ actual: z.number().finite(), predicted: z.number().finite() })).min(1),
    residualVsPredicted: z.array(z.object({ predicted: z.number().finite(), residual: z.number().finite() })).min(1),
  }),
  datasetCoverage: z.object({
    trainingRows: z.number().int().positive(),
    testRows: z.number().int().positive(),
    numericRanges: z.record(z.object({ min: z.number().finite(), max: z.number().finite() })),
    categoricalValues: z.record(z.array(z.string())),
  }),
  warnings: z.array(z.string()),
  explanationFacts: z.object({
    targetColumn: z.string(),
    usableRows: z.number().int().positive(),
    droppedMissingTargetRows: z.number().int().nonnegative(),
  }),
});

export type MlServiceRegressionAnalysis = z.infer<typeof mlServiceRegressionAnalysisSchema>;

const classificationMetricSchema = z.object({
  accuracy: z.number().finite().min(0).max(1),
  precision: z.number().finite().min(0).max(1),
  recall: z.number().finite().min(0).max(1),
  f1: z.number().finite().min(0).max(1),
});

export const mlServiceClassificationAnalysisSchema = z.object({
  analysisId: z.string().uuid(),
  taskType: z.literal('classification'),
  model: z.object({ name: z.literal('LogisticRegression') }),
  baseline: z.object({ name: z.literal('DummyClassifier (most_frequent)') }),
  quality: z.enum(['useful_signal', 'weak_signal', 'no_demonstrated_signal']),
  metrics: z.object({
    model: classificationMetricSchema,
    baseline: classificationMetricSchema,
    improvement: z.object({
      f1Absolute: z.number().finite(),
      f1Percent: z.number().finite(),
    }),
  }),
  predictions: z.array(z.object({
    input: z.record(analysisInputValueSchema),
    predictedClass: z.string().min(1),
    predictedProbability: z.number().finite().min(0).max(1),
    coverage: z.object({
      outsideNumericRanges: z.array(z.string()),
      unseenCategoricalValues: z.array(z.string()),
    }),
  })).min(1).max(10),
  charts: z.object({
    confusionMatrix: z.object({
      labels: z.array(z.string().min(1)).min(2).max(10),
      values: z.array(z.array(z.number().int().nonnegative())).min(2).max(10),
    }).superRefine((matrix, context) => {
      if (matrix.values.length !== matrix.labels.length || matrix.values.some((row) => row.length !== matrix.labels.length)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: 'Confusion matrix must be square and match its labels.' });
      }
    }),
    classDistribution: z.array(z.object({
      classLabel: z.string().min(1),
      count: z.number().int().positive(),
      percentage: z.number().finite().min(0).max(100),
    })).min(2).max(10),
  }),
  perClassMetrics: z.array(z.object({
    classLabel: z.string().min(1),
    precision: z.number().finite().min(0).max(1),
    recall: z.number().finite().min(0).max(1),
    f1: z.number().finite().min(0).max(1),
    support: z.number().int().nonnegative(),
  })).min(2).max(10),
  datasetCoverage: z.object({
    trainingRows: z.number().int().positive(),
    testRows: z.number().int().positive(),
    numericRanges: z.record(z.object({ min: z.number().finite(), max: z.number().finite() })),
    categoricalValues: z.record(z.array(z.string())),
  }),
  warnings: z.array(z.string()),
  explanationFacts: z.object({
    targetColumn: z.string(),
    usableRows: z.number().int().positive(),
    droppedMissingTargetRows: z.number().int().nonnegative(),
    classCount: z.number().int().min(2).max(10),
  }),
});

export type MlServiceClassificationAnalysis = z.infer<typeof mlServiceClassificationAnalysisSchema>;

export const mlServiceAnalysisSchema = z.discriminatedUnion('taskType', [
  mlServiceRegressionAnalysisSchema,
  mlServiceClassificationAnalysisSchema,
]);

export type MlServiceAnalysis = z.infer<typeof mlServiceAnalysisSchema>;
