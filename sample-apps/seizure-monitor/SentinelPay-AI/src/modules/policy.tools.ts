/**
 * SentinelPay AI — `evaluatePolicy` MCP Tool
 * Source: Technical Specification §5.6
 *
 * Applies the deterministic policy engine to a caller-supplied evidence
 * set. This tool never fabricates evidence — it only evaluates evidence
 * the agent already collected from earlier tool calls in the same
 * investigation (getTransaction, verifyVendor, analyzeInvoice,
 * getPaymentHistory) — and never executes an adverse financial action.
 */

import { parseEvaluatePolicyInput } from "../domain/schemas.js";
import { policyService } from "../services/policy.service.js";
import { auditService } from "../services/audit.service.js";
import { runTool, type ToolInvocationContext } from "./tool-runtime.js";

export const EVALUATE_POLICY_TOOL_NAME = "evaluatePolicy" as const;

export function evaluatePolicyHandler(rawInput: unknown, ctx: ToolInvocationContext) {
  return runTool(
    EVALUATE_POLICY_TOOL_NAME,
    ctx,
    rawInput,
    () => parseEvaluatePolicyInput(rawInput),
    (input) => {
      const policy = policyService.evaluatePolicy({
        caseId: input.caseId,
        transactionAmount: input.transactionAmount,
        evidence: input.evidence,
      });
      // §12.5 — same reasoning as calculateRisk: the tool-by-tool path must
      // record this itself, not rely on the orchestrator having done it.
      auditService.recordPolicyEvaluated(
        ctx.caseId ?? input.caseId,
        ctx.correlationId,
        policy.approvalRequired,
        policy.policyViolations.length
      );
      return policy;
    }
  );
}

/**
 * Deterministic. Never returns a self-approval — output is limited to
 * `{ approvalRequired, policyViolations, reviewRequired }` (§5.6).
 */
export const evaluatePolicyTool = {
  name: EVALUATE_POLICY_TOOL_NAME,
  description:
    "Evaluate deterministic organizational payment policy against a transaction amount and collected evidence. Read-only / compute-only; never executes a financial action.",
  inputSchema: {
    type: "object",
    properties: {
      caseId: { type: "string", pattern: "^[A-Z0-9][A-Z0-9-]{1,31}$", examples: ["CASE-827"] },
      transactionAmount: { type: "number", exclusiveMinimum: 0 },
      evidence: {
        type: "array",
        items: {
          type: "object",
          properties: {
            evidenceId: { type: "string" },
            caseId: { type: "string" },
            type: {
              type: "string",
              enum: [
                "BENEFICIARY_MISMATCH",
                "AMOUNT_ANOMALY",
                "DUPLICATE_INVOICE",
                "POLICY_VIOLATION",
                "INCOMPLETE_EVIDENCE",
                "DATA_CONFLICT",
              ],
            },
            severity: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
            observations: { type: "object" },
            sources: { type: "array", items: { type: "string" } },
          },
          required: ["evidenceId", "caseId", "type", "severity", "observations", "sources"],
          additionalProperties: false,
        },
      },
    },
    required: ["caseId", "transactionAmount", "evidence"],
    additionalProperties: false,
  },
  handler: evaluatePolicyHandler,
};
