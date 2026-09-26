import type { RuleOutcome } from './constraints.js';
import { assertUnitInterval } from './types.js';
import type { CandidateType } from './types.js';

export type DecisionCategory = 'RECOMMENDED' | 'REVIEW' | 'REJECTED';
export type EvidenceConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'NOT_APPLICABLE';

export interface ConfidenceInput {
  category: DecisionCategory;
  completeness: number;
  agreement: number;
  ruleOutcomes: readonly RuleOutcome[];
}

export function calculateConfidence(input: ConfidenceInput): EvidenceConfidence {
  assertUnitInterval(input.completeness, 'completeness');
  assertUnitInterval(input.agreement, 'agreement');
  if (input.category === 'REJECTED') return 'NOT_APPLICABLE';

  const hardFailure = input.ruleOutcomes.some(
    (outcome) => outcome.severity === 'HARD' && outcome.outcome === 'FAIL',
  );
  const disqualifyingSoftWarning = input.ruleOutcomes.some(
    (outcome) =>
      outcome.severity === 'SOFT' &&
      outcome.outcome === 'WARN' &&
      outcome.ruleId !== 'FIXTURE-PROVENANCE-001',
  );
  if (
    input.completeness === 1 &&
    input.agreement >= 0.8 &&
    !hardFailure &&
    !disqualifyingSoftWarning
  ) {
    return 'HIGH';
  }
  if (input.completeness >= 0.75 && input.agreement >= 0.6 && !hardFailure) return 'MEDIUM';
  return 'LOW';
}

export interface FinalRankingCandidate {
  candidateId: string;
  candidateKey: string;
  candidateType: CandidateType;
  finalScore: number;
  agreement: number;
  completeness: number;
  start: number;
  blockingReviewCondition: boolean;
  ruleOutcomes: readonly RuleOutcome[];
}

export interface RankingThresholds {
  recommendedMinimum: number;
  reviewMinimum: number;
}

export interface RankedCandidate extends FinalRankingCandidate {
  category: DecisionCategory;
  confidence: EvidenceConfidence;
  trackRank: number;
  categoryRank: number;
}

export const DEFAULT_RANKING_THRESHOLDS: RankingThresholds = {
  recommendedMinimum: 0.75,
  reviewMinimum: 0.5,
};

const CATEGORY_ORDER: Record<DecisionCategory, number> = {
  RECOMMENDED: 0,
  REVIEW: 1,
  REJECTED: 2,
};

function categorize(
  candidate: FinalRankingCandidate,
  thresholds: RankingThresholds,
): DecisionCategory {
  const hardFailure = candidate.ruleOutcomes.some(
    (outcome) => outcome.severity === 'HARD' && outcome.outcome === 'FAIL',
  );
  if (hardFailure) return 'REJECTED';
  if (candidate.finalScore >= thresholds.recommendedMinimum) {
    return candidate.blockingReviewCondition ? 'REVIEW' : 'RECOMMENDED';
  }
  return candidate.finalScore >= thresholds.reviewMinimum ? 'REVIEW' : 'REJECTED';
}

export function rankCandidates(
  candidates: readonly FinalRankingCandidate[],
  thresholds: RankingThresholds = DEFAULT_RANKING_THRESHOLDS,
): RankedCandidate[] {
  assertUnitInterval(thresholds.recommendedMinimum, 'recommended threshold');
  assertUnitInterval(thresholds.reviewMinimum, 'review threshold');
  if (thresholds.reviewMinimum > thresholds.recommendedMinimum) {
    throw new RangeError('review threshold must not exceed recommended threshold');
  }
  const tracks = new Set(candidates.map((candidate) => candidate.candidateType));
  if (tracks.size > 1) throw new Error('Candidates must belong to one track');
  for (const candidate of candidates) {
    assertUnitInterval(candidate.finalScore, 'final score');
    assertUnitInterval(candidate.agreement, 'agreement');
    assertUnitInterval(candidate.completeness, 'completeness');
    if (!Number.isInteger(candidate.start) || candidate.start <= 0) {
      throw new RangeError('candidate start must be a positive integer');
    }
  }

  const categorized = candidates.map((candidate) => ({
    ...candidate,
    category: categorize(candidate, thresholds),
  }));
  categorized.sort(
    (left, right) =>
      CATEGORY_ORDER[left.category] - CATEGORY_ORDER[right.category] ||
      right.finalScore - left.finalScore ||
      right.agreement - left.agreement ||
      right.completeness - left.completeness ||
      left.start - right.start ||
      left.candidateKey.localeCompare(right.candidateKey) ||
      left.candidateId.localeCompare(right.candidateId),
  );

  const categoryCounts: Record<DecisionCategory, number> = {
    RECOMMENDED: 0,
    REVIEW: 0,
    REJECTED: 0,
  };
  return categorized.map((candidate, index) => {
    categoryCounts[candidate.category] += 1;
    return {
      ...candidate,
      confidence: calculateConfidence({
        category: candidate.category,
        completeness: candidate.completeness,
        agreement: candidate.agreement,
        ruleOutcomes: candidate.ruleOutcomes,
      }),
      trackRank: index + 1,
      categoryRank: categoryCounts[candidate.category],
    };
  });
}
