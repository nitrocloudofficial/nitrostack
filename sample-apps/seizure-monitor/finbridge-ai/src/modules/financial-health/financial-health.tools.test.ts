import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { FinancialHealthTools } from './financial-health.tools.js';

// See growth.service.test.ts for why this is necessary.
after(() => {
  setTimeout(() => process.exit(process.exitCode ?? 0), 100);
});

test('calculateFinancialHealthTool always includes the guardrail fields', async () => {
  const tools = new FinancialHealthTools();
  const result = await tools.calculateFinancialHealthTool(
    { monthlyIncome: 60000, monthlyExpenses: 35000, savings: 150000, monthlyDebtPayment: 8000, emergencyFundMonths: 4 },
    { logger: { info: () => {} } } as any
  );

  assert.equal(result.educational_only, true);
  assert.ok(result.risk_note.length > 0);
  assert.ok(result.score >= 0 && result.score <= 100);
});

test('rejects a zero or negative monthlyIncome', async () => {
  const tools = new FinancialHealthTools();
  await assert.rejects(
    tools.calculateFinancialHealthTool(
      { monthlyIncome: 0, monthlyExpenses: 1000, savings: 0, monthlyDebtPayment: 0, emergencyFundMonths: 0 },
      { logger: { info: () => {} } } as any
    ),
    /monthlyIncome must be a positive number/
  );
});
