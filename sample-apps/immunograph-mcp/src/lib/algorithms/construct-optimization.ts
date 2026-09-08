import { calculateContainmentOverlap } from './overlap.js';
import { assertUnitInterval, type CandidateType } from './types.js';

export const FROZEN_CONSENSUS_RANKER_ID = 'immunograph-frozen-consensus-ranker';
export const FROZEN_CONSENSUS_RANKER_VERSION = '1.0.0';
export const CONSTRUCT_OPTIMIZER_ID = 'deterministic-genetic-construct-optimizer';
export const CONSTRUCT_OPTIMIZER_VERSION = '1.0.0';

export type ConfidenceLabel = 'HIGH' | 'MEDIUM' | 'LOW';
export type ManufacturabilityStatus = 'PASS' | 'WARN' | 'FAIL';

export interface FrozenConsensusRankingInput {
  binding: number;
  consensus: number;
  populationCoverage: number;
  completeness: number;
  evidenceAgreement: number;
  redundancyPenalty: number;
}

export interface FrozenConsensusContribution {
  feature: keyof FrozenConsensusRankingInput;
  value: number;
  weight: number;
  contribution: number;
}

export interface FrozenConsensusRankingResult {
  modelId: typeof FROZEN_CONSENSUS_RANKER_ID;
  modelVersion: typeof FROZEN_CONSENSUS_RANKER_VERSION;
  modelType: 'FROZEN_LINEAR_MODEL';
  scientificUse: false;
  priorityScore: number;
  contributions: FrozenConsensusContribution[];
}

export interface EvidenceConfidenceCalibrationInput {
  finalScore: number;
  agreement: number;
  completeness: number;
  evidenceCount: number;
  sourceStatuses: readonly string[];
}

export interface EvidenceConfidenceCalibrationResult {
  label: ConfidenceLabel;
  score: number;
  uncertainty: number;
  calibrationMethod: 'deterministic-evidence-quality-bins';
  scientificUse: false;
  reasons: string[];
}

export interface ConstructCandidate {
  candidateId: string;
  candidateType: CandidateType;
  peptide: string;
  start: number;
  end: number;
  rank: number;
  finalScore: number;
  agreement: number;
  completeness: number;
  category: 'RECOMMENDED' | 'REVIEW' | 'REJECTED';
  populationCoverage: Readonly<Record<string, number>>;
}

export interface ConstructOptimizationInput {
  track: 'MHCI' | 'MHCII';
  candidates: readonly ConstructCandidate[];
  populationWeights: Readonly<Record<string, number>>;
  maximumShortlistSize?: number;
  targetCoverage?: number;
  linker?: string;
  seed?: string;
  generations?: number;
  populationSize?: number;
  maxConstructLength?: number;
}

export interface ConstructOptimizationStep {
  step: number;
  candidateId: string;
  marginalCoverageGain: number;
  cumulativeCoverage: number;
  reasonCode: string;
}

export interface ManufacturabilityScreen {
  status: ManufacturabilityStatus;
  checks: Array<{
    ruleId: string;
    status: ManufacturabilityStatus;
    message: string;
  }>;
}

export interface ConstructOptimizationResult {
  algorithmId: typeof CONSTRUCT_OPTIMIZER_ID;
  algorithmVersion: typeof CONSTRUCT_OPTIMIZER_VERSION;
  selectedCandidateIds: string[];
  steps: ConstructOptimizationStep[];
  constructSequence: string;
  finalCoverage: number;
  coverageByPopulation: Record<string, number>;
  averageCandidateScore: number;
  redundancyPenalty: number;
  objectiveScore: number;
  confidence: EvidenceConfidenceCalibrationResult;
  manufacturability: ManufacturabilityScreen;
  scientificUse: false;
}

const FROZEN_RANKER_WEIGHTS: Record<keyof FrozenConsensusRankingInput, number> = {
  binding: 0.3,
  consensus: 0.2,
  populationCoverage: 0.2,
  completeness: 0.15,
  evidenceAgreement: 0.15,
  redundancyPenalty: -0.9,
};

