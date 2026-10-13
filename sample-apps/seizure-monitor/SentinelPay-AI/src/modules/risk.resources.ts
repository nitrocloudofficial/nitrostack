/**
 * SentinelPay AI — `risk://{caseId}` MCP Resource
 * Source: Technical Specification §3.1 (risk.resources.ts), §5.7
 *
 * Read-only contextual view of the most recently computed deterministic
 * risk result for a case. Not one of the six illustrative URIs in §6, but
 * — like `history.resources.ts` — the canonical folder structure names
 * this file explicitly; it mirrors `calculateRisk`'s tool output so a
 * human reviewer or UI widget can re-read it without recomputing.
 */

import { riskService } from "../services/risk.service.js";
import { NotFoundError } from "../domain/errors.js";
import { readResource } from "./resource-runtime.js";

export const RISK_RESOURCE_URI_TEMPLATE = "risk://{caseId}";

export function readRiskResource(caseId: string) {
  return readResource(RISK_RESOURCE_URI_TEMPLATE, "caseId", caseId, (id) => {
    const result = riskService.getLastResult(id);
    if (!result) {
      throw new NotFoundError(`No risk result has been calculated yet for case "${id}".`, {
        caseId: id,
      });
    }
    return result;
  });
}

export const riskResource = {
  uriTemplate: RISK_RESOURCE_URI_TEMPLATE,
  description: "Read-only contextual view of the last deterministic risk result computed for a case.",
  read: readRiskResource,
};
