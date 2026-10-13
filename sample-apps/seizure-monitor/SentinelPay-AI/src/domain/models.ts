/**
 * SentinelPay AI — Domain Models
 * Source: Technical Specification §10 (Data Models)
 *
 * These types are the canonical shape of every object that flows through
 * the evidence, policy, and risk pipeline. They are intentionally
 * framework-agnostic (no NitroStack/MCP imports) so they can be reused
 * unchanged regardless of how the SDK wraps tools/resources.
 */

export type Currency = "INR";

export type TransactionStatus = "PENDING" | "HELD" | "APPROVED" | "DENIED";

/** §10.1 */
export interface Transaction {
  transactionId: string;
  amount: number;
  currency: Currency;
  vendorId: string;
  invoiceId: string;
  /** As stated on the transaction itself — may not match the verified vendor record. */
  beneficiaryAccount: string;
  status: TransactionStatus;
  timestamp: string; // ISO-8601
}

export type RelationshipStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

/** §10.2 — Counterparty / vendor record */
export interface Counterparty {
  vendorId: string;
  vendorName: string;
  verified: boolean;
  /** Canonical verified beneficiary account. Compared against Transaction.beneficiaryAccount. */
  verifiedBeneficiaryAccount: string;
  relationshipStatus: RelationshipStatus;
}

/** §10.3 */
export interface Invoice {
  invoiceId: string;
  vendorId: string;
  amount: number;
  currency: Currency;
  beneficiaryAccount: string;
  duplicate: boolean;
}

/** §10.4 — Raw fixture shape (per-vendor payment array) */
export interface PaymentHistoryRecord {
  vendorId: string;
  payments: number[];
}

/** §5.5 — Computed/derived history statistics returned by getPaymentHistory */
export interface PaymentHistoryStats {
  vendorId: string;
  transactions: number[];
  averageAmount: number;
  maxAmount: number;
  transactionCount: number;
}

/** §10.5 */
export interface Policy {
  policyId: string;
  approvalThreshold: number;
  currency: Currency;
  beneficiaryMismatchRequiresReview: boolean;
  duplicateInvoiceRequiresReview: boolean;
  missingEvidenceRequiresReview: boolean;
}

export type EvidenceType =
  | "BENEFICIARY_MISMATCH"
  | "AMOUNT_ANOMALY"
  | "DUPLICATE_INVOICE"
  | "POLICY_VIOLATION"
  | "INCOMPLETE_EVIDENCE"
  | "DATA_CONFLICT";

export type EvidenceSeverity = "LOW" | "MEDIUM" | "HIGH";

/** §10.6 */
export interface Evidence {
  evidenceId: string;
  caseId: string;
  type: EvidenceType;
  severity: EvidenceSeverity;
  observations: Record<string, unknown>;
  sources: string[];
}

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface RiskFactor {
  name: "beneficiaryMismatch" | "amountAnomaly" | "policyViolation";
  weight: number;
  triggered: boolean;
}

/** §10.7 */
export interface RiskResult {
  caseId: string;
  rawScore: number;
  riskScore: number;
  riskLevel: RiskLevel;
  factors: RiskFactor[];
}

export type ApprovalStatus =
  | "WAITING_FOR_HUMAN_APPROVAL"
  | "APPROVED"
  | "DENIED";

export type Recommendation = "RELEASE" | "HOLD";

/** §10.8 */
export interface ApprovalCase {
  caseId: string;
  transactionId: string;
  riskScore: number;
  riskLevel: RiskLevel;
  recommendation: Recommendation;
  status: ApprovalStatus;
  createdAt: string; // ISO-8601
}

export type InvestigationStatus =
  | "IN_PROGRESS"
  | "PENDING_HUMAN_REVIEW"
  | "COMPLETE"
  | "FAILED_INCOMPLETE_EVIDENCE";

/** §10.9 */
export interface InvestigationCase {
  caseId: string;
  transactionId: string;
  status: InvestigationStatus;
  evidenceIds: string[];
  riskResultId: string | null;
  approvalId: string | null;
}

/** §5.6 — Policy evaluation result */
export interface PolicyViolation {
  rule:
    | "PAYMENT_APPROVAL_THRESHOLD"
    | "BENEFICIARY_VERIFICATION_REQUIRED"
    | "DUPLICATE_INVOICE"
    | "MISSING_MANDATORY_EVIDENCE";
  reason: string;
}

export interface PolicyResult {
  approvalRequired: boolean;
  policyViolations: PolicyViolation[];
  reviewRequired: boolean;
}

/** Inputs consumed by calculateRisk (§5.7) */
export interface RiskIndicators {
  beneficiaryMismatch: boolean;
  amountAnomaly: boolean;
  policyViolation: boolean;
}
