// Mock policy-terms lookup. Stands in for a real policy-document scan —
// this is what the "Cross-checked — policy terms" stamp on the coverage
// explainer is actually checking against. Deterministic on the insurer
// name and patient history text so demo cases behave consistently.

import type { CoverageExplainer } from '../types';

const WAITING_PERIOD_KEYWORDS = ['pre-existing', 'preexisting', 'chronic', 'diabetes', 'hypertension'];
const EXCLUSION_KEYWORDS: { keyword: string; exclusion: string }[] = [
  { keyword: 'cosmetic', exclusion: 'Cosmetic or elective procedures' },
  { keyword: 'dental', exclusion: 'Dental treatment not arising from accident' },
  { keyword: 'fertility', exclusion: 'Fertility and IVF treatment' },
  { keyword: 'pre-existing', exclusion: 'Pre-existing condition (waiting period applies)' },
  { keyword: 'preexisting', exclusion: 'Pre-existing condition (waiting period applies)' },
];

// A handful of known providers with a coverage limit + network stance.
// Anything unrecognized falls back to a conservative default.
const KNOWN_PROVIDERS: { keyword: string; coverageLimit: number; networkStatus: CoverageExplainer['networkStatus'] }[] = [
  { keyword: 'star health', coverageLimit: 500000, networkStatus: 'in-network' },
  { keyword: 'hdfc ergo', coverageLimit: 400000, networkStatus: 'in-network' },
  { keyword: 'suraksha', coverageLimit: 300000, networkStatus: 'in-network' },
  { keyword: 'niva bupa', coverageLimit: 450000, networkStatus: 'out-of-network' },
];

export function checkAgainstPolicyTerms(
  insuranceProvider: string,
  patientHistory: string
): CoverageExplainer {
  const providerNormalized = insuranceProvider.toLowerCase();
  const historyNormalized = patientHistory.toLowerCase();

  const providerMatch = KNOWN_PROVIDERS.find((p) => providerNormalized.includes(p.keyword));

  const waitingPeriodCleared = !WAITING_PERIOD_KEYWORDS.some((keyword) =>
    historyNormalized.includes(keyword)
  );

  const exclusionsApplicable = EXCLUSION_KEYWORDS.filter((entry) =>
    historyNormalized.includes(entry.keyword)
  ).map((entry) => entry.exclusion);

  return {
    covered: true,
    coverageLimit: providerMatch?.coverageLimit ?? 250000,
    waitingPeriodCleared,
    exclusionsApplicable: [...new Set(exclusionsApplicable)],
    networkStatus: providerMatch?.networkStatus ?? 'unknown',
  };
}
