import { assertFiniteNumber } from './types.js';
import type { CandidateType } from './types.js';

export type RuleOutcomeStatus = 'PASS' | 'WARN' | 'FAIL' | 'NOT_EVALUATED';

export interface RuleOutcome {
  ruleId: string;
  ruleVersion: string;
  severity: 'HARD' | 'SOFT';
  outcome: RuleOutcomeStatus;
  evidenceRefs: string[];
  message: string;
}

export interface BindingObservation {
  evidenceRef: string;
  percentileRank: number;
  required: boolean;
}

export interface BaseHardConstraintInput {
  candidateType: CandidateType;
  peptideLength: number;
  allele: string | undefined;
  allowedLengths: Readonly<{ MHCI: readonly number[]; MHCII: readonly number[] }>;
  supportedAlleles: readonly string[];
  requiredEvidenceRefs: readonly string[];
  presentEvidenceRefs: readonly string[];
  bindingObservations: readonly BindingObservation[];
  bindingPercentileRankMaximum: number;
}

export interface HardConstraintResult {
  passesAllHardConstraints: boolean;
  outcomes: RuleOutcome[];
}

const RULE_VERSION = 'mvp-v1.0';

function hardOutcome(
  ruleId: string,
  outcome: Exclude<RuleOutcomeStatus, 'WARN'>,
  evidenceRefs: readonly string[],
  message: string,
): RuleOutcome {
  return {
    ruleId,
    ruleVersion: RULE_VERSION,
    severity: 'HARD',
    outcome,
    evidenceRefs: [...new Set(evidenceRefs)].sort(),
    message,
  };
}

export function evaluateBaseHardConstraints(input: BaseHardConstraintInput): HardConstraintResult {
  if (!Number.isInteger(input.peptideLength) || input.peptideLength <= 0) {
    throw new RangeError('peptideLength must be a positive integer');
  }
  assertFiniteNumber(input.bindingPercentileRankMaximum, 'binding percentile maximum');
  if (input.bindingPercentileRankMaximum <= 0) {
    throw new RangeError('binding percentile maximum must be greater than zero');
  }
  for (const observation of input.bindingObservations) {
    assertFiniteNumber(observation.percentileRank, 'binding percentile rank');
    if (observation.percentileRank < 0) {
      throw new RangeError('binding percentile ranks must be non-negative');
    }
  }

  const isTCell = input.candidateType !== 'BCELL';
  const allowedLengths =
    input.candidateType === 'MHCI'
      ? input.allowedLengths.MHCI
      : input.candidateType === 'MHCII'
        ? input.allowedLengths.MHCII
        : [];
  const lengthPasses = !isTCell || allowedLengths.includes(input.peptideLength);
  const lengthOutcome = hardOutcome(
    'SEQ-LENGTH-001',
    !isTCell ? 'NOT_EVALUATED' : lengthPasses ? 'PASS' : 'FAIL',
    [],
    !isTCell
      ? 'B-cell regions do not use T-cell peptide length rules.'
      : lengthPasses
        ? 'Peptide length is allowed for the candidate track.'
        : 'Peptide length is not allowed for the candidate track.',
  );

  const allelePasses =
    !isTCell || (input.allele !== undefined && new Set(input.supportedAlleles).has(input.allele));
  const alleleOutcome = hardOutcome(
    'HLA-SUPPORTED-001',
    !isTCell ? 'NOT_EVALUATED' : allelePasses ? 'PASS' : 'FAIL',
    [],
    !isTCell
      ? 'B-cell regions do not use HLA allele support rules.'
      : allelePasses
        ? 'Allele is supported by the selected method.'
        : 'Allele is not supported by the selected method.',
  );

  const presentEvidence = new Set(input.presentEvidenceRefs);
  const missingEvidence = [...new Set(input.requiredEvidenceRefs)]
    .filter((reference) => !presentEvidence.has(reference))
    .sort();
  const evidenceOutcome = hardOutcome(
    'EVIDENCE-REQUIRED-001',
    missingEvidence.length === 0 ? 'PASS' : 'FAIL',
    input.presentEvidenceRefs,
    missingEvidence.length === 0
      ? 'All required evidence is present.'
      : `Required evidence is missing: ${missingEvidence.join(', ')}`,
  );

  const requiredBinding = input.bindingObservations.filter((observation) => observation.required);
  const bindingPasses = requiredBinding.some(
    (observation) => observation.percentileRank <= input.bindingPercentileRankMaximum,
  );
  const bindingOutcome = hardOutcome(
    'BINDING-001',
    !isTCell ? 'NOT_EVALUATED' : bindingPasses ? 'PASS' : 'FAIL',
    requiredBinding.map((observation) => observation.evidenceRef),
    !isTCell
      ? 'B-cell regions do not use T-cell binding rules.'
      : bindingPasses
        ? 'At least one required binding observation meets the threshold.'
        : 'No required binding observation meets the threshold.',
  );

  const outcomes = [lengthOutcome, alleleOutcome, evidenceOutcome, bindingOutcome];
  return {
    passesAllHardConstraints: outcomes.every((outcome) => outcome.outcome !== 'FAIL'),
    outcomes,
  };
}
