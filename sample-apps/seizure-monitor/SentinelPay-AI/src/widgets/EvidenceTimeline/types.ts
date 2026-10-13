/**
 * SentinelPay AI — EvidenceTimeline Widget Types
 * Source: Technical Specification §3.1 (widgets/EvidenceTimeline), §10.6
 */

export type EvidenceType =
  | "BENEFICIARY_MISMATCH"
  | "AMOUNT_ANOMALY"
  | "DUPLICATE_INVOICE"
  | "POLICY_VIOLATION"
  | "INCOMPLETE_EVIDENCE"
  | "DATA_CONFLICT";

export type EvidenceSeverity = "LOW" | "MEDIUM" | "HIGH";

export interface EvidenceItemView {
  evidenceId: string;
  type: EvidenceType;
  severity: EvidenceSeverity;
  observations: Record<string, unknown>;
  sources: string[];
}

export interface EvidenceTimelineProps {
  caseId: string;
  evidence: EvidenceItemView[];
}
