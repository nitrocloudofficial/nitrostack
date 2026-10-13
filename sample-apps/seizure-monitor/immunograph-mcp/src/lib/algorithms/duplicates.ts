import type { CandidateType } from './types.js';

export interface DuplicateCandidate {
  id: string;
  proteinHash: string;
  candidateType: CandidateType;
  start: number;
  end: number;
  peptide: string;
  allele?: string;
  observationRefs: readonly string[];
}

export interface CanonicalDuplicateCandidate extends Omit<DuplicateCandidate, 'observationRefs'> {
  observationRefs: string[];
}

export interface DuplicateLink {
  duplicateId: string;
  canonicalId: string;
  edgeType: 'DUPLICATE_OF';
  ruleId: 'DUPLICATE-001';
}

export interface DuplicateDetectionResult {
  canonicalCandidates: CanonicalDuplicateCandidate[];
  duplicateLinks: DuplicateLink[];
}

export function candidateIdentity(candidate: DuplicateCandidate): string {
  return JSON.stringify([
    candidate.proteinHash,
    candidate.candidateType,
    candidate.start,
    candidate.end,
    candidate.peptide,
    candidate.allele ?? null,
  ]);
}

export function detectDuplicates(
  candidates: readonly DuplicateCandidate[],
): DuplicateDetectionResult {
  const groups = new Map<string, DuplicateCandidate[]>();
  const ordered = [...candidates].sort(
    (left, right) =>
      candidateIdentity(left).localeCompare(candidateIdentity(right)) ||
      left.id.localeCompare(right.id),
  );
  for (const candidate of ordered) {
    const key = candidateIdentity(candidate);
    const group = groups.get(key);
    if (group === undefined) groups.set(key, [candidate]);
    else group.push(candidate);
  }

  const canonicalCandidates: CanonicalDuplicateCandidate[] = [];
  const duplicateLinks: DuplicateLink[] = [];
  for (const group of groups.values()) {
    const ranked = [...group].sort(
      (left, right) => left.start - right.start || left.id.localeCompare(right.id),
    );
    const canonical = ranked[0];
    if (canonical === undefined) continue;
    canonicalCandidates.push({
      ...canonical,
      observationRefs: [
        ...new Set(ranked.flatMap((candidate) => candidate.observationRefs)),
      ].sort(),
    });
    for (const duplicate of ranked.slice(1)) {
      duplicateLinks.push({
        duplicateId: duplicate.id,
        canonicalId: canonical.id,
        edgeType: 'DUPLICATE_OF',
        ruleId: 'DUPLICATE-001',
      });
    }
  }

  return {
    canonicalCandidates,
    duplicateLinks: duplicateLinks.sort((left, right) =>
      left.duplicateId.localeCompare(right.duplicateId),
    ),
  };
}
