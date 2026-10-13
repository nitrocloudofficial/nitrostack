/**
 * Unit tests for payment history statistics (§5.5, §35.6).
 * Verifies the amount-anomaly multiplier is *calculated*, not hard-coded.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { historyService } from "../../src/services/history.service";
import { evaluateAmountAnomaly } from "../../src/domain/evidence";
import { buildTransaction, TX_827_REFERENCE } from "../fixtures";
import { IncompleteEvidenceError } from "../../src/domain/errors";

test("VENDOR-032 history average matches locked §35.6 value (173200)", () => {
  const stats = historyService.getPaymentHistory("VENDOR-032");

  assert.equal(stats.transactionCount, 5);
  assert.equal(stats.averageAmount, TX_827_REFERENCE.expectedAverage);
  assert.equal(stats.maxAmount, 203000);
  assert.deepEqual(stats.transactions, TX_827_REFERENCE.historyPayments);
});

test("TX-827 amount / VENDOR-032 average ≈ 4.86x (calculated, not hard-coded)", () => {
  const stats = historyService.getPaymentHistory("VENDOR-032");
  const transaction = buildTransaction({
    transactionId: "TX-827",
    amount: 842000,
  });

  const { evidence, multiplier } = evaluateAmountAnomaly("CASE-827", transaction, stats);

  assert.ok(multiplier !== null);
  assert.equal(Math.round((multiplier as number) * 100) / 100, 4.86);
  assert.ok(evidence, "expected AMOUNT_ANOMALY evidence to be generated");
  assert.equal(evidence?.type, "AMOUNT_ANOMALY");
  assert.equal(evidence?.severity, "HIGH");
});

test("unknown vendor throws IncompleteEvidenceError, never zeros", () => {
  assert.throws(
    () => historyService.getPaymentHistory("VENDOR-DOES-NOT-EXIST"),
    IncompleteEvidenceError
  );
});

test("vendor with no history record (VENDOR-103) throws IncompleteEvidenceError", () => {
  // VENDOR-103 exists in counterparties.json but is intentionally
  // omitted from payment-history.json to exercise this path.
  assert.throws(
    () => historyService.getPaymentHistory("VENDOR-103"),
    IncompleteEvidenceError
  );
});

test("amount within normal range produces no anomaly evidence", () => {
  const stats = historyService.getPaymentHistory("VENDOR-101");
  const transaction = buildTransaction({
    transactionId: "TX-100",
    amount: 180000,
  });

  const { evidence, multiplier } = evaluateAmountAnomaly("CASE-100", transaction, stats);

  assert.ok(multiplier !== null && multiplier < 2.0);
  assert.equal(evidence, null);
});
