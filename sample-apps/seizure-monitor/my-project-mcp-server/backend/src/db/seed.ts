// Seeds the same two demo cases the frontend's lib/fake-data.ts ships with,
// so pointing the Next.js app at this API instead of the local fake data
// module is a true drop-in swap — same case IDs, same shape, same story.

import { store, type InternalCaseRecord } from './store';

const CLEAN_CASE: InternalCaseRecord = {
  caseId: 'clean-case',
  patientName: 'Meera Nair',
  hospitalName: 'Sunrise General Hospital',
  procedure: 'Laparoscopic Appendectomy',
  submittedAt: '2026-07-18T09:15:00.000Z',

  hospitalEstimate: 185000,
  insurerApproved: 185000,
  gap: 0,
  claimStatus: 'approved',

  objectivityReport: {
    summary:
      'Submission is consistent across hospital records, diagnosis codes, and policy terms. No discrepancies found.',
    flags: [],
  },

  coverageExplainer: {
    covered: true,
    coverageLimit: 500000,
    waitingPeriodCleared: true,
    exclusionsApplicable: [],
    networkStatus: 'in-network',
  },

  loanOffers: [
    { lenderName: 'Suraksha Health Finance', apr: 8.9, amount: 15000 },
  ],
  recommendedOffer: { lenderName: 'Suraksha Health Finance', apr: 8.9, amount: 15000 },

  timeline: [
    {
      timestamp: '2026-07-18T09:15:00.000Z',
      actor: 'hospital',
      event: 'Case submitted with patient history and cost estimate.',
    },
    {
      timestamp: '2026-07-18T09:16:00.000Z',
      actor: 'system',
      event: 'Objectivity check completed — no inconsistencies found.',
    },
    {
      timestamp: '2026-07-18T11:40:00.000Z',
      actor: 'insurer',
      event: 'Claim reviewed against policy terms.',
    },
    {
      timestamp: '2026-07-18T13:05:00.000Z',
      actor: 'insurer',
      event: 'Claim approved for full estimated amount.',
    },
    {
      timestamp: '2026-07-18T13:10:00.000Z',
      actor: 'system',
      event: 'Patient notified of approval.',
    },
  ],
};

const GOTCHA_CASE: InternalCaseRecord = {
  caseId: 'gotcha-case',
  patientName: 'Arjun Verma',
  hospitalName: 'Lakeside Multispecialty Hospital',
  procedure: 'Arthroscopic Knee Surgery',
  submittedAt: '2026-07-20T07:30:00.000Z',

  hospitalEstimate: 420000,
  insurerApproved: 260000,
  gap: 160000,
  claimStatus: 'partial',
  denialReason:
    'Partial approval — waiting period not fully cleared for a pre-existing condition, and one submitted procedure code could not be matched to the stated diagnosis.',

  objectivityReport: {
    summary:
      'Submission has inconsistencies that were flagged before reaching the insurer. Review recommended before treating the approved amount as final.',
    flags: [
      'Treatment code does not match diagnosis entered on the intake form.',
      'Hospital estimate is 61% higher than the median cost for this procedure at in-network facilities.',
    ],
  },

  coverageExplainer: {
    covered: true,
    coverageLimit: 300000,
    waitingPeriodCleared: false,
    exclusionsApplicable: [
      'Pre-existing knee condition (24-month waiting period applies)',
      'Cosmetic or elective add-ons to the procedure',
    ],
    networkStatus: 'in-network',
  },

  loanOffers: [
    {
      lenderName: 'QuickCash Medical Credit',
      apr: 34.99,
      amount: 160000,
      flagged: true,
      flagReason:
        'APR is significantly above market average for medical financing and includes a prepayment penalty.',
    },
    { lenderName: 'Suraksha Health Finance', apr: 10.75, amount: 160000 },
  ],
  recommendedOffer: { lenderName: 'Suraksha Health Finance', apr: 10.75, amount: 160000 },

  timeline: [
    {
      timestamp: '2026-07-20T07:30:00.000Z',
      actor: 'hospital',
      event: 'Case submitted with patient history and cost estimate.',
    },
    {
      timestamp: '2026-07-20T07:32:00.000Z',
      actor: 'system',
      event:
        'Objectivity check flagged 2 issues: mismatched treatment code and above-median cost estimate.',
    },
    {
      timestamp: '2026-07-20T10:05:00.000Z',
      actor: 'insurer',
      event: 'Claim reviewed against policy terms and waiting period.',
    },
    {
      timestamp: '2026-07-20T12:20:00.000Z',
      actor: 'insurer',
      event: 'Claim partially approved — pre-existing condition waiting period not yet cleared.',
    },
    {
      timestamp: '2026-07-20T12:25:00.000Z',
      actor: 'system',
      event: 'Financing options generated to cover the remaining gap.',
    },
    {
      timestamp: '2026-07-20T12:26:00.000Z',
      actor: 'system',
      event: 'One financing offer flagged for predatory APR.',
    },
  ],
};

export function runSeed() {
  store.seedIfMissing(CLEAN_CASE);
  store.seedIfMissing(GOTCHA_CASE);
}
