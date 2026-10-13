/**
 * SentinelPay AI — ApprovalCard Widget
 * Source: Technical Specification §3.1 (widgets/ApprovalCard), §5.8, §37
 *
 * Renders a human-review request and, if the host app wires
 * `onApprove`/`onDeny`, surfaces the human's decision upward. This
 * component itself never calls a payment/transfer API — per §5.8/§37
 * there is no such API anywhere in this system for it to call. Approving
 * here only means "a human recorded a decision", never "funds moved".
 */

import type { ApprovalCardProps } from "./types";

const STATUS_LABEL: Record<ApprovalCardProps["status"], string> = {
  WAITING_FOR_HUMAN_APPROVAL: "Waiting for human approval",
  APPROVED: "Approved",
  DENIED: "Denied",
};

const RECOMMENDATION_COLOR: Record<ApprovalCardProps["recommendation"], string> = {
  RELEASE: "#1a7f37",
  HOLD: "#cf222e",
};

export function ApprovalCard({
  caseId,
  transactionId,
  riskScore,
  riskLevel,
  recommendation,
  status,
  onApprove,
  onDeny,
}: ApprovalCardProps) {
  const decided = status !== "WAITING_FOR_HUMAN_APPROVAL";

  return (
    <div
      style={{
        border: "1px solid #d0d7de",
        borderRadius: 8,
        padding: 16,
        maxWidth: 360,
        fontFamily: "system-ui, sans-serif",
      }}
      data-testid="approval-card"
    >
      <div style={{ fontSize: 12, color: "#57606a" }}>{caseId}</div>
      <div style={{ fontSize: 12, color: "#57606a", marginBottom: 8 }}>Transaction {transactionId}</div>

      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: "#57606a" }}>Recommendation: </span>
        <span style={{ fontWeight: 700, color: RECOMMENDATION_COLOR[recommendation] }}>
          {recommendation}
        </span>
        <span style={{ fontSize: 12, color: "#57606a" }}>
          {" "}
          (risk {riskScore} · {riskLevel})
        </span>
      </div>

      <div style={{ fontSize: 13, marginBottom: 12 }}>{STATUS_LABEL[status]}</div>

      {!decided && (
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            disabled={!onApprove}
            onClick={() => onApprove?.(caseId)}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid #1a7f37",
              background: "#dafbe1",
              color: "#1a7f37",
              cursor: onApprove ? "pointer" : "not-allowed",
            }}
          >
            Approve
          </button>
          <button
            type="button"
            disabled={!onDeny}
            onClick={() => onDeny?.(caseId)}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid #cf222e",
              background: "#ffebe9",
              color: "#cf222e",
              cursor: onDeny ? "pointer" : "not-allowed",
            }}
          >
            Deny
          </button>
        </div>
      )}

      <div style={{ fontSize: 10, color: "#8c959f", marginTop: 10 }}>
        This action never transfers funds. There is no execution path from this card.
      </div>
    </div>
  );
}

export default ApprovalCard;
export type { ApprovalCardProps } from "./types";
