import assert from 'node:assert/strict';
import test from 'node:test';
import type { MlServiceConfig } from '../../config/environment.js';
import { MlClientService, MlServiceError, type FetchImplementation } from './ml-client.service.js';

const config: MlServiceConfig = {
  baseUrl: 'https://seer-ml.example.com',
  apiKey: 'test-secret',
  timeoutMs: 25,
  maxRetries: 1,
};

function makeClient(fetchImplementation: FetchImplementation): MlClientService {
  return MlClientService.forTesting(config, fetchImplementation);
}

test('returns a valid ML-service health response', async () => {
  let requestUrl = '';
  let authorization = '';
  let requestId = '';
  const client = makeClient(async (input, init) => {
    requestUrl = input;
    authorization = init.headers.authorization;
    requestId = init.headers['x-request-id'] ?? '';
    return new Response(JSON.stringify({ status: 'healthy', service: 'seer-ml', version: '0.1.0' }), { status: 200 });
  });

  const result = await client.health('mcp-request-42');

  assert.equal(requestUrl, 'https://seer-ml.example.com/health');
  assert.equal(authorization, 'Bearer test-secret');
  assert.equal(requestId, 'mcp-request-42');
  assert.deepEqual(result, { status: 'healthy', service: 'seer-ml', version: '0.1.0' });
});

test('normalizes timeouts', async () => {
  let attempts = 0;
  const client = makeClient(async () => {
    attempts += 1;
    const error = new Error('aborted');
    error.name = 'AbortError';
    throw error;
  });

  await assert.rejects(client.health(), (error: unknown) => error instanceof MlServiceError && error.code === 'timeout');
  assert.equal(attempts, 1);
});

test('retries one transient upstream failure without exposing its response body', async () => {
  let attempts = 0;
  const delays: number[] = [];
  const client = MlClientService.forTesting(config, async () => {
    attempts += 1;
    return new Response('sensitive details', { status: 503 });
  }, async (milliseconds) => { delays.push(milliseconds); });

  await assert.rejects(client.health(), (error: unknown) => error instanceof MlServiceError
    && error.code === 'upstream_error'
    && error.message === 'ML service health is temporarily unavailable.');
  assert.equal(attempts, 2);
  assert.deepEqual(delays, [250]);
});

test('does not retry client validation errors and returns their safe detail', async () => {
  let attempts = 0;
  const client = makeClient(async () => {
    attempts += 1;
    return new Response(JSON.stringify({ detail: 'CSV exceeds the configured row limit.' }), { status: 422 });
  });

  await assert.rejects(client.health(), (error: unknown) => error instanceof MlServiceError
    && error.code === 'validation_error'
    && error.message === 'CSV exceeds the configured row limit.');
  assert.equal(attempts, 1);
});

test('rejects malformed health responses', async () => {
  const client = makeClient(async () => new Response(JSON.stringify({ status: 'up' }), { status: 200 }));

  await assert.rejects(client.health(), (error: unknown) => error instanceof MlServiceError && error.code === 'invalid_response');
});

test('sends an authenticated multipart profile request', async () => {
  let requestUrl = '';
  let method = '';
  let form: FormData | undefined;
  const client = makeClient(async (input, init) => {
    requestUrl = input;
    method = init.method ?? '';
    form = init.body;
    return new Response(JSON.stringify({
      datasetId: 'employee-compensation',
      dimensions: { rows: 2, columns: 2 },
      columns: [
        {
          name: 'annual_salary', type: 'numeric', missingCount: 0, missingPercent: 0, uniqueCount: 2,
          numericSummary: { min: 80000, max: 90000, mean: 85000, median: 85000, standardDeviation: 5000, q1: 82500, q3: 87500 },
          categories: [],
        },
      ],
      duplicateRowCount: 0,
      targetCandidates: ['annual_salary'],
      identifierCandidates: [],
      constantColumns: [],
      unsupportedColumns: [],
      sampleRows: [{ annual_salary: 80000 }],
      warnings: [],
      charts: { missingValues: [{ column: 'annual_salary', count: 0 }], numericDistributions: [], categoryFrequencies: [] },
    }), { status: 200 });
  });

  const profile = await client.profile('employee-compensation', Buffer.from('annual_salary\n80000\n90000\n'));

  assert.equal(requestUrl, 'https://seer-ml.example.com/v1/profile');
  assert.equal(method, 'POST');
  assert.ok(form);
  assert.equal(form.get('dataset_id'), 'employee-compensation');
  assert.equal(await (form.get('file') as Blob).text(), 'annual_salary\n80000\n90000\n');
  assert.deepEqual(profile.dimensions, { rows: 2, columns: 2 });
});

test('rejects malformed profile responses', async () => {
  const client = makeClient(async () => new Response(JSON.stringify({ datasetId: 'employee-compensation' }), { status: 200 }));

  await assert.rejects(client.profile('employee-compensation', Buffer.from('a\n1\n')),
    (error: unknown) => error instanceof MlServiceError && error.code === 'invalid_response');
});

