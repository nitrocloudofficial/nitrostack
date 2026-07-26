import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateFinancialHealth } from './financial-health.logic.js';

test('scores a strong financial position highly with a positive-reinforcement suggestion', () => {
  const result = calculateFinancialHealth({
    monthlyIncome: 100000,
    monthlyExpenses: 40000,
    savings: 240000, // 6 months of expenses, consistent with emergencyFundMonths below
    monthlyDebtPayment: 0,
    emergencyFundMonths: 6
  });
  assert.ok(result.score >= 80);
  assert.match(result.suggestions[0], /strong/i);
});

test('flags when expenses and debt exceed income', () => {
  const result = calculateFinancialHealth({
    monthlyIncome: 30000,
    monthlyExpenses: 25000,
    savings: 5000,
    monthlyDebtPayment: 10000,
    emergencyFundMonths: 0
  });
  assert.equal(result.subScores.savingsRate, 0);
  assert.match(result.suggestions[0], /exceed your income/i);
});

test('scores exactly at the 40% DTI failure threshold as zero on debtRatio', () => {
  const result = calculateFinancialHealth({
    monthlyIncome: 50000,
    monthlyExpenses: 20000,
    savings: 100000,
    monthlyDebtPayment: 20000,
    emergencyFundMonths: 6
  });
  assert.equal(result.subScores.debtRatio, 0);
});

test('caps the emergency fund sub-score at 100 beyond the 6-month target', () => {
  const result = calculateFinancialHealth({
    monthlyIncome: 50000,
    monthlyExpenses: 20000,
    savings: 300000,
    monthlyDebtPayment: 0,
    emergencyFundMonths: 12
  });
  assert.equal(result.subScores.emergencyFund, 100);
});

test('flags a mismatch between stated savings and stated emergency fund months', () => {
  const result = calculateFinancialHealth({
    monthlyIncome: 50000,
    monthlyExpenses: 20000,
    savings: 20000,
    monthlyDebtPayment: 0,
    emergencyFundMonths: 6
  });
  assert.ok(result.suggestions.some((s) => /double-check/i.test(s)));
});
