/**
 * SentinelPay AI — `getPaymentHistory` MCP Tool
 * Source: Technical Specification §5.5
 */

import { parseGetPaymentHistoryInput } from "../domain/schemas.js";
import { historyService } from "../services/history.service.js";
import { runTool, type ToolInvocationContext } from "./tool-runtime.js";

export const GET_PAYMENT_HISTORY_TOOL_NAME = "getPaymentHistory" as const;

export function getPaymentHistoryHandler(rawInput: unknown, ctx: ToolInvocationContext) {
  return runTool(
    GET_PAYMENT_HISTORY_TOOL_NAME,
    ctx,
    rawInput,
    () => parseGetPaymentHistoryInput(rawInput),
    (input) => historyService.getPaymentHistory(input.vendorId)
  );
}

/**
 * Read-only. Returned `averageAmount`/`maxAmount` are always calculated
 * from the fixture data, never hard-coded (§5.5).
 */
export const getPaymentHistoryTool = {
  name: GET_PAYMENT_HISTORY_TOOL_NAME,
  description: "Retrieve historical payment behavior and computed statistics for a vendor. Read-only.",
  inputSchema: {
    type: "object",
    properties: {
      vendorId: { type: "string", pattern: "^[A-Z0-9][A-Z0-9-]{1,31}$", examples: ["VENDOR-032"] },
    },
    required: ["vendorId"],
    additionalProperties: false,
  },
  handler: getPaymentHistoryHandler,
};