test('sends an authenticated multipart regression-analysis request', async () => {
  let requestUrl = '';
  let form: FormData | undefined;
  const client = makeClient(async (input, init) => {
    requestUrl = input;
    form = init.body;
    return new Response(JSON.stringify({
      analysisId: '00000000-0000-4000-8000-000000000001', taskType: 'regression', model: { name: 'LinearRegression' }, baseline: { name: 'DummyRegressor (mean)' }, quality: 'useful_signal',
      metrics: { model: { mae: 1, rmse: 1, r2: 0.9 }, baseline: { mae: 2, rmse: 2, r2: 0 }, improvement: { maeAbsolute: 1, maePercent: 50, rmseAbsolute: 1, rmsePercent: 50, r2Absolute: 0.9 } },
      predictions: [{ input: { years_experience: 10 }, estimatedValue: 100000, coverage: { outsideNumericRanges: [], unseenCategoricalValues: [] } }],
      charts: { actualVsPredicted: [{ actual: 100000, predicted: 100000 }], residualVsPredicted: [{ predicted: 100000, residual: 0 }] },
      datasetCoverage: { trainingRows: 24, testRows: 6, numericRanges: { years_experience: { min: 1, max: 20 } }, categoricalValues: {} },
      warnings: [], explanationFacts: { targetColumn: 'annual_salary', usableRows: 30, droppedMissingTargetRows: 0 },
    }), { status: 200 });
  });
  const plan = {
    datasetId: 'employee-compensation', question: 'Estimate salary', targetColumn: 'annual_salary', featureColumns: ['years_experience'], taskType: 'regression' as const, predictionRows: [{ years_experience: 10 }],
    preprocessing: { numeric: ['years_experience'], categorical: [], numericImputer: 'median' as const, numericScaler: 'standard' as const, categoricalImputer: 'most_frequent' as const, categoricalEncoder: 'one_hot' as const },
    rows: { dataset: 30, missingTarget: 0, usable: 30 }, excludedColumns: [], assumptions: [], warnings: [], split: { trainingPercent: 80 as const, testPercent: 20 as const, randomState: 42 as const },
  };
  const result = await client.analyze(plan, Buffer.from('years_experience,annual_salary\n10,100000\n'));

  assert.equal(requestUrl, 'https://seer-ml.example.com/v1/analyze');
  assert.ok(form);
  assert.equal(JSON.parse(String(form.get('plan'))).targetColumn, 'annual_salary');
  assert.equal(await (form.get('file') as Blob).text(), 'years_experience,annual_salary\n10,100000\n');
  assert.equal(result.quality, 'useful_signal');
});

test('validates a classification-analysis response', async () => {
  const client = makeClient(async () => new Response(JSON.stringify({
    analysisId: '00000000-0000-4000-8000-000000000002', taskType: 'classification', model: { name: 'LogisticRegression' }, baseline: { name: 'DummyClassifier (most_frequent)' }, quality: 'useful_signal',
    metrics: { model: { accuracy: 1, precision: 1, recall: 1, f1: 1 }, baseline: { accuracy: 0.5, precision: 0.25, recall: 0.5, f1: 1 / 3 }, improvement: { f1Absolute: 2 / 3, f1Percent: 200 } },
    predictions: [{ input: { tenure_years: 2 }, predictedClass: 'leave', predictedProbability: 0.9, coverage: { outsideNumericRanges: [], unseenCategoricalValues: [] } }],
    charts: { confusionMatrix: { labels: ['leave', 'stay'], values: [[2, 0], [0, 2]] }, classDistribution: [{ classLabel: 'leave', count: 30, percentage: 50 }, { classLabel: 'stay', count: 30, percentage: 50 }] },
    perClassMetrics: [{ classLabel: 'leave', precision: 1, recall: 1, f1: 1, support: 2 }, { classLabel: 'stay', precision: 1, recall: 1, f1: 1, support: 2 }],
    datasetCoverage: { trainingRows: 48, testRows: 12, numericRanges: {}, categoricalValues: {} }, warnings: [],
    explanationFacts: { targetColumn: 'attrition', usableRows: 60, droppedMissingTargetRows: 0, classCount: 2 },
  }), { status: 200 }));
  const plan = {
    datasetId: 'employee-attrition', question: 'Will this employee leave?', targetColumn: 'attrition', featureColumns: ['tenure_years'], taskType: 'classification' as const, predictionRows: [{ tenure_years: 2 }],
    preprocessing: { numeric: ['tenure_years'], categorical: [], numericImputer: 'median' as const, numericScaler: 'standard' as const, categoricalImputer: 'most_frequent' as const, categoricalEncoder: 'one_hot' as const },
    rows: { dataset: 60, missingTarget: 0, usable: 60 }, excludedColumns: [], assumptions: [], warnings: [], split: { trainingPercent: 80 as const, testPercent: 20 as const, randomState: 42 as const },
  };

  const result = await client.analyze(plan, Buffer.from('tenure_years,attrition\n2,leave\n'));

  assert.equal(result.taskType, 'classification');
  assert.equal(result.predictions[0]?.predictedProbability, 0.9);
});
