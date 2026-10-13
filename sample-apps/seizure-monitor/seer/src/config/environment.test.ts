import assert from 'node:assert/strict';
import test from 'node:test';
import { loadAnalysisLimits, loadAnalysisPlanConfig, loadMlServiceConfig } from './environment.js';

test('loads a valid HTTPS ML-service configuration', () => {
  const config = loadMlServiceConfig({
    ML_SERVICE_BASE_URL: 'https://seer-ml.example.com/',
    ML_SERVICE_API_KEY: 'test-secret',
  });

  assert.deepEqual(config, {
    baseUrl: 'https://seer-ml.example.com',
    apiKey: 'test-secret',
    timeoutMs: 120_000,
    maxRetries: 1,
  });
});

test('loads configurable analysis limits with safe defaults', () => {
  assert.deepEqual(loadAnalysisLimits({}), {
    maxCategoricalValues: 50,
    maxEncodedFeatures: 500,
    maxPredictionRows: 10,
    minUsableRows: 20,
    smallDatasetWarningRows: 100,
    maxClassificationClasses: 10,
  });
});

test('allows HTTP only for localhost development', () => {
  const config = loadMlServiceConfig({
    ML_SERVICE_BASE_URL: 'http://127.0.0.1:8080',
    ML_SERVICE_API_KEY: 'test-secret',
  });

  assert.equal(config.baseUrl, 'http://127.0.0.1:8080');
});

test('rejects non-local HTTP ML-service URLs', () => {
  assert.throws(
    () => loadMlServiceConfig({
      ML_SERVICE_BASE_URL: 'http://seer-ml.example.com',
      ML_SERVICE_API_KEY: 'test-secret',
    }),
    /HTTPS/,
  );
});

test('loads the dedicated analysis-plan token configuration', () => {
  assert.deepEqual(loadAnalysisPlanConfig({
    ANALYSIS_PLAN_TOKEN_SECRET: 'a-very-long-dedicated-plan-token-secret',
  }), {
    tokenSecret: 'a-very-long-dedicated-plan-token-secret',
    tokenLifetimeMs: 900_000,
  });
});

test('rejects a missing or short analysis-plan token secret', () => {
  assert.throws(() => loadAnalysisPlanConfig({ ANALYSIS_PLAN_TOKEN_SECRET: 'too-short' }));
});
