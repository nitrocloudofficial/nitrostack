/**
 * SentinelPay AI — `investigation://{caseId}` and `audit://{caseId}` MCP Resources
 * Source: Technical Specification §6 (two of the six canonical resource URIs)
 *
 * `investigation://` exposes the current state of an investigation case
 * (status, linked evidence/risk/approval IDs). `audit://` exposes the
 * read-only audit trail summary for that case (§12.5). Neither resource
 * accepts a write — both are backed entirely by services that only ever
 * append internally (`investigationService`, `auditService`).
 */

import { investigationService } from "../services/investigation.service.js";
import { auditService } from "../services/audit.service.js";
import { NotFoundError } from "../domain/errors.js";
import { readResource } from "./resource-runtime.js";

export const INVESTIGATION_RESOURCE_URI_TEMPLATE = "investigation://{caseId}";
export const AUDIT_RESOURCE_URI_TEMPLATE = "audit://{caseId}";

export function readInvestigationResource(caseId: string) {
  return readResource(INVESTIGATION_RESOURCE_URI_TEMPLATE, "caseId", caseId, (id) => {
    const investigationCase = investigationService.getCase(id);
    if (!investigationCase) {
      throw new NotFoundError(`No investigation case "${id}" was found.`, { caseId: id });
    }
    return investigationCase;
  });
}

export function readAuditResource(caseId: string) {
  return readResource(AUDIT_RESOURCE_URI_TEMPLATE, "caseId", caseId, (id) => {
    const summary = auditService.getSummary(id);
    if (!summary) {
      throw new NotFoundError(`No audit trail exists yet for case "${id}".`, { caseId: id });
    }
    return summary;
  });
}

export const investigationResource = {
  uriTemplate: INVESTIGATION_RESOURCE_URI_TEMPLATE,
  description: "Read-only contextual view of an investigation case's current status.",
  read: readInvestigationResource,
};

export const auditResource = {
  uriTemplate: AUDIT_RESOURCE_URI_TEMPLATE,
  description: "Read-only audit trail summary for a case: tool calls, evidence, risk, and approval history.",
  read: readAuditResource,
};
