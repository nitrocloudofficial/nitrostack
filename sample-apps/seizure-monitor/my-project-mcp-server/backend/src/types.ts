// Mirrors frontend `lib/types.ts` exactly — this is the contract the
// Next.js app already renders against. Keep the two in sync by hand;
// there's no shared package in this hackathon setup.

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
  flags: string[];
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
  timestamp: string;
  actor: TimelineActor;
  event: string;
};

export type CaseData = {
  caseId: string;
  patientName: string;
  hospitalName: string;
  procedure: string;
  submittedAt: string;

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

// --- Backend-only shapes (not part of the frontend contract) ---

export type DocumentId =
  | 'discharge-summary'
  | 'id-proof'
  | 'policy-document'
  | 'itemized-bill';

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

export type PatientHistoryData = {
  patientHistory?: string;
};
