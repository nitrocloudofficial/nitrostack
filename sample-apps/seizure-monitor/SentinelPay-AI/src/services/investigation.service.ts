/**
 * SentinelPay AI — Investigation Service (Orchestrator)
 * Source: Technical Specification §9 (Complete Pipeline), §8 (Agent Architecture),
 *         §35.6 (locked reference case TX-827)
 *
 * Coordinates the full evidence-first pipeline for one transaction:
 *   transaction → vendor → invoice → history → evidence reconciliation
 *   → policy → risk → human-review preparation.
 *
 * This module contains no MCP/NitroStack imports and — critically — no
 * method that moves money. `modules/approval.tools.ts` is the only place
 * a human decision is ever recorded, and even that never triggers a
 * transfer. There is deliberately no `executePayment()` anywhere in this
 * file or this codebase (§5.8 Critical constraint).
 *
 * Missing or conflicting evidence is never silently treated as safe
 * (§8.7, §8.8): if a downstream source can't be verified, that gap is
 * itself recorded as evidence and the case is forced to HOLD.
 */

import type {
  ApprovalCase,
  Evidence,
  InvestigationCase,
  PolicyResult,
  RiskResult,
} from "../domain/models.js";
import {
  evaluateAmountAnomaly,
  evaluateBeneficiaryMatch,
  evaluateDuplicateInvoice,
  evaluateInvoiceTransactionConflict,
  hasBlockingEvidenceGap,
} from "../domain/evidence.js";
import { IncompleteEvidenceError, NotFoundError } from "../domain/errors.js";
import { transactionService } from "./transaction.service.js";
import { vendorService } from "./vendor.service.js";
import { invoiceService } from "./invoice.service.js";
import { historyService } from "./history.service.js";
import { policyService } from "./policy.service.js";
import { riskService } from "./risk.service.js";
import { auditService } from "./audit.service.js";
import { newCaseId } from "../observability/tracing.js";
import { logger } from "../observability/logger.js";
import { BoundedMap } from "../util/bounded-map.js";

/** Caps in-memory investigation-case history (see bounded-map.ts). */
const MAX_TRACKED_CASES = 10_000;

export interface InvestigationResult {
  investigation: InvestigationCase;
  evidence: Evidence[];
  policy: PolicyResult;
  risk: RiskResult;
  approval: ApprovalCase;
}

