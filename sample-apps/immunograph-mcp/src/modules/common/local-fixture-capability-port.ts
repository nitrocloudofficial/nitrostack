import {
  computeProfileHash,
  loadFixtureRegistry,
  matchFixture,
  type LoadedFixtureCase,
  type LoadedFixtureRegistry,
} from '../../lib/database/mcp.js';

import type { CapabilityPort } from './capability-port.js';
import { ToolExecutionError } from './executor.js';

const FIXTURE_POLICIES = new Set([
  'CACHE_THEN_LIVE_THEN_FIXTURE',
  'LIVE_THEN_CACHE_THEN_FIXTURE',
  'FIXTURE_ONLY',
]);

export class FixtureCapabilityError extends ToolExecutionError {
  constructor(code: string, message: string) {
    super(code, 'SCIENTIFIC', message, false);
    this.name = 'FixtureCapabilityError';
  }
}

interface PredictorInput {
  proteinRef: string;
  alleles?: string[];
  peptideLengths?: number[];
  methods: string[];
  parameters?: Record<string, unknown>;
  fallbackPolicy: string;
}

interface PopulationCoverageInput {
  associations: Array<{ candidateId: string; peptide?: string; allele: string }>;
  populationIds: string[];
  classMode: 'CLASS_I' | 'CLASS_II' | 'COMBINED';
  fallbackPolicy: string;
}

const equalStrings = (left: readonly string[], right: readonly string[]) =>
  [...left]
    .map((item) => item.toLowerCase())
    .sort()
    .join('|') ===
  [...right]
    .map((item) => item.toLowerCase())
    .sort()
    .join('|');

const equalNumbers = (left: readonly number[], right: readonly number[]) =>
  [...left].sort((a, b) => a - b).join('|') === [...right].sort((a, b) => a - b).join('|');

function connectorProvenance(
  fixture: LoadedFixtureCase,
  method: string,
  methodVersion: string,
  sourceUri: string,
) {
  return {
    connectorId: 'immunograph-synthetic-fixtures',
    connectorVersion: 'mvp-v1.0',
    method,
    methodVersion,
    status: 'FIXTURE' as const,
    sourceUri,
    fixtureId: fixture.fixtureId,
    parameters: { sourceKind: 'SYNTHETIC', scientificUse: false },
  };
}

export class LocalFixtureCapabilityPort implements CapabilityPort {
  constructor(private readonly registry: Promise<LoadedFixtureRegistry> = loadFixtureRegistry()) {}

  async invoke(capability: string, input: unknown): Promise<unknown> {
    switch (capability) {
      case 'predict_mhci':
        return this.predict(input as PredictorInput, 'MHCI');
      case 'predict_mhcii':
        return this.predict(input as PredictorInput, 'MHCII');
      case 'predict_bcell_fixture':
        return this.predictBcell(input as PredictorInput);
      case 'calculate_population_coverage':
        return this.populationCoverage(input as PopulationCoverageInput);
      case 'optimize_shortlist_coverage':
        return this.optimizeCoverage(input as { eligibleCandidateIds: string[] });
      default:
        throw new FixtureCapabilityError(
          'DEPENDENCY_UNAVAILABLE',
          `Capability ${capability} has no local fixture implementation.`,
        );
    }
  }

  private requireFixturePolicy(policy: string): void {
    if (!FIXTURE_POLICIES.has(policy)) {
      throw new FixtureCapabilityError(
        'DEPENDENCY_UNAVAILABLE',
        'No live or cached predictor capability is configured and fixture use is not permitted.',
      );
    }
  }

  private async predict(input: PredictorInput, track: 'MHCI' | 'MHCII') {
    this.requireFixturePolicy(input.fallbackPolicy);
    const registry = await this.registry;
    const fixture = this.findPredictionFixture(registry, input, track);
    const observations = fixture.expectedCandidates.observations
      .filter(
        (observation) =>
          observation.candidateType === track &&
          input.methods.some((method) => method.toLowerCase() === observation.method.toLowerCase()),
      )
      .map((observation) => ({
        observationId: observation.observationId,
        candidateRef: observation.candidateRef,
        candidateType: observation.candidateType,
        peptide: observation.peptide,
        start: observation.start,
        end: observation.end,
        length: observation.length,
        method: observation.method,
        methodVersion: observation.methodVersion,
        rawScore: observation.rawScore,
        percentileRank: observation.percentileRank,
        allele: observation.allele,
        rawFields: observation.rawFields,
      }));
    if (observations.length === 0) {
      throw new FixtureCapabilityError(
        'FIXTURE_NOT_FOUND',
        'No matching fixture observations exist.',
      );
    }
    const provenance = fixture.selectors
      .filter(({ track: selectorTrack }) => selectorTrack === track)
      .flatMap(({ methods }) => methods)
      .filter(({ method }) =>
        input.methods.some((item) => item.toLowerCase() === method.toLowerCase()),
      )
      .map(({ method, version }) =>
        connectorProvenance(
          fixture,
          method,
          version,
          `https://immunograph.local/fixtures/${fixture.fixtureId}`,
        ),
      );
    return { observations, provenance };
  }

