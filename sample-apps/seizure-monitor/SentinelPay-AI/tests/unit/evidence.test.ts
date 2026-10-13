/**
 * Unit tests for domain/evidence.ts — the canonical beneficiary
 * comparison (§5.3), missing-data handling (§8.7), and conflict
 * handling (§8.8).
 */

import test from "node:test";
import assert from "node:assert/strict";
import { evaluateBeneficiaryMatch, evaluateDuplicateInvoice } from "../../src/domain/evidence";
import { buildTransaction, buildVendor, buildInvoice, TX_827_REFERENCE } from "../fixtures";

test("TX-827: XXXX8291 vs XXXX4412 → BENEFICIARY_MISMATCH (locked §35.6)", () => {
  const evidence = evaluateBeneficiaryMatch(
    "CASE-827",
    TX_827_REFERENCE.transaction,
    TX_827_REFERENCE.vendor
  );

  assert.ok(evidence);
  assert.equal(evidence?.type, "BENEFICIARY_MISMATCH");
  assert.equal(evidence?.severity, "HIGH");
  assert.deepEqual(evidence?.observations, {
    transactionBeneficiary: "XXXX8291",
    verifiedBeneficiary: "XXXX4412",
  });
});

test("matching beneficiary accounts produce no evidence", () => {
  const transaction = buildTransaction({ beneficiaryAccount: "XXXX9999" });
  const vendor = buildVendor({ verifiedBeneficiaryAccount: "XXXX9999" });

  const evidence = evaluateBeneficiaryMatch("CASE-OK", transaction, vendor);
  assert.equal(evidence, null);
});

test("unverified vendor → INCOMPLETE_EVIDENCE, never a guessed match or mismatch (§5.3)", () => {
  const transaction = buildTransaction();
  const vendor = buildVendor({ verified: false, verifiedBeneficiaryAccount: "" });

  const evidence = evaluateBeneficiaryMatch("CASE-INCOMPLETE", transaction, vendor);
  assert.ok(evidence);
  assert.equal(evidence?.type, "INCOMPLETE_EVIDENCE");
});

test("null vendor (not found/unavailable) → INCOMPLETE_EVIDENCE", () => {
  const transaction = buildTransaction();
  const evidence = evaluateBeneficiaryMatch("CASE-NULL", transaction, null);
  assert.ok(evidence);
  assert.equal(evidence?.type, "INCOMPLETE_EVIDENCE");
});

test("duplicate invoice is flagged but is a risk indicator, not a rejection (§5.4)", () => {
  const invoice = buildInvoice({ duplicate: true });
  const evidence = evaluateDuplicateInvoice("CASE-DUP", invoice);

  assert.ok(evidence);
  assert.equal(evidence?.type, "DUPLICATE_INVOICE");
  // The evidence record itself carries no verdict — policy/risk layers decide meaning.
  assert.equal("recommendation" in (evidence ?? {}), false);
});

test("non-duplicate invoice produces no evidence", () => {
  const invoice = buildInvoice({ duplicate: false });
  const evidence = evaluateDuplicateInvoice("CASE-NODUP", invoice);
  assert.equal(evidence, null);
});
