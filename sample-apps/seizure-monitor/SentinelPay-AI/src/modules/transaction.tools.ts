/**
 * SentinelPay AI — `getTransaction` MCP Tool
 * Source: Technical Specification §5.2
 */

import { parseGetTransactionInput } from "../domain/schemas.js";
import { transactionService } from "../services/transaction.service.js";
import { runTool, type ToolInvocationContext } from "./tool-runtime.js";

export const GET_TRANSACTION_TOOL_NAME = "getTransaction" as const;

export function getTransactionHandler(rawInput: unknown, ctx: ToolInvocationContext) {
  return runTool(
    GET_TRANSACTION_TOOL_NAME,
    ctx,
    rawInput,
    () => parseGetTransactionInput(rawInput),
    (input) => transactionService.getTransaction(input.transactionId)
  );
}

/**
 * Framework-agnostic descriptor — see `tool-runtime.ts` header for the
 * NitroStack registration note. Read-only; retrieves a transaction by ID.
 */
export const getTransactionTool = {
  name: GET_TRANSACTION_TOOL_NAME,
  description: "Retrieve a financial transaction by its identifier. Read-only.",
  inputSchema: {
    type: "object",
    properties: {
      transactionId: { type: "string", pattern: "^[A-Z0-9][A-Z0-9-]{1,31}$", examples: ["TX-827"] },
    },
    required: ["transactionId"],
    additionalProperties: false,
  },
  handler: getTransactionHandler,
};
