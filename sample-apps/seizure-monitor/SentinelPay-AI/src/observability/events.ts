/**
 * SentinelPay AI — Audit Event Definitions
 * Source: Technical Specification §12.5 (Audit logging), §13.2 (Metrics),
 *         §9 (Complete Pipeline stages)
 *
 * Defines the structured audit-event shapes emitted throughout an
 * investigation. audit.service.ts appends these to the in-memory audit
 * trail; observability/metrics.ts increments counters from the same
 * event stream so the two stay consistent by construction.
 */

export type AuditEventType =
  | "INVESTIGATION_STARTED"
  | "TOOL_CALLED"
  | "EVIDENCE_RECORDED"
  | "MISSING_EVIDENCE_DETECTED"
  | "CONFLICT_DETECTED"
  | "POLICY_EVALUATED"
  | "RISK_CALCULATED"
  | "APPROVAL_PREPARED"
  | "APPROVAL_DECIDED"
  | "INVESTIGATION_COMPLETED"
  | "INVESTIGATION_FAILED"
  | "ERROR_RAISED";

export interface AuditEvent {
  eventId: string;
  eventType: AuditEventType;
  caseId: string;
  correlationId: string;
  timestamp: string; // ISO-8601
  payload: Record<string, unknown>;
}

/** §12.5 — the mandatory fields every investigation must record. */
export interface InvestigationAuditSummary {
  caseId: string;
  correlationId: string;
  toolCalls: string[];
  resultStatuses: Record<string, "SUCCESS" | "FAILURE">;
  riskScore: number | null;
  recommendation: "RELEASE" | "HOLD" | null;
  approvalStatus: string | null;
  errors: Array<{ code: string; message: string }>;
}
