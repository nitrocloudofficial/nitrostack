import { clamp01 } from './normalization.js';
import { assertUnitInterval } from './types.js';

export const MVP_TCELL_WEIGHTS = {
  binding: 0.4,
  consensus: 0.3,
  populationCoverage: 0.2,
  completeness: 0.1,
} as const;

export const MVP_BCELL_WEIGHTS = {
  graphBepi: 0.9,
  completeness: 0.1,
} as const;

export interface TCellScoringWeights {
  binding: number;
  consensus: number;
  populationCoverage: number;
  completeness: number;
}

export interface BCellScoringWeights {
  graphBepi: number;
  completeness: number;
}

interface PenaltyInput {
  missingOptionalWeightFraction: number;
  softWarningCount: number;
}

export interface TCellPreliminaryScoreInput extends PenaltyInput {
  track: 'TCELL';
  bindingQuality: number;
  consensusQuality: number;
  candidateCoverage: number;
  completeness: number;
  weights?: TCellScoringWeights;
}

export interface BCellPreliminaryScoreInput extends PenaltyInput {
  track: 'BCELL';
  predictorMean: number;
  completeness: number;
  weights?: BCellScoringWeights;
}

export type PreliminaryScoreInput = TCellPreliminaryScoreInput | BCellPreliminaryScoreInput;

export interface PreliminaryScoreResult {
  scoreBeforePenalty: number;
  missingEvidencePenalty: number;
  softWarningPenalty: number;
  fixturePenalty: 0;
  score: number;
}

export function calculatePreliminaryScore(input: PreliminaryScoreInput): PreliminaryScoreResult {
  assertUnitInterval(input.completeness, 'completeness');
  assertUnitInterval(input.missingOptionalWeightFraction, 'missing optional weight fraction');
  if (!Number.isInteger(input.softWarningCount) || input.softWarningCount < 0) {
    throw new RangeError('softWarningCount must be a non-negative integer');
  }

  let scoreBeforePenalty: number;
  if (input.track === 'TCELL') {
    assertUnitInterval(input.bindingQuality, 'binding quality');
    assertUnitInterval(input.consensusQuality, 'consensus quality');
    assertUnitInterval(input.candidateCoverage, 'candidate coverage');
    const weights = input.weights ?? MVP_TCELL_WEIGHTS;
    validateWeights(Object.values(weights));
    scoreBeforePenalty =
      weights.binding * input.bindingQuality +
      weights.consensus * input.consensusQuality +
      weights.populationCoverage * input.candidateCoverage +
      weights.completeness * input.completeness;
  } else {
    assertUnitInterval(input.predictorMean, 'GraphBepi predictor mean');
    const weights = input.weights ?? MVP_BCELL_WEIGHTS;
    validateWeights(Object.values(weights));
    scoreBeforePenalty =
      weights.graphBepi * input.predictorMean + weights.completeness * input.completeness;
  }

  const missingEvidencePenalty = 0.1 * input.missingOptionalWeightFraction;
  const softWarningPenalty = Math.min(0.2, 0.05 * input.softWarningCount);
  const fixturePenalty = 0 as const;
  return {
    scoreBeforePenalty,
    missingEvidencePenalty,
    softWarningPenalty,
    fixturePenalty,
    score: clamp01(
      scoreBeforePenalty - missingEvidencePenalty - softWarningPenalty - fixturePenalty,
    ),
  };
}

function validateWeights(weights: readonly number[]): void {
  for (const weight of weights) assertUnitInterval(weight, 'ranking weight');
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (Math.abs(total - 1) > 1e-12) throw new RangeError('Ranking weights must sum to 1');
}
