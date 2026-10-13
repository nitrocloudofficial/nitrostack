import type {
  BusinessProfile,
  CashFlowMetrics,
  PolicyFlag,
  ReasonCode,
  RiskBand,
  RiskDecision,
} from '../../common/types/instantpulse.types.js';
import { recommendCreditLimit } from './credit-limit.calculator.js';
import { FACTOR_LABELS, RISK_POLICY, scoreFraction } from './risk.policy.js';

type FactorKey = keyof typeof RISK_POLICY.weights;

/**
 * The decision.
 *
 * Deterministic and pure — the same metrics always produce the same score, the
 * same band and the same sentences. No model is consulted here, and that is the
 * design: a credit decision has to be reproducible and defensible months later,
 * which rules out anything that can quietly answer differently on a Tuesday.
 *
 * Three mechanisms, in precedence order:
 *   1. Hard blockers  — solvency and data-integrity floors. Force RED outright.
 *   2. Weighted score — seven factors summing to 100, less a capped anomaly penalty.
 *   3. Soft flags     — cap an otherwise-passing application at YELLOW so a person looks.
 */
export function scoreApplication(
  applicationId: string,
  metrics: CashFlowMetrics,
  profile: BusinessProfile,
  asOf: Date = new Date(),
): RiskDecision {
  const reasonCodes = buildReasonCodes(metrics);
  const rawScore = reasonCodes.reduce((sum, r) => sum + r.points, 0);

  const anomalyPenalty = Math.min(
    RISK_POLICY.anomalyPenaltyCap,
    metrics.anomalies.reduce((sum, a) => sum + a.penaltyPoints, 0),
  );

  const score = clamp(Math.round(rawScore - anomalyPenalty), 0, 100);

  const hardBlockers = evaluateHardBlockers(metrics);
  const softFlags = evaluateSoftFlags(metrics);
  const { band, bandReason } = decideBand(score, hardBlockers, softFlags);

  const credit = recommendCreditLimit(metrics, band, profile.requestedAmount);

  return {
    applicationId,
    scoredAt: asOf.toISOString(),
    policyVersion: RISK_POLICY.version,

    rawScore: round1(rawScore),
    anomalyPenalty,
    score,

    band,
    bandReason,

    reasonCodes,
    hardBlockers,
    softFlags,

    credit,
    nextAction: nextAction(band, hardBlockers, softFlags),
    summary: summarize(profile, metrics, score, band, credit.recommendedLimit),
  };
}

// ---------------------------------------------------------------------------
// Factors
// ---------------------------------------------------------------------------

