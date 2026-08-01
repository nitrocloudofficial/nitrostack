import { z } from 'zod';

const environmentSchema = z.object({
  ML_SERVICE_BASE_URL: z.string().url(),
  ML_SERVICE_API_KEY: z.string().min(1),
  ML_SERVICE_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),
  ML_SERVICE_MAX_RETRIES: z.coerce.number().int().min(0).max(1).default(1),
});

export interface MlServiceConfig {
  baseUrl: string;
  apiKey: string;
  timeoutMs: number;
  maxRetries: number;
}

const analysisLimitsEnvironmentSchema = z.object({
  ML_PROFILE_MAX_CATEGORICAL_VALUES: z.coerce.number().int().positive().max(50).default(50),
  ML_MAX_ENCODED_FEATURES: z.coerce.number().int().positive().default(500),
  ML_MAX_PREDICTION_ROWS: z.coerce.number().int().positive().max(10).default(10),
  ML_MIN_USABLE_ROWS: z.coerce.number().int().min(20).default(20),
  ML_SMALL_DATASET_WARNING_ROWS: z.coerce.number().int().min(20).default(100),
  ML_MAX_CLASSIFICATION_CLASSES: z.coerce.number().int().min(2).max(10).default(10),
});

export interface AnalysisLimits {
  maxCategoricalValues: number;
  maxEncodedFeatures: number;
  maxPredictionRows: number;
  minUsableRows: number;
  smallDatasetWarningRows: number;
  maxClassificationClasses: number;
}

const analysisPlanEnvironmentSchema = z.object({
  ANALYSIS_PLAN_TOKEN_SECRET: z.string().min(32),
});

export interface AnalysisPlanConfig {
  tokenSecret: string;
  tokenLifetimeMs: number;
}

export function loadMlServiceConfig(environment: NodeJS.ProcessEnv = process.env): MlServiceConfig {
  const parsed = environmentSchema.parse(environment);
  const url = new URL(parsed.ML_SERVICE_BASE_URL);
  const isLocalHttp = url.protocol === 'http:' && ['localhost', '127.0.0.1', '::1'].includes(url.hostname);

  if (url.protocol !== 'https:' && !isLocalHttp) {
    throw new Error('ML_SERVICE_BASE_URL must use HTTPS outside local development.');
  }

  return {
    baseUrl: url.toString().replace(/\/$/, ''),
    apiKey: parsed.ML_SERVICE_API_KEY,
    timeoutMs: parsed.ML_SERVICE_TIMEOUT_MS,
    maxRetries: parsed.ML_SERVICE_MAX_RETRIES,
  };
}

export function loadAnalysisLimits(environment: NodeJS.ProcessEnv = process.env): AnalysisLimits {
  const parsed = analysisLimitsEnvironmentSchema.parse(environment);
  return {
    maxCategoricalValues: parsed.ML_PROFILE_MAX_CATEGORICAL_VALUES,
    maxEncodedFeatures: parsed.ML_MAX_ENCODED_FEATURES,
    maxPredictionRows: parsed.ML_MAX_PREDICTION_ROWS,
    minUsableRows: parsed.ML_MIN_USABLE_ROWS,
    smallDatasetWarningRows: parsed.ML_SMALL_DATASET_WARNING_ROWS,
    maxClassificationClasses: parsed.ML_MAX_CLASSIFICATION_CLASSES,
  };
}

export function loadAnalysisPlanConfig(environment: NodeJS.ProcessEnv = process.env): AnalysisPlanConfig {
  const parsed = analysisPlanEnvironmentSchema.parse(environment);

  return {
    tokenSecret: parsed.ANALYSIS_PLAN_TOKEN_SECRET,
    tokenLifetimeMs: 15 * 60 * 1000,
  };
}
