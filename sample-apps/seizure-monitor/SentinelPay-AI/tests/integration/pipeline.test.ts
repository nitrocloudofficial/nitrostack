/**
 * Integration tests — complete tool combinations (§19.2):
 *
 *   transaction → vendor → invoice → history → policy → risk
 *
 * Unlike the unit tests (which exercise one service/function in
 * isolation with hand-built fixtures), these tests wire the real
 * `*.service.ts` singletons together against the real `data/*.json`
 * fixture files, the same way `investigation.service.ts` does — but
 * assembling the pipeline call-by-call here so a break in how two
 * services compose (e.g. a field-name mismatch between one service's
 * output and the next service's input) would fail here even if each
 * service's own unit tests still pass in isolation.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { transactionService } from "../../src/services/transaction.service";
import { vendorService } from "../../src/services/vendor.service";
import { invoiceService } from "../../src/services/invoice.service";
import { historyService } from "../../src/services/history.service";
import { policyService } from "../../src/services/policy.service";
import { riskService } from "../../src/services/risk.service";
import {
  evaluateAmountAnomaly,
  evaluateBeneficiaryMatch,
  evaluateDuplicateInvoice,
  evaluateInvoiceTransactionConflict,
} from "../../src/domain/evidence";
import { IncompleteEvidenceError, NotFoundError } from "../../src/domain/errors";

test("TX-827 locked reference case: full tool chain produces the exact locked numbers (§35.6)", () => {
  const caseId = "CASE-INTEGRATION-827";

  const transaction = transactionService.getTransaction("TX-827");
  assert.equal(transaction.amount, 842000);
  assert.equal(transaction.vendorId, "VENDOR-032");

  const vendor = vendorService.verifyVendor(transaction.vendorId);
  assert.equal(vendor.verified, true);
  assert.equal(vendor.verifiedBeneficiaryAccount, "XXXX4412");

  const invoice = invoiceService.analyzeInvoice(transaction.invoiceId);
  assert.equal(invoice.duplicate, false);

  const history = historyService.getPaymentHistory(transaction.vendorId);
  assert.equal(history.averageAmount, 173200);

  const beneficiaryEvidence = evaluateBeneficiaryMatch(caseId, transaction, vendor);
  assert.ok(beneficiaryEvidence);
  assert.equal(beneficiaryEvidence?.type, "BENEFICIARY_MISMATCH");

  const { evidence: amountEvidence, multiplier } = evaluateAmountAnomaly(caseId, transaction, history);
  assert.ok(amountEvidence);
  assert.equal(amountEvidence?.type, "AMOUNT_ANOMALY");
  assert.ok(multiplier !== null && Math.abs(multiplier - 4.86) < 0.01);

  const duplicateEvidence = evaluateDuplicateInvoice(caseId, invoice);
  assert.equal(duplicateEvidence, null); // TX-827's invoice is not a duplicate

  const evidence = [beneficiaryEvidence!, amountEvidence!];

  const policy = policyService.evaluatePolicy({
    caseId,
    transactionAmount: transaction.amount,
    evidence,
  });
  assert.equal(policy.approvalRequired, true);
  assert.ok(policy.policyViolations.some((v) => v.rule === "PAYMENT_APPROVAL_THRESHOLD"));
  assert.ok(policy.policyViolations.some((v) => v.rule === "BENEFICIARY_VERIFICATION_REQUIRED"));

  const risk = riskService.calculateRisk(caseId, {
    beneficiaryMismatch: true,
    amountAnomaly: true,
    policyViolation: policy.policyViolations.length > 0,
  });
  assert.equal(risk.rawScore, 87);
  assert.equal(risk.riskScore, 87);
  assert.equal(risk.riskLevel, "HIGH");

  // The risk resource cache must reflect exactly this result.
  assert.deepEqual(riskService.getLastResult(caseId), risk);
});

test("TX-100 clean case: full tool chain finds no anomalies and a LOW risk score", () => {
  const caseId = "CASE-INTEGRATION-100";

  const transaction = transactionService.getTransaction("TX-100");
  const vendor = vendorService.verifyVendor(transaction.vendorId);
  const invoice = invoiceService.analyzeInvoice(transaction.invoiceId);
  const history = historyService.getPaymentHistory(transaction.vendorId);

  const beneficiaryEvidence = evaluateBeneficiaryMatch(caseId, transaction, vendor);
  assert.equal(beneficiaryEvidence, null); // beneficiary matches — no evidence generated

  const conflictEvidence = evaluateInvoiceTransactionConflict(caseId, transaction, invoice);
  assert.equal(conflictEvidence, null);

  const duplicateEvidence = evaluateDuplicateInvoice(caseId, invoice);
  assert.equal(duplicateEvidence, null);

  const { evidence: amountEvidence } = evaluateAmountAnomaly(caseId, transaction, history);
  assert.equal(amountEvidence, null); // 100000 / ~92600 average is well under the 2x threshold

  const policy = policyService.evaluatePolicy({ caseId, transactionAmount: transaction.amount, evidence: [] });
  assert.equal(policy.approvalRequired, false);
  assert.deepEqual(policy.policyViolations, []);

  const risk = riskService.calculateRisk(caseId, {
    beneficiaryMismatch: false,
    amountAnomaly: false,
    policyViolation: false,
  });
  assert.equal(risk.riskScore, 0);
  assert.equal(risk.riskLevel, "LOW");
});

test("TX-200 duplicate invoice: policy forces review even though the numeric risk stays low", () => {
  const caseId = "CASE-INTEGRATION-200";

  const transaction = transactionService.getTransaction("TX-200");
  const vendor = vendorService.verifyVendor(transaction.vendorId);
  const invoice = invoiceService.analyzeInvoice(transaction.invoiceId);
  assert.equal(invoice.duplicate, true);

  const beneficiaryEvidence = evaluateBeneficiaryMatch(caseId, transaction, vendor);
  assert.equal(beneficiaryEvidence, null);

  const duplicateEvidence = evaluateDuplicateInvoice(caseId, invoice);
  assert.ok(duplicateEvidence);
  assert.equal(duplicateEvidence?.type, "DUPLICATE_INVOICE");

  const policy = policyService.evaluatePolicy({
    caseId,
    transactionAmount: transaction.amount,
    evidence: [duplicateEvidence!],
  });
  assert.equal(policy.approvalRequired, true);
  assert.ok(policy.policyViolations.some((v) => v.rule === "DUPLICATE_INVOICE"));

  const risk = riskService.calculateRisk(caseId, {
    beneficiaryMismatch: false,
    amountAnomaly: false,
    policyViolation: true,
  });
  assert.equal(risk.riskScore, 20);
  assert.equal(risk.riskLevel, "LOW"); // numeric score is LOW; policy still forces review
});

test("TX-300 unverified vendor with no history: both gaps surface as INCOMPLETE_EVIDENCE, never a guess", () => {
  const caseId = "CASE-INTEGRATION-300";

  const transaction = transactionService.getTransaction("TX-300");

  assert.throws(() => vendorService.verifyVendor(transaction.vendorId), IncompleteEvidenceError);
  assert.throws(() => historyService.getPaymentHistory(transaction.vendorId), IncompleteEvidenceError);

  // Evidence layer must reflect the missing vendor verification as INCOMPLETE_EVIDENCE,
  // never as a false BENEFICIARY_MISMATCH or a false "safe" result.
  const beneficiaryEvidence = evaluateBeneficiaryMatch(caseId, transaction, null);
  assert.equal(beneficiaryEvidence?.type, "INCOMPLETE_EVIDENCE");

  const { evidence: amountEvidence, multiplier } = evaluateAmountAnomaly(caseId, transaction, null);
  assert.equal(amountEvidence?.type, "INCOMPLETE_EVIDENCE");
  assert.equal(multiplier, null);

  const policy = policyService.evaluatePolicy({
    caseId,
    transactionAmount: transaction.amount,
    evidence: [beneficiaryEvidence!, amountEvidence!],
  });
  assert.equal(policy.approvalRequired, true);
  assert.ok(policy.policyViolations.some((v) => v.rule === "MISSING_MANDATORY_EVIDENCE"));
});

test("getTransaction propagates NotFoundError for an ID that doesn't exist in any fixture", () => {
  assert.throws(() => transactionService.getTransaction("TX-DOES-NOT-EXIST"), NotFoundError);
});

test("policy configuration is loaded once and reused consistently across calls", () => {
  const first = policyService.evaluatePolicy({ caseId: "CASE-A", transactionAmount: 1, evidence: [] });
  const second = policyService.evaluatePolicy({ caseId: "CASE-B", transactionAmount: 1, evidence: [] });
  assert.deepEqual(first, second);
});
