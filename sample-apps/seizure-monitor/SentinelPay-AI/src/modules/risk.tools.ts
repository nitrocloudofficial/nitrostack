/**
 * SentinelPay AI — `calculateRisk` MCP Tool
 * Source: Technical Specification §5.7
 *
 * Wraps the deterministic risk engine. The score is a labeled prototype
 * heuristic (§5.7, §22 Claims Boundary) — this tool's output must never
 * be presented as a validated probability of fraud.
 */

import { parseRiskIndicatorsInput } from "../domain/schemas.js";
import { riskService } from "../services/risk.service.js";
import { auditService } from "../services/audit.service.js";
import { runTool, type ToolInvocationContext } from "./tool-runtime.js";

export const CALCULATE_RISK_TOOL_NAME = "calculateRisk" as const;

export function calculateRiskHandler(rawInput: unknown, ctx: ToolInvocationContext) {
  return runTool(
    CALCULATE_RISK_TOOL_NAME,
    ctx,
    rawInput,
    () => parseRiskIndicatorsInput(rawInput),
    (input) => {
      const risk = riskService.calculateRisk(ctx.caseId ?? "UNSCOPED", input);
      // §12.5 — the audit summary's riskScore/riskLevel must be populated
      // for every path that reaches this tool, not only the single-call
      // orchestrator (investigation.service.ts already records this itself).
      auditService.recordRiskCalculated(ctx.caseId ?? "UNSCOPED", ctx.correlationId, risk);
      return risk;
    }
  );
}

export const calculateRiskTool = {
  name: CALCULATE_RISK_TOOL_NAME,
  description:
    "Calculate a reproducible prototype risk score (0-100) from boolean evidence indicators. Deterministic; not a validated fraud probability.",
  inputSchema: {
    type: "object",
    properties: {
      beneficiaryMismatch: { type: "boolean" },
      amountAnomaly: { type: "boolean" },
      policyViolation: { type: "boolean" },
    },
    required: ["beneficiaryMismatch", "amountAnomaly", "policyViolation"],
    additionalProperties: false,
  },
  handler: calculateRiskHandler,
};
