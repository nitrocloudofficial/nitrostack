/**
 * SentinelPay AI — Payment History Service
 * Source: Technical Specification §5.5 (getPaymentHistory)
 *
 * Retrieves historical payment behavior for a vendor and computes
 * summary statistics. The amount-anomaly multiplier (e.g. TX-827's
 * 842000 / 173200 ≈ 4.86x) must be *calculated* from this data, never
 * hard-coded — this service is the only place averageAmount/maxAmount
 * are derived from.
 */

import type { PaymentHistoryStats } from "../domain/models.js";
import { IncompleteEvidenceError } from "../domain/errors.js";
import { fixtureRepository } from "./fixtures.js";
import { logger } from "../observability/logger.js";

export class HistoryService {
  /**
   * Returns computed history statistics. If no history exists for the
   * vendor, throws IncompleteEvidenceError rather than returning zeros
   * that could be misread as "no anomaly" (§8.7).
   */
  getPaymentHistory(vendorId: string): PaymentHistoryStats {
    const start = Date.now();
    const record = fixtureRepository.getPaymentHistory(vendorId);

    if (!record || record.payments.length === 0) {
      logger.warn("history.unavailable", { vendorId, durationMs: Date.now() - start });
      throw new IncompleteEvidenceError(
        `Payment history for vendor "${vendorId}" could not be verified.`,
        { vendorId }
      );
    }

    const { payments } = record;
    const transactionCount = payments.length;
    const averageAmount = Math.round(
      payments.reduce((sum, amount) => sum + amount, 0) / transactionCount
    );
    const maxAmount = Math.max(...payments);

    logger.info("history.retrieved", {
      vendorId,
      transactionCount,
      averageAmount,
      durationMs: Date.now() - start,
    });

    return {
      vendorId,
      transactions: payments,
      averageAmount,
      maxAmount,
      transactionCount,
    };
  }
}

export const historyService = new HistoryService();
