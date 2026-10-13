/**
 * SentinelPay AI — Invoice Service
 * Source: Technical Specification §5.4 (analyzeInvoice)
 *
 * Retrieves and normalizes invoice evidence. A duplicate invoice is a
 * risk indicator, never an automatic rejection (§5.4) — this service
 * only reports the fact; policy/risk layers decide what it means.
 */

import type { Invoice } from "../domain/models.js";
import { NotFoundError } from "../domain/errors.js";
import { fixtureRepository } from "./fixtures.js";
import { logger } from "../observability/logger.js";

export interface AnalyzeInvoiceResult extends Invoice {
  /** §5.4 output field — fixed to VALID_FIXTURE for this deterministic MVP dataset. */
  status: "VALID_FIXTURE";
}

export class InvoiceService {
  analyzeInvoice(invoiceId: string): AnalyzeInvoiceResult {
    const start = Date.now();
    const invoice = fixtureRepository.getInvoice(invoiceId);

    if (!invoice) {
      logger.warn("invoice.not_found", { invoiceId, durationMs: Date.now() - start });
      throw new NotFoundError(`Invoice "${invoiceId}" was not found.`, { invoiceId });
    }

    logger.info("invoice.analyzed", {
      invoiceId,
      duplicate: invoice.duplicate,
      durationMs: Date.now() - start,
    });

    return { ...invoice, status: "VALID_FIXTURE" };
  }
}

export const invoiceService = new InvoiceService();