function buildReasonCodes(m: CashFlowMetrics): ReasonCode[] {
  const bp = RISK_POLICY.breakpoints;

  const overdraftSignal = m.nsfCount + m.negativeBalanceDays * 0.25;

  return [
    factor(
      'cashFlowHealth',
      'CF_HEALTH',
      m.inflowOutflowRatio,
      bp.cashFlowHealth,
      `Revenue covers ${pct(m.inflowOutflowRatio)} of outgoings — ${money(m.avgMonthlyInflow)} in against ` +
        `${money(m.avgMonthlyOutflow)} out per month, a net of ${signedMoney(m.netMonthlyCashFlow)}.`,
    ),

    factor(
      'revenueStability',
      'REV_STABILITY',
      m.revenueStability,
      bp.revenueStability,
      m.revenueStabilityConfidence < 0.5
        ? `Monthly revenue varies by about ${pct(m.revenueCoefficientOfVariation)} across only ` +
          `${m.monthsObserved} complete month(s) — too thin to lean on, so this factor is pulled toward neutral.`
        : `Monthly revenue varies by about ${pct(m.revenueCoefficientOfVariation)} around its mean across ` +
          `${m.monthsObserved} complete months.`,
      // Same principle as the trend factor: a weak measurement should move the
      // outcome less, in either direction.
      m.revenueStabilityConfidence,
    ),

    factor(
      'revenueTrend',
      'REV_TREND',
      m.revenueTrend,
      bp.revenueTrend,
      trendExplanation(m),
      // Discount the slope by how well the line actually fits. Choppy revenue
      // produces a confident-looking trend that is really just noise, and
      // scoring that as fact would penalise seasonal businesses for being seasonal.
      m.revenueTrendConfidence,
    ),

    factor(
      'liquidityBuffer',
      'LIQUIDITY',
      m.daysCashOnHand,
      bp.liquidityBuffer,
      `${money(m.currentBalance)} on hand covers about ${Math.round(m.daysCashOnHand)} days at the current ` +
        `burn rate of ${money(m.estimatedDailyBurn)}/day. Lowest balance observed was ${money(m.minBalance)}.`,
    ),

    factor(
      'debtService',
      'DEBT_SERVICE',
      m.debtServiceRatio,
      bp.debtService,
      m.monthlyDebtService > 0
        ? `Existing debt service of ${money(m.monthlyDebtService)}/month consumes ${pct(m.debtServiceRatio)} of revenue.`
        : 'No recurring debt service detected in the transaction history.',
    ),

    factor(
      'overdraftHistory',
      'OVERDRAFT',
      overdraftSignal,
      bp.overdraftHistory,
      m.nsfCount === 0 && m.negativeBalanceDays === 0
        ? 'No NSF fees or negative-balance days across the observed window.'
        : `${m.nsfCount} NSF/overdraft fee(s) and ${m.negativeBalanceDays} day(s) with a negative balance.`,
    ),

    factor(
      'accountTenure',
      'TENURE',
      m.accountTenureDays,
      bp.accountTenure,
      `${m.accountTenureDays} days of observed banking history, averaging ${Math.round(m.transactionsPerMonth)} ` +
        `transactions per month across ${m.distinctInflowSources} distinct revenue source(s).`,
    ),
  ];
}

function factor(
  key: FactorKey,
  code: string,
  signal: number,
  breakpoints: { zeroAt: number; fullAt: number },
  explanation: string,
  /**
   * 0..1 reliability of the signal. Below 1 the score is pulled toward neutral
   * in proportion — an unreliable measurement should move the outcome less,
   * in either direction. Omit when the signal is directly observed.
   */
  confidence = 1,
): ReasonCode {
  const maxPoints = RISK_POLICY.weights[key];
  const measured = scoreFraction(signal, breakpoints);
  const fraction = 0.5 + (measured - 0.5) * clamp(confidence, 0, 1);
  const points = round1(fraction * maxPoints);

  return {
    code,
    factor: key,
    label: FACTOR_LABELS[key],
    points,
    maxPoints,
    impact: fraction >= 0.7 ? 'positive' : fraction >= 0.4 ? 'neutral' : 'negative',
    explanation,
  };
}

// ---------------------------------------------------------------------------
// Blockers and flags
// ---------------------------------------------------------------------------

