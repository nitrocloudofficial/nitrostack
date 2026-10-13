export const SYNTHETIC_COVERAGE_ALGORITHM = 'DeterministicSyntheticPopulationCoverage';
export const SYNTHETIC_COVERAGE_ALGORITHM_VERSION = '1.0.0';

export interface SyntheticFrequencyRecord {
  allele: string;
  populationId: string;
  value: number;
  sourceKind: 'SYNTHETIC';
  scientificUse: false;
}

export interface SyntheticCoverageInput {
  populationId: string;
  alleles: readonly string[];
  frequencies: readonly SyntheticFrequencyRecord[];
}

export interface SyntheticCoverageResult {
  projectedCoverage: number;
  averageHits: number;
  alleleCarrierProbabilities: Array<{ allele: string; carrierProbability: number }>;
}

const round = (value: number): number => Number(value.toFixed(12));

export function calculateSyntheticCoverage(
  input: SyntheticCoverageInput,
): SyntheticCoverageResult | null {
  const alleles = [...new Set(input.alleles.map((allele) => allele.trim()))].filter(Boolean).sort();
  if (alleles.length === 0) return null;
  const carrierProbabilities: Array<{ allele: string; carrierProbability: number }> = [];
  for (const allele of alleles) {
    const record = input.frequencies.find(
      (frequency) =>
        frequency.allele === allele &&
        frequency.populationId === input.populationId &&
        frequency.sourceKind === 'SYNTHETIC' &&
        frequency.scientificUse === false,
    );
    if (
      record === undefined ||
      !Number.isFinite(record.value) ||
      record.value < 0 ||
      record.value > 1
    ) {
      return null;
    }
    carrierProbabilities.push({
      allele,
      carrierProbability: round(1 - (1 - record.value) ** 2),
    });
  }
  const projectedCoverage = round(
    1 - carrierProbabilities.reduce((missing, item) => missing * (1 - item.carrierProbability), 1),
  );
  return {
    projectedCoverage,
    averageHits: round(
      carrierProbabilities.reduce((sum, item) => sum + item.carrierProbability, 0),
    ),
    alleleCarrierProbabilities: carrierProbabilities,
  };
}
