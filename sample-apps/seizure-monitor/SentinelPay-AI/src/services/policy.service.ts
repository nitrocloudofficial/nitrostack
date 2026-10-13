/**
 * SentinelPay AI — Policy Service (Deterministic Policy Engine)
 * Source: Technical Specification §5.6 (evaluatePolicy), §10.5 (Policy model)
 *
 * Rules (locked, §5.6):
 *   Payment > ₹5,00,000        → Human approval required
 *   Beneficiary mismatch       → Verification required
 *   Duplicate invoice          → High risk + human review
 *   Missing mandatory evidence → Cannot recommend release
 *
 * The policy engine never executes an adverse financial action — it only
 * returns a structured PolicyResult for the risk engine / approval layer.
 */

import type { Evidence, Policy, PolicyResult, PolicyViolation } from "../domain/models.js";
import { PolicyError } from "../domain/errors.js";
import { fixtureRepository } from "./fixtures.js";
import { hasBlockingEvidenceGap } from "../domain/evidence.js";
import { logger } from "../observability/logger.js";

// §17.1 — env-tunable, defaults to the fixture-configured value (locked spec
// default 500000 / ₹5,00,000, §5.6) when unset. Mirrors the override pattern
// already used for the risk weights in risk.service.ts.
const APPROVAL_THRESHOLD_OVERRIDE =
  process.env.APPROVAL_THRESHOLD !== undefined ? Number(process.env.APPROVAL_THRESHOLD) : undefined;

export interface PolicyEvaluationInput {
  caseId: string;
  transactionAmount: number;
  evidence: Evidence[];
}

export class PolicyService {
  /** §5.6 output: { approvalRequired, policyViolations, reviewRequired } */
  evaluatePolicy(input: PolicyEvaluationInput): PolicyResult {
    const start = Date.now();
    const fixturePolicy: Policy | null = fixtureRepository.getPolicy();

    if (!fixturePolicy) {
      throw new PolicyError("Payment policy configuration could not be loaded.", {
        caseId: input.caseId,
      });
    }

    const policy: Policy =
      APPROVAL_THRESHOLD_OVERRIDE !== undefined && !Number.isNaN(APPROVAL_THRESHOLD_OVERRIDE)
        ? { ...fixturePolicy, approvalThreshold: APPROVAL_THRESHOLD_OVERRIDE }
        : fixturePolicy;

    const violations: PolicyViolation[] = [];

    // Rule 1: amount threshold
    if (input.transactionAmount > policy.approvalThreshold) {
      violations.push({
        rule: "PAYMENT_APPROVAL_THRESHOLD",
        reason: "Transaction exceeds configured approval threshold",
      });
    }

    const beneficiaryMismatch = input.evidence.some((e) => e.type === "BENEFICIARY_MISMATCH");
    if (beneficiaryMismatch && policy.beneficiaryMismatchRequiresReview) {
      violations.push({
        rule: "BENEFICIARY_VERIFICATION_REQUIRED",
        reason: "Transaction beneficiary does not match the verified vendor beneficiary account",
      });
    }

    const duplicateInvoice = input.evidence.some((e) => e.type === "DUPLICATE_INVOICE");
    if (duplicateInvoice && policy.duplicateInvoiceRequiresReview) {
      violations.push({
        rule: "DUPLICATE_INVOICE",
        reason: "Invoice is flagged as a duplicate",
      });
    }

    const missingEvidence = hasBlockingEvidenceGap(input.evidence);
    if (missingEvidence && policy.missingEvidenceRequiresReview) {
      violations.push({
        rule: "MISSING_MANDATORY_EVIDENCE",
        reason: "Required evidence is incomplete or conflicting; release cannot be recommended",
      });
    }

    const result: PolicyResult = {
      approvalRequired: violations.length > 0,
      policyViolations: violations,
      reviewRequired: violations.length > 0,
    };

    logger.info("policy.evaluated", {
      caseId: input.caseId,
      violationCount: violations.length,
      durationMs: Date.now() - start,
    });

    return result;
  }
}

export const policyService = new PolicyService();