const DEFAULT_LINKER = 'GPGPG';

export function applyFrozenConsensusRankingModel(
  input: FrozenConsensusRankingInput,
): FrozenConsensusRankingResult {
  const contributions = (
    Object.keys(FROZEN_RANKER_WEIGHTS) as Array<keyof FrozenConsensusRankingInput>
  ).map((feature) => {
    const value = input[feature];
    if (feature === 'redundancyPenalty') assertUnitInterval(value, feature);
    else assertUnitInterval(value, feature);
    const weight = FROZEN_RANKER_WEIGHTS[feature];
    return {
      feature,
      value,
      weight,
      contribution: round(value * weight),
    };
  });
  return {
    modelId: FROZEN_CONSENSUS_RANKER_ID,
    modelVersion: FROZEN_CONSENSUS_RANKER_VERSION,
    modelType: 'FROZEN_LINEAR_MODEL',
    scientificUse: false,
    priorityScore: clamp01(round(contributions.reduce((sum, item) => sum + item.contribution, 0))),
    contributions,
  };
}

export function calibrateEvidenceConfidence(
  input: EvidenceConfidenceCalibrationInput,
): EvidenceConfidenceCalibrationResult {
  assertUnitInterval(input.finalScore, 'final score');
  assertUnitInterval(input.agreement, 'agreement');
  assertUnitInterval(input.completeness, 'completeness');
  if (!Number.isInteger(input.evidenceCount) || input.evidenceCount < 0) {
    throw new RangeError('evidenceCount must be a non-negative integer');
  }
  const hasLive = input.sourceStatuses.includes('LIVE');
  const sourceReliability = hasLive ? 1 : input.sourceStatuses.includes('CACHED') ? 0.85 : 0.7;
  const evidenceDepth = Math.min(1, input.evidenceCount / 3);
  const score = clamp01(
    round(
      input.finalScore * 0.3 +
        input.agreement * 0.25 +
        input.completeness * 0.2 +
        evidenceDepth * 0.15 +
        sourceReliability * 0.1,
    ),
  );
  const reasons: string[] = [];
  if (input.agreement < 0.6) reasons.push('Low predictor/evidence agreement');
  if (input.completeness < 0.75) reasons.push('Incomplete required evidence');
  if (input.evidenceCount < 2) reasons.push('Limited evidence depth');
  if (!hasLive) reasons.push('No live scientific predictor provenance');
  return {
    label:
      input.agreement < 0.5 || input.completeness < 0.5
        ? 'LOW'
        : score >= 0.8 && reasons.length === 0
          ? 'HIGH'
          : score >= 0.6
            ? 'MEDIUM'
            : 'LOW',
    score,
    uncertainty: round(1 - score),
    calibrationMethod: 'deterministic-evidence-quality-bins',
    scientificUse: false,
    reasons,
  };
}

