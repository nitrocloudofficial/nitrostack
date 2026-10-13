/**
 * SentinelPay AI — `history://{vendorId}` MCP Resource
 * Source: Technical Specification §3.1 (history.resources.ts), §5.5
 *
 * Not one of the six illustrative URIs listed in §6, but the canonical
 * folder structure explicitly names this file alongside the other
 * `*.resources.ts` modules — a natural, read-only contextual view of a
 * vendor's payment history, mirroring `getPaymentHistory`.
 */

import { historyService } from "../services/history.service.js";
import { readResource } from "./resource-runtime.js";

export const HISTORY_RESOURCE_URI_TEMPLATE = "history://{vendorId}";

export function readHistoryResource(vendorId: string) {
  return readResource(HISTORY_RESOURCE_URI_TEMPLATE, "vendorId", vendorId, (id) =>
    historyService.getPaymentHistory(id)
  );
}

export const historyResource = {
  uriTemplate: HISTORY_RESOURCE_URI_TEMPLATE,
  description: "Read-only contextual view of a vendor's computed payment-history statistics.",
  read: readHistoryResource,
};
