/**
 * CREED-Lite — Centralized Underwriting Thresholds & Causal Model Parameters
 *
 * Single source of truth for all scoring breakpoints, policy limits,
 * and causal-model coefficients. Every service imports from here
 * instead of embedding magic numbers.
 */

// ─── Underwriting Scoring Thresholds ───────────────────────────────────────────

export const CREDIT_SCORE = {
  /** FICO floor recognized by the model */
  FLOOR: 300,
  /** Minimum score for "prime" lending tier */
  PRIME: 660,
  /** Minimum score for "super-prime" tier */
  SUPER_PRIME: 740,
  /** FICO ceiling */
  CEILING: 850,
} as const;

export const DTI = {
  /** DTI at or below this is considered excellent */
  EXCELLENT: 0.36,
  /** Maximum DTI for a Qualified Mortgage (QM) */
  QUALIFIED_MAX: 0.43,
} as const;

export const INCOME = {
  /** Annual income considered strong by underwriting */
  STRONG: 60_000,
  /** Minimum annual income for underwriting eligibility */
  MINIMUM: 40_000,
} as const;

export const CREDIT_HISTORY = {
  /** Years of history considered "established" */
  ESTABLISHED: 5,
  /** Minimum years required */
  MINIMUM_YEARS: 2,
} as const;

/** Minimum composite score (0-1) required for approval */
export const APPROVAL_THRESHOLD = 0.65;

// ─── Scoring Weights (must sum to 100) ─────────────────────────────────────────

export const SCORING_WEIGHTS = {
  CREDIT_SCORE: 35,
  DTI: 30,
  INCOME: 20,
  CREDIT_HISTORY: 15,
} as const;

// ─── Savings / Reserves ────────────────────────────────────────────────────────

export const SAVINGS = {
  /** Minimum months of living-expense reserves expected by underwriting */
  MIN_RESERVE_MONTHS: 3,
} as const;

// ─── Causal Model Parameters ───────────────────────────────────────────────────

export const CAUSAL_PARAMS = {
  /** Fraction of current income gained per professional certification */
  CERT_INCOME_MULTIPLIER: 0.12,
  /** Market-rate cost (USD) for one professional certification */
  DEFAULT_CERT_COST_USD: 300,
  /** Approximate credit-score points gained per 1 percentage-point DTI reduction */
  CREDIT_POINTS_PER_DTI_PERCENT: 1.5,
  /** Maximum credit-score improvement from savings-based creditworthiness */
  MAX_SAVINGS_CREDIT_BOOST: 25,
  /** Below this projected credit-score improvement, don't generate a standalone savings path */
  MIN_CREDIT_IMPROVEMENT_THRESHOLD: 5,
  /** Expected income increase (%) from job negotiation / side income (no cert required) */
  INCOME_NEGOTIATION_MULTIPLIER: 0.08,
  /** Estimated credit-score boost from adding a verified co-signer */
  COSIGNER_CREDIT_BOOST: 40,
} as const;

// ─── Fraud Detection Thresholds ────────────────────────────────────────────────

export const FRAUD_THRESHOLDS = {
  /** Minimum months of verified co-signer relationship */
  MIN_COSIGNER_RELATIONSHIP_MONTHS: 6,
  /** Maximum days between payoff and reapplication before flagging debt parking */
  MAX_PAYOFF_REAPPLY_DAYS: 14,
  /** Maximum stated income increase (%) without credential verification */
  MAX_UNVERIFIED_INCOME_INCREASE_PCT: 50,
} as const;
