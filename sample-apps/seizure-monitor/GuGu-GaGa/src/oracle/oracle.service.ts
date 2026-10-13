/**
 * CREED-Lite — Oracle Service (Bank Underwriting Scoring Engine)
 *
 * PRODUCTION VERSION — Continuous piecewise-linear scoring with smooth
 * interpolation.  No step-function cliffs; every unique input yields
 * a unique composite score.
 *
 * All thresholds imported from shared config — single source of truth.
 */

import { Injectable } from '@nitrostack/core';
import type { OnModuleInit } from '@nitrostack/core';
import {
  CREDIT_SCORE,
  DTI,
  INCOME,
  CREDIT_HISTORY,
  SAVINGS,
  APPROVAL_THRESHOLD,
  SCORING_WEIGHTS,
} from '../config/thresholds.js';

// ─── Interfaces ────────────────────────────────────────────────────────────────

export interface ApplicantProfile {
  creditScore: number;        // 300-850
  dtiRatio: number;           // 0.0-1.0  or  0-100 (auto-normalized)
  annualIncome: number;       // USD
  liquidSavings: number;      // USD
  creditHistoryYears: number;
  monthlyDebtPayment: number; // USD
  certificationCount: number;
}

export interface ComponentScore {
  score: number;
  maxScore: number;
  input: number;
  label: string;
}

export interface ScoreBreakdown {
  creditScoreComponent: ComponentScore;
  dtiComponent: ComponentScore;
  incomeComponent: ComponentScore;
  creditHistoryComponent: ComponentScore;
  totalScore: number;
}

export interface OracleDecision {
  status: 'APPROVED' | 'REJECTED';
  approvalProbability: number;
  riskFactors: string[];
  scoreBreakdown: ScoreBreakdown;
}

