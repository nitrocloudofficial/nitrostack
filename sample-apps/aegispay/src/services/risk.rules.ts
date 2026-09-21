// risk.rules.ts — Eight pure functions. Zero I/O. Zero LLM calls.
//
// Each rule receives a RiskContext and returns RiskFlag | null.
// Evidence strings are written for humans — they appear verbatim in the
// approval widget and the audit log.
//
// LOQ owns this file. Do not edit outside the LOQ zone (see TEAM.md S3).

import type {
  RiskContext,
  RiskFlag,
  Paise,
} from '../types/contracts.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format paise as Indian-rupee string: 24000000 -> "Rs.2,40,000" */
function formatINR(paise: Paise): string {
  const rupees = Math.floor(paise / 100);
  const str = rupees.toString();
  if (str.length <= 3) return `Rs.${str}`;
  let result = str.slice(-3);
  let rest = str.slice(0, -3);
  while (rest.length > 2) {
    result = rest.slice(-2) + ',' + result;
    rest = rest.slice(0, -2);
  }
  if (rest.length > 0) result = rest + ',' + result;
  return `Rs.${result}`;
}

/** ISO day-of-week (0=Sun ... 6=Sat) for an ISO timestamp in IST (UTC+5:30). */
function istDayOfWeek(iso: string): number {
  const ms = Date.parse(iso);
  const istMs = ms + 19_800_000;
  return new Date(istMs).getUTCDay();
}

/** Hour (0-23) in IST for an ISO timestamp. */
function istHour(iso: string): number {
  const ms = Date.parse(iso);
  const istMs = ms + 19_800_000;
  return new Date(istMs).getUTCHours();
}

/** Days between two ISO timestamps (absolute value). */
function daysBetween(a: string, b: string): number {
  return Math.abs(Date.parse(a) - Date.parse(b)) / 86_400_000;
}

// ---------------------------------------------------------------------------
// Rule 1 — AMOUNT_TIER
// Severity scales with which threshold the amount crosses.
// ---------------------------------------------------------------------------