export function optimizeMultiEpitopeConstruct(
  input: ConstructOptimizationInput,
): ConstructOptimizationResult {
  validateOptimizationInput(input);
  const linker = input.linker ?? DEFAULT_LINKER;
  const maximumShortlistSize = input.maximumShortlistSize ?? 8;
  const selectable = input.candidates
    .filter(
      (candidate) => candidate.candidateType === input.track && candidate.category !== 'REJECTED',
    )
    .sort(candidateOrder);
  if (selectable.length === 0 || maximumShortlistSize === 0) {
    return emptyOptimization(input.track, linker, input.populationWeights);
  }

  const rng = seededRng(input.seed ?? stableSeed(input));
  const populationSize = Math.max(8, input.populationSize ?? 24);
  const generations = Math.max(1, input.generations ?? 64);
  let population = initialPopulation(selectable, maximumShortlistSize, populationSize);

  for (let generation = 0; generation < generations; generation += 1) {
    const ranked = rankGenomes(population, selectable, input);
    const survivors = ranked.slice(0, Math.max(2, Math.ceil(populationSize / 3)));
    const next = survivors.map((item) => item.genome);
    while (next.length < populationSize) {
      const left = survivors[Math.floor(rng() * survivors.length)]?.genome ?? survivors[0]!.genome;
      const right =
        survivors[Math.floor(rng() * survivors.length)]?.genome ?? survivors.at(-1)!.genome;
      next.push(
        mutateGenome(crossover(left, right, rng), selectable.length, maximumShortlistSize, rng),
      );
    }
    population = uniqueGenomes(next);
  }

  const best = rankGenomes(population, selectable, input)[0];
  if (best === undefined) return emptyOptimization(input.track, linker, input.populationWeights);
  const selected = best.selected.sort(candidateOrder);
  const coverageByPopulation = calculateSetCoverage(selected, input.populationWeights);
  const steps = buildSelectionSteps(selected, input.populationWeights);
  const constructSequence = selected.map((candidate) => candidate.peptide).join(linker);
  const averageCandidateScore = average(selected.map((candidate) => candidate.finalScore));
  const redundancyPenalty = calculateRedundancyPenalty(selected);
  const confidence = calibrateEvidenceConfidence({
    finalScore: best.objectiveScore,
    agreement: average(selected.map((candidate) => candidate.agreement)),
    completeness: average(selected.map((candidate) => candidate.completeness)),
    evidenceCount: selected.length,
    sourceStatuses: ['SYNTHETIC'],
  });
  return {
    algorithmId: CONSTRUCT_OPTIMIZER_ID,
    algorithmVersion: CONSTRUCT_OPTIMIZER_VERSION,
    selectedCandidateIds: selected.map((candidate) => candidate.candidateId),
    steps,
    constructSequence,
    finalCoverage: weightedCoverage(coverageByPopulation, input.populationWeights),
    coverageByPopulation,
    averageCandidateScore,
    redundancyPenalty,
    objectiveScore: best.objectiveScore,
    confidence,
    manufacturability: screenManufacturability(constructSequence, input.maxConstructLength ?? 500),
    scientificUse: false,
  };
}

function validateOptimizationInput(input: ConstructOptimizationInput): void {
  if (input.maximumShortlistSize !== undefined) {
    if (!Number.isInteger(input.maximumShortlistSize) || input.maximumShortlistSize < 0) {
      throw new RangeError('maximumShortlistSize must be a non-negative integer');
    }
  }
  if (input.targetCoverage !== undefined)
    assertUnitInterval(input.targetCoverage, 'targetCoverage');
  if (input.populationSize !== undefined && input.populationSize <= 0) {
    throw new RangeError('populationSize must be positive');
  }
  if (input.generations !== undefined && input.generations <= 0) {
    throw new RangeError('generations must be positive');
  }
  for (const candidate of input.candidates) {
    assertUnitInterval(candidate.finalScore, 'candidate finalScore');
    assertUnitInterval(candidate.agreement, 'candidate agreement');
    assertUnitInterval(candidate.completeness, 'candidate completeness');
    if (candidate.end < candidate.start)
      throw new RangeError('candidate end must not precede start');
    for (const coverage of Object.values(candidate.populationCoverage)) {
      assertUnitInterval(coverage, 'candidate population coverage');
    }
  }
  const populationWeightValues = Object.values(input.populationWeights);
  for (const weight of populationWeightValues) {
    if (!Number.isFinite(weight) || weight < 0)
      throw new RangeError('population weights must be non-negative');
  }
}