  private async predictBcell(input: PredictorInput) {
    this.requireFixturePolicy(input.fallbackPolicy);
    const registry = await this.registry;
    const fixture = this.findPredictionFixture(registry, input, 'BCELL');
    const bcell = fixture.expectedCandidates.bcell;
    return {
      residueScores: bcell.residueScores,
      regions: bcell.regions,
      rawMethodFields: bcell.rawMethodFields,
      provenance: [
        connectorProvenance(fixture, bcell.method, bcell.methodVersion, bcell.provenance.sourceUri),
      ],
    };
  }

  private findPredictionFixture(
    registry: LoadedFixtureRegistry,
    input: PredictorInput,
    track: 'MHCI' | 'MHCII' | 'BCELL',
  ): LoadedFixtureCase {
    const fixture = registry.cases.find(
      (candidate) =>
        candidate.proteinSha256 === input.proteinRef || candidate.fixtureId === input.proteinRef,
    );
    if (fixture === undefined) {
      throw new FixtureCapabilityError(
        'FIXTURE_NOT_FOUND',
        'No fixture matches the protein reference.',
      );
    }
    const selector = fixture.selectors.find(
      (candidate) =>
        candidate.track === track &&
        equalStrings(
          candidate.methods.map(({ method }) => method),
          input.methods,
        ) &&
        equalStrings(candidate.alleles, input.alleles ?? []) &&
        equalNumbers(candidate.peptideLengths, input.peptideLengths ?? []) &&
        candidate.parametersHash === computeProfileHash(input.parameters ?? {}),
    );
    if (selector === undefined || matchFixture(registry, selector) === null) {
      throw new FixtureCapabilityError(
        'FIXTURE_NOT_FOUND',
        'No approved fixture exactly matches the requested scientific configuration.',
      );
    }
    return fixture;
  }

  private async populationCoverage(input: PopulationCoverageInput) {
    this.requireFixturePolicy(input.fallbackPolicy);
    const registry = await this.registry;
    const requestedCandidates = input.associations.map(({ candidateId }) => candidateId);
    const fixture = registry.cases.find((candidate) => {
      const coverage = candidate.expectedCandidates.coverage;
      const knownCandidates = candidate.expectedCandidates.observations.map(
        ({ candidateRef }) => candidateRef,
      );
      return (
        input.associations.every(({ candidateId }) => knownCandidates.includes(candidateId)) &&
        equalStrings(coverage.populationIds, input.populationIds) &&
        coverage.classMode === input.classMode
      );
    });
    if (fixture === undefined || requestedCandidates.length === 0) {
      throw new FixtureCapabilityError('FIXTURE_NOT_FOUND', 'No exact coverage fixture matches.');
    }
    const coverage = fixture.expectedCandidates.coverage;
    return {
      projectedCoverage: coverage.projectedCoverage,
      metrics: coverage.metrics,
      provenance: connectorProvenance(
        fixture,
        'synthetic-population-coverage',
        'synthetic-fixture-v1',
        coverage.provenance.sourceUri,
      ),
    };
  }

  private async optimizeCoverage(input: { eligibleCandidateIds: string[] }) {
    const registry = await this.registry;
    const fixture = registry.cases.find(({ expectedCandidates }) =>
      equalStrings(
        expectedCandidates.optimization.selectedCandidateIds,
        input.eligibleCandidateIds,
      ),
    );
    if (fixture === undefined) {
      throw new FixtureCapabilityError('FIXTURE_NOT_FOUND', 'No exact shortlist fixture matches.');
    }
    const optimization = fixture.expectedCandidates.optimization;
    return {
      steps: optimization.steps,
      selectedCandidateIds: optimization.selectedCandidateIds,
      finalCoverage: optimization.finalCoverage,
      provenance: connectorProvenance(
        fixture,
        'synthetic-population-coverage',
        'synthetic-fixture-v1',
        optimization.provenance.sourceUri,
      ),
    };
  }
}

export const localFixtureCapabilityPort = new LocalFixtureCapabilityPort();
