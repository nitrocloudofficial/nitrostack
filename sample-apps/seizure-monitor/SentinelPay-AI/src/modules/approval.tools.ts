/**
 * SentinelPay AI — `prepareApproval` MCP Tool
 * Source: Technical Specification §5.8
 *
 * Creates a human-review request from an already-computed risk result.
 * This is the final, deliberately narrow step in the tool chain.
 *
 * CRITICAL CONSTRAINT (§5.8): there is no `executePayment` tool anywhere
 * in this codebase. This module cannot transfer money, cannot approve
 * itself, and status is always created as `WAITING_FOR_HUMAN_APPROVAL` —
 * never `APPROVED`. A human decision is recorded separately, out of band
 * from this tool, and is never triggered by agent or document content.
 */

import type { ApprovalCase } from "../domain/models.js";
import { parsePrepareApprovalInput } from "../domain/schemas.js";
import { auditService } from "../services/audit.service.js";
import { runTool, type ToolInvocationContext } from "./tool-runtime.js";
import { BoundedMap } from "../util/bounded-map.js";

/** Caps in-memory prepared-approval history (see bounded-map.ts). */
const MAX_TRACKED_CASES = 10_000;

export const PREPARE_APPROVAL_TOOL_NAME = "prepareApproval" as const;

/** In-memory store of prepared approval cases, keyed by caseId (read-only elsewhere). */
const approvalsByCase = new BoundedMap<string, ApprovalCase>(MAX_TRACKED_CASES);

export function prepareApprovalHandler(rawInput: unknown, ctx: ToolInvocationContext) {
  return runTool(
    PREPARE_APPROVAL_TOOL_NAME,
    ctx,
    rawInput,
    () => parsePrepareApprovalInput(rawInput),
    (input) => {
      // Status is hard-coded, never derived from input — the agent cannot
      // ever request or influence an APPROVED/DENIED status (§5.8).
      const approval: ApprovalCase = {
        caseId: input.caseId,
        transactionId: input.transactionId,
        riskScore: input.riskScore,
        riskLevel: input.riskLevel,
        recommendation: input.recommendation,
        status: "WAITING_FOR_HUMAN_APPROVAL",
        createdAt: new Date().toISOString(),
      };

      approvalsByCase.set(approval.caseId, approval);
      auditService.recordApprovalPrepared(approval, ctx.correlationId);

      // §5.8 output shape: { caseId, status, recommendation, riskScore }
      return {
        caseId: approval.caseId,
        status: approval.status,
        recommendation: approval.recommendation,
        riskScore: approval.riskScore,
      };
    }
  );
}

/** Read-only lookup backing the `investigation://{caseId}` resource's approval field. */
export function getPreparedApproval(caseId: string): ApprovalCase | null {
  return approvalsByCase.get(caseId) ?? null;
}

export const prepareApprovalTool = {
  name: PREPARE_APPROVAL_TOOL_NAME,
  description:
    "Create a human-review request for a transaction, given its computed risk score/level and recommendation. Never executes a payment; status is always WAITING_FOR_HUMAN_APPROVAL.",
  inputSchema: {
    type: "object",
    properties: {
      caseId: { type: "string", pattern: "^[A-Z0-9][A-Z0-9-]{1,31}$", examples: ["CASE-827"] },
      transactionId: { type: "string", pattern: "^[A-Z0-9][A-Z0-9-]{1,31}$", examples: ["TX-827"] },
      riskScore: { type: "number", minimum: 0, maximum: 100 },
      riskLevel: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
      recommendation: { type: "string", enum: ["RELEASE", "HOLD"] },
    },
    required: ["caseId", "transactionId", "riskScore", "riskLevel", "recommendation"],
    additionalProperties: false,
  },
  handler: prepareApprovalHandler,
};

// NOTE: intentionally no executePayment/transferFunds/approve/reject-decision
// tool exists in this file or anywhere in this codebase (§5.8, §37).
