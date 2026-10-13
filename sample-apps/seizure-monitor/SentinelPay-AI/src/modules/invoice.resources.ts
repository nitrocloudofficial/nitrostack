/**
 * SentinelPay AI — `invoice://{invoiceId}` MCP Resource
 * Source: Technical Specification §6
 */

import { invoiceService } from "../services/invoice.service.js";
import { readResource } from "./resource-runtime.js";

export const INVOICE_RESOURCE_URI_TEMPLATE = "invoice://{invoiceId}";

export function readInvoiceResource(invoiceId: string) {
  return readResource(INVOICE_RESOURCE_URI_TEMPLATE, "invoiceId", invoiceId, (id) =>
    invoiceService.analyzeInvoice(id)
  );
}

export const invoiceResource = {
  uriTemplate: INVOICE_RESOURCE_URI_TEMPLATE,
  description: "Read-only contextual view of a single invoice, including duplicate status.",
  read: readInvoiceResource,
};
