import assert from 'node:assert/strict';
import test from 'node:test';
import type { AnalysisPlan } from './analysis.schemas.js';
import { PlanTokenError, PlanTokenService } from './plan-token.service.js';

const plan: AnalysisPlan = {
  datasetId: 'employee-compensation',
  question: 'Estimate salary',
  targetColumn: 'annual_salary',
  featureColumns: ['years_experience'],
  taskType: 'regression',
  predictionRows: [{ years_experience: 10 }],
  preprocessing: {
    numeric: ['years_experience'], categorical: [], numericImputer: 'median', numericScaler: 'standard',
    categoricalImputer: 'most_frequent', categoricalEncoder: 'one_hot',
  },
  rows: { dataset: 30, missingTarget: 0, usable: 30 },
  excludedColumns: [],
  assumptions: [],
  warnings: [],
  split: { trainingPercent: 80, testPercent: 20, randomState: 42 },
};

test('issues review tokens and exchanges them for execution tokens', () => {
  const tokenService = PlanTokenService.forTesting({ tokenSecret: 'a-very-long-dedicated-plan-token-secret', tokenLifetimeMs: 900_000 }, () => 1_000);
  const issued = tokenService.issueReview(plan, 'a'.repeat(64));
  const review = tokenService.verify(issued.token);
  const execution = tokenService.issueExecution(review);

  assert.equal(review.purpose, 'review');
  assert.equal(tokenService.verify(execution.token).purpose, 'execution');
  assert.equal(review.plan.question, 'Estimate salary');
  assert.equal(issued.expiresAt, '1970-01-01T00:15:01.000Z');
});

test('rejects tampered and expired analysis-plan tokens', () => {
  let now = 1_000;
  const tokenService = PlanTokenService.forTesting({ tokenSecret: 'a-very-long-dedicated-plan-token-secret', tokenLifetimeMs: 100 }, () => now);
  const issued = tokenService.issueReview(plan, 'a'.repeat(64));
  const tampered = `${issued.token.slice(0, -1)}x`;

  assert.throws(() => tokenService.verify(tampered), PlanTokenError);
  const differentSecret = PlanTokenService.forTesting({ tokenSecret: 'another-very-long-dedicated-token-secret', tokenLifetimeMs: 100 }, () => now);
  assert.throws(() => differentSecret.verify(issued.token), PlanTokenError);
  now = 1_101;
  assert.throws(() => tokenService.verify(issued.token), PlanTokenError);
});
