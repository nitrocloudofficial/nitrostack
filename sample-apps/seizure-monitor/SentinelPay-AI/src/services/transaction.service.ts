/**
 * SentinelPay AI — Transaction Service
 * Source: Technical Specification §5.2 (getTransaction)
 *
 * Pure business logic behind the `getTransaction` MCP tool. Contains no
 * MCP/NitroStack imports so it can be unit tested and wired into the
 * tool adapter unchanged once the SDK registration syntax is verified.
 */

import type { Transaction } from "../domain/models.js";
import { NotFoundError } from "../domain/errors.js";
import { fixtureRepository } from "./fixtures.js";
import { logger } from "../observability/logger.js";

export class TransactionService {
  /**
   * Retrieve a transaction by ID. Throws NotFoundError if it doesn't
   * exist in the fixture set — deterministic "not found" is never
   * retried (§5.2 Retry, §11.6).
   */
  getTransaction(transactionId: string): Transaction {
    const start = Date.now();
    const transaction = fixtureRepository.getTransaction(transactionId);

    if (!transaction) {
      logger.warn("transaction.not_found", { transactionId, durationMs: Date.now() - start });
      throw new NotFoundError(`Transaction "${transactionId}" was not found.`, {
        transactionId,
      });
    }

    logger.info("transaction.retrieved", {
      transactionId,
      durationMs: Date.now() - start,
      status: transaction.status,
    });

    return transaction;
  }
}

export const transactionService = new TransactionService();
