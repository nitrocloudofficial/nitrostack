import { assertUnitInterval } from './types.js';

export type ExplanationAudience = 'RESEARCHER' | 'JUDGE';
export type ExplanationCategory = 'RECOMMENDED' | 'REVIEW' | 'REJECTED';
export type ExplanationRuleStatus = 'PASS' | 'WARN' | 'FAIL' | 'NOT_EVALUATED';
export type ExplanationProvenanceStatus = 'LIVE' | 'CACHED' | 'SYNTHETIC' | 'FIXTURE' | 'FAILED';

export interface CandidateExplanationInput {
  audience: ExplanationAudience;
  candidateKey: string;
  category: ExplanationCategory;
  trackRank: number;
  finalScore: number;
  componentScores: Readonly<Record<string, number>>;
  ruleOutcomes: readonly { ruleId: string; outcome: ExplanationRuleStatus }[];
  provenanceStatuses: readonly ExplanationProvenanceStatus[];
}

export interface CandidateExplanationResult {
  text: string;
  strongestComponent: { name: string; value: number } | null;
  warningRuleIds: string[];
  failedRuleIds: string[];
  provenanceSummary: Partial<Record<ExplanationProvenanceStatus, number>>;
  disclaimer: string;
}

const DISCLAIMER =
  'This result is computational decision support and requires qualified scientific review.';
const SYNTHETIC_DISCLAIMER =
  'Offline synthetic demonstration values are not validated biological predictions and have scientificUse = false.';

export function explainCandidate(input: CandidateExplanationInput): CandidateExplanationResult {
  assertUnitInterval(input.finalScore, 'final score');
  if (!Number.isInteger(input.trackRank) || input.trackRank <= 0) {
    throw new RangeError('trackRank must be a positive integer');
  }
  const components = Object.entries(input.componentScores);
  components.forEach(([name, value]) => assertUnitInterval(value, `component ${name}`));
  components.sort(
    ([leftName, leftValue], [rightName, rightValue]) =>
      rightValue - leftValue || leftName.localeCompare(rightName),
  );
  const strongest = components[0];
  const strongestComponent =
    strongest === undefined ? null : { name: strongest[0], value: strongest[1] };
  const warningRuleIds = input.ruleOutcomes
    .filter((outcome) => outcome.outcome === 'WARN')
    .map((outcome) => outcome.ruleId)
    .sort();
  const failedRuleIds = input.ruleOutcomes
    .filter((outcome) => outcome.outcome === 'FAIL')
    .map((outcome) => outcome.ruleId)
    .sort();
  const provenanceSummary: Partial<Record<ExplanationProvenanceStatus, number>> = {};
  for (const status of [...input.provenanceStatuses].sort()) {
    provenanceSummary[status] = (provenanceSummary[status] ?? 0) + 1;
  }
  const support = strongestComponent
    ? `Strongest component: ${strongestComponent.name} (${strongestComponent.value}).`
    : 'No score components were supplied.';
  const warnings = warningRuleIds.length > 0 ? ` Warnings: ${warningRuleIds.join(', ')}.` : '';
  const failures = failedRuleIds.length > 0 ? ` Failed rules: ${failedRuleIds.join(', ')}.` : '';
  const disclaimer = input.provenanceStatuses.includes('SYNTHETIC')
    ? `${SYNTHETIC_DISCLAIMER} ${DISCLAIMER}`
    : DISCLAIMER;
  return {
    text: `${input.candidateKey} is ${input.category} at track rank ${input.trackRank} with score ${input.finalScore}. ${support}${warnings}${failures} ${disclaimer}`,
    strongestComponent,
    warningRuleIds,
    failedRuleIds,
    provenanceSummary,
    disclaimer,
  };
}
