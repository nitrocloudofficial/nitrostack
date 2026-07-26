import type { CandidateType } from './types.js';

export interface EvidenceGroupingKey {
  proteinHash: string;
  candidateType: CandidateType;
  start: number;
  end: number;
  sequence: string;
  allele?: string | null;
  targetSemantics: string;
}

export interface EvidenceCompatibility {
  compatible: boolean;
  mismatchedFields: Array<keyof EvidenceGroupingKey>;
}

const groupingFields: ReadonlyArray<keyof EvidenceGroupingKey> = [
  'proteinHash',
  'candidateType',
  'start',
  'end',
  'sequence',
  'allele',
  'targetSemantics',
];

export function checkEvidenceCompatibility(
  left: EvidenceGroupingKey,
  right: EvidenceGroupingKey,
): EvidenceCompatibility {
  const mismatchedFields = groupingFields.filter((field) => {
    const leftValue = field === 'allele' ? (left[field] ?? null) : left[field];
    const rightValue = field === 'allele' ? (right[field] ?? null) : right[field];
    return leftValue !== rightValue;
  });

  if (
    (left.candidateType === 'BCELL' || right.candidateType === 'BCELL') &&
    left.candidateType !== right.candidateType &&
    !mismatchedFields.includes('candidateType')
  ) {
    mismatchedFields.push('candidateType');
  }

  return { compatible: mismatchedFields.length === 0, mismatchedFields };
}

export function assertCompatibleEvidence(observations: readonly EvidenceGroupingKey[]): void {
  const reference = observations[0];
  if (!reference) return;
  for (const observation of observations.slice(1)) {
    const result = checkEvidenceCompatibility(reference, observation);
    if (!result.compatible) {
      throw new RangeError(`Incompatible evidence: ${result.mismatchedFields.join(', ')}`);
    }
  }
}
