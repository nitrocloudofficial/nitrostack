// Shared data contract for Care Mediator.
// This is the ONLY place case-shaped types should be defined — every
// component and page should import CaseData (or its sub-types) from here
// rather than re-declaring fields inline.

export type ClaimStatus =
  | 'approved'
  | 'partial'
  | 'denied'
  | 'pending'
  | 'more-info-requested';

export type NetworkStatus = 'in-network' | 'out-of-network' | 'unknown';

export type TimelineActor = 'hospital' | 'insurer' | 'patient' | 'system';

export type ObjectivityReport = {
  summary: string;
  flags: string[]; // inconsistencies the system caught before submission
};

export type CoverageExplainer = {
  covered: boolean;
  coverageLimit: number;
  waitingPeriodCleared: boolean;
  exclusionsApplicable: string[];
  networkStatus: NetworkStatus;
};

export type LoanOffer = {
  lenderName: string;
  apr: number;
  amount: number;
  flagged?: boolean;
  flagReason?: string;
};

export type RecommendedOffer = {
  lenderName: string;
  apr: number;
  amount: number;
};

export type TimelineEvent = {
  timestamp: string; // ISO timestamp
  actor: TimelineActor;
  event: string;
};

export type CaseData = {
  caseId: string;
  patientName: string;
  hospitalName: string;
  procedure: string;
  submittedAt: string; // ISO timestamp

  hospitalEstimate: number;
  insurerApproved: number;
  gap: number;
  claimStatus: ClaimStatus;
  denialReason?: string;

  objectivityReport: ObjectivityReport;

  coverageExplainer: CoverageExplainer;

  loanOffers: LoanOffer[];
  recommendedOffer: RecommendedOffer;

  timeline: TimelineEvent[];
};

// --- Backend-sourced shapes (mirror backend/src/types.ts) ---

export type DocumentId = 'discharge-summary' | 'id-proof' | 'policy-document' | 'itemized-bill';

export type DocumentRecord = {
  documentId: DocumentId;
  originalName: string;
  storedPath: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
};

export type IssueReport = {
  id: string;
  caseId: string;
  issueType: string;
  description: string;
  reportedAt: string;
  status: 'open' | 'closed';
};

export type CreateCaseInput = {
  patientName: string;
  hospitalName: string;
  procedure: string;
  patientHistory?: string;
  insuranceProvider: string;
  estimatedCost: number;
};

export type DecisionInput =
  | { action: 'approve' }
  | { action: 'partial'; approvedAmount: number; note?: string }
  | { action: 'deny'; note: string }
  | { action: 'more-info'; note: string };