function initialPopulation(
  candidates: readonly ConstructCandidate[],
  maximumShortlistSize: number,
  populationSize: number,
): number[][] {
  const genomes: number[][] = [[]];
  genomes.push(candidates.slice(0, maximumShortlistSize).map((_candidate, index) => index));
  genomes.push(greedyByCoverage(candidates, maximumShortlistSize));
  genomes.push(greedyByScore(candidates, maximumShortlistSize));
  for (let start = 0; genomes.length < populationSize && start < candidates.length; start += 1) {
    genomes.push(
      Array.from({ length: maximumShortlistSize }, (_value, offset) => start + offset).filter(
        (index) => index < candidates.length,
      ),
    );
  }
  return uniqueGenomes(genomes);
}

function greedyByCoverage(
  candidates: readonly ConstructCandidate[],
  maximumShortlistSize: number,
): number[] {
  const selected: number[] = [];
  const populationWeights = equalPopulationWeights(candidates);
  let before = 0;
  while (selected.length < maximumShortlistSize && selected.length < candidates.length) {
    let bestIndex = -1;
    let bestGain = -1;
    for (let index = 0; index < candidates.length; index += 1) {
      if (selected.includes(index)) continue;
      const after = weightedCoverageForSelection(
        [...selected, index].map((selectedIndex) => candidates[selectedIndex]!),
        populationWeights,
      );
      const gain = after - before;
      if (gain > bestGain) {
        bestGain = gain;
        bestIndex = index;
      }
    }
    if (bestIndex < 0 || bestGain <= 0) break;
    selected.push(bestIndex);
    before += bestGain;
  }
  return selected;
}

function greedyByScore(
  candidates: readonly ConstructCandidate[],
  maximumShortlistSize: number,
): number[] {
  return candidates
    .map((candidate, index) => ({ candidate, index }))
    .sort(
      (left, right) =>
        right.candidate.finalScore - left.candidate.finalScore || left.index - right.index,
    )
    .slice(0, maximumShortlistSize)
    .map(({ index }) => index);
}

function rankGenomes(
  genomes: readonly number[][],
  candidates: readonly ConstructCandidate[],
  input: ConstructOptimizationInput,
) {
  return uniqueGenomes(genomes)
    .map((genome) => {
      const normalizedGenome = [...new Set(genome)]
        .filter((index) => index >= 0 && index < candidates.length)
        .sort((left, right) => left - right);
      const selected = normalizedGenome.map((index) => candidates[index]!).sort(candidateOrder);
      return {
        genome: normalizedGenome,
        selected,
        objectiveScore: scoreSelection(selected, input),
      };
    })
    .sort(
      (left, right) =>
        right.objectiveScore - left.objectiveScore ||
        right.selected.length - left.selected.length ||
        left.selected
          .map((candidate) => candidate.candidateId)
          .join('|')
          .localeCompare(right.selected.map((candidate) => candidate.candidateId).join('|')),
    );
}

function scoreSelection(
  selected: readonly ConstructCandidate[],
  input: ConstructOptimizationInput,
): number {
  if (selected.length === 0) return 0;
  const coverage = weightedCoverageForSelection(selected, input.populationWeights);
  const averageScore = average(selected.map((candidate) => candidate.finalScore));
  const rankPriority = average(selected.map((candidate) => 1 / candidate.rank));
  const redundancyPenalty = calculateRedundancyPenalty(selected);
  const targetBonus =
    input.targetCoverage === undefined || coverage < input.targetCoverage ? 0 : 0.03;
  return clamp01(
    round(
      coverage * 0.55 +
        averageScore * 0.25 +
        rankPriority * 0.15 +
        targetBonus -
        redundancyPenalty * 0.45,
    ),
  );
}

function weightedCoverageForSelection(
  selected: readonly ConstructCandidate[],
  populationWeights: Readonly<Record<string, number>>,
): number {
  if (selected.length === 0) return 0;
  const weightedPopulations = Object.entries(populationWeights);
  if (weightedPopulations.length > 0) {
    const totalWeight = weightedPopulations.reduce((sum, [, weight]) => sum + weight, 0);
    if (totalWeight > 0) {
      return round(
        weightedPopulations.reduce((sum, [populationId, weight]) => {
          const missProbability = selected.reduce(
            (missing, candidate) =>
              missing * (1 - (candidate.populationCoverage[populationId] ?? 0)),
            1,
          );
          return sum + (1 - missProbability) * weight;
        }, 0) / totalWeight,
      );
    }
  }
  return weightedCoverage(calculateSetCoverage(selected, populationWeights), populationWeights);
}

