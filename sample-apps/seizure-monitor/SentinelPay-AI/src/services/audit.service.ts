/**
 * SentinelPay AI — Audit Service
 * Source: Technical Specification §12.5 (Audit logging), §9.7 (Stage 6 — Storage)
 *
 * For the MVP, storage is deterministic JSON fixtures plus request-scoped,
 * in-memory audit records (§9.7) — this is explicitly not a durable store.
 * A future production implementation should persist these in a
 * transactional database (§9.7, §24.2).
 *
 * Every investigation records: case ID, correlation ID, tool calls,
 * result statuses, risk score, recommendation, approval status, and
 * errors (§12.5) — never secrets.
 */

import { randomUUID } from "node:crypto";
import type { ApprovalCase, RiskResult } from "../domain/models.js";
import type { AuditEvent, AuditEventType, InvestigationAuditSummary } from "../observability/events.js";
import { logger } from "../observability/logger.js";
import { metrics } from "../observability/metrics.js";
import { BoundedMap } from "../util/bounded-map.js";

/** Caps in-memory audit history to the most recently active cases (see bounded-map.ts). */
const MAX_TRACKED_CASES = 10_000;

class AuditService {
  private readonly eventsByCase = new BoundedMap<string, AuditEvent[]>(MAX_TRACKED_CASES);

  private append(caseId: string, correlationId: string, eventType: AuditEventType, payload: Record<string, unknown>) {
    const event: AuditEvent = {
      eventId: `audit-${randomUUID()}`,
      eventType,
      caseId,
      correlationId,
      timestamp: new Date().toISOString(),
      payload,
    };
    const existing = this.eventsByCase.get(caseId) ?? [];
    existing.push(event);
    this.eventsByCase.set(caseId, existing);
    return event;
  }

  recordInvestigationStarted(caseId: string, correlationId: string, transactionId: string): void {
    this.append(caseId, correlationId, "INVESTIGATION_STARTED", { transactionId });
    metrics.increment("investigation_total");
    logger.info("investigation.started", { caseId, correlationId, transactionId });
  }

  recordToolCall(caseId: string, correlationId: string, tool: string, status: "SUCCESS" | "FAILURE"): void {
    this.append(caseId, correlationId, "TOOL_CALLED", { tool, status });
  }

  recordEvidence(caseId: string, correlationId: string, evidenceType: string, severity: string): void {
    this.append(caseId, correlationId, "EVIDENCE_RECORDED", { evidenceType, severity });
    if (evidenceType === "INCOMPLETE_EVIDENCE") {
      this.append(caseId, correlationId, "MISSING_EVIDENCE_DETECTED", { evidenceType });
      metrics.increment("missing_evidence_total");
    }
    if (evidenceType === "DATA_CONFLICT") {
      this.append(caseId, correlationId, "CONFLICT_DETECTED", { evidenceType });
      metrics.increment("conflict_detected_total");
    }
  }

  recordPolicyEvaluated(caseId: string, correlationId: string, approvalRequired: boolean, violationCount: number): void {
    this.append(caseId, correlationId, "POLICY_EVALUATED", { approvalRequired, violationCount });
  }

  recordRiskCalculated(caseId: string, correlationId: string, risk: RiskResult): void {
    this.append(caseId, correlationId, "RISK_CALCULATED", {
      riskScore: risk.riskScore,
      riskLevel: risk.riskLevel,
    });
    metrics.increment("risk_calculation_total");
  }

  recordApprovalPrepared(approval: ApprovalCase, correlationId = "unscoped"): void {
    this.append(approval.caseId, correlationId, "APPROVAL_PREPARED", {
      status: approval.status,
      recommendation: approval.recommendation,
      riskScore: approval.riskScore,
    });
  }

  recordApprovalDecided(caseId: string, correlationId: string, status: "APPROVED" | "DENIED"): void {
    this.append(caseId, correlationId, "APPROVAL_DECIDED", { status });
    metrics.increment("approval_decision_total");
  }

  recordInvestigationCompleted(caseId: string, correlationId: string): void {
    this.append(caseId, correlationId, "INVESTIGATION_COMPLETED", {});
    metrics.increment("investigation_success_total");
    logger.info("investigation.completed", { caseId, correlationId });
  }

  recordInvestigationFailed(caseId: string, correlationId: string, errorCode: string, message: string): void {
    this.append(caseId, correlationId, "INVESTIGATION_FAILED", { errorCode, message });
    this.append(caseId, correlationId, "ERROR_RAISED", { errorCode, message });
    metrics.increment("investigation_failure_total");
    logger.error("investigation.failed", { caseId, correlationId, errorCode });
  }

  /** Read-only audit trail for a case — backs the `audit://{caseId}` resource (§6). */
  getTrail(caseId: string): AuditEvent[] {
    return [...(this.eventsByCase.get(caseId) ?? [])];
  }

  /** §12.5 — the mandatory audit summary fields for a completed investigation. */
  getSummary(caseId: string): InvestigationAuditSummary | null {
    const events = this.eventsByCase.get(caseId);
    if (!events || events.length === 0) return null;

    const toolCalls: string[] = [];
    const resultStatuses: Record<string, "SUCCESS" | "FAILURE"> = {};
    let riskScore: number | null = null;
    let recommendation: "RELEASE" | "HOLD" | null = null;
    let approvalStatus: string | null = null;
    const errors: Array<{ code: string; message: string }> = [];

    for (const event of events) {
      if (event.eventType === "TOOL_CALLED") {
        const tool = event.payload.tool as string;
        toolCalls.push(tool);
        resultStatuses[tool] = event.payload.status as "SUCCESS" | "FAILURE";
      }
      if (event.eventType === "RISK_CALCULATED") {
        riskScore = event.payload.riskScore as number;
      }
      if (event.eventType === "APPROVAL_PREPARED") {
        recommendation = event.payload.recommendation as "RELEASE" | "HOLD";
        approvalStatus = event.payload.status as string;
      }
      if (event.eventType === "APPROVAL_DECIDED") {
        approvalStatus = event.payload.status as string;
      }
      if (event.eventType === "ERROR_RAISED") {
        errors.push({
          code: event.payload.errorCode as string,
          message: event.payload.message as string,
        });
      }
    }

    return {
      caseId,
      correlationId: events[0]?.correlationId ?? "",
      toolCalls,
      resultStatuses,
      riskScore,
      recommendation,
      approvalStatus,
      errors,
    };
  }
}

export const auditService = new AuditService();
