/**
 * SentinelPay AI — Risk Service (Deterministic Risk Engine)
 * Source: Technical Specification §5.7 (calculateRisk), §17.2 (risk weights),
 *         §35.6 (locked expected calculation for TX-827)
 *
 * Formula (locked):
 *   rawScore = beneficiaryMismatch*35 + amountAnomaly*32 + policyViolation*20
 *   riskScore = min(rawScore, 100)
 *
 * Classification:
 *   0–30   LOW
 *   31–60  MEDIUM
 *   61–100 HIGH
 *
 * For TX-827 (all three indicators true): 35 + 32 + 20 = 87 → HIGH.
 *
 * This score is an explicitly-labeled prototype heuristic, not a
 * probability of fraud (§5.7, §22 Claims Boundary) — callers must not
 * present it as validated financial risk.
 */

import type { RiskFactor, RiskIndicators, RiskLevel, RiskResult } from "../domain/models.js";
import { RiskEngineError } from "../domain/errors.js";
import { logger } from "../observability/logger.js";
import { BoundedMap } from "../util/bounded-map.js";

/** Caps in-memory risk-result history to the most recently active cases (see bounded-map.ts). */
const MAX_TRACKED_CASES = 10_000;

// §17.2 — prototype weights, environment-tunable but defaulted to the locked spec values.
export const BENEFICIARY_MISMATCH_WEIGHT = Number(
  process.env.BENEFICIARY_MISMATCH_WEIGHT ?? 35
);
export const AMOUNT_ANOMALY_WEIGHT = Number(process.env.AMOUNT_ANOMALY_WEIGHT ?? 32);
export const POLICY_VIOLATION_WEIGHT = Number(process.env.POLICY_VIOLATION_WEIGHT ?? 20);
export const RISK_SCORE_CAP = Number(process.env.RISK_SCORE_CAP ?? 100);

function classify(score: number): RiskLevel {
  if (score <= 30) return "LOW";
  if (score <= 60) return "MEDIUM";
  return "HIGH";
}

export class RiskService {
  /**
   * In-memory cache of the most recent RiskResult per case, keyed by
   * caseId. Read-only backing for the `risk://{caseId}` resource (§3.1) —
   * never written to except by `calculateRisk` itself.
   */
  private readonly lastResultByCase = new BoundedMap<string, RiskResult>(MAX_TRACKED_CASES);

  calculateRisk(caseId: string, indicators: RiskIndicators): RiskResult {
    const start = Date.now();

    for (const [key, value] of Object.entries(indicators)) {
      if (typeof value !== "boolean") {
        throw new RiskEngineError(`Risk indicator "${key}" must be a boolean.`, {
          caseId,
          key,
          received: value,
        });
      }
    }

    const factors: RiskFactor[] = [
      {
        name: "beneficiaryMismatch",
        weight: BENEFICIARY_MISMATCH_WEIGHT,
        triggered: indicators.beneficiaryMismatch,
      },
      {
        name: "amountAnomaly",
        weight: AMOUNT_ANOMALY_WEIGHT,
        triggered: indicators.amountAnomaly,
      },
      {
        name: "policyViolation",
        weight: POLICY_VIOLATION_WEIGHT,
        triggered: indicators.policyViolation,
      },
    ];

    const rawScore = factors.reduce((sum, f) => sum + (f.triggered ? f.weight : 0), 0);
    const riskScore = Math.min(rawScore, RISK_SCORE_CAP);
    const riskLevel = classify(riskScore);

    const result: RiskResult = { caseId, rawScore, riskScore, riskLevel, factors };

    logger.info("risk.calculated", {
      caseId,
      rawScore,
      riskScore,
      riskLevel,
      durationMs: Date.now() - start,
    });

    this.lastResultByCase.set(caseId, result);
    return result;
  }

  /** Read-only lookup backing the `risk://{caseId}` resource. Never mutates. */
  getLastResult(caseId: string): RiskResult | null {
    return this.lastResultByCase.get(caseId) ?? null;
  }
}

export const riskService = new RiskService();