function crossover(left: readonly number[], right: readonly number[], rng: () => number): number[] {
  const combined = [...new Set([...left.slice(0, Math.ceil(left.length * rng())), ...right])];
  return combined.sort((a, b) => a - b);
}

function mutateGenome(
  genome: readonly number[],
  candidateCount: number,
  maximumShortlistSize: number,
  rng: () => number,
): number[] {
  const next = new Set(genome);
  if (rng() < 0.55 && next.size > 0) {
    const values = [...next];
    next.delete(values[Math.floor(rng() * values.length)]!);
  }
  if (rng() < 0.85 && next.size < maximumShortlistSize && candidateCount > 0) {
    next.add(Math.floor(rng() * candidateCount));
  }
  return [...next].slice(0, maximumShortlistSize).sort((a, b) => a - b);
}

function uniqueGenomes(genomes: readonly number[][]): number[][] {
  const seen = new Set<string>();
  const unique: number[][] = [];
  for (const genome of genomes) {
    const normalized = [...new Set(genome)].sort((a, b) => a - b);
    const key = normalized.join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(normalized);
  }
  return unique;
}

function buildSelectionSteps(
  selected: readonly ConstructCandidate[],
  populationWeights: Readonly<Record<string, number>>,
): ConstructOptimizationStep[] {
  const steps: ConstructOptimizationStep[] = [];
  let previousCoverage: Record<string, number> = {};
  for (const [index, candidate] of selected.entries()) {
    const currentCoverage = calculateSetCoverage(selected.slice(0, index + 1), populationWeights);
    const previous = weightedCoverage(previousCoverage, populationWeights);
    const current = weightedCoverage(currentCoverage, populationWeights);
    steps.push({
      step: index + 1,
      candidateId: candidate.candidateId,
      marginalCoverageGain: clamp01(round(current - previous)),
      cumulativeCoverage: current,
      reasonCode: index === 0 ? 'GA_SEED_COVERAGE_ANCHOR' : 'GA_COVERAGE_REDUNDANCY_TRADEOFF',
    });
    previousCoverage = currentCoverage;
  }
  return steps;
}

function calculateSetCoverage(
  selected: readonly ConstructCandidate[],
  populationWeights: Readonly<Record<string, number>>,
): Record<string, number> {
  const populationIds = new Set([
    ...Object.keys(populationWeights),
    ...selected.flatMap((candidate) => Object.keys(candidate.populationCoverage)),
  ]);
  return Object.fromEntries(
    [...populationIds]
      .sort()
      .map((populationId) => [
        populationId,
        round(
          1 -
            selected.reduce(
              (missProbability, candidate) =>
                missProbability * (1 - (candidate.populationCoverage[populationId] ?? 0)),
              1,
            ),
        ),
      ]),
  );
}

function weightedCoverage(
  coverageByPopulation: Readonly<Record<string, number>>,
  populationWeights: Readonly<Record<string, number>>,
): number {
  const entries = Object.entries(coverageByPopulation);
  if (entries.length === 0) return 0;
  const totalWeight = Object.values(populationWeights).reduce((sum, weight) => sum + weight, 0);
  if (totalWeight <= 0) return average(entries.map(([, coverage]) => coverage));
  return round(
    entries.reduce(
      (sum, [populationId, coverage]) => sum + coverage * (populationWeights[populationId] ?? 0),
      0,
    ) / totalWeight,
  );
}

