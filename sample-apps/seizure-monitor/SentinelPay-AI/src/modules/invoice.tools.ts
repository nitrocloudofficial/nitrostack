/**
 * SentinelPay AI — `analyzeInvoice` MCP Tool
 * Source: Technical Specification §5.4
 */

import { parseAnalyzeInvoiceInput } from "../domain/schemas.js";
import { invoiceService } from "../services/invoice.service.js";
import { runTool, type ToolInvocationContext } from "./tool-runtime.js";

export const ANALYZE_INVOICE_TOOL_NAME = "analyzeInvoice" as const;

export function analyzeInvoiceHandler(rawInput: unknown, ctx: ToolInvocationContext) {
  return runTool(
    ANALYZE_INVOICE_TOOL_NAME,
    ctx,
    rawInput,
    () => parseAnalyzeInvoiceInput(rawInput),
    (input) => invoiceService.analyzeInvoice(input.invoiceId)
  );
}

/**
 * Read-only. A `duplicate: true` result is a risk indicator only — this
 * tool never rejects or approves anything itself (§5.4 Duplicate handling).
 */
export const analyzeInvoiceTool = {
  name: ANALYZE_INVOICE_TOOL_NAME,
  description: "Retrieve and normalize invoice evidence, including duplicate status. Read-only.",
  inputSchema: {
    type: "object",
    properties: {
      invoiceId: { type: "string", pattern: "^[A-Z0-9][A-Z0-9-]{1,31}$", examples: ["INV-5521"] },
    },
    required: ["invoiceId"],
    additionalProperties: false,
  },
  handler: analyzeInvoiceHandler,
};
