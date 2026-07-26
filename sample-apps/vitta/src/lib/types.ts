/** Shared domain types for Vitta. Pure — no NitroStack imports. */

export type ConsentScope = 'CREDIT_BUREAU' | 'BANK_STATEMENTS' | 'KYC';

export type Employment = 'SALARIED' | 'SELF_EMPLOYED';

export type Outcome = 'APPROVE' | 'CONDITIONAL' | 'DECLINE';

export interface ConsentPayload {
  jti: string;
  lead_id: string;
  scopes: ConsentScope[];
  iat: number; // epoch seconds
  exp: number; // epoch seconds
  version: string; // consent text version
}

export interface CaseRecord {
  lead_id: string;
  session_id: string;
  created_at: string;
  purpose?: string;
  intent_flag?: 'FAST_TRACK' | 'STANDARD';
  amount?: number;
  tenure_months?: number;
  employment?: Employment;
  city?: string;
  income_band?: string;
  pan?: string;
  mobile?: string;
  name?: string;
  prelim_eligibility?: string;
  kyc?: KycResult;
  fraud?: FraudResult;
  bureau?: BureauReport;
  bank?: BankSummary;
  affordability?: Affordability;
  decision?: Decision;
  offers?: Offer[];
  recommended_offer_id?: string;
  sanction?: SanctionResult;
  status?: string;
}

export interface KycResult {
  kyc_status: 'PASS' | 'RETRY' | 'FAIL';
  kyc_hash: string;
  risk_flags: string[];
}

export interface FraudResult {
  verdict: 'CLEAR' | 'REVIEW' | 'BLOCK';
  signals: string[];
  score: number;
}

export interface BureauReport {
  score: number;
  dpd_max_12m: number;
  dpd_max_24m: number;
  writeoff_24m: boolean;
  inquiries_6m: number;
  active_emi: number;
  tradelines: { type: string; sanctioned: number; emi: number; status: string }[];
  reason_codes: string[];
}

export interface BankSummary {
  avg_salary_credit: number;
  income_variance_pct: number;
  bounce_count: number;
  cash_withdrawal_ratio: number;
  net_surplus: number;
  employer_consistency: number; // 0..1
  stability_index: number; // 0..100
}

export interface Affordability {
  net_income: number;
  existing_emi: number;
  proposed_emi: number;
  foir: number; // 0..1
  dti: number; // 0..1
  stability_index: number;
}

export interface Decision {
  outcome: Outcome;
  max_amount: number;
  rate_band: { min: number; max: number };
  tenure_range: { min: number; max: number };
  score: number;
  reason_codes: string[];
  explanations: string[];
}

export interface Offer {
  offer_id: string;
  amount: number;
  tenure_months: number;
  roi_annual_pct: number;
  emi: number;
  processing_fee_pct: number;
  apr_pct: number;
  total_cost: number;
  valid_till: string;
  recommended: boolean;
  why_recommended?: string;
}

export interface SanctionResult {
  url: string;
  hash: string;
  valid_till: string;
  letter_fields: Record<string, unknown>;
}

export interface AuditEnvelope {
  session_id: string;
  seq: number;
  actor: string;
  event: string;
  payload: Record<string, unknown>;
  version: { policy: string; score: string; prompt: string };
  ts: string;
}

/** Consent-gate refusal payload (the signature feature). */
export interface ConsentRefusal {
  error: 'CONSENT_REQUIRED';
  code: ConsentFailureCode;
  hint: string;
}

export type ConsentFailureCode =
  | 'CONSENT_REQUIRED'
  | 'CONSENT_INVALID'
  | 'CONSENT_EXPIRED'
  | 'SCOPE_NOT_GRANTED'
  | 'CONSENT_REVOKED'
  | 'CONSENT_LEAD_MISMATCH';

export const VERSION_BLOCK = {
  policy: 'v1.7',
  score: 'scorecard-2026-07',
  prompt: 'uw_explainer_v1',
} as const;
