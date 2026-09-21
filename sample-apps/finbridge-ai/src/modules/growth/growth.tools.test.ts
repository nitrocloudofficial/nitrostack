import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { sipFutureValue, GrowthTools } from './growth.tools.js';

// See growth.service.test.ts for why this is necessary.
after(() => {
  setTimeout(() => process.exit(process.exitCode ?? 0), 100);
});

test('sipFutureValue matches a hand-computed example', () => {
  // 2000/month at 12% annual for 1 year -> monthly rate 1%, 12 months, annuity due
  const fv = sipFutureValue(2000, 0.12, 1);
  const expected = 2000 * ((Math.pow(1.01, 12) - 1) / 0.01) * 1.01;
  assert.ok(Math.abs(fv - expected) < 0.01);
});

test('sipFutureValue handles a zero rate without dividing by zero', () => {
  const fv = sipFutureValue(1000, 0, 2);
  assert.equal(fv, 1000 * 24);
});

const fakeNavCacheService = {
  async getCagrBand() {
    return { low: 0.08, high: 0.12, source: 'live' as const, asOf: '24-07-2026', schemeName: 'Test Fund' };
  }
};

test('rejects a non-positive monthlyAmount', async () => {
  const tools = new GrowthTools(fakeNavCacheService as any);
  await assert.rejects(
    tools.projectInvestmentGrowth(
      { monthlyAmount: 0, years: 5, fundCategory: 'equity' },
      { logger: { info: () => {} } } as any
    ),
    /monthlyAmount must be a positive number/
  );
});

test('rejects a years value outside 1-40', async () => {
  const tools = new GrowthTools(fakeNavCacheService as any);
  await assert.rejects(
    tools.projectInvestmentGrowth(
      { monthlyAmount: 1000, years: 50, fundCategory: 'equity' },
      { logger: { info: () => {} } } as any
    ),
    /years must be a whole number between 1 and 40/
  );
});

test('projectInvestmentGrowth always returns low <= high and non-empty assumptions', async () => {
  const tools = new GrowthTools(fakeNavCacheService as any);
  const result = await tools.projectInvestmentGrowth(
    { monthlyAmount: 5000, years: 10, fundCategory: 'equity' },
    { logger: { info: () => {} } } as any
  );

  assert.ok(result.lowEstimate <= result.highEstimate);
  assert.ok(result.assumptions.length > 0);
  assert.equal(result.educational_only, true);
  assert.match(result.navSource, /Test Fund/);
});
