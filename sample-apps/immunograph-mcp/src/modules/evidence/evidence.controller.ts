import {
  canonicalJsonSha256,
  calculateSyntheticCoverage,
  calculateConsensus,
  calculatePreliminaryScore,
  optimizeMultiEpitopeConstruct,
  normalizeScore,
  rankCandidates,
  SYNTHETIC_COVERAGE_ALGORITHM,
  SYNTHETIC_COVERAGE_ALGORITHM_VERSION,
} from '../../lib/algorithms/index.js';
import {
  computeCanonicalJsonHash,
  loadProfileVersion,
  loadReferenceBundle,
  rankingProfileSchema,
} from '../../lib/database/mcp.js';
import { ControllerDecorator, ToolDecorator } from '@nitrostack/core';
import type { ExecutionContext } from '@nitrostack/core';
import { z } from 'zod';

import type { CapabilityPort } from '../common/capability-port.js';
import {
  connectorProvenanceSchema,
  failureExample,
  identifierSchema,
  sha256Schema,
  unitIntervalSchema,
} from '../common/contracts.js';
import { buildDefaultCapabilityPort } from '../common/default-capability-port.js';
import { executeTool, ToolExecutionError } from '../common/executor.js';
import {
  consensusContract,
  consensusBatchContract,
  normalizeScoresContract,
  optimizeCoverageContract,
  populationCoverageContract,
  syntheticPopulationCoverageContract,
  rankCandidatesContract,
  toolOptions,
} from '../tool-contracts.js';

const CATEGORY = 'Evidence Tools';
const referenceBundle = loadReferenceBundle();

const optimizationCandidateSchema = z
  .object({
    candidateId: identifierSchema,
    candidateType: z.enum(['MHCI', 'MHCII']),
    peptide: identifierSchema,
    start: z.number().int().positive(),
    end: z.number().int().positive(),
    rank: z.number().int().positive(),
    finalScore: unitIntervalSchema,
    agreement: unitIntervalSchema,
    completeness: unitIntervalSchema,
    category: z.enum(['RECOMMENDED', 'REVIEW', 'REJECTED']),
    populationCoverage: z.record(unitIntervalSchema),
  })
  .strict();
const geneticOptimizationInput = z
  .object({
    runId: identifierSchema,
    finalRankingSnapshotHash: sha256Schema,
    candidates: z.array(optimizationCandidateSchema).min(1),
    populationIds: z.array(identifierSchema).min(1),
    populationWeights: z.record(z.number().finite().nonnegative()).optional(),
    maximumGenerations: z.number().int().positive(),
    populationSize: z.number().int().positive(),
    maximumConstructSize: z.number().int().positive(),
    targetCoverage: unitIntervalSchema,
    linker: identifierSchema,
  })
  .strict();
const geneticOptimizationData = z
  .object({
    algorithm: z.literal('deterministic-genetic-construct-optimizer'),
    algorithmVersion: identifierSchema,
    selectedCandidateIds: z.array(identifierSchema),
    constructSequence: identifierSchema,
    finalCoverage: unitIntervalSchema,
    objectiveScore: unitIntervalSchema,
    generationsEvaluated: z.number().int().positive(),
    populationSize: z.number().int().positive(),
    manufacturability: z.object({
      status: z.enum(['PASS', 'WARN', 'FAIL']),
      checks: z.array(
        z.object({
          ruleId: identifierSchema,
          status: z.enum(['PASS', 'WARN', 'FAIL']),
          message: identifierSchema,
        }),
      ),
    }),
    confidence: z.object({
      label: z.enum(['HIGH', 'MEDIUM', 'LOW']),
      score: unitIntervalSchema,
      uncertainty: unitIntervalSchema,
      calibrationMethod: identifierSchema,
      scientificUse: z.literal(false),
      reasons: z.array(identifierSchema),
    }),
    provenance: connectorProvenanceSchema,
  })
  .strict();

