import type {
  Anomaly,
  CashFlowMetrics,
  NormalizedTransaction,
} from '../../common/types/instantpulse.types.js';
import { isHighRiskMerchant, isWire } from '../plaid/transaction-normalizer.js';

/**
 * "Unusual transactions" made concrete.
 *
 * Each detector answers a question a credit officer would actually ask on
 * seeing the statement — where did that $40k go, why did revenue triple in one
 * month, why did nothing come in for six weeks. Findings carry penalty points,
 * but the engine caps the total: anomalies should colour a decision, never
 * single-handedly decide one.
 *
 * At most one finding per transaction, most specific wins, so a round-number
 * wire that is also a statistical outlier is not punished twice.
 */
export function detectAnomalies(
  transactions: NormalizedTransaction[],
  metrics: CashFlowMetrics,
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const claimed = new Set<string>();

  const claim = (id: string) => {
    if (claimed.has(id)) return false;
    claimed.add(id);
    return true;
  };

  const magnitudes = transactions.map((t) => Math.abs(t.amount));
  const avg = mean(magnitudes);
  const sd = stdDev(magnitudes, avg);
  const outlierThreshold = avg + 3 * sd;
  const materialityFloor = Math.max(1_000, metrics.avgMonthlyInflow * 0.1);

  // Payroll is the largest line on most small-business statements, so a naive
  // outlier test flags it every single month. A payment that recurs is
  // explained by definition — only unexplained movement is anomalous.
  const recurring = findRecurringDescriptions(transactions);
  const isRecurring = (t: NormalizedTransaction) => recurring.has(descriptionKey(t));

  for (const t of transactions) {
    const magnitude = Math.abs(t.amount);

    // 1. High-risk merchant categories — gambling, crypto exchanges, payday lending.
    if (isHighRiskMerchant(t) && claim(t.id)) {
      anomalies.push({
        code: 'HIGH_RISK_MERCHANT',
        severity: 'high',
        description: `Transaction with a high-risk merchant category: "${t.name}".`,
        date: t.date,
        amount: round2(t.amount),
        penaltyPoints: 8,
      });
      continue;
    }

    // 2. Large round-number wires out — the classic unexplained-transfer shape.
    if (
      t.direction === 'outflow' &&
      isWire(t) &&
      !isRecurring(t) &&
      magnitude >= materialityFloor &&
      magnitude % 500 === 0 &&
      claim(t.id)
    ) {
      const share = metrics.avgMonthlyInflow > 0 ? magnitude / metrics.avgMonthlyInflow : 1;
      anomalies.push({
        code: 'ROUND_NUMBER_WIRE',
        severity: share > 0.3 ? 'high' : 'medium',
        description:
          `Round-number outgoing wire of ${money(magnitude)} — ${pct(share)} of average monthly ` +
          `revenue, with no matching supplier or payroll pattern.`,
        date: t.date,
        amount: round2(t.amount),
        penaltyPoints: share > 0.3 ? 7 : 4,
      });
      continue;
    }

    // 3. Statistical outliers against the account's own spending distribution.
    if (
      sd > 0 &&
      !isRecurring(t) &&
      magnitude > outlierThreshold &&
      magnitude >= materialityFloor &&
      claim(t.id)
    ) {
      anomalies.push({
        code: 'OUTLIER_TRANSACTION',
        severity: magnitude > outlierThreshold * 2 ? 'high' : 'medium',
        description:
          `${t.direction === 'inflow' ? 'Deposit' : 'Payment'} of ${money(magnitude)} sits more than ` +
          `three standard deviations above this account's typical transaction size.`,
        date: t.date,
        amount: round2(t.amount),
        penaltyPoints: 4,
      });
    }
  }

  // 4. A single month carrying implausibly more revenue than its neighbours.
  const inflows = metrics.monthly.map((m) => m.inflow);
  if (inflows.length >= 3) {
    const med = median(inflows);
    for (const bucket of metrics.monthly) {
      if (med > 0 && bucket.inflow > med * 2.5) {
        anomalies.push({
          code: 'REVENUE_SPIKE',
          severity: 'medium',
          description:
            `Revenue in ${bucket.month} (${money(bucket.inflow)}) is more than 2.5x the median month ` +
            `(${money(med)}). Worth confirming it is recurring rather than one-off.`,
          date: `${bucket.month}-01`,
          amount: bucket.inflow,
          penaltyPoints: 3,
        });
      }
    }
  }

  // 5. Extended stretches with no money coming in at all.
  const inflowDates = transactions
    .filter((t) => t.direction === 'inflow')
    .map((t) => new Date(t.date).getTime())
    .sort((a, b) => a - b);

  for (let i = 1; i < inflowDates.length; i++) {
    const gapDays = Math.round((inflowDates[i] - inflowDates[i - 1]) / 86_400_000);
    if (gapDays > 30) {
      anomalies.push({
        code: 'INFLOW_GAP',
        severity: gapDays > 60 ? 'high' : 'medium',
        description: `${gapDays} consecutive days with no incoming revenue.`,
        date: new Date(inflowDates[i]).toISOString().slice(0, 10),
        penaltyPoints: gapDays > 60 ? 6 : 3,
      });
    }
  }

  // 6. Revenue concentrated in a single payer is a real continuity risk.
  if (metrics.distinctInflowSources === 1 && metrics.monthsObserved >= 3) {
    anomalies.push({
      code: 'SINGLE_REVENUE_SOURCE',
      severity: 'medium',
      description:
        'All incoming revenue arrives from a single payer. Losing that one relationship would ' +
        'remove the entire repayment capacity.',
      penaltyPoints: 4,
    });
  }

  return anomalies.sort((a, b) => b.penaltyPoints - a.penaltyPoints);
}

/** Strip trailing reference numbers so "INV-4021" and "INV-4088" collapse together. */
function descriptionKey(t: NormalizedTransaction): string {
  return (t.merchantName ?? t.name)
    .toUpperCase()
    .replace(/[0-9]{2,}/g, '')
    .replace(/[^A-Z ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Four or more occurrences in the window counts as an established pattern.
 * Deliberately above three so a business that made exactly three unexplained
 * wires does not get to hide them behind the recurrence exemption.
 */
function findRecurringDescriptions(transactions: NormalizedTransaction[]): Set<string> {
  const counts = new Map<string, number>();
  for (const t of transactions) {
    const key = descriptionKey(t);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const recurring = new Set<string>();
  for (const [key, count] of counts) {
    if (count >= 4) recurring.add(key);
  }
  return recurring;
}

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[], avg: number): number {
  if (values.length < 2) return 0;
  return Math.sqrt(mean(values.map((v) => (v - avg) ** 2)));
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function money(n: number): string {
  return `$${Math.round(Math.abs(n)).toLocaleString('en-US')}`;
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
