import type {
  CashFlowMetrics,
  FinancialSnapshot,
  MonthlyBucket,
  NormalizedTransaction,
} from '../../common/types/instantpulse.types.js';
import { isDebtService, isNsfFee } from '../plaid/transaction-normalizer.js';
import { detectAnomalies } from './anomaly.detector.js';

/**
 * Turn a ledger into the numbers a credit decision is actually made from.
 *
 * Pure and synchronous on purpose: no IO, no clock beyond the injected `asOf`,
 * no randomness. The same snapshot always produces the same metrics, which is
 * what makes the resulting score defensible when someone asks why.
 */
export function analyzeCashFlow(
  snapshot: FinancialSnapshot,
  asOf: Date = new Date(),
): CashFlowMetrics {
  const transactions = snapshot.transactions.filter((t) => !t.pending);
  const currentBalance = snapshot.totalCurrentBalance;

  if (transactions.length === 0) {
    return emptyMetrics(snapshot.windowDays, currentBalance);
  }

  const monthly = bucketByMonth(transactions, asOf);
  assignEndingBalances(monthly, currentBalance);

  // A 180-day window almost never lines up with calendar months, so the first
  // and last buckets are partial. Averaging them in understates revenue and
  // inflates the volatility measure — a business with rock-steady income can
  // look erratic purely because its window started on the 14th. Statistics run
  // on complete months only; the partials still surface in the UI series.
  const completeMonths = monthly.filter((m) => m.isComplete);
  const statMonths = completeMonths.length >= 2 ? completeMonths : monthly;

  // "Months of usable data" — every policy threshold reasons about this, not
  // about how many calendar buckets the window happens to touch.
  const monthsObserved = statMonths.length;

  const inflows = transactions.filter((t) => t.direction === 'inflow');
  const outflows = transactions.filter((t) => t.direction === 'outflow');

  const monthlyInflows = statMonths.map((m) => m.inflow);
  const avgMonthlyInflow = mean(monthlyInflows);
  const avgMonthlyOutflow = mean(statMonths.map((m) => m.outflow));
  const netMonthlyCashFlow = round2(avgMonthlyInflow - avgMonthlyOutflow);

  // Guard the denominator: a business with zero outflow is a data problem, not
  // an infinitely healthy one.
  const inflowOutflowRatio = avgMonthlyOutflow > 0 ? avgMonthlyInflow / avgMonthlyOutflow : avgMonthlyInflow > 0 ? 3 : 0;

  const cv = coefficientOfVariation(monthlyInflows);
  const trend = normalizedTrend(monthlyInflows);

  // How much the volatility estimate can be trusted. Two months is a real
  // measurement but a weak one; by four it is worth taking at face value.
  const revenueStabilityConfidence = clamp((monthsObserved - 1) / 3, 0, 1);
  // Always the measured value. Thin history is expressed through the paired
  // confidence rather than by overwriting the measurement, which keeps the
  // reported metric honest and lets the engine decide how much weight it earns.
  const revenueStability = clamp(1 - cv, 0, 1);

  const balanceSeries = reconstructDailyBalances(transactions, currentBalance, asOf);
  const balances = [...balanceSeries.values()];
  const minBalance = balances.length ? round2(Math.min(...balances)) : currentBalance;
  const negativeBalanceDays = balances.filter((b) => b < 0).length;

  const estimatedDailyBurn = round2(avgMonthlyOutflow / 30);
  const daysCashOnHand =
    estimatedDailyBurn > 0 ? round2(Math.max(0, currentBalance) / estimatedDailyBurn) : 999;

  const nsfCount = transactions.filter(isNsfFee).length;

  // Debt service from the ledger, plus any minimum payments the liabilities
  // product reported that never showed up as a transaction in this window.
  const ledgerDebtService = outflows.filter(isDebtService).reduce((s, t) => s + Math.abs(t.amount), 0);
  const liabilityMinimums = snapshot.liabilities.reduce((s, l) => s + (l.minimumPayment ?? 0), 0);
  const monthlyDebtService = round2(
    Math.max(ledgerDebtService / Math.max(1, monthsObserved), liabilityMinimums),
  );
  const debtServiceRatio = avgMonthlyInflow > 0 ? round4(monthlyDebtService / avgMonthlyInflow) : 0;

  const dates = transactions.map((t) => t.date).sort();
  const accountTenureDays = daysBetween(new Date(dates[0]), asOf);
  const lastInflowDate = inflows.length ? inflows[inflows.length - 1].date : undefined;
  const daysSinceLastInflow = lastInflowDate ? daysBetween(new Date(lastInflowDate), asOf) : 9999;

  const largestSingleInflow = inflows.length ? round2(Math.max(...inflows.map((t) => t.amount))) : 0;
  const distinctInflowSources = new Set(inflows.map((t) => normalizeSourceName(t))).size;

  const metrics: CashFlowMetrics = {
    windowDays: snapshot.windowDays,
    monthsObserved,
    monthly,

    avgMonthlyInflow: round2(avgMonthlyInflow),
    avgMonthlyOutflow: round2(avgMonthlyOutflow),
    netMonthlyCashFlow,
    inflowOutflowRatio: round4(inflowOutflowRatio),

    revenueStability: round4(revenueStability),
    revenueStabilityConfidence: round4(revenueStabilityConfidence),
    revenueCoefficientOfVariation: round4(cv),
    revenueTrend: round4(trend.trend),
    revenueTrendConfidence: round4(trend.confidence),

    currentBalance: round2(currentBalance),
    minBalance,
    estimatedDailyBurn,
    daysCashOnHand,
    negativeBalanceDays,

    nsfCount,
    monthlyDebtService,
    debtServiceRatio,

    accountTenureDays,
    transactionsPerMonth: round2(transactions.length / Math.max(1, monthsObserved)),
    daysSinceLastInflow,
    largestSingleInflow,
    distinctInflowSources,

    anomalies: [],
  };

  metrics.anomalies = detectAnomalies(transactions, metrics);
  return metrics;
}

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