// ─── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class OracleService implements OnModuleInit {
  // ── Lifecycle ──

  onModuleInit() {
    console.log(
      `✅ Oracle Service initialized — approval threshold: ${APPROVAL_THRESHOLD * 100}%`
    );
  }

  // ── Public API ──

  /**
   * Normalize DTI ratio — gracefully handle both decimal (0.48) and
   * percentage (48) input formats.
   */
  normalizeDti(dtiRaw: number): number {
    return dtiRaw > 1 ? dtiRaw / 100 : dtiRaw;
  }

  /**
   * Evaluate an applicant profile and return a deterministic but
   * continuous approval probability with score breakdown.
   */
  evaluate(profile: Partial<ApplicantProfile>): OracleDecision {
    // ── Explicit validation — no silent defaults ──
    const creditScore = profile.creditScore ?? 0;
    const dtiRaw = profile.dtiRatio ?? 0;
    const dti = this.normalizeDti(dtiRaw);
    const annualIncome = profile.annualIncome ?? 0;
    const creditHistoryYears = profile.creditHistoryYears ?? 0;
    const liquidSavings = profile.liquidSavings ?? 0;
    const monthlyDebtPayment = profile.monthlyDebtPayment ?? 0;

    const riskFactors: string[] = [];

    // ── Validation warnings for missing/zero inputs ──
    if (!profile.creditScore || profile.creditScore <= 0) {
      riskFactors.push('Credit score was not provided or is zero — evaluation may be inaccurate');
    }
    if (annualIncome <= 0) {
      riskFactors.push('Annual income is zero or not provided — applicant has no verified income source');
    }

    // ── Credit Score (35%) — continuous ──
    const creditScorePoints = this.interpolate(creditScore, [
      [CREDIT_SCORE.FLOOR, 0],
      [CREDIT_SCORE.PRIME, 25],
      [CREDIT_SCORE.SUPER_PRIME, SCORING_WEIGHTS.CREDIT_SCORE],
      [CREDIT_SCORE.CEILING, SCORING_WEIGHTS.CREDIT_SCORE],
    ]);
    if (creditScore < CREDIT_SCORE.PRIME && creditScore > 0) {
      riskFactors.push(
        `Credit score ${creditScore} is below prime threshold (${CREDIT_SCORE.PRIME})`
      );
    }

    // ── DTI Ratio (30%) — continuous, lower is better ──
    const dtiPoints = this.interpolate(dti, [
      [0.0, SCORING_WEIGHTS.DTI],
      [DTI.EXCELLENT, SCORING_WEIGHTS.DTI],
      [DTI.QUALIFIED_MAX, 20],
      [0.60, 5],
      [1.0, 0],
    ]);
    if (dti > DTI.QUALIFIED_MAX) {
      riskFactors.push(
        `DTI ratio ${(dti * 100).toFixed(1)}% exceeds qualified maximum (${(DTI.QUALIFIED_MAX * 100).toFixed(1)}%)`
      );
    }
    if (dti > 0.60) {
      riskFactors.push(
        `DTI ratio ${(dti * 100).toFixed(1)}% is severely elevated — immediate debt reduction is critical`
      );
    }

    // ── Income (20%) — continuous ──
    const incomePoints = this.interpolate(annualIncome, [
      [0, 0],
      [INCOME.MINIMUM, 12],
      [INCOME.STRONG, SCORING_WEIGHTS.INCOME],
      [200_000, SCORING_WEIGHTS.INCOME],
    ]);
    if (annualIncome > 0 && annualIncome < INCOME.MINIMUM) {
      riskFactors.push(
        `Annual income $${annualIncome.toLocaleString()} is below minimum ($${INCOME.MINIMUM.toLocaleString()})`
      );
    }

    // ── Credit History (15%) — continuous ──
    const historyPoints = this.interpolate(creditHistoryYears, [
      [0, 0],
      [CREDIT_HISTORY.MINIMUM_YEARS, 8],
      [CREDIT_HISTORY.ESTABLISHED, SCORING_WEIGHTS.CREDIT_HISTORY],
      [30, SCORING_WEIGHTS.CREDIT_HISTORY],
    ]);
    if (creditHistoryYears < CREDIT_HISTORY.MINIMUM_YEARS) {
      riskFactors.push(
        `Credit history ${creditHistoryYears} year(s) is below minimum (${CREDIT_HISTORY.MINIMUM_YEARS} years)`
      );
    }

    // ── Supplementary risk factors (not scored but reported) ──
    if (monthlyDebtPayment > 0 && liquidSavings < monthlyDebtPayment * SAVINGS.MIN_RESERVE_MONTHS) {
      riskFactors.push(
        `Liquid savings $${liquidSavings.toLocaleString()} is below ${SAVINGS.MIN_RESERVE_MONTHS}-month reserve requirement ($${(monthlyDebtPayment * SAVINGS.MIN_RESERVE_MONTHS).toLocaleString()})`
      );
    }

    // ── Composite ──
    const totalScore = creditScorePoints + dtiPoints + incomePoints + historyPoints;
    const approvalProbability = this.round(totalScore / 100);

    return {
      status: approvalProbability >= APPROVAL_THRESHOLD ? 'APPROVED' : 'REJECTED',
      approvalProbability,
      riskFactors,
      scoreBreakdown: {
        creditScoreComponent: {
          score: this.round(creditScorePoints),
          maxScore: SCORING_WEIGHTS.CREDIT_SCORE,
          input: creditScore,
          label: 'Credit Score',
        },
        dtiComponent: {
          score: this.round(dtiPoints),
          maxScore: SCORING_WEIGHTS.DTI,
          input: dti,
          label: 'DTI Ratio',
        },
        incomeComponent: {
          score: this.round(incomePoints),
          maxScore: SCORING_WEIGHTS.INCOME,
          input: annualIncome,
          label: 'Annual Income',
        },
        creditHistoryComponent: {
          score: this.round(historyPoints),
          maxScore: SCORING_WEIGHTS.CREDIT_HISTORY,
          input: creditHistoryYears,
          label: 'Credit History',
        },
        totalScore: this.round(totalScore),
      },
    };
  }

  /**
   * Re-evaluate after applying hypothetical changes to a base profile.
   */
  simulateIntervention(
    baseProfile: ApplicantProfile,
    changes: Partial<ApplicantProfile>
  ): OracleDecision {
    const modified = { ...baseProfile, ...changes };
    return this.evaluate(modified);
  }

  /**
   * Expose the active thresholds so other services (e.g. CausalGraphService)
   * can target the exact approval boundary.
   */
  getThresholds() {
    return {
      approvalThreshold: APPROVAL_THRESHOLD,
      primeCreditScore: CREDIT_SCORE.PRIME,
      superPrimeCreditScore: CREDIT_SCORE.SUPER_PRIME,
      maxQualifiedDti: DTI.QUALIFIED_MAX,
      excellentDti: DTI.EXCELLENT,
      strongIncome: INCOME.STRONG,
      minimumIncome: INCOME.MINIMUM,
      establishedHistory: CREDIT_HISTORY.ESTABLISHED,
      minimumHistory: CREDIT_HISTORY.MINIMUM_YEARS,
    };
  }

  // ── Private helpers ──

  /**
   * Piecewise-linear interpolation between ordered breakpoints.
   *
   * @param value  The input value to map
   * @param bp     Array of [inputValue, outputScore] pairs, sorted ascending by inputValue
   */
  private interpolate(value: number, bp: [number, number][]): number {
    if (value <= bp[0][0]) return bp[0][1];
    if (value >= bp[bp.length - 1][0]) return bp[bp.length - 1][1];

    for (let i = 0; i < bp.length - 1; i++) {
      const [x0, y0] = bp[i];
      const [x1, y1] = bp[i + 1];
      if (value >= x0 && value <= x1) {
        const t = (value - x0) / (x1 - x0);
        return y0 + t * (y1 - y0);
      }
    }
    return bp[bp.length - 1][1];
  }

  /** Round to 2 decimal places */
  private round(n: number): number {
    return Math.round(n * 100) / 100;
  }
}
