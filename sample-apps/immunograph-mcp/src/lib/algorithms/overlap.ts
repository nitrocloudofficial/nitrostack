import { assertUnitInterval } from './types.js';
import type { CandidateType } from './types.js';

export interface InclusiveInterval {
  start: number;
  end: number;
}

export interface OverlapCandidate extends InclusiveInterval {
  id: string;
  candidateKey: string;
  proteinHash: string;
  candidateType: CandidateType;
  allele?: string;
  peptide: string;
  length: number;
  passesHardConstraints: boolean;
  preliminaryScore: number;
  completeness: number;
  agreement: number;
}

export interface OverlapRejection {
  candidateId: string;
  retainedCandidateId: string;
  ruleId: 'BIO-OVERLAP-001';
}

export interface OverlapResolutionResult {
  retainedCandidateIds: string[];
  rejections: OverlapRejection[];
}

export interface OverlapPair {
  leftCandidateId: string;
  rightCandidateId: string;
  containmentOverlap: number;
}

export interface OverlapDetectionResult {
  pairs: OverlapPair[];
  components: string[][];
}

function intervalLength(interval: InclusiveInterval): number {
  if (!Number.isInteger(interval.start) || !Number.isInteger(interval.end) || interval.start <= 0) {
    throw new RangeError('Intervals require positive integer coordinates');
  }
  if (interval.end < interval.start) throw new RangeError('Interval end must not precede start');
  return interval.end - interval.start + 1;
}

export function calculateContainmentOverlap(
  left: InclusiveInterval,
  right: InclusiveInterval,
): number {
  const leftLength = intervalLength(left);
  const rightLength = intervalLength(right);
  const intersection = Math.max(
    0,
    Math.min(left.end, right.end) - Math.max(left.start, right.start) + 1,
  );
  return intersection / Math.min(leftLength, rightLength);
}

export function areOverlapCompetitors(left: OverlapCandidate, right: OverlapCandidate): boolean {
  if (left.proteinHash !== right.proteinHash || left.candidateType !== right.candidateType) {
    return false;
  }
  if (left.candidateType === 'BCELL') return true;
  return left.allele === right.allele;
}

function validateCandidate(candidate: OverlapCandidate): void {
  const derivedLength = intervalLength(candidate);
  if (candidate.length !== derivedLength)
    throw new RangeError('Candidate length must match coordinates');
  assertUnitInterval(candidate.preliminaryScore, 'preliminary score');
  assertUnitInterval(candidate.completeness, 'completeness');
  assertUnitInterval(candidate.agreement, 'agreement');
}

function dominanceOrder(left: OverlapCandidate, right: OverlapCandidate): number {
  return (
    Number(right.passesHardConstraints) - Number(left.passesHardConstraints) ||
    right.preliminaryScore - left.preliminaryScore ||
    right.completeness - left.completeness ||
    right.agreement - left.agreement ||
    left.length - right.length ||
    left.start - right.start ||
    left.candidateKey.localeCompare(right.candidateKey) ||
    left.id.localeCompare(right.id)
  );
}

interface OverlapGraph {
  components: OverlapCandidate[][];
  pairs: OverlapPair[];
}

function buildOverlapGraph(
  candidates: readonly OverlapCandidate[],
  threshold: number,
): OverlapGraph {
  assertUnitInterval(threshold, 'overlap threshold');
  candidates.forEach(validateCandidate);
  const ordered = [...candidates].sort((left, right) =>
    left.candidateKey.localeCompare(right.candidateKey),
  );
  const parents = ordered.map((_candidate, index) => index);
  const find = (index: number): number => {
    let root = index;
    while (parents[root] !== root) root = parents[root] ?? root;
    while (parents[index] !== index) {
      const next = parents[index] ?? index;
      parents[index] = root;
      index = next;
    }
    return root;
  };
  const union = (left: number, right: number): void => {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot) parents[rightRoot] = leftRoot;
  };
  const pairs: OverlapPair[] = [];
  for (let leftIndex = 0; leftIndex < ordered.length; leftIndex += 1) {
    const left = ordered[leftIndex];
    if (left === undefined) continue;
    for (let rightIndex = leftIndex + 1; rightIndex < ordered.length; rightIndex += 1) {
      const right = ordered[rightIndex];
      if (right === undefined || !areOverlapCompetitors(left, right)) continue;
      const containmentOverlap = calculateContainmentOverlap(left, right);
      if (containmentOverlap > threshold) {
        union(leftIndex, rightIndex);
        pairs.push({
          leftCandidateId: left.id,
          rightCandidateId: right.id,
          containmentOverlap,
        });
      }
    }
  }
  const componentMap = new Map<number, OverlapCandidate[]>();
  ordered.forEach((candidate, index) => {
    const root = find(index);
    const component = componentMap.get(root);
    if (component === undefined) componentMap.set(root, [candidate]);
    else component.push(candidate);
  });
  return { components: [...componentMap.values()], pairs };
}

export function detectOverlaps(
  candidates: readonly OverlapCandidate[],
  threshold: number,
): OverlapDetectionResult {
  const graph = buildOverlapGraph(candidates, threshold);
  return {
    pairs: graph.pairs,
    components: graph.components.map((component) =>
      component.map((candidate) => candidate.id).sort(),
    ),
  };
}

export function resolveOverlaps(
  candidates: readonly OverlapCandidate[],
  dominanceThreshold: number,
): OverlapResolutionResult {
  const graph = buildOverlapGraph(candidates, dominanceThreshold);

  const retained: OverlapCandidate[] = [];
  const rejections: OverlapRejection[] = [];
  for (const component of graph.components) {
    const ranked = [...component].sort(dominanceOrder);
    const winner = ranked[0];
    if (winner === undefined) continue;
    retained.push(winner);
    for (const rejected of ranked.slice(1)) {
      rejections.push({
        candidateId: rejected.id,
        retainedCandidateId: winner.id,
        ruleId: 'BIO-OVERLAP-001',
      });
    }
  }

  return {
    retainedCandidateIds: retained
      .sort((left, right) => left.candidateKey.localeCompare(right.candidateKey))
      .map((candidate) => candidate.id),
    rejections: rejections.sort((left, right) => left.candidateId.localeCompare(right.candidateId)),
  };
}
