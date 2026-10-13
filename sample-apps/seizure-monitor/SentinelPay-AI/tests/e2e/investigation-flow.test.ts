/**
 * End-to-end tests (§19.3):
 *
 *   User request → agent → tools → evidence → risk → explanation → approval
 *
 * These tests drive the system the way a real MCP client/agent would:
 * through the actual tool handlers (`*.tools.ts`, which run the full
 * `runTool` pipeline — auth → authorization → envelope check → schema
 * validation → service → audit) and the actual MCP resource `read()`
 * functions, in the exact sequence `investigation.prompts.ts` documents
 * (`investigate_payment`, §7.1). Nothing here reaches into a service
 * directly — if any of these fail, a real MCP client would see the same
 * failure. `investigation.service.ts`'s own orchestrator is exercised in
 * parallel as the single-call "whole pipeline" path, since that is what a
 * NitroStack widget/host would call for a one-shot investigation.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { getTransactionHandler } from "../../src/modules/transaction.tools";
import { verifyVendorHandler } from "../../src/modules/vendor.tools";
import { analyzeInvoiceHandler } from "../../src/modules/invoice.tools";
import { getPaymentHistoryHandler } from "../../src/modules/history.tools";
import { evaluatePolicyHandler } from "../../src/modules/policy.tools";
import { calculateRiskHandler } from "../../src/modules/risk.tools";
import { prepareApprovalHandler, getPreparedApproval } from "../../src/modules/approval.tools";
import { runTool, type ToolInvocationContext } from "../../src/modules/tool-runtime";

import { readTransactionResource } from "../../src/modules/transaction.resources";
import { readCounterpartyResource } from "../../src/modules/vendor.resources";
import { readInvestigationResource, readAuditResource } from "../../src/modules/investigation.resources";
import { readRiskResource } from "../../src/modules/risk.resources";

import { investigationService } from "../../src/services/investigation.service";
import { auditService } from "../../src/services/audit.service";

import { UnauthorizedError, ForbiddenError, NotFoundError } from "../../src/domain/errors";
import type { Transaction, Counterparty, Invoice, PaymentHistoryStats } from "../../src/domain/models";

const AUTH_TOKEN = "e2e-test-token";

function withAuth<T>(run: () => T): T {
  process.env.MCP_AUTH_TOKEN = AUTH_TOKEN;
  try {
    return run();
  } finally {
    delete process.env.MCP_AUTH_TOKEN;
  }
}

function ctx(caseId: string, correlationId: string): ToolInvocationContext {
  return { correlationId, caseId, authorizationHeader: `Bearer ${AUTH_TOKEN}` };
}

test("full agent-driven investigation of TX-827, tool by tool, matches the locked reference case", () => {
  withAuth(() => {
    const caseId = "CASE-E2E-827";
    const correlationId = "corr-e2e-827";

    // Stage 4 — Execution: the documented investigate_payment tool sequence (§7.1, §9.5).
    const transaction = getTransactionHandler(
      { transactionId: "TX-827" },
      ctx(caseId, correlationId)
    ) as Transaction;
    assert.equal(transaction.amount, 842000);

    const vendor = verifyVendorHandler(
      { vendorId: transaction.vendorId },
      ctx(caseId, correlationId)
    ) as Counterparty;
    assert.equal(vendor.verifiedBeneficiaryAccount, "XXXX4412");

    const invoice = analyzeInvoiceHandler(
      { invoiceId: transaction.invoiceId },
      ctx(caseId, correlationId)
    ) as Invoice;
    assert.equal(invoice.duplicate, false);

    const history = getPaymentHistoryHandler(
      { vendorId: transaction.vendorId },
      ctx(caseId, correlationId)
    ) as PaymentHistoryStats;
    assert.equal(history.averageAmount, 173200);

    // Stage 5/6 — Verification & evidence reconciliation, done by the agent
    // itself from tool outputs it already holds (mirrors what an LLM agent
    // following investigate_payment would compute before calling evaluatePolicy).
    const beneficiaryMismatch = transaction.beneficiaryAccount !== vendor.verifiedBeneficiaryAccount;
    assert.equal(beneficiaryMismatch, true);

    const multiplier = transaction.amount / history.averageAmount;
    const amountAnomaly = multiplier >= 2;
    assert.equal(amountAnomaly, true);

    const evidence = [
      {
        evidenceId: "ev-e2e-1",
        caseId,
        type: "BENEFICIARY_MISMATCH" as const,
        severity: "HIGH" as const,
        observations: {
          transactionBeneficiary: transaction.beneficiaryAccount,
          verifiedBeneficiary: vendor.verifiedBeneficiaryAccount,
        },
        sources: [`transaction://${transaction.transactionId}`, `counterparty://${vendor.vendorId}`],
      },
      {
        evidenceId: "ev-e2e-2",
        caseId,
        type: "AMOUNT_ANOMALY" as const,
        severity: "HIGH" as const,
        observations: { multiplier: Number(multiplier.toFixed(2)) },
        sources: [`transaction://${transaction.transactionId}`, `history://${vendor.vendorId}`],
      },
    ];

    const policy = evaluatePolicyHandler(
      { caseId, transactionAmount: transaction.amount, evidence },
      ctx(caseId, correlationId)
    ) as { approvalRequired: boolean; policyViolations: unknown[]; reviewRequired: boolean };
    assert.equal(policy.approvalRequired, true);
    assert.equal(policy.policyViolations.length, 2);

    const risk = calculateRiskHandler(
      {
        beneficiaryMismatch,
        amountAnomaly,
        policyViolation: policy.policyViolations.length > 0,
      },
      ctx(caseId, correlationId)
    ) as { riskScore: number; riskLevel: string };
    assert.equal(risk.riskScore, 87);
    assert.equal(risk.riskLevel, "HIGH");

    // Stage — prepare human review. Status must always be WAITING_FOR_HUMAN_APPROVAL,
    // never an auto-approval, regardless of any input the agent supplies (§5.8).
    const approval = prepareApprovalHandler(
      {
        caseId,
        transactionId: transaction.transactionId,
        riskScore: risk.riskScore,
        riskLevel: risk.riskLevel as "LOW" | "MEDIUM" | "HIGH",
        recommendation: "HOLD",
      },
      ctx(caseId, correlationId)
    ) as { status: string; recommendation: string };
    assert.equal(approval.status, "WAITING_FOR_HUMAN_APPROVAL");
    assert.equal(approval.recommendation, "HOLD");
    assert.equal(getPreparedApproval(caseId)?.status, "WAITING_FOR_HUMAN_APPROVAL");

    // Stage 6/7 — Storage & Reporting: the audit trail must show every tool call
    // that just happened, in order, plus the final risk/approval summary (§12.5).
    const summary = auditService.getSummary(caseId);
    assert.ok(summary);
    assert.deepEqual(summary?.toolCalls, [
      "getTransaction",
      "verifyVendor",
      "analyzeInvoice",
      "getPaymentHistory",
      "evaluatePolicy",
      "calculateRisk",
      "prepareApproval",
    ]);
    assert.equal(summary?.riskScore, 87);
    assert.equal(summary?.recommendation, "HOLD");
    assert.equal(summary?.approvalStatus, "WAITING_FOR_HUMAN_APPROVAL");
    assert.deepEqual(summary?.errors, []);

    // The MCP resources a UI/agent would re-read afterwards must reflect
    // exactly what was just computed (not recompute or diverge from it).
    const transactionResourceResult = readTransactionResource("TX-827") as Transaction;
    assert.equal(transactionResourceResult.transactionId, "TX-827");

    const vendorResourceResult = readCounterpartyResource("VENDOR-032") as Counterparty;
    assert.equal(vendorResourceResult.verifiedBeneficiaryAccount, "XXXX4412");

    const riskResourceResult = readRiskResource(caseId) as { riskScore: number; riskLevel: string };
    assert.equal(riskResourceResult.riskScore, 87);
    assert.equal(riskResourceResult.riskLevel, "HIGH");
  });
});

test("the single-call orchestrator (investigation.service.ts) reaches the same TX-827 result end to end", () => {
  const result = investigationService.investigate("TX-827", "corr-e2e-orchestrator-827");

  assert.equal(result.risk.riskScore, 87);
  assert.equal(result.risk.riskLevel, "HIGH");
  assert.equal(result.approval.recommendation, "HOLD");
  assert.equal(result.approval.status, "WAITING_FOR_HUMAN_APPROVAL");
  assert.equal(result.investigation.status, "PENDING_HUMAN_REVIEW");
  assert.ok(result.evidence.some((e) => e.type === "BENEFICIARY_MISMATCH"));
  assert.ok(result.evidence.some((e) => e.type === "AMOUNT_ANOMALY"));

  // Resources backed by the orchestrator's own case store must resolve.
  const investigationResourceResult = readInvestigationResource(result.investigation.caseId) as {
    status: string;
  };
  assert.equal(investigationResourceResult.status, "PENDING_HUMAN_REVIEW");

  const auditResourceResult = readAuditResource(result.investigation.caseId) as {
    recommendation: string | null;
  };
  assert.equal(auditResourceResult.recommendation, "HOLD");
});

test("the orchestrator reaches RELEASE end to end for a clean transaction (TX-100)", () => {
  const result = investigationService.investigate("TX-100", "corr-e2e-100");

  assert.equal(result.risk.riskLevel, "LOW");
  assert.equal(result.policy.approvalRequired, false);
  assert.equal(result.approval.recommendation, "RELEASE");
  // Even a RELEASE recommendation still waits for a human — there is no
  // auto-execution path anywhere in this system (§5.8).
  assert.equal(result.approval.status, "WAITING_FOR_HUMAN_APPROVAL");
});

test("the orchestrator forces HOLD end to end despite a low numeric score (TX-200, duplicate invoice)", () => {
  const result = investigationService.investigate("TX-200", "corr-e2e-200");

  assert.equal(result.risk.riskLevel, "LOW");
  assert.equal(result.policy.approvalRequired, true);
  assert.equal(result.approval.recommendation, "HOLD");
});

test("the orchestrator forces HOLD end to end for missing evidence, never a silent RELEASE (TX-300)", () => {
  const result = investigationService.investigate("TX-300", "corr-e2e-300");

  assert.ok(result.evidence.some((e) => e.type === "INCOMPLETE_EVIDENCE"));
  assert.equal(result.approval.recommendation, "HOLD");
});

test("an unknown transaction ID fails the whole investigation cleanly (no partial/garbage case)", () => {
  assert.throws(
    () => investigationService.investigate("TX-DOES-NOT-EXIST", "corr-e2e-missing"),
    NotFoundError
  );
});

// --- Security, end to end through the real tool-invocation pipeline ---

test("a tool call without any Authorization header is rejected before touching any service", () => {
  process.env.MCP_AUTH_TOKEN = AUTH_TOKEN;
  try {
    assert.throws(
      () =>
        getTransactionHandler(
          { transactionId: "TX-827" },
          { correlationId: "corr-e2e-noauth" } // no authorizationHeader
        ),
      UnauthorizedError
    );
  } finally {
    delete process.env.MCP_AUTH_TOKEN;
  }
});

test("a tool call with a wrong bearer token is rejected end to end", () => {
  process.env.MCP_AUTH_TOKEN = AUTH_TOKEN;
  try {
    assert.throws(
      () =>
        getTransactionHandler(
          { transactionId: "TX-827" },
          { correlationId: "corr-e2e-badauth", authorizationHeader: "Bearer wrong-token" }
        ),
      UnauthorizedError
    );
  } finally {
    delete process.env.MCP_AUTH_TOKEN;
  }
});

test("a well-authenticated call to an unauthorized tool name is rejected by capability checks", () => {
  withAuth(() => {
    // There is no capability for an executePayment-style tool anywhere in
    // the system; simulate what would happen if one were ever wired up by
    // calling the shared pipeline directly with that name.
    assert.throws(
      () =>
        runTool(
          "executePayment",
          { correlationId: "corr-e2e-forbidden", authorizationHeader: `Bearer ${AUTH_TOKEN}` },
          { anything: true },
          () => ({ anything: true }),
          (input) => input
        ),
      ForbiddenError
    );
  });
});

test("a malformed transaction ID is rejected end to end before any fixture lookup happens", () => {
  withAuth(() => {
    assert.throws(
      () =>
        getTransactionHandler({ transactionId: "not a valid id!" }, ctx("CASE-BAD-ID", "corr-e2e-badid")),
      (err: unknown) => err instanceof Error && err.name === "InvalidInputError"
    );
  });
});
