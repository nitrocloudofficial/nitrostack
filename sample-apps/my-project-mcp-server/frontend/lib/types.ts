export type Role = 'hospital' | 'patient' | 'insurer';

export type CashlessStatus = 'approved' | 'denied' | 'pending';

export interface ReconcileCaseInput {
  patientId: string;
  procedureCode: string;
  city: string;
  hospitalBilledAmount: number;
  [key: string]: unknown;
}

export interface InsurerClaim {
  claimId: string;
  cashlessStatus: CashlessStatus;
  approvedAmount: number | null;
  denialReason?: string;
  isNetworkHospital?: boolean;
}

export interface LoanOffer {
  offerId: string;
  lenderName: string;
  principal: number;
  tenureMonths: number;
  flatInterestRate: number;
  processingFeePct: number;
  isPredatory: boolean;
  totalRepayable: number;
  effectiveAnnualRate: number;
}

export interface ReconcileCaseResult {
  patientId: string;
  procedureCode: string;
  city: string;
  isConsistent: boolean;
  inconsistencies: string[];
  hospitalBilledAmount: number;
  cghsBenchmark: number | null;
  insurerClaim: InsurerClaim | null;
  coverageGap: number;
  financingNeeded: boolean;
  financingOptions: LoanOffer[] | null;
}

export interface PolicyExplanation {
  id: string;
  matchedKeyword: string;
  title: string;
  plainLanguage: string;
  severity: 'info' | 'warning' | 'danger';
}

export interface PolicyDecoderResult {
  clausesFound: number;
  explanations: PolicyExplanation[];
  hospitalNote: string | null;
  summary: string;
}

export interface CityProcedure {
  code: string;
  procedure: string;
  city: string;
  cghsRate: number;
  currency: string;
}

export interface DemoCase {
  id: string;
  label: string;
  description: string;
  variant: 'clean' | 'gotcha' | 'pending';
  input: ReconcileCaseInput;
}

export const DEMO_CASES: DemoCase[] = [
  {
    id: 'pat-01',
    label: 'PAT-01 — Clean case',
    description: 'Approved claim, bill matches CGHS benchmark, zero coverage gap',
    variant: 'clean',
    input: {
      patientId: 'PAT-01',
      procedureCode: 'CGHS-CARD-001',
      city: 'Chennai',
      hospitalBilledAmount: 65000,
    },
  },
  {
    id: 'pat-02',
    label: 'PAT-02 — Gotcha case',
    description: 'Denied claim → full coverage gap → predatory loan flagged',
    variant: 'gotcha',
    input: {
      patientId: 'PAT-02',
      procedureCode: 'CGHS-ORTH-014',
      city: 'Chennai',
      hospitalBilledAmount: 130000,
    },
  },
  {
    id: 'pat-03',
    label: 'PAT-03 — Pending claim',
    description: 'Cashless approval still pending, non-network hospital',
    variant: 'pending',
    input: {
      patientId: 'PAT-03',
      procedureCode: 'CGHS-GEN-007',
      city: 'Chennai',
      hospitalBilledAmount: 35000,
    },
  },
];

export const PROCEDURE_LABELS: Record<string, string> = {
  'CGHS-CARD-001': 'Coronary Angioplasty (single stent)',
  'CGHS-ORTH-014': 'Total Knee Replacement (unilateral)',
  'CGHS-GEN-007': 'Laparoscopic Appendectomy',
};

