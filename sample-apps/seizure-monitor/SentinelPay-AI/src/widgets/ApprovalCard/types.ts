/**
 * SentinelPay AI — ApprovalCard Widget Types
 * Source: Technical Specification §3.1 (widgets/ApprovalCard), §10.8, §5.8
 */

export type ApprovalStatus = "WAITING_FOR_HUMAN_APPROVAL" | "APPROVED" | "DENIED";
export type Recommendation = "RELEASE" | "HOLD";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface ApprovalCardProps {
  caseId: string;
  transactionId: string;
  riskScore: number;
  riskLevel: RiskLevel;
  recommendation: Recommendation;
  status: ApprovalStatus;
  /** Optional handlers wired by the host app; this component never calls
   *  an execution/transfer API itself — it only reports a human's choice
   *  upward. Omit to render a read-only, disabled view. */
  onApprove?: (caseId: string) => void;
  onDeny?: (caseId: string) => void;
}