export function amountTier(ctx: RiskContext): RiskFlag | null {
  const { amount } = ctx.invoice;
  const { autoLimit, dualLimit } = ctx.thresholds;

  if (amount > dualLimit) {
    return {
      ruleId: 'AMOUNT_TIER',
      severity: 'high',
      evidence: `Amount ${formatINR(amount)} exceeds dual-approval threshold ${formatINR(dualLimit)}`,
    };
  }

  if (amount > autoLimit) {
    return {
      ruleId: 'AMOUNT_TIER',
      severity: 'medium',
      evidence: `Amount ${formatINR(amount)} exceeds auto-approval limit ${formatINR(autoLimit)}`,
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Rule 2 — FIRST_TIME_PAYEE
// No prior payment history for this vendor in the last 90 days.
// ---------------------------------------------------------------------------

export function firstTimePayee(ctx: RiskContext): RiskFlag | null {
  if (ctx.vendorHistory.length === 0) {
    return {
      ruleId: 'FIRST_TIME_PAYEE',
      severity: 'medium',
      evidence: `Vendor ${ctx.vendor.id} has no prior payments in the last 90 days`,
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Rule 3 — VELOCITY_SPIKE
// Amount exceeds a multiple of the vendor's 90-day average payment.
// Skips if no history (FIRST_TIME_PAYEE covers that case).
// ---------------------------------------------------------------------------

export function velocitySpike(ctx: RiskContext): RiskFlag | null {
  if (ctx.vendorHistory.length === 0) return null;

  const mean =
    ctx.vendorHistory.reduce((sum, p) => sum + p.amount, 0) /
    ctx.vendorHistory.length;

  const threshold = mean * ctx.thresholds.velocityMultiple;

  if (ctx.invoice.amount > threshold) {
    return {
      ruleId: 'VELOCITY_SPIKE',
      severity: 'medium',
      evidence:
        `Invoice amount ${formatINR(ctx.invoice.amount)} is ` +
        `${(ctx.invoice.amount / mean).toFixed(1)}x the 90-day average of ${formatINR(Math.round(mean))} ` +
        `(threshold: ${ctx.thresholds.velocityMultiple}x)`,
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Rule 4 — DUPLICATE_INVOICE
// A prior payment to the same vendor for the same amount within 7 days.
// ---------------------------------------------------------------------------

const DUPLICATE_WINDOW_DAYS = 7;

export function duplicateInvoice(ctx: RiskContext): RiskFlag | null {
  const { vendorId } = ctx.invoice;
  const { amount } = ctx.invoice;
  const invoiceDate = ctx.invoice.invoiceDate;

  const match = ctx.vendorHistory.some(
    (p) =>
      p.vendorId === vendorId &&
      p.amount === amount &&
      daysBetween(p.paidAt, invoiceDate) <= DUPLICATE_WINDOW_DAYS,
  );

  if (match) {
    return {
      ruleId: 'DUPLICATE_INVOICE',
      severity: 'high',
      evidence:
        `Vendor ${vendorId} already received ${formatINR(amount)} ` +
        `within ${DUPLICATE_WINDOW_DAYS} days of this invoice date`,
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Rule 5 — STRUCTURING
// >=3 same-day payments to the same payee, each within structuringBand
// below the auto-approval limit. Classic layering pattern.
// ---------------------------------------------------------------------------

export function structuring(ctx: RiskContext): RiskFlag | null {
  const { autoLimit, structuringBand } = ctx.thresholds;
  const lowerBound = autoLimit * (1 - structuringBand);

  const structured = ctx.sameDayPayments.filter(
    (p) => p.amount >= lowerBound && p.amount < autoLimit,
  );

  if (structured.length >= 3) {
    const total = structured.reduce((s, p) => s + p.amount, 0);
    return {
      ruleId: 'STRUCTURING',
      severity: 'high',
      evidence:
        `${structured.length} same-day payments to ${ctx.vendor.id} ` +
        `totaling ${formatINR(total)}, each within ${structuringBand * 100}% ` +
        `below the ${formatINR(autoLimit)} limit - possible structuring`,
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Rule 6 — DENY_LIST
// Vendor ID or destination account appears on the deny list.
// ---------------------------------------------------------------------------

export function denyListRule(ctx: RiskContext): RiskFlag | null {
  const reasons: string[] = [];

  if (ctx.denyList.includes(ctx.vendor.id)) {
    reasons.push(`vendor ID ${ctx.vendor.id}`);
  }
  if (ctx.denyList.includes(ctx.invoice.destinationAccount)) {
    reasons.push(`account ${ctx.invoice.destinationAccount}`);
  }

  if (reasons.length > 0) {
    return {
      ruleId: 'DENY_LIST',
      severity: 'high',
      evidence: `Deny-list match: ${reasons.join(' and ')}`,
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Rule 7 — ACCOUNT_CHANGED
// Invoice destination account differs from the vendor's last-paid account.
// Only fires when the vendor has a prior payment (lastPaidAccount is non-null).
// ---------------------------------------------------------------------------

export function accountChanged(ctx: RiskContext): RiskFlag | null {
  const { lastPaidAccount } = ctx.vendor;

  if (lastPaidAccount !== null && ctx.invoice.destinationAccount !== lastPaidAccount) {
    return {
      ruleId: 'ACCOUNT_CHANGED',
      severity: 'high',
      evidence:
        `Invoice directs payment to ${ctx.invoice.destinationAccount}, ` +
        `but vendor ${ctx.vendor.id} was last paid to ${lastPaidAccount}`,
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Rule 8 — OFF_HOURS
// evaluatedAt falls outside business hours (IST) or on a weekend.
// ---------------------------------------------------------------------------

export function offHours(ctx: RiskContext): RiskFlag | null {
  const day = istDayOfWeek(ctx.evaluatedAt);
  const hour = istHour(ctx.evaluatedAt);

  const weekend = day === 0 || day === 6;
  const outsideHours =
    hour < ctx.thresholds.businessStartHour ||
    hour >= ctx.thresholds.businessEndHour;

  if (weekend || outsideHours) {
    const reason = weekend
      ? `Submitted on a ${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][day]}`
      : `Submitted at ${hour}:00 IST, outside business hours ${ctx.thresholds.businessStartHour}-${ctx.thresholds.businessEndHour}`;
    return {
      ruleId: 'OFF_HOURS',
      severity: 'low',
      evidence: reason,
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// All rules in evaluation order. The engine calls each in sequence.
// ---------------------------------------------------------------------------

export const ALL_RULES = [
  denyListRule,
  amountTier,
  firstTimePayee,
  velocitySpike,
  duplicateInvoice,
  structuring,
  accountChanged,
  offHours,
] as const;
