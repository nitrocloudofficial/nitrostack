/**
 * SentinelPay AI — `verifyVendor` MCP Tool
 * Source: Technical Specification §5.3
 */

import { parseVerifyVendorInput } from "../domain/schemas.js";
import { vendorService } from "../services/vendor.service.js";
import { runTool, type ToolInvocationContext } from "./tool-runtime.js";

export const VERIFY_VENDOR_TOOL_NAME = "verifyVendor" as const;

export function verifyVendorHandler(rawInput: unknown, ctx: ToolInvocationContext) {
  return runTool(
    VERIFY_VENDOR_TOOL_NAME,
    ctx,
    rawInput,
    () => parseVerifyVendorInput(rawInput),
    (input) => vendorService.verifyVendor(input.vendorId)
  );
}

/**
 * Read-only. Supplies `verifiedBeneficiaryAccount` — one of the exact two
 * canonical fields compared for the beneficiary-mismatch check (§5.3).
 */
export const verifyVendorTool = {
  name: VERIFY_VENDOR_TOOL_NAME,
  description:
    "Verify vendor identity and retrieve the canonical verified beneficiary account. Read-only.",
  inputSchema: {
    type: "object",
    properties: {
      vendorId: { type: "string", pattern: "^[A-Z0-9][A-Z0-9-]{1,31}$", examples: ["VENDOR-032"] },
    },
    required: ["vendorId"],
    additionalProperties: false,
  },
  handler: verifyVendorHandler,
};
