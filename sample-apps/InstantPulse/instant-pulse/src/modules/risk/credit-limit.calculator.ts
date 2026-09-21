import type {
  CashFlowMetrics,
  CreditRecommendation,
  RiskBand,
} from '../../common/types/instantpulse.types.js';
import { RISK_POLICY } from './risk.policy.js';

/**
 * Recommend a credit limit as the *lowest* of three independent ceilings.
 *
 * Taking the minimum rather than blending them is the point. Each ceiling
 * answers a different question — how much does this business turn over, how
 * much cash does it actually hold, how much new debt can it service — and a
 * business is only as creditworthy as its weakest answer. Reporting which
 * ceiling bound the number tells an officer exactly what would have to change
 * to justify lending more.
 */
export function recommendCreditLimit(
  metrics: CashFlowMetrics,
  band: RiskBand,
  requestedAmount?: number,
): CreditRecommendation {
  const cfg = RISK_POLICY.creditLimit;
  const multiplier = cfg.bandMultiplier[band];

  const revenueBasedCap = Math.max(0, metrics.avgMonthlyInflow * multiplier);
  const liquidityCap = Math.max(0, metrics.minBalance) * cfg.liquidityMultiple;

  // What is left of monthly revenue's serviceable share once existing debt is paid,
  // annualised into a principal the business could carry.
  const serviceableMonthly = metrics.avgMonthlyInflow * cfg.affordabilityShare - metrics.monthlyDebtService;
  const affordabilityCap = Math.max(0, serviceableMonthly) * 12;

  const ceilings: Array<{ name: string; value: number }> = [
    { name: 'revenue', value: revenueBasedCap },
    { name: 'liquidity', value: liquidityCap },
    { name: 'affordability', value: affordabilityCap },
  ];

  const binding = ceilings.reduce((lowest, c) => (c.value < lowest.value ? c : lowest));

  const raw = Math.min(binding.value, cfg.maxLimit);
  const recommendedLimit = band === 'RED' ? 0 : Math.max(cfg.minLimit, roundDownTo(raw, cfg.roundTo));

  const requestCoverage =
    requestedAmount && requestedAmount > 0
      ? Math.round((recommendedLimit / requestedAmount) * 100) / 100
      : undefined;

  return {
    recommendedLimit,
    currency: cfg.currency,
    revenueBasedCap: round2(revenueBasedCap),
    liquidityCap: round2(liquidityCap),
    affordabilityCap: round2(affordabilityCap),
    bindingConstraint: band === 'RED' ? 'band' : binding.name,
    requestedAmount,
    requestCoverage,
    explanation: explain(band, binding.name, recommendedLimit, metrics, requestedAmount, requestCoverage),
  };
}

function explain(
  band: RiskBand,
  binding: string,
  limit: number,
  metrics: CashFlowMetrics,
  requestedAmount?: number,
  coverage?: number,
): string {
  if (band === 'RED') {
    return 'No limit recommended. The application carries at least one blocking condition, so exposure is held at zero pending resolution.';
  }

  const bindingSentence =
    binding === 'revenue'
      ? `Bound by turnover: ${money(metrics.avgMonthlyInflow)} average monthly revenue at the ${band} multiplier.`
      : binding === 'liquidity'
        ? `Bound by liquidity: the lowest balance observed was ${money(metrics.minBalance)}, and exposure is held to ${RISK_POLICY.creditLimit.liquidityMultiple}x that floor.`
        : `Bound by affordability: after ${money(metrics.monthlyDebtService)}/month of existing debt service, only a limited share of revenue remains free.`;

  const coverageSentence =
    requestedAmount && coverage !== undefined
      ? coverage >= 1
        ? ` This fully covers the ${money(requestedAmount)} requested.`
        : ` This covers ${Math.round(coverage * 100)}% of the ${money(requestedAmount)} requested.`
      : '';

  return `Recommended limit ${money(limit)}. ${bindingSentence}${coverageSentence}`;
}

function roundDownTo(value: number, step: number): number {
  return Math.floor(value / step) * step;
}

function money(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