function bucketByMonth(transactions: NormalizedTransaction[], asOf: Date): MonthlyBucket[] {
  const buckets = new Map<string, MonthlyBucket>();

  for (const t of transactions) {
    const month = t.date.slice(0, 7);
    let bucket = buckets.get(month);
    if (!bucket) {
      bucket = {
        month,
        inflow: 0,
        outflow: 0,
        net: 0,
        transactionCount: 0,
        endingBalanceEstimate: 0,
        isComplete: false,
      };
      buckets.set(month, bucket);
    }

    if (t.amount >= 0) bucket.inflow += t.amount;
    else bucket.outflow += Math.abs(t.amount);
    bucket.transactionCount++;
  }

  const ordered = [...buckets.values()].sort((a, b) => a.month.localeCompare(b.month));
  const observationStart = new Date(transactions[0].date);

  for (const b of ordered) {
    b.inflow = round2(b.inflow);
    b.outflow = round2(b.outflow);
    b.net = round2(b.inflow - b.outflow);

    // Complete means the whole calendar month sits inside the observed window.
    const [year, month] = b.month.split('-').map(Number);
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 0));
    b.isComplete = monthStart >= startOfDay(observationStart) && monthEnd <= asOf;
  }

  return ordered;
}

/**
 * Plaid reports a balance, not a balance history. Walk the monthly nets
 * backwards from today's balance so each month carries a closing figure.
 */
function assignEndingBalances(monthly: MonthlyBucket[], currentBalance: number): void {
  let running = currentBalance;
  for (let i = monthly.length - 1; i >= 0; i--) {
    monthly[i].endingBalanceEstimate = round2(running);
    running -= monthly[i].net;
  }
}

