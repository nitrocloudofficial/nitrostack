/**
 * Shared domain types for Contract Sentinel.
 */

export type RiskTolerance = 'low' | 'medium' | 'high';

export type ContractStatus = 'tracked' | 'reviewed' | 'needs_attention';

export type Classification = 'safe' | 'danger';

export type RecommendedActionCode =
  | 'renew_as_is'
  | 'renegotiate'
  | 'let_lapse'
  | 'monitor';

export interface CompanyProfile {
  industry: string;
  companySize: number;
  jurisdiction: string;
  riskTolerance: RiskTolerance;
  setAt: string;
}

/** A clause extracted from raw contract text. */
export interface ExtractedClause {
  /** Clause category, e.g. `auto_renewal`, `liability_cap`. */
  type: string;
  /** Human label for display. */
  label: string;
  /** Verbatim clause text taken from the contract. */
  text: string;
}

/** An obligation extracted from raw contract text. */
export interface ExtractedObligation {
  /** Who owes the obligation, as far as the text reveals. */
  owedBy: string;
  /** Verbatim sentence describing the obligation. */
  text: string;
}

export interface TrackedContract {
  id: string;
  title: string;
  counterparty: string;
  contractType: string;
  currency: string;
  annualValue: number;
  /** ISO date (YYYY-MM-DD) or null when no deadline could be extracted. */
  deadline: string | null;
  status: ContractStatus;
  /** How many sentinel cycles have evaluated this contract. */
  reviewCount: number;
  imageUrl: string;
  contractText: string;
  clauses: ExtractedClause[];
  obligations: ExtractedObligation[];
  ingestedAt: string;
  /** Populated by the sentinel cycle's act phase. */
  lastCycleAt: string | null;
  lastRiskScore: number | null;
  lastClassification: Classification | null;
  recommendedAction: RecommendedActionCode | null;
  recommendedActionDetail: string | null;
}

/** One scoring factor — never a bare number, always evidence + rationale. */
export interface RiskFactor {
  code: string;
  label: string;
  /** Points this factor contributed to the risk score. Negative = mitigating. */
  weight: number;
  /** The exact clause text that drove this factor. */
  clauseText: string;
  rationale: string;
}

export interface RecommendedAction {
  action: RecommendedActionCode;
  label: string;
  talkingPoints: string[];
}

export interface RiskAssessment {
  contractId: string;
  riskScore: number;
  classification: Classification;
  dangerThreshold: number;
  /** Highest-weight factor — the clause that primarily caused the classification. */
  drivingClause: RiskFactor;
  factors: RiskFactor[];
  scoreExplanation: string;
  daysUntilDeadline: number | null;
  needsAction: boolean;
  actionReasons: string[];
  recommendedAction: RecommendedAction;
  profileAdjustment: string;
  disclaimer: string;
}

export const NOT_LEGAL_ADVICE =
  'This is an automated heuristic assessment generated from the contract text supplied. It is NOT legal advice — have a qualified lawyer review any contract before you act on it.';
