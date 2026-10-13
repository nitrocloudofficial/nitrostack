/**
 * End-to-end pipeline test for the reference case TX-827 (§35.6, §23.2).
 * Exercises the full investigation.service.ts orchestration against the
 * real data/*.json fixtures (not test-fixture builders), so this is the
 * closest thing to a regression test for the exact demo numbers.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { investigationService } from "../../src/services/investigation.service";

test("TX-827 end-to-end: risk 87, HIGH, HOLD, WAITING_FOR_HUMAN_APPROVAL", () => {
  const result = investigationService.investigate("TX-827", "corr-test-827");

  assert.equal(result.risk?.riskScore, 87);
  assert.equal(result.risk?.riskLevel, "HIGH");
  assert.equal(result.approval.recommendation, "HOLD");
  assert.equal(result.approval.status, "WAITING_FOR_HUMAN_APPROVAL");
  assert.equal(result.investigation.status, "PENDING_HUMAN_REVIEW");

  const types = result.evidence.map((e) => e.type).sort();
  assert.ok(types.includes("BENEFICIARY_MISMATCH"));
  assert.ok(types.includes("AMOUNT_ANOMALY"));
});

test("TX-100 (clean, in-range, no mismatch) → LOW risk, RELEASE", () => {
  const result = investigationService.investigate("TX-100", "corr-test-100");

  assert.equal(result.risk?.riskLevel, "LOW");
  assert.equal(result.approval.recommendation, "RELEASE");
  // Even a clean case still stops at human approval — no auto-execution exists.
  assert.equal(result.approval.status, "WAITING_FOR_HUMAN_APPROVAL");
});

test("TX-200 (duplicate invoice) → policy violation drives risk up", () => {
  const result = investigationService.investigate("TX-200", "corr-test-200");

  assert.ok(result.risk && result.risk.riskScore >= 20);
  const types = result.evidence.map((e) => e.type);
  assert.ok(types.includes("DUPLICATE_INVOICE"));
});

test("TX-300 (unverified vendor, no history) → forced HOLD despite gaps", () => {
  const result = investigationService.investigate("TX-300", "corr-test-300");

  // Missing/incomplete evidence must never silently produce RELEASE (§8.7).
  assert.equal(result.approval.recommendation, "HOLD");
});

test("no path in this service can move money", () => {
  assert.equal(
    // Intentionally checking that no such method exists on the service.
    typeof (investigationService as unknown as { executePayment?: unknown }).executePayment,
    "undefined"
  );
});
