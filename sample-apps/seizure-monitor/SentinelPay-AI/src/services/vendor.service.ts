/**
 * SentinelPay AI — Vendor Service
 * Source: Technical Specification §5.3 (verifyVendor)
 *
 * Retrieves vendor identity/verification and the canonical
 * `verifiedBeneficiaryAccount` used for the beneficiary-mismatch check.
 * This service does NOT compute the mismatch itself — that comparison
 * lives in domain/evidence.ts (evaluateBeneficiaryMatch), which is the
 * single place the two canonical fields are compared, per §5.3.
 */

import type { Counterparty } from "../domain/models.js";
import { IncompleteEvidenceError, NotFoundError } from "../domain/errors.js";
import { fixtureRepository } from "./fixtures.js";
import { logger } from "../observability/logger.js";

export class VendorService {
  /**
   * Retrieve and verify a vendor. Distinguishes three failure states
   * per §5.3 "Failure cases":
   *  - vendor missing            → NotFoundError
   *  - vendor exists but not
   *    verified / no verified
   *    beneficiary account       → IncompleteEvidenceError
   *  - otherwise                 → Counterparty
   */
  verifyVendor(vendorId: string): Counterparty {
    const start = Date.now();
    const vendor = fixtureRepository.getCounterparty(vendorId);

    if (!vendor) {
      logger.warn("vendor.not_found", { vendorId, durationMs: Date.now() - start });
      throw new NotFoundError(`Vendor "${vendorId}" was not found.`, { vendorId });
    }

    if (!vendor.verified || !vendor.verifiedBeneficiaryAccount) {
      // §5.3: "Missing canonical beneficiary data must produce an
      // INCOMPLETE_EVIDENCE state rather than a mismatch."
      logger.warn("vendor.incomplete_verification", {
        vendorId,
        verified: vendor.verified,
        durationMs: Date.now() - start,
      });
      throw new IncompleteEvidenceError(
        `Vendor "${vendorId}" has no verified beneficiary account on file.`,
        { vendorId }
      );
    }

    logger.info("vendor.verified", {
      vendorId,
      relationshipStatus: vendor.relationshipStatus,
      durationMs: Date.now() - start,
    });

    return vendor;
  }
}

export const vendorService = new VendorService();
