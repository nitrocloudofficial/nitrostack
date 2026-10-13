/**
 * SentinelPay AI — Evidence Normalization & Provenance
 * Source: Technical Specification §8.7 (Missing data), §8.8 (Conflicting data),
 *         §10.6 (Evidence model), §5.3 (canonical mismatch fields)
 *
 * This module builds Evidence records out of raw tool outputs. It never
 * fabricates facts: if a required source is unavailable, it produces an
 * INCOMPLETE_EVIDENCE record instead of guessing; if two trusted sources
 * disagree, it produces a DATA_CONFLICT record instead of silently
 * picking one.
 */

import { randomUUID } from "node:crypto";
import type {
  Counterparty,
  Evidence,
  EvidenceSeverity,
  Invoice,
  PaymentHistoryStats,
  Transaction,
} from "./models.js";

function newEvidence(
  caseId: string,
  partial: Omit<Evidence, "evidenceId" | "caseId">
): Evidence {
  return { evidenceId: `ev-${randomUUID()}`, caseId, ...partial };
}

/**
 * §5.3 — the exact two canonical fields compared for the beneficiary
 * mismatch: transaction.beneficiaryAccount vs vendor.verifiedBeneficiaryAccount.
 *
 * Returns:
 *  - a BENEFICIARY_MISMATCH evidence record if they disagree,
 *  - an INCOMPLETE_EVIDENCE record if the verified vendor account is unavailable,
 *  - null if they match (no evidence generated — nothing anomalous to report).
 */
export function evaluateBeneficiaryMatch(
  caseId: string,
  transaction: Pick<Transaction, "transactionId" | "beneficiaryAccount">,
  vendor: Pick<Counterparty, "vendorId" | "verified" | "verifiedBeneficiaryAccount"> | null
): Evidence | null {
  if (!vendor || !vendor.verified || !vendor.verifiedBeneficiaryAccount) {
    // Missing canonical beneficiary data → INCOMPLETE_EVIDENCE, never a guessed mismatch/match.
    return newEvidence(caseId, {
      type: "INCOMPLETE_EVIDENCE",
      severity: "HIGH",
      observations: {
        reason: "Verified vendor beneficiary account unavailable.",
        transactionId: transaction.transactionId,
      },
      sources: [`transaction://${transaction.transactionId}`],
    });
  }

  if (transaction.beneficiaryAccount !== vendor.verifiedBeneficiaryAccount) {
    return newEvidence(caseId, {
      type: "BENEFICIARY_MISMATCH",
      severity: "HIGH",
      observations: {
        transactionBeneficiary: transaction.beneficiaryAccount,
        verifiedBeneficiary: vendor.verifiedBeneficiaryAccount,
      },
      sources: [
        `transaction://${transaction.transactionId}`,
        `counterparty://${vendor.vendorId}`,
      ],
    });
  }

  return null;
}

/**
 * §8.8 — if the transaction's invoice-declared beneficiary and the
 * transaction's own beneficiary disagree, that is an independent
 * conflict between two trusted internal sources (not a vendor-identity
 * problem). Reported explicitly rather than resolved by guessing.
 */
export function evaluateInvoiceTransactionConflict(
  caseId: string,
  transaction: Pick<Transaction, "transactionId" | "beneficiaryAccount">,
  invoice: Pick<Invoice, "invoiceId" | "beneficiaryAccount"> | null
): Evidence | null {
  if (!invoice) {
    return newEvidence(caseId, {
      type: "INCOMPLETE_EVIDENCE",
      severity: "HIGH",
      observations: {
        reason: "Invoice record unavailable.",
        transactionId: transaction.transactionId,
      },
      sources: [`transaction://${transaction.transactionId}`],
    });
  }

  if (invoice.beneficiaryAccount !== transaction.beneficiaryAccount) {
    return newEvidence(caseId, {
      type: "DATA_CONFLICT",
      severity: "HIGH",
      observations: {
        transactionBeneficiary: transaction.beneficiaryAccount,
        invoiceBeneficiary: invoice.beneficiaryAccount,
      },
      sources: [
        `transaction://${transaction.transactionId}`,
        `invoice://${invoice.invoiceId}`,
      ],
    });
  }

  return null;
}

/** §5.4 — a duplicate invoice is a risk indicator, never an automatic rejection. */
export function evaluateDuplicateInvoice(
  caseId: string,
  invoice: Pick<Invoice, "invoiceId" | "duplicate">
): Evidence | null {
  if (!invoice.duplicate) return null;
  return newEvidence(caseId, {
    type: "DUPLICATE_INVOICE",
    severity: "HIGH",
    observations: { invoiceId: invoice.invoiceId, duplicate: true },
    sources: [`invoice://${invoice.invoiceId}`],
  });
}

/**
 * §5.5 — amount anomaly must be *calculated* from fixture history, never
 * hard-coded. Returns the evidence plus the computed multiplier so callers
 * (e.g. the risk engine, UI) can display it.
 */
export function evaluateAmountAnomaly(
  caseId: string,
  transaction: Pick<Transaction, "transactionId" | "amount">,
  history: PaymentHistoryStats | null,
  opts: { anomalyMultiplierThreshold?: number } = {}
): { evidence: Evidence | null; multiplier: number | null } {
  const threshold = opts.anomalyMultiplierThreshold ?? 2.0;

  if (!history || history.transactionCount === 0 || history.averageAmount <= 0) {
    return {
      evidence: newEvidence(caseId, {
        type: "INCOMPLETE_EVIDENCE",
        severity: "HIGH",
        observations: {
          reason: "Payment history could not be verified.",
          transactionId: transaction.transactionId,
        },
        sources: [`transaction://${transaction.transactionId}`],
      }),
      multiplier: null,
    };
  }

  const multiplier = transaction.amount / history.averageAmount;
  if (multiplier < threshold) {
    return { evidence: null, multiplier };
  }

  return {
    evidence: newEvidence(caseId, {
      type: "AMOUNT_ANOMALY",
      severity: multiplier >= 3 ? "HIGH" : "MEDIUM",
      observations: {
        transactionAmount: transaction.amount,
        historicalAverage: history.averageAmount,
        multiplier: Number(multiplier.toFixed(2)),
      },
      sources: [`transaction://${transaction.transactionId}`, `history://${history.vendorId}`],
    }),
    multiplier,
  };
}

/** Utility: does this evidence set contain any INCOMPLETE_EVIDENCE or DATA_CONFLICT record? */
export function hasBlockingEvidenceGap(evidence: Evidence[]): boolean {
  return evidence.some((e) => e.type === "INCOMPLETE_EVIDENCE" || e.type === "DATA_CONFLICT");
}

export function summarizeSeverity(evidence: Evidence[]): EvidenceSeverity {
  if (evidence.some((e) => e.severity === "HIGH")) return "HIGH";
  if (evidence.some((e) => e.severity === "MEDIUM")) return "MEDIUM";
  return "LOW";
}