function calculateRedundancyPenalty(selected: readonly ConstructCandidate[]): number {
  if (selected.length < 2) return 0;
  let penalty = 0;
  let comparisons = 0;
  for (let left = 0; left < selected.length; left += 1) {
    for (let right = left + 1; right < selected.length; right += 1) {
      const leftCandidate = selected[left]!;
      const rightCandidate = selected[right]!;
      comparisons += 1;
      if (leftCandidate.peptide === rightCandidate.peptide) penalty += 1;
      else penalty += calculateContainmentOverlap(leftCandidate, rightCandidate) * 0.5;
    }
  }
  return clamp01(round(penalty / comparisons));
}

function screenManufacturability(
  constructSequence: string,
  maxConstructLength: number,
): ManufacturabilityScreen {
  const checks = [
    {
      ruleId: 'MFG-LENGTH-001',
      status:
        constructSequence.length === 0
          ? ('WARN' as const)
          : constructSequence.length <= maxConstructLength
            ? ('PASS' as const)
            : ('FAIL' as const),
      message:
        constructSequence.length === 0
          ? 'No construct sequence was produced.'
          : `Construct length ${constructSequence.length}/${maxConstructLength}.`,
    },
    {
      ruleId: 'MFG-HOMOPOLYMER-001',
      status: /(.)\1{5,}/.test(constructSequence) ? ('WARN' as const) : ('PASS' as const),
      message: 'Flags long repeated amino-acid runs for review.',
    },
    {
      ruleId: 'MFG-GLYCOSYLATION-MOTIF-001',
      status: /N[^P][ST]/.test(constructSequence) ? ('WARN' as const) : ('PASS' as const),
      message: 'Flags N-linked glycosylation motif patterns for review.',
    },
  ];
  return {
    status: checks.some((check) => check.status === 'FAIL')
      ? 'FAIL'
      : checks.some((check) => check.status === 'WARN')
        ? 'WARN'
        : 'PASS',
    checks,
  };
}

function emptyOptimization(
  _track: 'MHCI' | 'MHCII',
  _linker: string,
  populationWeights: Readonly<Record<string, number>>,
): ConstructOptimizationResult {
  return {
    algorithmId: CONSTRUCT_OPTIMIZER_ID,
    algorithmVersion: CONSTRUCT_OPTIMIZER_VERSION,
    selectedCandidateIds: [],
    steps: [],
    constructSequence: '',
    finalCoverage: 0,
    coverageByPopulation: Object.fromEntries(Object.keys(populationWeights).map((id) => [id, 0])),
    averageCandidateScore: 0,
    redundancyPenalty: 0,
    objectiveScore: 0,
    confidence: calibrateEvidenceConfidence({
      finalScore: 0,
      agreement: 0,
      completeness: 0,
      evidenceCount: 0,
      sourceStatuses: ['SYNTHETIC'],
    }),
    manufacturability: screenManufacturability('', 500),
    scientificUse: false,
  };
}

function candidateOrder(left: ConstructCandidate, right: ConstructCandidate): number {
  return (
    left.rank - right.rank ||
    left.start - right.start ||
    left.candidateId.localeCompare(right.candidateId)
  );
}

function equalPopulationWeights(candidates: readonly ConstructCandidate[]): Record<string, number> {
  const ids = new Set(candidates.flatMap((candidate) => Object.keys(candidate.populationCoverage)));
  return Object.fromEntries([...ids].map((id) => [id, 1]));
}

function stableSeed(input: ConstructOptimizationInput): string {
  return [
    input.track,
    input.maximumShortlistSize ?? 8,
    input.targetCoverage ?? 'none',
    input.candidates.map((candidate) => candidate.candidateId).join('|'),
  ].join(':');
}

function seededRng(seed: string): () => number {
  let state = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    state ^= seed.charCodeAt(index);
    state = Math.imul(state, 16777619);
  }
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function average(values: readonly number[]): number {
  return values.length === 0
    ? 0
    : round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function round(value: number): number {
  return Number(value.toFixed(12));
}
