import { canonicalJsonSha256 } from './canonical-json.js';
import type { GeneratedPeptide } from './peptides.js';

export const SYNTHETIC_BINDING_ALGORITHM = 'DeterministicSyntheticBindingPredictor';
export const SYNTHETIC_BINDING_ALGORITHM_VERSION = '1.0.0';

export interface SyntheticBindingPredictionInput {
  proteinHash: string;
  candidateType: 'MHCI' | 'MHCII';
  candidates: readonly GeneratedPeptide[];
  alleles: readonly string[];
  method: string;
  methodVersion: string;
  datasetVersion: string;
}

export interface SyntheticBindingObservation {
  observationId: string;
  candidateRef: string;
  candidateType: 'MHCI' | 'MHCII';
  peptide: string;
  start: number;
  end: number;
  length: number;
  allele: string;
  method: string;
  methodVersion: string;
  rawScore: number;
  percentileRank: number;
  normalizedScore: number;
}

const unitSeed = (hash: string): number =>
  Number.parseInt(hash.slice(0, 13), 16) / Number.parseInt('fffffffffffff', 16);

const round = (value: number): number => Number(value.toFixed(12));

export function predictSyntheticBinding(
  input: SyntheticBindingPredictionInput,
): SyntheticBindingObservation[] {
  if (!/^[a-f0-9]{64}$/.test(input.proteinHash)) throw new Error('proteinHash must be SHA-256');
  if (input.candidates.some(({ candidateType }) => candidateType !== input.candidateType)) {
    throw new Error('Synthetic prediction candidates must belong to one requested track');
  }
  const alleles = [...new Set(input.alleles.map((allele) => allele.trim()))].filter(Boolean).sort();
  if (alleles.length === 0) throw new Error('Synthetic prediction requires at least one allele');

  const observations: Array<
    Omit<SyntheticBindingObservation, 'percentileRank' | 'normalizedScore'> & { seed: string }
  > = [];
  for (const allele of alleles) {
    for (const candidate of input.candidates) {
      const identity = {
        proteinHash: input.proteinHash,
        candidateType: input.candidateType,
        start: candidate.start,
        end: candidate.end,
        peptide: candidate.peptide,
        allele,
      } as const;
      const seed = canonicalJsonSha256({
        ...identity,
        method: input.method,
        methodVersion: input.methodVersion,
        datasetVersion: input.datasetVersion,
        algorithm: SYNTHETIC_BINDING_ALGORITHM,
        algorithmVersion: SYNTHETIC_BINDING_ALGORITHM_VERSION,
      });
      const candidateRef = canonicalJsonSha256(identity);
      observations.push({
        observationId: canonicalJsonSha256({ candidateRef, seed }),
        candidateRef,
        candidateType: input.candidateType,
        peptide: candidate.peptide,
        start: candidate.start,
        end: candidate.end,
        length: candidate.length,
        allele,
        method: input.method,
        methodVersion: input.methodVersion,
        rawScore: round(unitSeed(seed)),
        seed,
      });
    }
  }

  const ranked: SyntheticBindingObservation[] = [];
  for (const allele of alleles) {
    const group = observations
      .filter((observation) => observation.allele === allele)
      .sort(
        (left, right) =>
          right.rawScore - left.rawScore ||
          left.start - right.start ||
          left.length - right.length ||
          left.candidateRef.localeCompare(right.candidateRef),
      );
    group.forEach((observationWithSeed, index) => {
      const { seed, ...observation } = observationWithSeed;
      void seed;
      const percentileRank = round(((index + 0.5) / group.length) * 100);
      ranked.push({
        ...observation,
        percentileRank,
        normalizedScore: round(1 - percentileRank / 100),
      });
    });
  }
  return ranked.sort(
    (left, right) =>
      left.candidateType.localeCompare(right.candidateType) ||
      left.start - right.start ||
      left.length - right.length ||
      left.allele.localeCompare(right.allele) ||
      left.candidateRef.localeCompare(right.candidateRef),
  );
}
