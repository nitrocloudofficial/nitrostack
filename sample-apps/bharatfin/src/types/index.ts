export interface Account {
  accountId: string;
  userId: string;
  bankId: string;
  bankName: string;
  accountNumber: string;
  accountType: 'savings' | 'current' | 'credit';
  balance: number;
  currency: string;
  lastUpdated: string; // ISO timestamp
}

/**
 * Financial Information types, mirroring the RBI Account Aggregator FI type
 * taxonomy. A consent grants access to specific FI types only — asking for data
 * outside the granted scope is a scope violation, not merely a missing consent.
 */
export type FiType = 'DEPOSIT' | 'TERM_DEPOSIT' | 'RECURRING_DEPOSIT' | 'LOAN' | 'CREDIT_CARD';

export interface Consent {
  consentId: string;
  userId: string;
  bankId: string;
  status: 'pending' | 'approved' | 'rejected' | 'revoked';
  consentUrl: string;
  aaProvider: 'setu' | 'finvu' | 'onemoney';
  createdAt: string;
  expiresAt: string;
  /** FI types this consent grants access to. Absent = legacy consent, treated as DEPOSIT only. */
  fiTypes?: FiType[];
  /** Human-readable purpose shown to the customer in their AA app. */
  purpose?: string;
  /** RBI purpose code (101 = personal finance management, 102 = lending). */
  purposeCode?: string;
  /** The application this consent was raised for. */
  applicationId?: string;
  /** Who raised the request (the FIU — i.e. the lending bank). */
  requestedBy?: string;
  requestedAt?: string;
}

/**
 * Append-only audit trail of every consent request and every data-access attempt.
 * This is the regulator-facing evidence trail: who asked for what, when, under
 * which consent, and whether it was allowed or refused.
 */
export interface ConsentAuditEntry {
  entryId: string;
  timestamp: string;
  event:
    | 'CONSENT_REQUESTED'
    | 'CONSENT_APPROVED'
    | 'CONSENT_REJECTED'
    | 'DATA_ACCESS_GRANTED'
    | 'DATA_ACCESS_BLOCKED';
  userId: string;
  applicationId?: string;
  consentId?: string;
  /** Which tool triggered this entry. */
  actor: string;
  fiTypes?: FiType[];
  outcome: 'ALLOWED' | 'BLOCKED';
  reason: string;
}

export interface Liability {
  liabilityId: string;
  userId: string;
  lenderName: string;
  loanAmount: number;
  outstandingAmount: number;
  emi: number;
  tenure: number; // months
  rateOfInterest: number;
  type: 'personal' | 'home' | 'auto' | 'credit_card';
}

export interface ServiceabilityResult {
  userId: string;
  monthlyIncome: number;
  declaredMonthlyExpense: number;
  effectiveExpense: number; // max(declared, 40% of income)
  disposableIncome: number;
  requestedLoanAmount: number;
  eligibleLoanAmount: number;
  qualifies: boolean;
  computedAt: string;
}

export interface CreditHealth {
  userId: string;
  creditScore: number; // 300–900
  healthLabel: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  liabilitiesCount: number;
  totalOutstanding: number;
  defaultHistory: boolean;
  lastUpdated: string;
}

export interface Application {
  applicationId: string;
  userId: string;
  bankId: string;
  applicantName: string;
  applicantEmail: string;
  loanAmount: number;
  status: 'pending' | 'approved' | 'rejected' | 'exception';
  createdAt: string;
  /** 'joint' applications require consent from every applicant before data can be pulled. */
  applicationType?: 'single' | 'joint';
  /** userIds of co-applicants on a joint application. */
  coApplicantUserIds?: string[];
  serviceabilityResult?: ServiceabilityResult;
  variances?: VarianceFlag[];
  reviewerNote?: string;
  reviewedAt?: string;
}

export interface VarianceFlag {
  fieldName: string;
  declaredValue: string | number;
  verifiedValue: string | number;
  variancePercent: number;
  flagged: boolean; // true if >10%
}
