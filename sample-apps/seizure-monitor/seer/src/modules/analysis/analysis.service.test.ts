import assert from 'node:assert/strict';
import test from 'node:test';
import type { AnalysisLimits } from '../../config/environment.js';
import { AnalysisPlanError, AnalysisService } from './analysis.service.js';
import { PlanTokenService } from './plan-token.service.js';

const regressionCsv = Buffer.from(`employee_id,years_experience,department,performance_rating,annual_salary\n${Array.from({ length: 24 }, (_, index) => `EMP${String(index + 1).padStart(4, '0')},${index + 1},${index % 2 ? 'engineering' : 'sales'},${(index % 5) + 1},${70000 + index * 3000}`).join('\n')}\n`);
const classificationCsv = Buffer.from(`id,years_experience,department,churn\n${Array.from({ length: 24 }, (_, index) => `EMP${String(index + 1).padStart(4, '0')},${index + 1},${index % 2 ? 'engineering' : 'sales'},${index % 2 ? 'yes' : 'no'}`).join('\n')}\n`);

function createService(initialCsv: Buffer<ArrayBufferLike> = regressionCsv, limits?: AnalysisLimits) {
  let csv: Buffer<ArrayBufferLike> = initialCsv;
  const service = new AnalysisService(
    { readCsv: async () => csv } as never,
    PlanTokenService.forTesting({ tokenSecret: 'a-very-long-dedicated-plan-token-secret', tokenLifetimeMs: 900_000 }, () => 1_000),
    limits,
  );
  return { service, replaceCsv: (value: Buffer<ArrayBufferLike>) => { csv = value; } };
}

test('creates a deterministic, signed regression analysis plan', async () => {
  const { service } = createService();
  const result = await service.create({
    datasetId: 'employee-compensation',
    question: 'Estimate annual salary for an employee.',
    targetColumn: 'annual_salary',
    featureColumns: ['years_experience', 'department', 'performance_rating'],
    taskType: 'regression',
    predictionRows: [{ years_experience: 10, department: 'engineering', performance_rating: 4 }],
  });

  assert.equal(result.plan.rows.usable, 24);
  assert.deepEqual(result.plan.preprocessing.numeric, ['years_experience', 'performance_rating']);
  assert.deepEqual(result.plan.preprocessing.categorical, ['department']);
  assert.match(result.reviewToken, /\./);
  assert.ok(result.plan.assumptions.some((item) => item.includes('performance_rating')));
  const confirmed = await service.confirm(result.reviewToken);
  assert.deepEqual(confirmed.approved, true);
  assert.match(confirmed.executionToken, /\./);
  await assert.rejects(service.prepareRun(result.reviewToken), /Explicit user approval is required/);
  assert.equal((await service.prepareRun(confirmed.executionToken)).plan.question, 'Estimate annual salary for an employee.');
});

test('creates a valid classification plan for a two-class target', async () => {
  const { service } = createService(classificationCsv);
  const result = await service.create({
    datasetId: 'employee-compensation',
    question: 'Will this employee churn?',
    targetColumn: 'churn',
    featureColumns: ['years_experience', 'department'],
    taskType: 'classification',
    predictionRows: [{ years_experience: 6, department: 'engineering' }],
  });

  assert.equal(result.plan.taskType, 'classification');
});

test('rejects invalid feature selection and incomplete prediction rows', async () => {
  const { service } = createService();
  const input = {
    datasetId: 'employee-compensation', question: 'Estimate salary', targetColumn: 'annual_salary',
    featureColumns: ['employee_id'], taskType: 'regression' as const, predictionRows: [{ employee_id: 'EMP9999' }],
  };
  await assert.rejects(service.create(input), AnalysisPlanError);

  await assert.rejects(service.create({
    ...input,
    featureColumns: ['years_experience', 'department'],
    predictionRows: [{ years_experience: 10 }],
  }), AnalysisPlanError);
});

test('rejects classification when the target has too many classes', async () => {
  const { service } = createService();
  await assert.rejects(service.create({
    datasetId: 'employee-compensation', question: 'Classify salary', targetColumn: 'annual_salary',
    featureColumns: ['years_experience'], taskType: 'classification', predictionRows: [{ years_experience: 10 }],
  }), /between 2 and 10 classes/);
});

test('rejects confirmation when the packaged dataset changes', async () => {
  const { service, replaceCsv } = createService();
  const result = await service.create({
    datasetId: 'employee-compensation', question: 'Estimate salary', targetColumn: 'annual_salary',
    featureColumns: ['years_experience'], taskType: 'regression', predictionRows: [{ years_experience: 10 }],
  });
  replaceCsv(Buffer.from(`${regressionCsv.toString('utf8')}EMP9999,25,sales,4,150000\n`));

  await assert.rejects(service.confirm(result.reviewToken), /dataset has changed/);
});

test('discloses prediction rows outside the observed numeric dataset range before approval', async () => {
  const { service } = createService();
  const result = await service.create({
    datasetId: 'employee-compensation', question: 'Estimate salary', targetColumn: 'annual_salary',
    featureColumns: ['years_experience'], taskType: 'regression', predictionRows: [{ years_experience: 99 }],
  });

  assert.ok(result.plan.warnings.some((warning) => warning.includes('outside the observed dataset range')));
});

test('enforces a configured prediction-row limit before issuing a plan token', async () => {
  const { service } = createService(regressionCsv, {
    maxCategoricalValues: 50,
    maxEncodedFeatures: 500,
    maxPredictionRows: 1,
    minUsableRows: 20,
    smallDatasetWarningRows: 100,
    maxClassificationClasses: 10,
  });

  await assert.rejects(service.create({
    datasetId: 'employee-compensation', question: 'Estimate salary', targetColumn: 'annual_salary',
    featureColumns: ['years_experience'], taskType: 'regression',
    predictionRows: [{ years_experience: 10 }, { years_experience: 11 }],
  }), /maximum of 1 prediction row/);
});

test('discloses small datasets and universal model limitations before approval', async () => {
  const { service } = createService();
  const result = await service.create({
    datasetId: 'employee-compensation', question: 'Estimate salary', targetColumn: 'annual_salary',
    featureColumns: ['years_experience'], taskType: 'regression', predictionRows: [{ years_experience: 10 }],
  });

  assert.ok(result.plan.warnings.some((warning) => warning.includes('small dataset')));
  assert.ok(result.plan.warnings.some((warning) => warning.includes('associations, not causes')));
  assert.ok(result.plan.warnings.some((warning) => warning.includes('bias or unequal outcomes')));
});
