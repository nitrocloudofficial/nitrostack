/**
 * Unit tests for the deterministic policy engine (§5.6).
 * Depends on data/policies.json (approvalThreshold = 500000).
 */

import test from "node:test";
import assert from "node:assert/strict";
import { policyService } from "../../src/services/policy.service";
import { buildEvidence } from "../fixtures";

test("amount above threshold triggers PAYMENT_APPROVAL_THRESHOLD", () => {
  const result = policyService.evaluatePolicy({
    caseId: "CASE-1",
    transactionAmount: 842000,
    evidence: [],
  });

  assert.equal(result.approvalRequired, true);
  assert.ok(result.policyViolations.some((v) => v.rule === "PAYMENT_APPROVAL_THRESHOLD"));
});

test("amount below threshold with no evidence → no violations", () => {
  const result = policyService.evaluatePolicy({
    caseId: "CASE-2",
    transactionAmount: 100000,
    evidence: [],
  });

  assert.equal(result.approvalRequired, false);
  assert.equal(result.policyViolations.length, 0);
});

test("beneficiary mismatch evidence triggers BENEFICIARY_VERIFICATION_REQUIRED", () => {
  const result = policyService.evaluatePolicy({
    caseId: "CASE-3",
    transactionAmount: 100000,
    evidence: [buildEvidence({ type: "BENEFICIARY_MISMATCH" })],
  });

  assert.ok(result.policyViolations.some((v) => v.rule === "BENEFICIARY_VERIFICATION_REQUIRED"));
});

test("duplicate invoice evidence triggers DUPLICATE_INVOICE and requires review", () => {
  const result = policyService.evaluatePolicy({
    caseId: "CASE-4",
    transactionAmount: 100000,
    evidence: [buildEvidence({ type: "DUPLICATE_INVOICE" })],
  });

  assert.ok(result.policyViolations.some((v) => v.rule === "DUPLICATE_INVOICE"));
  assert.equal(result.reviewRequired, true);
});

test("incomplete evidence triggers MISSING_MANDATORY_EVIDENCE — never a silent pass", () => {
  const result = policyService.evaluatePolicy({
    caseId: "CASE-5",
    transactionAmount: 100000,
    evidence: [buildEvidence({ type: "INCOMPLETE_EVIDENCE" })],
  });

  assert.ok(result.policyViolations.some((v) => v.rule === "MISSING_MANDATORY_EVIDENCE"));
});

test("data conflict also counts as a blocking evidence gap", () => {
  const result = policyService.evaluatePolicy({
    caseId: "CASE-6",
    transactionAmount: 100000,
    evidence: [buildEvidence({ type: "DATA_CONFLICT" })],
  });

  assert.ok(result.policyViolations.some((v) => v.rule === "MISSING_MANDATORY_EVIDENCE"));
});