function evaluateHardBlockers(m: CashFlowMetrics): PolicyFlag[] {
  const cfg = RISK_POLICY.hardBlockers;
  const flags: PolicyFlag[] = [];

  if (m.accountTenureDays < cfg.minObservedHistoryDays) {
    flags.push({
      code: 'INSUFFICIENT_HISTORY',
      label: 'Insufficient banking history',
      explanation:
        `Only ${m.accountTenureDays} days of transaction history are available; the policy floor is ` +
        `${cfg.minObservedHistoryDays} days. There is not enough evidence to underwrite yet.`,
    });
  }

  if (m.monthsObserved < cfg.minMonthsObserved) {
    flags.push({
      code: 'INSUFFICIENT_TRANSACTION_DATA',
      label: 'Not enough transaction data',
      explanation:
        `Transactions span only ${m.monthsObserved} calendar month(s). At least ${cfg.minMonthsObserved} are ` +
        `required before cash-flow patterns mean anything.`,
    });
  }

  if (m.nsfCount >= cfg.maxNsfEvents) {
    flags.push({
      code: 'EXCESSIVE_NSF',
      label: 'Repeated insufficient-funds events',
      explanation:
        `${m.nsfCount} NSF/overdraft events in the window, at or above the policy limit of ${cfg.maxNsfEvents}. ` +
        `Repeated NSF activity is the single strongest predictor of near-term default in this model.`,
    });
  }

  if (m.daysSinceLastInflow > cfg.maxDaysSinceLastInflow) {
    flags.push({
      code: 'NO_RECENT_REVENUE',
      label: 'No recent incoming revenue',
      explanation:
        `${m.daysSinceLastInflow} days since the last incoming payment, beyond the ${cfg.maxDaysSinceLastInflow}-day ` +
        `limit. The business may be dormant or banking elsewhere.`,
    });
  }

  if (cfg.requireNonNegativeNetCashFlow && m.netMonthlyCashFlow < 0) {
    flags.push({
      code: 'NEGATIVE_CASH_FLOW',
      label: 'Negative net cash flow',
      explanation:
        `The business is spending ${money(Math.abs(m.netMonthlyCashFlow))} more than it earns each month. ` +
        `Extending credit against a shrinking balance would accelerate the shortfall.`,
    });
  }

  return flags;
}

function evaluateSoftFlags(m: CashFlowMetrics): PolicyFlag[] {
  const cfg = RISK_POLICY.softFlags;
  const flags: PolicyFlag[] = [];

  if (m.debtServiceRatio > cfg.maxDebtServiceRatio) {
    flags.push({
      code: 'HIGH_DEBT_SERVICE',
      label: 'Heavy existing debt load',
      explanation:
        `Debt service consumes ${pct(m.debtServiceRatio)} of revenue, above the ${pct(cfg.maxDebtServiceRatio)} ` +
        `review threshold. Confirm what the existing obligations are before adding more.`,
    });
  }

  if (m.revenueStability < cfg.minRevenueStability) {
    flags.push({
      code: 'UNSTABLE_REVENUE',
      label: 'Highly variable revenue',
      explanation:
        `Revenue stability scores ${m.revenueStability.toFixed(2)}, below the ${cfg.minRevenueStability} threshold. ` +
        `Seasonality may explain it — worth asking.`,
    });
  }

  if (m.daysCashOnHand < cfg.minDaysCashOnHand) {
    flags.push({
      code: 'THIN_LIQUIDITY',
      label: 'Thin cash buffer',
      explanation:
        `Only ${Math.round(m.daysCashOnHand)} days of cash on hand, under the ${cfg.minDaysCashOnHand}-day ` +
        `review threshold. A single late customer payment would bite.`,
    });
  }

  if (m.negativeBalanceDays > cfg.maxNegativeBalanceDays) {
    flags.push({
      code: 'RECURRING_OVERDRAFT',
      label: 'Recurring overdrafts',
      explanation:
        `The account was negative on ${m.negativeBalanceDays} days, above the ${cfg.maxNegativeBalanceDays}-day ` +
        `threshold, suggesting routine reliance on overdraft.`,
    });
  }

  if (cfg.flagOnAnyHighSeverityAnomaly) {
    const high = m.anomalies.filter((a) => a.severity === 'high');
    if (high.length > 0) {
      flags.push({
        code: 'HIGH_SEVERITY_ANOMALY',
        label: 'Unexplained account activity',
        explanation:
          `${high.length} high-severity anomal${high.length === 1 ? 'y' : 'ies'} detected: ` +
          `${high.map((a) => a.code).join(', ')}. These need an explanation before funds move.`,
      });
    }
  }

  return flags;
}

