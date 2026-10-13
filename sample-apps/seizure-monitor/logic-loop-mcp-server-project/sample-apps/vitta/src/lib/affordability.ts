/**
 * affordability.ts — FOIR / DTI computation (PDF p.9). Pure.
 * FOIR = (existing_emi + proposed_emi) / net_monthly_income.
 */
import { computeEmi } from './emi.js';
import { POLICY } from './policy.js';
import type { Affordability, BureauReport, BankSummary } from './types.js';

export function computeAffordability(args: {
  requested_amount: number;
  tenure_months: number;
  bureau: BureauReport;
  bank: BankSummary;
  net_income: number;
}): Affordability {
  const existing_emi = args.bureau.active_emi;
  const proposed_emi = computeEmi(args.requested_amount, POLICY.base_rate_pct, args.tenure_months);
  const net_income = args.net_income;
  const foir = round3((existing_emi + proposed_emi) / net_income);
  const dti = round3(existing_emi / net_income);
  return {
    net_income,
    existing_emi,
    proposed_emi,
    foir,
    dti,
    stability_index: args.bank.stability_index,
  };
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