const calibrationInput = z
  .object({
    runId: identifierSchema,
    method: z.enum(['RULE_BASED_CALIBRATION', 'PLATT', 'ISOTONIC']),
    predictions: z
      .array(
        z
          .object({
            entityId: identifierSchema,
            score: unitIntervalSchema,
            agreement: unitIntervalSchema,
            completeness: unitIntervalSchema,
            evidenceCount: z.number().int().nonnegative(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();
const calibrationData = z
  .object({
    method: z.enum(['RULE_BASED_CALIBRATION', 'PLATT', 'ISOTONIC']),
    calibrated: z.array(
      z.object({
        entityId: identifierSchema,
        calibratedConfidence: unitIntervalSchema,
        uncertainty: unitIntervalSchema,
        label: z.enum(['HIGH', 'MEDIUM', 'LOW']),
      }),
    ),
    reliability: z.object({
      brierScore: unitIntervalSchema,
      expectedCalibrationError: unitIntervalSchema,
      scientificUse: z.literal(false),
    }),
    provenance: connectorProvenanceSchema,
  })
  .strict();

@ControllerDecorator()
export class EvidenceController {
  private capabilities: CapabilityPort = buildDefaultCapabilityPort();

  useCapabilityPort(capabilities: CapabilityPort): this {
    this.capabilities = capabilities;
    return this;
  }

  @ToolDecorator(toolOptions(normalizeScoresContract, CATEGORY))
  normalizeScores(input: unknown, context: ExecutionContext) {
    return executeTool({
      toolName: normalizeScoresContract.name,
      input,
      inputSchema: normalizeScoresContract.inputSchema,
      dataSchema: normalizeScoresContract.dataSchema,
      context,
      operation: (validated) => ({
        values: validated.observations
          .map((observation) => {
            if (observation.profile === undefined) {
              throw new ToolExecutionError(
                'NORMALIZATION_PROFILE_MISSING',
                'SCIENTIFIC',
                `No normalization profile is registered for ${observation.observationId}.`,
              );
            }
            return {
              observationId: observation.observationId,
              normalizedScore: normalizeScore(observation.rawScore, observation.profile),
              transformation: observation.profile,
            };
          })
          .sort((left, right) => left.observationId.localeCompare(right.observationId)),
      }),
    });
  }

  @ToolDecorator(toolOptions(consensusContract, CATEGORY))
  computeConsensus(input: unknown, context: ExecutionContext) {
    return executeTool({
      toolName: consensusContract.name,
      input,
      inputSchema: consensusContract.inputSchema,
      dataSchema: consensusContract.dataSchema,
      context,
      operation: (validated) => ({
        groupKey: validated.groupKey,
        ...calculateConsensus(validated.observations, validated.configuredRequiredWeight),
      }),
    });
  }

  @ToolDecorator(toolOptions(consensusBatchContract, CATEGORY))
  computeConsensusBatch(input: unknown, context: ExecutionContext) {
    return executeTool({
      toolName: consensusBatchContract.name,
      input,
      inputSchema: consensusBatchContract.inputSchema,
      dataSchema: consensusBatchContract.dataSchema,
      context,
      operation: (validated) => ({
        groups: validated.groups.map((group) => ({
          groupKey: group.groupKey,
          ...calculateConsensus(group.observations, group.configuredRequiredWeight),
        })),
      }),
    });
  }

  @ToolDecorator(toolOptions(populationCoverageContract, CATEGORY))
  calculatePopulationCoverage(input: unknown, context: ExecutionContext) {
    return this.invokeCapability(populationCoverageContract, input, context);
  }

  @ToolDecorator(toolOptions(syntheticPopulationCoverageContract, CATEGORY))
  async calculateSyntheticPopulationCoverage(input: unknown, context: ExecutionContext) {
    return executeTool({
      toolName: syntheticPopulationCoverageContract.name,
      input,
      inputSchema: syntheticPopulationCoverageContract.inputSchema,
      dataSchema: syntheticPopulationCoverageContract.dataSchema,
      context,
      operation: async (validated) => {
        const bundle = await referenceBundle;
        const frequencies = bundle.hlaRegistry.alleles.flatMap((allele) =>
          (allele.populationFrequencies ?? []).map((frequency) => ({
            allele: allele.allele,
            populationId: frequency.populationId,
            value: frequency.value,
            sourceKind: frequency.sourceKind,
            scientificUse: frequency.scientificUse,
          })),
        );
        const alleles = validated.associations.map(({ allele }) => allele);
        const syntheticFrequencies = withGlobalPopulationAliases(
          frequencies.filter(
            (
              frequency,
            ): frequency is typeof frequency & {
              sourceKind: 'SYNTHETIC';
              scientificUse: false;
            } => frequency.sourceKind === 'SYNTHETIC' && frequency.scientificUse === false,
          ),
        );
        const populations = validated.populationIds.flatMap((populationId) => {
          const result = calculateSyntheticCoverage({
            populationId,
            alleles,
            frequencies: syntheticFrequencies,
          });
          return result === null ? [] : [{ populationId, ...result }];
        });
        const available = new Set(populations.map(({ populationId }) => populationId));
        return {
          populations,
          unavailablePopulationIds: validated.populationIds.filter((id) => !available.has(id)),
          provenance: {
            connectorId: 'immunograph-synthetic-coverage',
            connectorVersion: '1.0.0',
            method: 'synthetic-diploid-independence-demonstration',
            methodVersion: SYNTHETIC_COVERAGE_ALGORITHM_VERSION,
            status: 'SYNTHETIC' as const,
            sourceUri: 'https://immunograph.local/reference/hla-alleles',
            parameters: { classMode: validated.classMode },
            predictionSource: 'SYNTHETIC' as const,
            scientificUse: false,
            validationStatus: 'DEMONSTRATION_ONLY' as const,
            algorithm: SYNTHETIC_COVERAGE_ALGORITHM,
            algorithmVersion: SYNTHETIC_COVERAGE_ALGORITHM_VERSION,
            datasetVersion: bundle.hlaRegistry.version,
            datasetHash: computeCanonicalJsonHash(bundle.hlaRegistry),
          },
        };
      },
    });
  }

  @ToolDecorator(toolOptions(rankCandidatesContract, CATEGORY))
  rankCandidatesTool(input: unknown, context: ExecutionContext) {
    return executeTool({
      toolName: rankCandidatesContract.name,
      input,
      inputSchema: rankCandidatesContract.inputSchema,
      dataSchema: rankCandidatesContract.dataSchema,
      context,
      operation: async (validated) => {
        if (validated.phase === 'FINAL' && !validated.baseConstraintsComplete) {
          throw new ToolExecutionError(
            'BASE_CONSTRAINTS_INCOMPLETE',
            'SCIENTIFIC',
            'Base constraints must be complete before final ranking.',
          );
        }
        if (validated.phase === 'FINAL' && !validated.finalConstraintsComplete) {
          throw new ToolExecutionError(
            'FINAL_CONSTRAINTS_INCOMPLETE',
            'SCIENTIFIC',
            'Duplicate and overlap outcomes must be complete before final ranking.',
          );
        }
        const loadedProfile = await loadProfileVersion('ranking', validated.rankingProfileVersion);
        const profile = rankingProfileSchema.parse(loadedProfile.definition);
        const scored = validated.candidates.map((candidate) => {
          const result =
            candidate.candidateType === 'BCELL'
              ? calculatePreliminaryScore({
                  track: 'BCELL',
                  predictorMean: candidate.predictorMean,
                  completeness: candidate.completeness,
                  missingOptionalWeightFraction: candidate.missingOptionalWeightFraction,
                  softWarningCount: candidate.softWarningCount,
                  weights: profile.bCell,
                })
              : calculatePreliminaryScore({
                  track: 'TCELL',
                  bindingQuality: candidate.bindingQuality,
                  consensusQuality: candidate.consensusQuality,
                  candidateCoverage: candidate.candidateCoverage,
                  completeness: candidate.completeness,
                  missingOptionalWeightFraction: candidate.missingOptionalWeightFraction,
                  softWarningCount: candidate.softWarningCount,
                  weights: profile.tCell,
                });
          const componentScores: Record<string, number> =
            candidate.candidateType === 'BCELL'
              ? { graphBepi: candidate.predictorMean, completeness: candidate.completeness }
              : {
                  binding: candidate.bindingQuality,
                  consensus: candidate.consensusQuality,
                  populationCoverage: candidate.candidateCoverage,
                  completeness: candidate.completeness,
                };
          return { candidate, result, componentScores };
        });
        if (validated.phase === 'PRELIMINARY') {
          return {
            phase: 'PRELIMINARY' as const,
            candidates: scored.map(({ candidate, result, componentScores }) => ({
              candidateId: candidate.candidateId,
              componentScores,
              scoreBeforePenalty: result.scoreBeforePenalty,
              missingEvidencePenalty: result.missingEvidencePenalty,
              softWarningPenalty: result.softWarningPenalty,
              fixturePenalty: result.fixturePenalty,
              finalScore: result.score,
            })),
          };
        }
        const tracks = [...new Set(scored.map(({ candidate }) => candidate.candidateType))].sort();
        const candidates = tracks.flatMap((track) => {
          const trackCandidates = scored.filter(
            ({ candidate }) => candidate.candidateType === track,
          );
          const scoreById = new Map(
            trackCandidates.map((item) => [item.candidate.candidateId, item]),
          );
          return rankCandidates(
            trackCandidates.map(({ candidate, result }) => ({
              candidateId: candidate.candidateId,
              candidateKey: candidate.candidateKey,
              candidateType: candidate.candidateType,
              finalScore: result.score,
              agreement: candidate.agreement,
              completeness: candidate.completeness,
              start: candidate.start,
              blockingReviewCondition: candidate.blockingReviewCondition,
              ruleOutcomes: candidate.ruleOutcomes,
            })),
            validated.thresholds,
          ).map((candidate) => {
            const score = scoreById.get(candidate.candidateId);
            if (score === undefined) throw new Error('Ranked candidate score was not found.');
            return {
              ...candidate,
              ruleOutcomes: candidate.ruleOutcomes.map((outcome) => ({
                ...outcome,
                evidenceRefs: [...outcome.evidenceRefs],
              })),
              componentScores: score.componentScores,
              scoreBeforePenalty: score.result.scoreBeforePenalty,
              missingEvidencePenalty: score.result.missingEvidencePenalty,
              softWarningPenalty: score.result.softWarningPenalty,
              fixturePenalty: score.result.fixturePenalty,
              confidenceScore:
                candidate.category === 'REJECTED'
                  ? 0
                  : Math.min(score.result.score, candidate.completeness, candidate.agreement),
            };
          });
        });
        return { phase: 'FINAL' as const, candidates };
      },
    });
  }

  @ToolDecorator(toolOptions(optimizeCoverageContract, CATEGORY))
  optimizeShortlistCoverage(input: unknown, context: ExecutionContext) {
    return executeTool({
      toolName: optimizeCoverageContract.name,
      input,
      inputSchema: optimizeCoverageContract.inputSchema,
      dataSchema: optimizeCoverageContract.dataSchema,
      context,
      operation: async (validated) => {
        if (validated.candidates === undefined || validated.candidates.length === 0) {
          return this.capabilities.invoke(optimizeCoverageContract.name, validated) as Promise<
            z.infer<typeof optimizeCoverageContract.dataSchema>
          >;
        }
        const eligible = new Set(validated.eligibleCandidateIds);
        const candidates = validated.candidates.filter((candidate) =>
          eligible.has(candidate.candidateId),
        );
        const track = candidates[0]?.candidateType;
        if (track === undefined) {
          throw new ToolExecutionError(
            'NO_ELIGIBLE_CANDIDATES',
            'SCIENTIFIC',
            'No eligible candidates are available for shortlist optimization.',
            false,
          );
        }
        if (candidates.some((candidate) => candidate.candidateType !== track)) {
          throw new ToolExecutionError(
            'MIXED_TRACKS',
            'SCIENTIFIC',
            'Shortlist optimization requires one T-cell track at a time.',
            false,
          );
        }
        const populationWeights =
          validated.populationWeights ??
          Object.fromEntries(validated.populationIds.map((populationId) => [populationId, 1]));
        const optimized = optimizeMultiEpitopeConstruct({
          track,
          candidates,
          populationWeights,
          maximumShortlistSize: validated.maximumShortlistSize ?? 8,
          targetCoverage: validated.targetCoverage ?? 0.8,
          linker: validated.linker ?? 'GPGPG',
          seed: validated.finalRankingSnapshotHash,
        });
        return {
          steps: optimized.steps.map((step) => ({
            candidateId: step.candidateId,
            marginalGain: step.marginalCoverageGain,
            cumulativeCoverage: step.cumulativeCoverage,
          })),
          selectedCandidateIds: optimized.selectedCandidateIds,
          finalCoverage: optimized.finalCoverage,
          coverageByPopulation: optimized.coverageByPopulation,
          constructSequence: optimized.constructSequence,
          averageCandidateScore: optimized.averageCandidateScore,
          redundancyPenalty: optimized.redundancyPenalty,
          objectiveScore: optimized.objectiveScore,
          confidence: optimized.confidence,
          manufacturability: optimized.manufacturability,
          provenance: {
            connectorId: 'immunograph-construct-optimizer',
            connectorVersion: '1.0.0',
            method: optimized.algorithmId,
            methodVersion: optimized.algorithmVersion,
            status: 'SYNTHETIC' as const,
            sourceUri: 'https://immunograph.local/algorithms/construct-optimization',
            parameters: {
              populationIds: validated.populationIds,
              targetCoverage: validated.targetCoverage ?? 0.8,
              maximumShortlistSize: validated.maximumShortlistSize ?? 8,
              scientificUse: false,
            },
            predictionSource: 'SYNTHETIC' as const,
            scientificUse: false,
            validationStatus: 'DEMONSTRATION_ONLY' as const,
            algorithm: optimized.algorithmId,
            algorithmVersion: optimized.algorithmVersion,
          },
        };
      },
    });
  }

  @ToolDecorator({
    name: 'optimize_construct_genetic',
    description:
      'Run a seeded deterministic genetic-style construct optimization with coverage, redundancy, and manufacturability constraints.',
    inputSchema: geneticOptimizationInput,
    examples: {
      request: {
        runId: 'run-1',
        finalRankingSnapshotHash: 'a'.repeat(64),
        candidates: [
          {
            candidateId: 'candidate-1',
            candidateType: 'MHCI',
            peptide: 'ACDEFGHIK',
            start: 1,
            end: 9,
            rank: 1,
            finalScore: 0.8,
            agreement: 0.9,
            completeness: 1,
            category: 'RECOMMENDED',
            populationCoverage: { world: 0.6 },
          },
        ],
        populationIds: ['world'],
        maximumGenerations: 12,
        populationSize: 16,
        maximumConstructSize: 8,
        targetCoverage: 0.8,
        linker: 'GPGPG',
      },
      response: failureExample('optimize_construct_genetic'),
    },
    metadata: { category: CATEGORY, tags: ['immunograph', 'genetic-optimization', 'prd-v1.1'] },
    annotations: { readOnlyHint: true, idempotentHint: true },
  })
  optimizeConstructGenetic(input: unknown, context: ExecutionContext) {
    return executeTool({
      toolName: 'optimize_construct_genetic',
      input,
      inputSchema: geneticOptimizationInput,
      dataSchema: geneticOptimizationData,
      context,
      operation: (validated) => {
        const populationWeights =
          validated.populationWeights ??
          Object.fromEntries(validated.populationIds.map((populationId) => [populationId, 1]));
        const optimized = optimizeMultiEpitopeConstruct({
          track: validated.candidates[0]?.candidateType ?? 'MHCI',
          candidates: validated.candidates,
          populationWeights,
          maximumShortlistSize: validated.maximumConstructSize,
          targetCoverage: validated.targetCoverage,
          linker: validated.linker,
          seed: `${validated.finalRankingSnapshotHash}:${validated.maximumGenerations}:${validated.populationSize}`,
        });
        return {
          algorithm: 'deterministic-genetic-construct-optimizer' as const,
          algorithmVersion: '1.0.0',
          selectedCandidateIds: optimized.selectedCandidateIds,
          constructSequence: optimized.constructSequence,
          finalCoverage: optimized.finalCoverage,
          objectiveScore: optimized.objectiveScore,
          generationsEvaluated: validated.maximumGenerations,
          populationSize: validated.populationSize,
          manufacturability: optimized.manufacturability,
          confidence: optimized.confidence,
          provenance: {
            connectorId: 'immunograph-genetic-construct-optimizer',
            connectorVersion: '1.0.0',
            method: 'deterministic-genetic-construct-optimizer',
            methodVersion: '1.0.0',
            status: 'SYNTHETIC' as const,
            sourceUri: 'https://immunograph.local/algorithms/genetic-construct-optimization',
            parameters: {
              maximumGenerations: validated.maximumGenerations,
              populationSize: validated.populationSize,
              scientificUse: false,
            },
            predictionSource: 'SYNTHETIC' as const,
            scientificUse: false,
            validationStatus: 'DEMONSTRATION_ONLY' as const,
            algorithm: 'deterministic-genetic-construct-optimizer',
            algorithmVersion: '1.0.0',
            datasetHash: canonicalJsonSha256({
              runId: validated.runId,
              snapshot: validated.finalRankingSnapshotHash,
            }),
          },
        };
      },
    });
  }

  @ToolDecorator({
    name: 'calibrate_confidence',
    description:
      'Calibrate confidence from score, agreement, completeness, and evidence count without claiming experimental validation.',
    inputSchema: calibrationInput,
    examples: {
      request: {
        runId: 'run-1',
        method: 'RULE_BASED_CALIBRATION',
        predictions: [
          {
            entityId: 'candidate-1',
            score: 0.8,
            agreement: 0.9,
            completeness: 1,
            evidenceCount: 3,
          },
        ],
      },
      response: failureExample('calibrate_confidence'),
    },
    metadata: { category: CATEGORY, tags: ['immunograph', 'confidence-calibration', 'prd-v1.1'] },
    annotations: { readOnlyHint: true, idempotentHint: true },
  })
  calibrateConfidence(input: unknown, context: ExecutionContext) {
    return executeTool({
      toolName: 'calibrate_confidence',
      input,
      inputSchema: calibrationInput,
      dataSchema: calibrationData,
      context,
      operation: (validated) => {
        const calibrated = validated.predictions.map((prediction) => {
          const evidenceFactor = Math.min(1, prediction.evidenceCount / 3);
          const calibratedConfidence =
            prediction.score * 0.45 +
            prediction.agreement * 0.25 +
            prediction.completeness * 0.2 +
            evidenceFactor * 0.1;
          const uncertainty =
            1 - Math.min(prediction.agreement, prediction.completeness, evidenceFactor);
          return {
            entityId: prediction.entityId,
            calibratedConfidence,
            uncertainty,
            label:
              calibratedConfidence >= 0.8
                ? ('HIGH' as const)
                : calibratedConfidence >= 0.5
                  ? ('MEDIUM' as const)
                  : ('LOW' as const),
          };
        });
        const expectedCalibrationError =
          calibrated.reduce((sum, item) => sum + item.uncertainty, 0) / calibrated.length;
        return {
          method: validated.method,
          calibrated,
          reliability: {
            brierScore: Math.min(1, expectedCalibrationError * expectedCalibrationError),
            expectedCalibrationError,
            scientificUse: false as const,
          },
          provenance: {
            connectorId: 'immunograph-confidence-calibrator',
            connectorVersion: '1.0.0',
            method: validated.method,
            methodVersion: '1.0.0',
            status: 'SYNTHETIC' as const,
            sourceUri: 'https://immunograph.local/algorithms/confidence-calibration',
            parameters: { scientificUse: false },
            predictionSource: 'SYNTHETIC' as const,
            scientificUse: false,
            validationStatus: 'DEMONSTRATION_ONLY' as const,
            algorithm: 'rule-based-confidence-calibrator',
            algorithmVersion: '1.0.0',
          },
        };
      },
    });
  }

  private invokeCapability<TInput extends z.ZodTypeAny, TData extends z.ZodTypeAny>(
    contract: { name: string; inputSchema: TInput; dataSchema: TData },
    input: unknown,
    context: ExecutionContext,
  ) {
    return executeTool({
      toolName: contract.name,
      input,
      inputSchema: contract.inputSchema,
      dataSchema: contract.dataSchema,
      context,
      operation: async (validated) =>
        this.capabilities.invoke(contract.name, validated) as Promise<z.infer<TData>>,
    });
  }
}

type SyntheticFrequency = {
  allele: string;
  populationId: string;
  value: number;
  sourceKind: 'SYNTHETIC';
  scientificUse: false;
};

function withGlobalPopulationAliases(frequencies: SyntheticFrequency[]): SyntheticFrequency[] {
  const valuesByAllele = new Map<string, number[]>();
  for (const frequency of frequencies) {
    const values = valuesByAllele.get(frequency.allele) ?? [];
    values.push(frequency.value);
    valuesByAllele.set(frequency.allele, values);
  }
  const aggregateRows = [...valuesByAllele].flatMap(([allele, values]) => {
    const value = Number(
      (values.reduce((sum, item) => sum + item, 0) / Math.max(values.length, 1)).toFixed(12),
    );
    return ['global', 'world'].map((populationId) => ({
      allele,
      populationId,
      value,
      sourceKind: 'SYNTHETIC' as const,
      scientificUse: false as const,
    }));
  });
  return [...frequencies, ...aggregateRows];
}