function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Plaid gives a current balance and a ledger, not a balance history. Rebuild the
 * history by walking the ledger backwards from today's balance — that is the
 * only way to see whether the account ever actually went negative, which is a
 * far stronger signal than the balance that happens to be showing right now.
 */
function reconstructDailyBalances(
  transactions: NormalizedTransaction[],
  currentBalance: number,
  asOf: Date,
): Map<string, number> {
  const netByDay = new Map<string, number>();
  for (const t of transactions) {
    netByDay.set(t.date, (netByDay.get(t.date) ?? 0) + t.amount);
  }

  const firstDate = new Date(transactions[0].date);
  const series = new Map<string, number>();

  let balance = currentBalance;
  const cursor = new Date(asOf);

  while (cursor >= firstDate) {
    const key = cursor.toISOString().slice(0, 10);
    series.set(key, round2(balance));
    balance -= netByDay.get(key) ?? 0;
    cursor.setDate(cursor.getDate() - 1);
  }

  return series;
}

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function coefficientOfVariation(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  if (m === 0) return 0;
  const variance = mean(values.map((v) => (v - m) ** 2));
  return Math.sqrt(variance) / m;
}

/**
 * OLS slope over the monthly series, expressed as a fraction of mean revenue,
 * paired with the regression's R².
 *
 * The R² matters as much as the slope. Fit a line through five months of highly
 * seasonal revenue and it will happily report a catastrophic decline that is
 * pure noise. Reporting the confidence lets the engine discount a slope it has
 * no business trusting, rather than scoring the noise as fact.
 */
function normalizedTrend(values: number[]): { trend: number; confidence: number } {
  if (values.length < 3) return { trend: 0, confidence: 0 };

  const m = mean(values);
  if (m === 0) return { trend: 0, confidence: 0 };

  const xs = values.map((_, i) => i);
  const xMean = mean(xs);
  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < values.length; i++) {
    numerator += (xs[i] - xMean) * (values[i] - m);
    denominator += (xs[i] - xMean) ** 2;
  }

  if (denominator === 0) return { trend: 0, confidence: 0 };

  const slope = numerator / denominator;
  const intercept = m - slope * xMean;

  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < values.length; i++) {
    const predicted = intercept + slope * xs[i];
    ssRes += (values[i] - predicted) ** 2;
    ssTot += (values[i] - m) ** 2;
  }

  const rSquared = ssTot === 0 ? 0 : Math.max(0, Math.min(1, 1 - ssRes / ssTot));
  return { trend: slope / m, confidence: rSquared };
}

function daysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 86_400_000));
}

/** Collapse invoice numbers and the like so "INV-4021" and "INV-4022" are one source. */
function normalizeSourceName(t: NormalizedTransaction): string {
  return (t.merchantName ?? t.name)
    .toUpperCase()
    .replace(/[0-9]{2,}/g, '')
    .replace(/[^A-Z ]/g, '')
    .trim();
}

function emptyMetrics(windowDays: number, currentBalance: number): CashFlowMetrics {
  return {
    windowDays,
    monthsObserved: 0,
    monthly: [],
    avgMonthlyInflow: 0,
    avgMonthlyOutflow: 0,
    netMonthlyCashFlow: 0,
    inflowOutflowRatio: 0,
    revenueStability: 0,
    revenueStabilityConfidence: 0,
    revenueCoefficientOfVariation: 0,
    revenueTrend: 0,
    revenueTrendConfidence: 0,
    currentBalance: round2(currentBalance),
    minBalance: round2(currentBalance),
    estimatedDailyBurn: 0,
    daysCashOnHand: 0,
    negativeBalanceDays: 0,
    nsfCount: 0,
    monthlyDebtService: 0,
    debtServiceRatio: 0,
    accountTenureDays: 0,
    transactionsPerMonth: 0,
    daysSinceLastInflow: 9999,
    largestSingleInflow: 0,
    distinctInflowSources: 0,
    anomalies: [],
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
