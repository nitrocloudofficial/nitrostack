/**
 * policy.ts — editable credit policy constants (PDF p.9). Mirrored by the
 * policy://credit-policy/v1.7 Resource so the client can read the same rules.
 */
export const POLICY = {
  version: 'v1.7',
  base_rate_pct: 15.99, // representative rate for FOIR headroom + demo EMI
  foir_cap: 0.55, // FOIR ≤ 55%
  min_bureau_score: 680,
  max_dpd_12m: 30, // days past due
  max_inquiries_6m: 6,
  min_amount: 25000,
  max_amount_floor: 50000, // below this serviceable amount → decline (no viable loan)
  eligible_employment: ['SALARIED', 'SELF_EMPLOYED'] as const,
  processing_fee_pct: 1.5,
  tenure: { min: 12, max: 48 },
  score_bands: { approve_min: 60, conditional_min: 40 },
  rate_bands: {
    APPROVE: { min: 13.5, max: 15.0 },
    CONDITIONAL: { min: 15.99, max: 18.0 },
  },
} as const;

export const REASON_TEXT: Record<string, string> = {
  SUBPRIME_SCORE: 'Your bureau score is below our current cut-off of 680.',
  DPD_OVER_30_12M: 'A repayment was overdue by more than 30 days in the last 12 months.',
  WRITEOFF_24M: 'A written-off account appears on your bureau in the last 24 months.',
  EXCESS_INQUIRIES: 'There were more than 6 credit inquiries in the last 6 months.',
  EMPLOYMENT_INELIGIBLE: 'This product is available to salaried and self-employed applicants only.',
  CITY_NOT_SERVED: 'We do not currently lend in this city.',
  FOIR_NO_HEADROOM: 'Your existing EMIs already use most of your monthly income.',
  FOIR_LIMIT: 'Existing EMIs raise your FOIR, so we reduced the eligible amount to keep repayments affordable.',
  SCORE_BELOW_THRESHOLD: 'Your overall profile score is below the approval threshold.',
  HIGH_EXISTING_EMI: 'Your existing monthly EMIs are high relative to your income.',
  ELEVATED_INQUIRIES: 'Several recent credit inquiries were considered.',
  CLEAN_BUREAU: 'Your bureau record is clean with no adverse markers.',
  LOW_UTILISATION: 'Your existing credit utilisation is low.',
  MANUAL_REVIEW: 'Your application needs a brief review by our team before final approval.',
  STABLE_INCOME: 'Your income pattern is stable and consistent.',
};
