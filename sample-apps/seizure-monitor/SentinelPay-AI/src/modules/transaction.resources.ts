/**
 * SentinelPay AI — `transaction://{transactionId}` MCP Resource
 * Source: Technical Specification §6
 */

import { transactionService } from "../services/transaction.service.js";
import { readResource } from "./resource-runtime.js";

export const TRANSACTION_RESOURCE_URI_TEMPLATE = "transaction://{transactionId}";

export function readTransactionResource(transactionId: string) {
  return readResource(TRANSACTION_RESOURCE_URI_TEMPLATE, "transactionId", transactionId, (id) =>
    transactionService.getTransaction(id)
  );
}

export const transactionResource = {
  uriTemplate: TRANSACTION_RESOURCE_URI_TEMPLATE,
  description: "Read-only contextual view of a single transaction.",
  read: readTransactionResource,
};
