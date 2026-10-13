/**
 * Security tests for the least-privilege capability model (§11.4, §12.2).
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  assertAuthorized,
  assertToolAuthorized,
  isAuthorized,
  TOOL_CAPABILITY_MAP,
} from "../../src/security/authorization";
import { ForbiddenError } from "../../src/domain/errors";

test("all seven documented tools map to a granted capability", () => {
  const expectedTools = [
    "getTransaction",
    "verifyVendor",
    "analyzeInvoice",
    "getPaymentHistory",
    "evaluatePolicy",
    "calculateRisk",
    "prepareApproval",
  ];

  for (const tool of expectedTools) {
    assert.ok(TOOL_CAPABILITY_MAP[tool], `expected a capability mapping for ${tool}`);
    assert.doesNotThrow(() => assertToolAuthorized(tool));
  }
});

test("no capability for transferring funds, modifying vendor/policy, or self-approval exists", () => {
  const forbidden = [
    "TRANSFER_FUNDS",
    "MODIFY_VENDOR",
    "MODIFY_POLICY",
    "SELF_APPROVE",
    "EXECUTE_PAYMENT",
  ];

  for (const capability of forbidden) {
    // @ts-expect-error — intentionally passing a capability outside the closed union
    assert.equal(isAuthorized(capability), false);
  }
});

test("unknown tool name is rejected, not silently allowed", () => {
  assert.throws(() => assertToolAuthorized("executePayment"), ForbiddenError);
  assert.throws(() => assertToolAuthorized("transferFunds"), ForbiddenError);
});

test("assertAuthorized throws ForbiddenError for capabilities outside the closed set", () => {
  assert.throws(() => {
    // @ts-expect-error — intentional out-of-union capability
    assertAuthorized("TRANSFER_FUNDS");
  }, ForbiddenError);
});