export class InvestigationService {
  /**
   * Runs the complete investigation pipeline for a transaction (§9.1–9.10).
   * Throws only for a hard failure on the primary record itself (the
   * transaction not existing at all) — every other missing/incomplete
   * source degrades to recorded evidence rather than aborting the case,
   * per §8.7.
   */
  investigate(transactionId: string, correlationId: string): InvestigationResult {
    const caseId = newCaseId(transactionId);
    auditService.recordInvestigationStarted(caseId, correlationId, transactionId);

    try {
      // Stage 4 — Execution: transaction (hard dependency; not-found aborts the case).
      const transaction = transactionService.getTransaction(transactionId);

      // Vendor verification — a missing/unverified vendor degrades to
      // INCOMPLETE_EVIDENCE rather than aborting (§5.3 Failure cases).
      let vendor = null;
      try {
        vendor = vendorService.verifyVendor(transaction.vendorId);
      } catch (err) {
        if (err instanceof NotFoundError || err instanceof IncompleteEvidenceError) {
          vendor = null;
        } else {
          throw err;
        }
      }

      // Invoice analysis — a missing invoice degrades the same way.
      let invoice = null;
      try {
        invoice = invoiceService.analyzeInvoice(transaction.invoiceId);
      } catch (err) {
        if (err instanceof NotFoundError) {
          invoice = null;
        } else {
          throw err;
        }
      }

      // Payment history — a missing history degrades the same way.
      let history = null;
      try {
        history = historyService.getPaymentHistory(transaction.vendorId);
      } catch (err) {
        if (err instanceof IncompleteEvidenceError) {
          history = null;
        } else {
          throw err;
        }
      }

      // Stage 5/6 — Verification & evidence reconciliation (§9.6, §8.8).
      const evidence: Evidence[] = [];

      const beneficiaryEvidence = evaluateBeneficiaryMatch(
        caseId,
        transaction,
        vendor ? { vendorId: vendor.vendorId, verified: vendor.verified, verifiedBeneficiaryAccount: vendor.verifiedBeneficiaryAccount } : null
      );
      if (beneficiaryEvidence) evidence.push(beneficiaryEvidence);

      if (invoice) {
        const invoiceConflict = evaluateInvoiceTransactionConflict(caseId, transaction, invoice);
        if (invoiceConflict) evidence.push(invoiceConflict);

        const duplicateEvidence = evaluateDuplicateInvoice(caseId, invoice);
        if (duplicateEvidence) evidence.push(duplicateEvidence);
      } else {
        const missingInvoiceEvidence = evaluateInvoiceTransactionConflict(caseId, transaction, null);
        if (missingInvoiceEvidence) evidence.push(missingInvoiceEvidence);
      }

      const { evidence: amountEvidence } = evaluateAmountAnomaly(caseId, transaction, history);
      if (amountEvidence) evidence.push(amountEvidence);

      for (const item of evidence) {
        auditService.recordEvidence(caseId, correlationId, item.type, item.severity);
      }

      // Stage — deterministic policy.
      const policy = policyService.evaluatePolicy({
        caseId,
        transactionAmount: transaction.amount,
        evidence,
      });
      auditService.recordPolicyEvaluated(caseId, correlationId, policy.approvalRequired, policy.policyViolations.length);

      // Stage — deterministic risk.
      const beneficiaryMismatch = evidence.some((e) => e.type === "BENEFICIARY_MISMATCH");
      const amountAnomaly = evidence.some((e) => e.type === "AMOUNT_ANOMALY");
      const policyViolation = policy.policyViolations.length > 0;

      const risk = riskService.calculateRisk(caseId, {
        beneficiaryMismatch,
        amountAnomaly,
        policyViolation,
      });
      auditService.recordRiskCalculated(caseId, correlationId, risk);

      // Stage — decision explanation / recommendation.
      // Evidence gaps (§8.7) and any policy violation (§5.6) force HOLD
      // regardless of the numeric score. Missing evidence is never
      // silently treated as safe.
      const blockingGap = hasBlockingEvidenceGap(evidence);
      const recommendation: "RELEASE" | "HOLD" =
        risk.riskLevel === "LOW" && !blockingGap && !policy.approvalRequired ? "RELEASE" : "HOLD";

      // Stage — prepare human review. There is no execution path from here.
      const approval: ApprovalCase = {
        caseId,
        transactionId,
        riskScore: risk.riskScore,
        riskLevel: risk.riskLevel,
        recommendation,
        status: "WAITING_FOR_HUMAN_APPROVAL",
        createdAt: new Date().toISOString(),
      };
      auditService.recordApprovalPrepared(approval, correlationId);

      const investigation: InvestigationCase = {
        caseId,
        transactionId,
        status: "PENDING_HUMAN_REVIEW",
        evidenceIds: evidence.map((e) => e.evidenceId),
        riskResultId: caseId,
        approvalId: caseId,
      };

      this.cases.set(caseId, investigation);
      auditService.recordInvestigationCompleted(caseId, correlationId);

      return { investigation, evidence, policy, risk, approval };
    } catch (err) {
      const code = err instanceof Error && "code" in err ? String((err as { code: unknown }).code) : "INTERNAL_ERROR";
      const message = err instanceof Error ? err.message : "Unknown error.";
      auditService.recordInvestigationFailed(caseId, correlationId, code, message);
      logger.error("investigation.error", { caseId, correlationId, errorCode: code });
      throw err;
    }
  }

  private readonly cases = new BoundedMap<string, InvestigationCase>(MAX_TRACKED_CASES);

  /** Read-only lookup backing the `investigation://{caseId}` resource (§6). */
  getCase(caseId: string): InvestigationCase | null {
    return this.cases.get(caseId) ?? null;
  }

  // NOTE: intentionally no executePayment()/transferFunds() method exists
  // anywhere on this class — see §5.8 Critical constraint.
}

export const investigationService = new InvestigationService();
