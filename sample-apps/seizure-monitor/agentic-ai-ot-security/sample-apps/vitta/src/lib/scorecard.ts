/**
 * scorecard.ts — rules-first, pre-baked scorecard, explainable reason codes
 * (CLAUDE.md rule 8: NEVER trained ML). Pure, deterministic.
 *
 * Pipeline: hard negatives → FOIR cap → weighted score band → Decision.
 */
import { POLICY, REASON_TEXT } from './policy.js';
import { principalForEmi } from './emi.js';
import type { Affordability, BureauReport, Decision, Employment, Outcome } from './types.js';

/** Weighted 0–100 creditworthiness score (independent of requested amount). */
export function computeScore(bureau: BureauReport, affordability: Affordability): number {
  // bureau score → 0..40 (620 floor, 800 ceiling)
  const bureauComp = clamp((bureau.score - 620) / (800 - 620), 0, 1) * 40;
  // existing-EMI burden → 0..20 (lower burden better; 0 burden ~20, 50% burden ~0)
  const burden = affordability.existing_emi / affordability.net_income;
  const burdenComp = clamp((0.5 - burden) / 0.5, 0, 1) * 20;
  // DPD → 0..15
  const dpdComp = bureau.dpd_max_12m === 0 ? 15 : bureau.dpd_max_12m <= 15 ? 10 : bureau.dpd_max_12m <= 30 ? 6 : 0;
  // inquiries → 0..10
  const inqComp = bureau.inquiries_6m <= 2 ? 10 : bureau.inquiries_6m <= 4 ? 7 : bureau.inquiries_6m <= 6 ? 4 : 0;
  // income stability → 0..15
  const stabComp = clamp(affordability.stability_index / 100, 0, 1) * 15;
  return Math.round(bureauComp + burdenComp + dpdComp + inqComp + stabComp);
}

export function underwrite(args: {
  requested_amount: number;
  tenure_months: number;
  employment: Employment | string;
  segment_cap: number;
  bureau: BureauReport;
  affordability: Affordability;
}): Decision {
  const { bureau, affordability } = args;
  const reason_codes: string[] = [];

  // 1) hard negatives → DECLINE
  const hard: string[] = [];
  if (bureau.score < POLICY.min_bureau_score) hard.push('SUBPRIME_SCORE');
  if (bureau.dpd_max_12m > POLICY.max_dpd_12m) hard.push('DPD_OVER_30_12M');
  if (bureau.writeoff_24m) hard.push('WRITEOFF_24M');
  if (bureau.inquiries_6m > POLICY.max_inquiries_6m) hard.push('EXCESS_INQUIRIES');
  if (!POLICY.eligible_employment.includes(args.employment as any)) hard.push('EMPLOYMENT_INELIGIBLE');

  if (hard.length) {
    return decline(hard, bureau);
  }

  // 2) FOIR headroom → max serviceable principal
  const maxProposedEmi = POLICY.foir_cap * affordability.net_income - affordability.existing_emi;
  if (maxProposedEmi < 1000) {
    return decline(['FOIR_NO_HEADROOM'], bureau);
  }
  const maxPrincipalByFoir = principalForEmi(maxProposedEmi, POLICY.base_rate_pct, args.tenure_months);
  const maxServiceable = Math.min(maxPrincipalByFoir, args.segment_cap);
  const approvedAmount = floorTo(Math.min(args.requested_amount, maxServiceable), 10000);

  // 3) score band
  const score = computeScore(bureau, affordability);
  const foirPct = Math.round(affordability.foir * 100);

  let outcome: Outcome;
  const explanations: string[] = [];

  if (score < POLICY.score_bands.conditional_min) {
    return decline(['SCORE_BELOW_THRESHOLD', ...topBureauReasons(bureau)], bureau, score);
  }

  const fullAmount = approvedAmount >= floorTo(args.requested_amount, 10000);
  const bandApprove = score >= POLICY.score_bands.approve_min;

  if (bandApprove && fullAmount) {
    outcome = 'APPROVE';
    reason_codes.push('CLEAN_BUREAU', ...bureau.reason_codes.filter((r) => r === 'LOW_UTILISATION'));
    explanations.push(`Approved for ₹${fmt(approvedAmount)} at a FOIR of ${foirPct}%.`);
  } else {
    outcome = 'CONDITIONAL';
    if (!fullAmount) {
      reason_codes.push('FOIR_LIMIT', 'HIGH_EXISTING_EMI');
      explanations.push(
        `Approved for ₹${fmt(approvedAmount)} instead of ₹${fmt(args.requested_amount)} because existing EMIs put your FOIR at ${foirPct}%.`,
      );
    }
    if (!bandApprove) {
      reason_codes.push('MANUAL_REVIEW', ...topBureauReasons(bureau));
      explanations.push(REASON_TEXT.MANUAL_REVIEW);
    }
  }

  const band = outcome === 'APPROVE' ? POLICY.rate_bands.APPROVE : POLICY.rate_bands.CONDITIONAL;
  // dedupe reason codes and attach human text
  const uniqReasons = [...new Set(reason_codes)];
  for (const rc of uniqReasons) {
    const t = REASON_TEXT[rc];
    if (t && !explanations.includes(t)) explanations.push(t);
  }

  return {
    outcome,
    max_amount: approvedAmount,
    rate_band: { min: band.min, max: band.max },
    tenure_range: { min: POLICY.tenure.min, max: POLICY.tenure.max },
    score,
    reason_codes: uniqReasons,
    explanations,
  };
}

function decline(codes: string[], bureau: BureauReport, score?: number): Decision {
  const uniq = [...new Set([...codes, ...bureau.reason_codes])];
  const explanations = uniq.map((c) => REASON_TEXT[c]).filter(Boolean) as string[];
  explanations.push('You can reapply once these factors improve. We can share a short improvement plan.');
  return {
    outcome: 'DECLINE',
    max_amount: 0,
    rate_band: { min: 0, max: 0 },
    tenure_range: { min: POLICY.tenure.min, max: POLICY.tenure.max },
    score: score ?? 0,
    reason_codes: codes,
    explanations,
  };
}

function topBureauReasons(bureau: BureauReport): string[] {
  return bureau.reason_codes.filter((r) => ['HIGH_EXISTING_EMI', 'ELEVATED_INQUIRIES', 'BORDERLINE_SCORE'].includes(r));
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
function floorTo(n: number, step: number): number {
  return Math.floor(n / step) * step;
}
function fmt(n: number): string {
  return n.toLocaleString('en-IN');
}
