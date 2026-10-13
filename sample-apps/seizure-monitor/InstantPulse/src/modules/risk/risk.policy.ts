/**
 * The scoring policy, in one place, as data.
 *
 * This object is published verbatim as the `instantpulse://policy/risk-model`
 * resource. That is the whole point: an applicant who is declined, an officer
 * who disagrees, or a regulator who asks "on what basis" can read the exact
 * numbers the decision was computed from. Nothing about the score lives in a
 * model weight nobody can see.
 *
 * Every factor is scored on a single signal and produces exactly one reason
 * code, so a score can always be read back as a list of sentences that add up.
 */

export interface FactorBreakpoints {
  /** Signal value at or below which the factor earns zero points. */
  zeroAt: number;
  /** Signal value at or above which the factor earns full points. */
  fullAt: number;
}

export const RISK_POLICY = {
  version: '1.0.0',
  description:
    'InstantPulse deterministic credit pre-screening policy. Seven weighted factors summing to 100, ' +
    'less a capped anomaly penalty. Hard blockers force RED regardless of score; soft flags cap the ' +
    'outcome at YELLOW so a human makes the final call.',

  defaultWindowDays: 180,

  /** Factor weights. Must sum to 100. */
  weights: {
    cashFlowHealth: 22,
    revenueStability: 18,
    revenueTrend: 8,
    liquidityBuffer: 20,
    debtService: 14,
    overdraftHistory: 12,
    accountTenure: 6,
  },

  /**
   * Piecewise-linear breakpoints per factor. The signal is mapped onto 0..1
   * between `zeroAt` and `fullAt`, then multiplied by the factor's weight.
   */
  breakpoints: {
    /** Average monthly inflow ÷ average monthly outflow. */
    cashFlowHealth: { zeroAt: 0.9, fullAt: 1.3 } as FactorBreakpoints,
    /** 1 − coefficient of variation of monthly revenue. */
    revenueStability: { zeroAt: 0.25, fullAt: 0.85 } as FactorBreakpoints,
    /** Month-over-month revenue slope as a fraction of mean revenue. */
    revenueTrend: { zeroAt: -0.06, fullAt: 0.03 } as FactorBreakpoints,
    /** Current balance ÷ estimated daily burn. Two months of runway scores full. */
    liquidityBuffer: { zeroAt: 5, fullAt: 60 } as FactorBreakpoints,
    /** Monthly debt service ÷ average monthly inflow. Inverted — lower is better. */
    debtService: { zeroAt: 0.45, fullAt: 0.05 } as FactorBreakpoints,
    /** NSF events + a quarter-weight per negative-balance day. Inverted. */
    overdraftHistory: { zeroAt: 5, fullAt: 0 } as FactorBreakpoints,
    /**
     * Days of observed banking history. Full credit at the analysis window
     * itself — a threshold beyond what the pull can ever return would be a
     * permanent penalty applied equally to every applicant, which scores
     * nothing at all.
     */
    accountTenure: { zeroAt: 30, fullAt: 180 } as FactorBreakpoints,
  },

  /** Anomalies colour a decision; they must never decide one on their own. */
  anomalyPenaltyCap: 20,

  bands: {
    greenMin: 75,
    yellowMin: 50,
  },

  /**
   * Conditions that force RED no matter how the weighted score came out.
   * These are data-integrity and solvency floors, not judgement calls.
   */
  hardBlockers: {
    minObservedHistoryDays: 60,
    maxNsfEvents: 4,
    maxDaysSinceLastInflow: 45,
    requireNonNegativeNetCashFlow: true,
    minMonthsObserved: 2,
  },

  /**
   * Conditions that cap the outcome at YELLOW. The business may well be sound —
   * but a person should look before money moves.
   */
  softFlags: {
    maxDebtServiceRatio: 0.4,
    minRevenueStability: 0.4,
    minDaysCashOnHand: 21,
    maxNegativeBalanceDays: 3,
    flagOnAnyHighSeverityAnomaly: true,
  },

  creditLimit: {
    /** Fraction of one month's revenue offered, by band. */
    bandMultiplier: { GREEN: 1.0, YELLOW: 0.5, RED: 0 },
    /** Share of monthly revenue considered available for new debt service. */
    affordabilityShare: 0.15,
    /** Cushion multiple applied to the lowest observed balance. */
    liquidityMultiple: 3,
    maxLimit: 250_000,
    minLimit: 0,
    roundTo: 500,
    currency: 'USD',
  },
} as const;

export type RiskPolicy = typeof RISK_POLICY;

export const FACTOR_LABELS: Record<keyof RiskPolicy['weights'], string> = {
  cashFlowHealth: 'Cash flow health',
  revenueStability: 'Revenue stability',
  revenueTrend: 'Revenue trend',
  liquidityBuffer: 'Liquidity buffer',
  debtService: 'Debt service capacity',
  overdraftHistory: 'Overdraft & NSF history',
  accountTenure: 'Account tenure',
};

/**
 * Map a signal onto 0..1 using the factor's breakpoints.
 * Handles inverted factors (where `fullAt < zeroAt`) without a separate branch.
 */
export function scoreFraction(value: number, breakpoints: FactorBreakpoints): number {
  const { zeroAt, fullAt } = breakpoints;
  if (fullAt === zeroAt) return value >= fullAt ? 1 : 0;

  const fraction = (value - zeroAt) / (fullAt - zeroAt);
  return Math.max(0, Math.min(1, fraction));
}
