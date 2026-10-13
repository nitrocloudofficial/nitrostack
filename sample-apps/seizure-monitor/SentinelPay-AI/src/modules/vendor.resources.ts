/**
 * SentinelPay AI — `counterparty://{vendorId}` MCP Resource
 * Source: Technical Specification §6
 */

import { vendorService } from "../services/vendor.service.js";
import { readResource } from "./resource-runtime.js";

export const COUNTERPARTY_RESOURCE_URI_TEMPLATE = "counterparty://{vendorId}";

export function readCounterpartyResource(vendorId: string) {
  return readResource(COUNTERPARTY_RESOURCE_URI_TEMPLATE, "vendorId", vendorId, (id) =>
    vendorService.verifyVendor(id)
  );
}

export const counterpartyResource = {
  uriTemplate: COUNTERPARTY_RESOURCE_URI_TEMPLATE,
  description: "Read-only contextual view of a vendor's verification state.",
  read: readCounterpartyResource,
};