function decideBand(
  score: number,
  hardBlockers: PolicyFlag[],
  softFlags: PolicyFlag[],
): { band: RiskBand; bandReason: string } {
  if (hardBlockers.length > 0) {
    return {
      band: 'RED',
      bandReason:
        `Blocked by ${hardBlockers.length} hard condition(s): ${hardBlockers.map((b) => b.code).join(', ')}. ` +
        `Hard blockers override the weighted score, which was ${score}/100.`,
    };
  }

  if (score < RISK_POLICY.bands.yellowMin) {
    return {
      band: 'RED',
      bandReason: `Score of ${score}/100 falls below the ${RISK_POLICY.bands.yellowMin}-point minimum for manual review.`,
    };
  }

  if (score < RISK_POLICY.bands.greenMin) {
    return {
      band: 'YELLOW',
      bandReason:
        `Score of ${score}/100 sits between ${RISK_POLICY.bands.yellowMin} and ${RISK_POLICY.bands.greenMin} — ` +
        `viable, but not clear-cut enough to approve without a human.`,
    };
  }

  if (softFlags.length > 0) {
    return {
      band: 'YELLOW',
      bandReason:
        `Score of ${score}/100 clears the automatic-approval threshold, but ${softFlags.length} review ` +
        `flag(s) cap it at YELLOW: ${softFlags.map((f) => f.code).join(', ')}.`,
    };
  }

  return {
    band: 'GREEN',
    bandReason: `Score of ${score}/100 clears the ${RISK_POLICY.bands.greenMin}-point threshold with no review flags.`,
  };
}

function nextAction(band: RiskBand, hardBlockers: PolicyFlag[], softFlags: PolicyFlag[]): string {
  switch (band) {
    case 'GREEN':
      return 'Proceed automatically. Call stripe_start_onboarding to create the payment account and issue the onboarding link.';
    case 'YELLOW':
      return (
        'Route to an officer. The application is in review_list_queue; use review_request_documents for the ' +
        `open questions (${softFlags.map((f) => f.code).join(', ') || 'score in review range'}), or ` +
        'review_override_decision to approve with a written justification.'
      );
    case 'RED':
      return (
        'Decline or remediate. The blocking conditions are ' +
        `${hardBlockers.map((b) => b.code).join(', ') || 'a score below the review floor'} — share them with the ` +
        'applicant via the explain_decision prompt, and re-run once resolved.'
      );
  }
}

function summarize(
  profile: BusinessProfile,
  m: CashFlowMetrics,
  score: number,
  band: RiskBand,
  limit: number,
): string {
  const head = `${profile.businessName} scored ${score}/100 (${band}) on ${m.monthsObserved} month(s) of banking data.`;
  const body = `Average monthly revenue ${money(m.avgMonthlyInflow)}, net ${signedMoney(m.netMonthlyCashFlow)}, ${Math.round(m.daysCashOnHand)} days of cash on hand.`;
  const tail =
    band === 'RED'
      ? 'No credit limit recommended.'
      : `Recommended limit ${money(limit)}.`;
  return `${head} ${body} ${tail}`;
}

// ---------------------------------------------------------------------------

function trendExplanation(m: CashFlowMetrics): string {
  const direction = m.revenueTrend >= 0 ? 'growing' : 'declining';
  const rate = pct(Math.abs(m.revenueTrend));

  if (m.revenueTrendConfidence < 0.3) {
    return (
      `Revenue is nominally ${direction} at ${rate} per month, but the fit is weak ` +
      `(R²=${m.revenueTrendConfidence.toFixed(2)}) — the month-to-month swings are too large to read a ` +
      `reliable trend, so this factor is scored close to neutral.`
    );
  }

  return (
    `Revenue is ${direction} at roughly ${rate} per month across ${m.monthsObserved} complete months ` +
    `(R²=${m.revenueTrendConfidence.toFixed(2)}).`
  );
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function money(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

function signedMoney(n: number): string {
  return `${n < 0 ? '-' : '+'}$${Math.round(Math.abs(n)).toLocaleString('en-US')}`;
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}
