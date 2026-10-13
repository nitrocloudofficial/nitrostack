import assert from 'node:assert/strict';
import test from 'node:test';
import type { ExecutionContext } from '@nitrostack/core';
import { AnalysisTools } from './analysis.tools.js';

const plan = {
  datasetId: 'employee-compensation', question: 'Estimate salary', targetColumn: 'annual_salary', featureColumns: ['years_experience'], taskType: 'regression' as const, predictionRows: [{ years_experience: 10 }],
  preprocessing: { numeric: ['years_experience'], categorical: [], numericImputer: 'median' as const, numericScaler: 'standard' as const, categoricalImputer: 'most_frequent' as const, categoricalEncoder: 'one_hot' as const },
  rows: { dataset: 30, missingTarget: 0, usable: 30 }, excludedColumns: [], assumptions: [], warnings: [], split: { trainingPercent: 80 as const, testPercent: 20 as const, randomState: 42 as const },
};

test('creates, confirms, and executes plans through thin MCP tool interfaces', async () => {
  const calls: string[] = [];
  const analysis = {
    create: async () => ({ plan, reviewToken: 'review-token', expiresAt: '2026-01-01T00:15:00.000Z' }),
    confirm: async () => ({ approved: true as const, plan, executionToken: 'execution-token', expiresAt: '2026-01-01T00:15:00.000Z' }),
    prepareRun: async () => ({ plan, csv: Buffer.from('years_experience,annual_salary\n10,100000\n'), expiresAt: '2026-01-01T00:15:00.000Z' }),
  };
  const mlClient = {
    analyze: async () => ({
      analysisId: '00000000-0000-4000-8000-000000000001', taskType: 'regression' as const,
      model: { name: 'LinearRegression' as const }, baseline: { name: 'DummyRegressor (mean)' as const }, quality: 'useful_signal' as const,
      metrics: { model: { mae: 1, rmse: 1, r2: 0.9 }, baseline: { mae: 2, rmse: 2, r2: 0 }, improvement: { maeAbsolute: 1, maePercent: 50, rmseAbsolute: 1, rmsePercent: 50, r2Absolute: 0.9 } },
      predictions: [{ input: { years_experience: 10 }, estimatedValue: 100000, coverage: { outsideNumericRanges: [], unseenCategoricalValues: [] } }],
      charts: { actualVsPredicted: [{ actual: 100000, predicted: 100000 }], residualVsPredicted: [{ predicted: 100000, residual: 0 }] },
      datasetCoverage: { trainingRows: 24, testRows: 6, numericRanges: { years_experience: { min: 1, max: 20 } }, categoricalValues: {} },
      warnings: [], explanationFacts: { targetColumn: 'annual_salary', usableRows: 30, droppedMissingTargetRows: 0 },
    }),
  };
  const tools = new AnalysisTools(analysis as never, mlClient as never);
  const context = {
    requestId: 'test-request', logger: { info: (message: string) => calls.push(message), error: () => undefined },
  } as unknown as ExecutionContext;

  const created = await tools.createAnalysisPlan({
    datasetId: 'employee-compensation', question: 'Estimate salary', targetColumn: 'annual_salary',
    featureColumns: ['years_experience'], taskType: 'regression', predictionRows: [{ years_experience: 10 }],
  }, context);
  const confirmed = await tools.confirmAnalysisPlan({ reviewToken: created.reviewToken }, context);
  const result = await tools.runAnalysis({ executionToken: confirmed.executionToken }, context);

  assert.equal(confirmed.approved, true);
  assert.equal(result.targetColumn, 'annual_salary');
  assert.deepEqual(calls, ['Analysis plan created', 'Analysis plan confirmed', 'Analysis completed']);
});

test('executes an approved classification plan through the same tool', async () => {
  const classificationPlan = {
    ...plan,
    datasetId: 'employee-attrition', question: 'Will this employee leave?', targetColumn: 'attrition', taskType: 'classification' as const,
    predictionRows: [{ years_experience: 2 }],
  };
  const analysis = { prepareRun: async () => ({ plan: classificationPlan, csv: Buffer.from('years_experience,attrition\n2,leave\n'), expiresAt: '2026-01-01T00:15:00.000Z' }) };
  const mlClient = {
    analyze: async () => ({
      analysisId: '00000000-0000-4000-8000-000000000002', taskType: 'classification' as const,
      model: { name: 'LogisticRegression' as const }, baseline: { name: 'DummyClassifier (most_frequent)' as const }, quality: 'useful_signal' as const,
      metrics: { model: { accuracy: 1, precision: 1, recall: 1, f1: 1 }, baseline: { accuracy: 0.5, precision: 0.25, recall: 0.5, f1: 1 / 3 }, improvement: { f1Absolute: 2 / 3, f1Percent: 200 } },
      predictions: [{ input: { years_experience: 2 }, predictedClass: 'leave', predictedProbability: 0.9, coverage: { outsideNumericRanges: [], unseenCategoricalValues: [] } }],
      charts: { confusionMatrix: { labels: ['leave', 'stay'], values: [[2, 0], [0, 2]] }, classDistribution: [{ classLabel: 'leave', count: 12, percentage: 50 }, { classLabel: 'stay', count: 12, percentage: 50 }] },
      perClassMetrics: [{ classLabel: 'leave', precision: 1, recall: 1, f1: 1, support: 2 }, { classLabel: 'stay', precision: 1, recall: 1, f1: 1, support: 2 }],
      datasetCoverage: { trainingRows: 20, testRows: 4, numericRanges: { years_experience: { min: 1, max: 10 } }, categoricalValues: {} },
      warnings: [], explanationFacts: { targetColumn: 'attrition', usableRows: 24, droppedMissingTargetRows: 0, classCount: 2 },
    }),
  };
  const tools = new AnalysisTools(analysis as never, mlClient as never);
  const context = { requestId: 'test-request', logger: { info: () => undefined, error: () => undefined } } as unknown as ExecutionContext;

  const result = await tools.runAnalysis({ executionToken: 'execution-token' }, context);

  assert.equal(result.taskType, 'classification');
  assert.equal(result.predictions[0]?.predictedClass, 'leave');
});
