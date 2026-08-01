/**
 * offers.ts — up to 3 offers, intent-aware ordering (SPEC.md).
 * FAST_TRACK (medical/emergency) → lowest EMI first; else lowest total cost first.
 */
import { computeEmi, computeApr, totalCost } from './emi.js';
import { POLICY } from './policy.js';
import type { Decision, Offer } from './types.js';

export function generateOffers(args: {
  lead_id: string;
  decision: Decision;
  tenure_months: number;
  intent_flag?: 'FAST_TRACK' | 'STANDARD';
  existing_customer?: boolean;
  /** FOIR guard: when provided, candidate tenures whose EMI would breach the
   *  FOIR cap at max_amount are dropped (shorter tenure = higher EMI — the
   *  approved amount is only serviceable at tenures ≥ the underwritten one). */
  affordability?: { existing_emi: number; net_income: number };
}): { offers: Offer[]; recommended_offer_id: string } {
  const { decision } = args;
  if (decision.outcome === 'DECLINE' || decision.max_amount <= 0) {
    return { offers: [], recommended_offer_id: '' };
  }

  const amount = decision.max_amount;
  const rate = decision.rate_band.min; // best rate the applicant qualifies for
  const fee = args.existing_customer ? POLICY.processing_fee_pct - 0.5 : POLICY.processing_fee_pct;
  const validTill = isoPlusDays(45);

  // candidate tenures around the requested tenure, clamped to policy grid
  const t = clampTenure(args.tenure_months);
  let tenures = uniq([clampTenure(t - 12), t, clampTenure(t + 12)]).slice(0, 3);

  // FOIR guard: every offer must itself be serviceable (agent-found bug #2:
  // a shorter-tenure offer at max_amount can breach the cap that set max_amount)
  if (args.affordability) {
    const { existing_emi, net_income } = args.affordability;
    const serviceable = tenures.filter(
      (tn) => (existing_emi + computeEmi(amount, rate, tn)) / net_income <= POLICY.foir_cap + 1e-9,
    );
    if (serviceable.length) tenures = serviceable;
  }

  const offers: Offer[] = tenures.map((tenure, i) => {
    const emi = computeEmi(amount, rate, tenure);
    return {
      offer_id: `${args.lead_id}-OF${i + 1}`,
      amount,
      tenure_months: tenure,
      roi_annual_pct: rate,
      emi,
      processing_fee_pct: fee,
      apr_pct: computeApr(amount, rate, tenure, fee),
      total_cost: totalCost(emi, tenure, amount, fee),
      valid_till: validTill,
      recommended: false,
    };
  });

  // recommend: FAST_TRACK → lowest EMI; else lowest total cost
  const recommended =
    args.intent_flag === 'FAST_TRACK'
      ? [...offers].sort((a, b) => a.emi - b.emi)[0]
      : [...offers].sort((a, b) => a.total_cost - b.total_cost)[0];

  for (const o of offers) {
    if (o.offer_id === recommended.offer_id) {
      o.recommended = true;
      o.why_recommended =
        args.intent_flag === 'FAST_TRACK'
          ? `Lowest monthly EMI (₹${o.emi.toLocaleString('en-IN')}) — eases your immediate cash burden for a time-sensitive need.`
          : `Lowest total cost (₹${o.total_cost.toLocaleString('en-IN')}) over the loan life.`;
    }
  }

  // intent-aware ordering of the list itself
  const ordered =
    args.intent_flag === 'FAST_TRACK'
      ? [...offers].sort((a, b) => a.emi - b.emi)
      : [...offers].sort((a, b) => a.total_cost - b.total_cost);

  return { offers: ordered, recommended_offer_id: recommended.offer_id };
}

function clampTenure(t: number): number {
  return Math.max(POLICY.tenure.min, Math.min(POLICY.tenure.max, t));
}
function uniq(a: number[]): number[] {
  return [...new Set(a)];
}
function isoPlusDays(days: number): string {
  const d = new Date(Date.now() + days * 86400_000);
  return d.toISOString();
}
