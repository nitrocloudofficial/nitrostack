import type { ToolOptions } from '@nitrostack/core';
import { z } from 'zod';

import {
  candidateTypeSchema,
  connectorProvenanceSchema,
  failureExample,
  fallbackPolicySchema,
  identifierSchema,
  ruleOutcomeSchema,
  sha256Schema,
  unitIntervalSchema,
} from './common/contracts.js';

const positiveInteger = z.number().int().positive();
const nonnegativeInteger = z.number().int().nonnegative();
const nonemptyStrings = z.array(identifierSchema).min(1);
const jsonRecord = z.record(z.unknown());
type FallbackPolicy = z.infer<typeof fallbackPolicySchema>;
type PredictorInput = {
  runId: string;
  proteinRef?: string;
  sequence?: string;
  alleles: string[];
  peptideLengths: number[];
  methods: string[];
  fallbackPolicy: FallbackPolicy;
};
type ValidateSequenceInput = { fasta: string; profileVersion: string };
type GeneratePeptidesInput = {
  runId: string;
  sequence: string;
  sequenceHash?: string;
  candidateType: 'MHCI' | 'MHCII';
  peptideLengths: number[];
};
type CoverageInput = {
  runId: string;
  associations: Array<{ candidateId: string; peptide?: string; allele: string }>;
  populationIds: string[];
  classMode: 'CLASS_I' | 'CLASS_II' | 'COMBINED';
  fallbackPolicy: FallbackPolicy;
};
type SyntheticCoverageInput = Omit<CoverageInput, 'fallbackPolicy'>;

export const generatedCandidateSchema = z.object({
  candidateType: z.enum(['MHCI', 'MHCII']),
  start: positiveInteger,
  end: positiveInteger,
  length: positiveInteger,
  peptide: identifierSchema,
});

export const overlapCandidateSchema = z.object({
  id: identifierSchema,
  candidateKey: identifierSchema,
  proteinHash: sha256Schema,
  candidateType: candidateTypeSchema,
  allele: identifierSchema.optional(),
  peptide: identifierSchema,
  start: positiveInteger,
  end: positiveInteger,
  length: positiveInteger,
  passesHardConstraints: z.boolean(),
  preliminaryScore: unitIntervalSchema,
  completeness: unitIntervalSchema,
  agreement: unitIntervalSchema,
});

const normalizationProfileSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('IDENTITY'),
    min: z.literal(0),
    max: z.literal(1),
    direction: z.literal('HIGHER_BETTER'),
  }),
  z.object({ kind: z.literal('INVERSE_PERCENTILE'), cap: z.number().positive() }),
  z.object({
    kind: z.literal('FIXED_MIN_MAX'),
    min: z.number(),
    max: z.number(),
    direction: z.enum(['HIGHER_BETTER', 'LOWER_BETTER']),
  }),
  z.object({
    kind: z.literal('LOGISTIC'),
    midpoint: z.number(),
    slope: z.number().positive(),
    direction: z.enum(['HIGHER_BETTER', 'LOWER_BETTER']),
  }),
]);

const hardConstraintInputSchema = z.object({
  candidateType: candidateTypeSchema,
  peptideLength: positiveInteger,
  allele: identifierSchema.optional(),
  allowedLengths: z.object({ MHCI: z.array(positiveInteger), MHCII: z.array(positiveInteger) }),
  supportedAlleles: z.array(identifierSchema),
  requiredEvidenceRefs: z.array(identifierSchema),
  presentEvidenceRefs: z.array(identifierSchema),
  bindingObservations: z.array(
    z.object({
      evidenceRef: identifierSchema,
      percentileRank: z.number().nonnegative(),
      required: z.boolean(),
    }),
  ),
  bindingPercentileRankMaximum: z.number().positive(),
});

const rankedCandidateInputSchema = z.object({
  candidateId: identifierSchema,
  candidateKey: identifierSchema,
  candidateType: candidateTypeSchema,
  finalScore: unitIntervalSchema,
  agreement: unitIntervalSchema,
  completeness: unitIntervalSchema,
  start: positiveInteger,
  blockingReviewCondition: z.boolean(),
  ruleOutcomes: z.array(ruleOutcomeSchema),
});

const artifactSchema = z.object({
  artifactId: identifierSchema,
  mediaType: identifierSchema,
  sha256: sha256Schema,
  byteLength: nonnegativeInteger,
  reference: identifierSchema,
  contentBase64: identifierSchema.optional(),
});
const predictionDataSchema = z.object({
  observations: z.array(
    z.object({
      observationId: identifierSchema,
      candidateRef: identifierSchema,
      candidateType: z.enum(['MHCI', 'MHCII']),
      peptide: identifierSchema,
      start: positiveInteger,
      end: positiveInteger,
      length: positiveInteger,
      method: identifierSchema,
      methodVersion: identifierSchema,
      rawScore: z.number().finite(),
      percentileRank: z.number().finite().nonnegative().optional(),
      allele: identifierSchema.optional(),
      rawFields: jsonRecord,
    }),
  ),
  provenance: z.array(connectorProvenanceSchema),
});

export interface ToolContract<
  TInput extends z.ZodTypeAny = z.ZodTypeAny,
  TData extends z.ZodTypeAny = z.ZodTypeAny,
> {
  name: string;
  description: string;
  inputSchema: TInput;
  dataSchema: TData;
  exampleInput: z.infer<TInput>;
  taskSupport?: 'forbidden' | 'optional' | 'required';
}

export function defineContract<TInput extends z.ZodTypeAny, TData extends z.ZodTypeAny>(
  contract: ToolContract<TInput, TData>,
): ToolContract<TInput, TData> {
  return contract;
}

export function toolOptions(contract: ToolContract, category: string): ToolOptions {
  // Public MCP clients such as Claude can reject tools marked as task-support
  // "required" unless their host provides NitroStack task augmentation. The
  // tools are still fully validated and idempotent; expose them as optional so
  // external clients can call them directly during deployed MCP demos.
  const taskSupport = contract.taskSupport === 'required' ? 'optional' : contract.taskSupport;
  return {
    name: contract.name,
    description: contract.description,
    inputSchema: contract.inputSchema,
    // NitroStack v1.0.13 serializes normal tool handler returns as text content.
    // The MCP SDK rejects text-only results when a tool advertises outputSchema,
    // expecting structuredContent instead. We still validate every output inside
    // executeTool; omitting advertised outputSchema keeps HTTP clients compatible.
    examples: { request: contract.exampleInput, response: failureExample(contract.name) },
    metadata: { category, tags: ['immunograph', 'deterministic', 'mvp-v1'] },
    annotations: { readOnlyHint: true, idempotentHint: true },
    taskSupport: taskSupport ?? 'forbidden',
  };
}

const predictorInput = z.preprocess(
  (raw) => {
    if (typeof raw !== 'object' || raw === null) return raw;
    const value = { ...(raw as Record<string, unknown>) };
    if (value.peptideLengths === undefined && value.lengths !== undefined) {
      value.peptideLengths = value.lengths;
    }
    delete value.lengths;
    return value;
  },
  z
    .object({
      runId: identifierSchema.default('interactive-run'),
      proteinRef: identifierSchema.optional(),
      sequence: identifierSchema.optional(),
      alleles: nonemptyStrings,
      peptideLengths: z.array(positiveInteger).min(1),
      methods: nonemptyStrings.default(['iedb-recommended']),
      fallbackPolicy: fallbackPolicySchema.default('LIVE_THEN_CACHE_THEN_FIXTURE'),
    })
    .strict(),
) as z.ZodType<PredictorInput>;

export const validateSequenceContract = defineContract({
  name: 'validate_sequence',
  description: 'Validate and normalize one protein FASTA record.',
  inputSchema: z.preprocess(
    (raw) => {
      if (typeof raw !== 'object' || raw === null) return raw;
      const value = { ...(raw as Record<string, unknown>) };
      if (value.fasta === undefined && value.sequence !== undefined) value.fasta = value.sequence;
      if (value.profileVersion === undefined) value.profileVersion = 'mvp-v1.0';
      delete value.sequence;
      return value;
    },
    z.object({ fasta: z.string(), profileVersion: identifierSchema }).strict(),
  ) as z.ZodType<ValidateSequenceInput>,
  dataSchema: z.object({
    normalizedSequence: identifierSchema,
    header: z.string(),
    sequenceLength: positiveInteger,
    sha256: sha256Schema,
    warnings: z.array(z.string()),
  }),
  exampleInput: { fasta: '>protein\nACDEFGHIK', profileVersion: 'mvp-v1.0' },
});

export const generatePeptidesContract = defineContract({
  name: 'generate_candidate_peptides',
  description: 'Generate stable one-based T-cell peptide windows.',
  inputSchema: z.preprocess(
    (raw) => {
      if (typeof raw !== 'object' || raw === null) return raw;
      const value = { ...(raw as Record<string, unknown>) };
      if (value.peptideLengths === undefined && value.lengths !== undefined) {
        value.peptideLengths = value.lengths;
      }
      delete value.lengths;
      delete value.overlapping;
      return value;
    },
    z
      .object({
        runId: identifierSchema.default('interactive-run'),
        sequence: identifierSchema,
        sequenceHash: sha256Schema.optional(),
        candidateType: z.enum(['MHCI', 'MHCII']),
        peptideLengths: z.array(positiveInteger).min(1),
      })
      .strict(),
  ) as z.ZodType<GeneratePeptidesInput>,
  dataSchema: z.object({ candidates: z.array(generatedCandidateSchema) }),
  exampleInput: {
    runId: 'run-1',
    sequence: 'ACDEFGHIK',
    sequenceHash: 'a'.repeat(64),
    candidateType: 'MHCI' as const,
    peptideLengths: [9],
  },
});

export const predictMhciContract = defineContract({
  name: 'predict_mhci',
  description: 'Resolve MHC-I predictions through configured live/cache/fixture connectors.',
  inputSchema: predictorInput,
  dataSchema: predictionDataSchema,
  exampleInput: {
    runId: 'run-1',
    proteinRef: 'protein-1',
    sequence: 'ACDEFGHIKLMNPQRST',
    alleles: ['HLA-A*02:01'],
    peptideLengths: [9],
    methods: ['iedb-recommended'],
    fallbackPolicy: 'LIVE_THEN_CACHE_THEN_FIXTURE' as const,
  },
  taskSupport: 'required' as const,
});
export const predictMhciiContract = defineContract({
  name: 'predict_mhcii',
  description: 'Resolve MHC-II predictions through configured live/cache/fixture connectors.',
  inputSchema: predictorInput,
  dataSchema: predictionDataSchema,
  exampleInput: {
    runId: 'run-1',
    proteinRef: 'protein-1',
    sequence: 'ACDEFGHIKLMNPQRST',
    alleles: ['HLA-DRB1*01:01'],
    peptideLengths: [15],
    methods: ['iedb-mhcii'],
    fallbackPolicy: 'LIVE_THEN_CACHE_THEN_FIXTURE' as const,
  },
  taskSupport: 'required' as const,
});
export const predictBcellContract = defineContract({
  name: 'predict_bcell',
  description: 'Resolve B-cell evidence; GraphBepi is fixture-only in MVP v1.',
  inputSchema: z
    .object({
      runId: identifierSchema,
      proteinRef: identifierSchema,
      methods: nonemptyStrings,
      parameters: jsonRecord,
      fallbackPolicy: fallbackPolicySchema,
    })
    .strict()
    .superRefine((value, context) => {
      const usesGraphBepi = value.methods.some((method) => method.toLowerCase() === 'graphbepi');
      const fixturePermitted = [
        'CACHE_THEN_LIVE_THEN_FIXTURE',
        'LIVE_THEN_CACHE_THEN_FIXTURE',
        'FIXTURE_ONLY',
      ].includes(value.fallbackPolicy);
      if (usesGraphBepi && !fixturePermitted) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['fallbackPolicy'],
          message: 'GraphBepi is fixture-only in MVP v1.0.',
        });
      }
    }),
  dataSchema: z.object({
    residueScores: z.array(z.object({ position: positiveInteger, score: unitIntervalSchema })),
    regions: z.array(
      z.object({ start: positiveInteger, end: positiveInteger, score: unitIntervalSchema }),
    ),
    rawMethodFields: jsonRecord,
    provenance: z.array(connectorProvenanceSchema),
  }),
  exampleInput: {
    runId: 'run-1',
    proteinRef: 'protein-1',
    methods: ['graphbepi'],
    parameters: {},
    fallbackPolicy: 'FIXTURE_ONLY' as const,
  },
  taskSupport: 'required' as const,
});

export const predictSyntheticBindingContract = defineContract({
  name: 'predict_synthetic_binding',
  description:
    'Generate deterministic offline demonstration binding values; never scientific predictions.',
  inputSchema: z
    .object({
      runId: identifierSchema,
      proteinHash: sha256Schema,
      candidateType: z.enum(['MHCI', 'MHCII']),
      candidates: z.array(generatedCandidateSchema).min(1),
      alleles: nonemptyStrings,
      method: identifierSchema,
      methodVersion: identifierSchema,
      datasetVersion: identifierSchema,
    })
    .strict(),
  dataSchema: z.object({
    observations: z.array(
      z.object({
        observationId: identifierSchema,
        candidateRef: identifierSchema,
        candidateType: z.enum(['MHCI', 'MHCII']),
        peptide: identifierSchema,
        start: positiveInteger,
        end: positiveInteger,
        length: positiveInteger,
        allele: identifierSchema,
        method: identifierSchema,
        methodVersion: identifierSchema,
        rawScore: unitIntervalSchema,
        percentileRank: z.number().finite().min(0).max(100),
        normalizedScore: unitIntervalSchema,
        rawFields: jsonRecord,
      }),
    ),
    provenance: connectorProvenanceSchema,
  }),
  exampleInput: {
    runId: 'run-1',
    proteinHash: 'a'.repeat(64),
    candidateType: 'MHCI' as const,
    candidates: [
      { candidateType: 'MHCI' as const, start: 1, end: 9, length: 9, peptide: 'ACDEFGHIK' },
    ],
    alleles: ['HLA-A*02:01'],
    method: 'synthetic-binding',
    methodVersion: '1.0.0',
    datasetVersion: 'synthetic-v1',
  },
});

export const normalizeScoresContract = defineContract({
  name: 'normalize_scores',
  description: 'Normalize registered raw scores with versioned transformations.',
  inputSchema: z
    .object({
      runId: identifierSchema,
      registryVersion: identifierSchema,
      observations: z
        .array(
          z.object({
            observationId: identifierSchema,
            rawScore: z.number().finite(),
            profile: normalizationProfileSchema.optional(),
          }),
        )
        .min(1),
    })
    .strict(),
  dataSchema: z.object({
    values: z.array(
      z.object({
        observationId: identifierSchema,
        normalizedScore: unitIntervalSchema,
        transformation: normalizationProfileSchema,
      }),
    ),
  }),
  exampleInput: {
    runId: 'run-1',
    registryVersion: 'mvp-v1.0',
    observations: [
      {
        observationId: 'obs-1',
        rawScore: 0.8,
        profile: {
          kind: 'IDENTITY' as const,
          min: 0 as const,
          max: 1 as const,
          direction: 'HIGHER_BETTER' as const,
        },
      },
    ],
  },
});

export const consensusContract = defineContract({
  name: 'compute_consensus',
  description: 'Compute deterministic weighted agreement, completeness, and consensus.',
  inputSchema: z
    .object({
      runId: identifierSchema,
      groupKey: identifierSchema,
      configuredRequiredWeight: z.number().positive(),
      observations: z
        .array(
          z.object({
            observationId: identifierSchema,
            normalizedScore: unitIntervalSchema,
            reliabilityWeight: z.number().nonnegative(),
            required: z.boolean(),
          }),
        )
        .min(1),
    })
    .strict(),
  dataSchema: z.object({
    groupKey: identifierSchema,
    weightedMean: unitIntervalSchema,
    weightedVariance: z.number().nonnegative(),
    agreement: unitIntervalSchema,
    agreementStatus: z.enum(['SUFFICIENT_OBSERVATIONS', 'INSUFFICIENT_OBSERVATIONS']),
    completeness: unitIntervalSchema,
    consensus: unitIntervalSchema,
  }),
  exampleInput: {
    runId: 'run-1',
    groupKey: 'candidate-1|HLA-A*02:01',
    configuredRequiredWeight: 1,
    observations: [
      { observationId: 'obs-1', normalizedScore: 0.8, reliabilityWeight: 1, required: true },
    ],
  },
});

export const consensusBatchContract = defineContract({
  name: 'compute_consensus_batch',
  description: 'Compute deterministic consensus for multiple independent candidate groups.',
  inputSchema: z
    .object({
      runId: identifierSchema,
      groups: z
        .array(
          z.object({
            groupKey: identifierSchema,
            configuredRequiredWeight: z.number().positive(),
            observations: z
              .array(
                z.object({
                  observationId: identifierSchema,
                  normalizedScore: unitIntervalSchema,
                  reliabilityWeight: z.number().nonnegative(),
                  required: z.boolean(),
                }),
              )
              .min(1),
          }),
        )
        .min(1),
    })
    .strict(),
  dataSchema: z.object({
    groups: z.array(
      z.object({
        groupKey: identifierSchema,
        weightedMean: unitIntervalSchema,
        weightedVariance: z.number().nonnegative(),
        agreement: unitIntervalSchema,
        agreementStatus: z.enum(['SUFFICIENT_OBSERVATIONS', 'INSUFFICIENT_OBSERVATIONS']),
        completeness: unitIntervalSchema,
        consensus: unitIntervalSchema,
      }),
    ),
  }),
  exampleInput: {
    runId: 'run-1',
    groups: [
      {
        groupKey: 'candidate-1',
        configuredRequiredWeight: 1,
        observations: [
          { observationId: 'obs-1', normalizedScore: 0.8, reliabilityWeight: 1, required: true },
        ],
      },
    ],
  },
});

export const populationCoverageContract = defineContract({
  name: 'calculate_population_coverage',
  description:
    'Calculate population coverage using a configured authoritative service or exact fixture.',
  inputSchema: z.preprocess(
    (raw) => {
      if (typeof raw !== 'object' || raw === null) return raw;
      const value = { ...(raw as Record<string, unknown>) };
      if (value.populationIds === undefined && value.populations !== undefined) {
        value.populationIds = value.populations;
      }
      delete value.populations;
      return value;
    },
    z
      .object({
        runId: identifierSchema.default('interactive-run'),
        associations: z
          .array(
            z.object({
              candidateId: identifierSchema,
              peptide: identifierSchema.optional(),
              allele: identifierSchema,
            }),
          )
          .min(1),
        populationIds: nonemptyStrings,
        classMode: z.enum(['CLASS_I', 'CLASS_II', 'COMBINED']).default('COMBINED'),
        fallbackPolicy: fallbackPolicySchema.default('LIVE_THEN_CACHE_THEN_FIXTURE'),
      })
      .strict(),
  ) as z.ZodType<CoverageInput>,
  dataSchema: z.object({
    projectedCoverage: unitIntervalSchema,
    metrics: jsonRecord,
    provenance: connectorProvenanceSchema,
  }),
  exampleInput: {
    runId: 'run-1',
    associations: [{ candidateId: 'candidate-1', allele: 'HLA-A*02:01' }],
    populationIds: ['world'],
    classMode: 'CLASS_I' as const,
    fallbackPolicy: 'LIVE_THEN_CACHE_THEN_FIXTURE' as const,
  },
  taskSupport: 'required' as const,
});

export const syntheticPopulationCoverageContract = defineContract({
  name: 'calculate_synthetic_population_coverage',
  description:
    'Calculate deterministic demonstration coverage from explicitly synthetic HLA frequencies.',
  inputSchema: z.preprocess(
    (raw) => {
      if (typeof raw !== 'object' || raw === null) return raw;
      const value = { ...(raw as Record<string, unknown>) };
      if (value.populationIds === undefined && value.populations !== undefined) {
        value.populationIds = value.populations;
      }
      delete value.populations;
      return value;
    },
    z
      .object({
        runId: identifierSchema.default('interactive-run'),
        associations: z
          .array(
            z.object({
              candidateId: identifierSchema,
              peptide: identifierSchema.optional(),
              allele: identifierSchema,
            }),
          )
          .min(1),
        populationIds: nonemptyStrings,
        classMode: z.enum(['CLASS_I', 'CLASS_II', 'COMBINED']).default('COMBINED'),
      })
      .strict(),
  ) as z.ZodType<SyntheticCoverageInput>,
  dataSchema: z.object({
    populations: z.array(
      z.object({
        populationId: identifierSchema,
        projectedCoverage: unitIntervalSchema,
        averageHits: z.number().finite().nonnegative(),
        alleleCarrierProbabilities: z.array(
          z.object({ allele: identifierSchema, carrierProbability: unitIntervalSchema }),
        ),
      }),
    ),
    unavailablePopulationIds: z.array(identifierSchema),
    provenance: connectorProvenanceSchema,
  }),
  exampleInput: {
    runId: 'run-1',
    associations: [{ candidateId: 'candidate-1', allele: 'HLA-A*02:01' }],
    populationIds: ['synthetic-population-alpha'],
    classMode: 'CLASS_I' as const,
  },
});

export const rankCandidatesContract = defineContract({
  name: 'rank_candidates',
  description:
    'Calculate deterministic preliminary scores or stable final ranks from completed snapshots.',
  inputSchema: z
    .object({
      runId: identifierSchema,
      phase: z.enum(['PRELIMINARY', 'FINAL']),
      rankingProfileVersion: identifierSchema,
      baseConstraintsComplete: z.boolean(),
      finalConstraintsComplete: z.boolean(),
      candidates: z
        .array(
          z.discriminatedUnion('candidateType', [
            z.object({
              candidateId: identifierSchema,
              candidateKey: identifierSchema,
              candidateType: z.enum(['MHCI', 'MHCII']),
              bindingQuality: unitIntervalSchema,
              consensusQuality: unitIntervalSchema,
              candidateCoverage: unitIntervalSchema,
              agreement: unitIntervalSchema,
              completeness: unitIntervalSchema,
              missingOptionalWeightFraction: unitIntervalSchema,
              softWarningCount: nonnegativeInteger,
              start: positiveInteger,
              blockingReviewCondition: z.boolean(),
              ruleOutcomes: z.array(ruleOutcomeSchema),
            }),
            z.object({
              candidateId: identifierSchema,
              candidateKey: identifierSchema,
              candidateType: z.literal('BCELL'),
              predictorMean: unitIntervalSchema,
              agreement: unitIntervalSchema,
              completeness: unitIntervalSchema,
              missingOptionalWeightFraction: unitIntervalSchema,
              softWarningCount: nonnegativeInteger,
              start: positiveInteger,
              blockingReviewCondition: z.boolean(),
              ruleOutcomes: z.array(ruleOutcomeSchema),
            }),
          ]),
        )
        .min(1),
      thresholds: z
        .object({ recommendedMinimum: unitIntervalSchema, reviewMinimum: unitIntervalSchema })
        .optional(),
    })
    .strict(),
  dataSchema: z.discriminatedUnion('phase', [
    z.object({
      phase: z.literal('PRELIMINARY'),
      candidates: z.array(
        z.object({
          candidateId: identifierSchema,
          componentScores: z.record(unitIntervalSchema),
          scoreBeforePenalty: unitIntervalSchema,
          missingEvidencePenalty: z.number().nonnegative(),
          softWarningPenalty: z.number().nonnegative(),
          fixturePenalty: z.literal(0),
          finalScore: unitIntervalSchema,
        }),
      ),
    }),
    z.object({
      phase: z.literal('FINAL'),
      candidates: z.array(
        rankedCandidateInputSchema.extend({
          componentScores: z.record(unitIntervalSchema),
          scoreBeforePenalty: unitIntervalSchema,
          missingEvidencePenalty: z.number().nonnegative(),
          softWarningPenalty: z.number().nonnegative(),
          fixturePenalty: z.literal(0),
          category: z.enum(['RECOMMENDED', 'REVIEW', 'REJECTED']),
          confidence: z.enum(['HIGH', 'MEDIUM', 'LOW', 'NOT_APPLICABLE']),
          confidenceScore: unitIntervalSchema,
          trackRank: positiveInteger,
          categoryRank: positiveInteger,
        }),
      ),
    }),
  ]),
  exampleInput: {
    runId: 'run-1',
    phase: 'FINAL' as const,
    rankingProfileVersion: 'mvp-v1.0',
    baseConstraintsComplete: true,
    finalConstraintsComplete: true,
    candidates: [
      {
        candidateId: 'candidate-1',
        candidateKey: 'key-1',
        candidateType: 'MHCI' as const,
        bindingQuality: 0.8,
        consensusQuality: 0.8,
        candidateCoverage: 0.7,
        agreement: 0.9,
        completeness: 1,
        missingOptionalWeightFraction: 0,
        softWarningCount: 0,
        start: 1,
        blockingReviewCondition: false,
        ruleOutcomes: [],
      },
    ],
  },
});

export const optimizeCoverageContract = defineContract({
  name: 'optimize_shortlist_coverage',
  description:
    'Select a stable T-cell shortlist using deterministic construct optimization and set-level coverage.',
  inputSchema: z
    .object({
      runId: identifierSchema,
      eligibleCandidateIds: nonemptyStrings,
      finalRankingSnapshotHash: sha256Schema,
      populationIds: nonemptyStrings,
      targetCoverage: unitIntervalSchema.optional(),
      maximumShortlistSize: positiveInteger.optional(),
      method: identifierSchema,
      candidates: z
        .array(
          z
            .object({
              candidateId: identifierSchema,
              candidateType: z.enum(['MHCI', 'MHCII']),
              peptide: identifierSchema,
              start: positiveInteger,
              end: positiveInteger,
              rank: positiveInteger,
              finalScore: unitIntervalSchema,
              agreement: unitIntervalSchema,
              completeness: unitIntervalSchema,
              category: z.enum(['RECOMMENDED', 'REVIEW', 'REJECTED']),
              populationCoverage: z.record(unitIntervalSchema),
            })
            .strict(),
        )
        .optional(),
      populationWeights: z.record(z.number().finite().nonnegative()).optional(),
      linker: identifierSchema.optional(),
    })
    .strict()
    .refine(
      (value) => value.targetCoverage !== undefined || value.maximumShortlistSize !== undefined,
    ),
  dataSchema: z.object({
    steps: z.array(
      z.object({
        candidateId: identifierSchema,
        marginalGain: unitIntervalSchema,
        cumulativeCoverage: unitIntervalSchema,
      }),
    ),
    selectedCandidateIds: z.array(identifierSchema),
    finalCoverage: unitIntervalSchema,
    coverageByPopulation: z.record(unitIntervalSchema).optional(),
    constructSequence: z.string().optional(),
    averageCandidateScore: unitIntervalSchema.optional(),
    redundancyPenalty: unitIntervalSchema.optional(),
    objectiveScore: unitIntervalSchema.optional(),
    confidence: z
      .object({
        label: z.enum(['HIGH', 'MEDIUM', 'LOW']),
        score: unitIntervalSchema,
        uncertainty: unitIntervalSchema,
        calibrationMethod: identifierSchema,
        scientificUse: z.literal(false),
        reasons: z.array(z.string()),
      })
      .strict()
      .optional(),
    manufacturability: z
      .object({
        status: z.enum(['PASS', 'WARN', 'FAIL']),
        checks: z.array(
          z
            .object({
              ruleId: identifierSchema,
              status: z.enum(['PASS', 'WARN', 'FAIL']),
              message: z.string(),
            })
            .strict(),
        ),
      })
      .strict()
      .optional(),
    provenance: connectorProvenanceSchema,
  }),
  exampleInput: {
    runId: 'run-1',
    eligibleCandidateIds: ['candidate-1'],
    finalRankingSnapshotHash: 'a'.repeat(64),
    populationIds: ['world'],
    targetCoverage: 0.8,
    method: 'iedb-population-coverage',
  },
  taskSupport: 'required' as const,
});

export const detectOverlapContract = defineContract({
  name: 'detect_overlapping_epitopes',
  description: 'Detect interval pairs and overlap components without resolving dominance.',
  inputSchema: z
    .object({
      runId: identifierSchema,
      profileVersion: identifierSchema,
      threshold: unitIntervalSchema,
      candidates: z.array(overlapCandidateSchema),
    })
    .strict(),
  dataSchema: z.object({
    pairs: z.array(
      z.object({
        leftCandidateId: identifierSchema,
        rightCandidateId: identifierSchema,
        containmentOverlap: unitIntervalSchema,
      }),
    ),
    components: z.array(z.array(identifierSchema)),
  }),
  exampleInput: { runId: 'run-1', profileVersion: 'mvp-v1.0', threshold: 0.8, candidates: [] },
});

export const removeDuplicatesContract = defineContract({
  name: 'remove_duplicate_candidates',
  description: 'Canonicalize only candidates with identical positional identity fields.',
  inputSchema: z
    .object({
      runId: identifierSchema,
      proteinHash: sha256Schema,
      candidates: z.array(
        z.object({
          id: identifierSchema,
          candidateType: candidateTypeSchema,
          start: positiveInteger,
          end: positiveInteger,
          peptide: identifierSchema,
          allele: identifierSchema.optional(),
          observationRefs: z.array(identifierSchema),
        }),
      ),
    })
    .strict(),
  dataSchema: z.object({
    canonicalCandidates: z.array(
      z.object({
        id: identifierSchema,
        proteinHash: sha256Schema,
        candidateType: candidateTypeSchema,
        start: positiveInteger,
        end: positiveInteger,
        peptide: identifierSchema,
        allele: identifierSchema.optional(),
        observationRefs: z.array(identifierSchema),
      }),
    ),
    duplicateLinks: z.array(
      z.object({
        duplicateId: identifierSchema,
        canonicalId: identifierSchema,
        edgeType: z.literal('DUPLICATE_OF'),
        ruleId: z.literal('DUPLICATE-001'),
      }),
    ),
  }),
  exampleInput: {
    runId: 'run-1',
    proteinHash: 'a'.repeat(64),
    candidates: [
      {
        id: 'candidate-1',
        candidateType: 'MHCI' as const,
        start: 1,
        end: 9,
        peptide: 'ACDEFGHIK',
        allele: 'HLA-A*02:01',
        observationRefs: [],
      },
    ],
  },
});

export const validateThresholdsContract = defineContract({
  name: 'validate_thresholds',
  description: 'Evaluate every applicable non-overlap hard rule.',
  inputSchema: z
    .object({
      runId: identifierSchema,
      ruleProfileVersion: identifierSchema,
      candidates: z
        .array(z.object({ candidateId: identifierSchema, evidence: hardConstraintInputSchema }))
        .min(1),
    })
    .strict(),
  dataSchema: z.object({
    candidates: z.array(
      z.object({
        candidateId: identifierSchema,
        passesAllHardConstraints: z.boolean(),
        outcomes: z.array(ruleOutcomeSchema),
      }),
    ),
  }),
  exampleInput: {
    runId: 'run-1',
    ruleProfileVersion: 'mvp-v1.0',
    candidates: [
      {
        candidateId: 'candidate-1',
        evidence: {
          candidateType: 'MHCI' as const,
          peptideLength: 9,
          allele: 'HLA-A*02:01',
          allowedLengths: { MHCI: [9], MHCII: [15] },
          supportedAlleles: ['HLA-A*02:01'],
          requiredEvidenceRefs: ['obs-1'],
          presentEvidenceRefs: ['obs-1'],
          bindingObservations: [{ evidenceRef: 'obs-1', percentileRank: 1, required: true }],
          bindingPercentileRankMaximum: 2,
        },
      },
    ],
  },
});

export const categorizeContract = defineContract({
  name: 'categorize_candidates',
  description: 'Assign deterministic provisional categories and blocking conditions.',
  inputSchema: z
    .object({
      runId: identifierSchema,
      categoryProfileVersion: identifierSchema,
      candidates: z.array(rankedCandidateInputSchema).min(1),
      thresholds: z
        .object({ recommendedMinimum: unitIntervalSchema, reviewMinimum: unitIntervalSchema })
        .optional(),
    })
    .strict(),
  dataSchema: z.object({
    candidates: z.array(
      rankedCandidateInputSchema.extend({
        category: z.enum(['RECOMMENDED', 'REVIEW', 'REJECTED']),
        confidence: z.enum(['HIGH', 'MEDIUM', 'LOW', 'NOT_APPLICABLE']),
        trackRank: positiveInteger,
        categoryRank: positiveInteger,
      }),
    ),
  }),
  exampleInput: {
    runId: 'run-1',
    categoryProfileVersion: 'mvp-v1.0',
    candidates: [
      {
        candidateId: 'candidate-1',
        candidateKey: 'key-1',
        candidateType: 'MHCI' as const,
        finalScore: 0.8,
        agreement: 0.9,
        completeness: 1,
        start: 1,
        blockingReviewCondition: false,
        ruleOutcomes: [],
      },
    ],
  },
});

export const applyConstraintsContract = defineContract({
  name: 'apply_constraint_rules',
  description: 'Apply complete deterministic constraints to an immutable evidence snapshot.',
  inputSchema: z
    .object({
      runId: identifierSchema,
      snapshotHash: sha256Schema,
      ruleProfileVersion: identifierSchema,
      overlapThreshold: unitIntervalSchema,
      candidates: z.array(overlapCandidateSchema),
    })
    .strict(),
  dataSchema: z.object({
    snapshotHash: sha256Schema,
    overlap: z.object({
      retainedCandidateIds: z.array(identifierSchema),
      rejections: z.array(
        z.object({
          candidateId: identifierSchema,
          retainedCandidateId: identifierSchema,
          ruleId: z.literal('BIO-OVERLAP-001'),
        }),
      ),
    }),
    finalEligibility: z.array(z.object({ candidateId: identifierSchema, eligible: z.boolean() })),
  }),
  exampleInput: {
    runId: 'run-1',
    snapshotHash: 'a'.repeat(64),
    ruleProfileVersion: 'mvp-v1.0',
    overlapThreshold: 0.8,
    candidates: [],
  },
});

export const generateReportContract = defineContract({
  name: 'generate_report',
  description: 'Generate immutable report artifacts from an approved run.',
  inputSchema: z
    .object({
      runId: identifierSchema,
      templateVersion: identifierSchema,
      outputFormats: z.array(z.enum(['JSON', 'CSV', 'PDF'])).min(1),
      idempotencyKey: identifierSchema,
      reportSnapshot: z
        .object({
          executionMode: z.enum(['LIVE', 'SYNTHETIC', 'FIXTURE', 'HYBRID']),
          runQuality: identifierSchema,
          scientificUse: z.boolean(),
          disclaimer: identifierSchema,
          candidates: z.array(jsonRecord),
        })
        .optional(),
    })
    .strict(),
  dataSchema: z.object({
    artifacts: z.array(artifactSchema).min(1),
    disclaimer: identifierSchema,
    provenanceSummary: jsonRecord,
    runQuality: identifierSchema,
  }),
  exampleInput: {
    runId: 'run-1',
    templateVersion: 'mvp-v1.0',
    outputFormats: ['JSON' as const, 'CSV' as const],
    idempotencyKey: 'report-run-1',
  },
  taskSupport: 'required' as const,
});
export const exportCandidatesContract = defineContract({
  name: 'export_candidates',
  description: 'Export approved candidates with separate raw and normalized score fields.',
  inputSchema: z
    .object({
      runId: identifierSchema,
      categories: z.array(z.enum(['RECOMMENDED', 'REVIEW', 'REJECTED'])).min(1),
      format: z.enum(['JSON', 'CSV']),
      idempotencyKey: identifierSchema,
    })
    .strict(),
  dataSchema: artifactSchema,
  exampleInput: {
    runId: 'run-1',
    categories: ['RECOMMENDED' as const],
    format: 'CSV' as const,
    idempotencyKey: 'export-run-1',
  },
});
export const visualizeResultsContract = defineContract({
  name: 'visualize_results',
  description: 'Build a validated deterministic visualization view model.',
  inputSchema: z
    .object({
      runId: identifierSchema,
      visualizationType: z.enum([
        'SEQUENCE_MAP',
        'CONNECTOR_STATUS',
        'CONSTRAINT_SUMMARY',
        'SCORE_DISTRIBUTION',
        'EVIDENCE_GRAPH',
        'WORKFLOW_GRAPH',
        'POPULATION_COVERAGE',
      ]),
    })
    .strict(),
  dataSchema: z.object({ visualizationType: identifierSchema, viewModel: jsonRecord }),
  exampleInput: { runId: 'run-1', visualizationType: 'SEQUENCE_MAP' as const },
});

export const explainCandidateContract = defineContract({
  name: 'explain_candidate',
  description: 'Explain a fixed candidate decision without changing scientific values.',
  inputSchema: z
    .object({
      runId: identifierSchema,
      audience: z.enum(['RESEARCHER', 'JUDGE']),
      explanationMode: z.enum(['DETERMINISTIC', 'LLM_PARAPHRASE']),
      candidateKey: identifierSchema,
      category: z.enum(['RECOMMENDED', 'REVIEW', 'REJECTED']),
      trackRank: positiveInteger,
      finalScore: unitIntervalSchema,
      componentScores: z.record(unitIntervalSchema),
      ruleOutcomes: z.array(
        z.object({
          ruleId: identifierSchema,
          outcome: z.enum(['PASS', 'WARN', 'FAIL', 'NOT_EVALUATED']),
        }),
      ),
      provenanceStatuses: z.array(z.enum(['LIVE', 'CACHED', 'SYNTHETIC', 'FIXTURE', 'FAILED'])),
    })
    .strict(),
  dataSchema: z.object({
    deterministic: z.object({
      text: identifierSchema,
      strongestComponent: z
        .object({ name: identifierSchema, value: unitIntervalSchema })
        .nullable(),
      warningRuleIds: z.array(identifierSchema),
      failedRuleIds: z.array(identifierSchema),
      provenanceSummary: z.record(nonnegativeInteger),
      disclaimer: identifierSchema,
    }),
    llmParaphrase: z.string().nullable(),
  }),
  exampleInput: {
    runId: 'run-1',
    audience: 'RESEARCHER' as const,
    explanationMode: 'DETERMINISTIC' as const,
    candidateKey: 'key-1',
    category: 'RECOMMENDED' as const,
    trackRank: 1,
    finalScore: 0.8,
    componentScores: { binding: 0.9 },
    ruleOutcomes: [],
    provenanceStatuses: ['LIVE' as const],
  },
});
export const exportTraceContract = defineContract({
  name: 'export_workflow_trace',
  description: 'Export a redacted ordered workflow trace without secrets or chain-of-thought.',
  inputSchema: z
    .object({
      runId: identifierSchema,
      redactionProfile: identifierSchema,
      idempotencyKey: identifierSchema,
    })
    .strict(),
  dataSchema: z.object({ artifact: artifactSchema, eventCount: nonnegativeInteger }),
  exampleInput: { runId: 'run-1', redactionProfile: 'mvp-safe-v1', idempotencyKey: 'trace-run-1' },
});

const toolGroupNameSchema = z.enum([
  'Immunoinformatics Tools',
  'Evidence Tools',
  'Constraint Tools',
  'Structure Tools',
  'Chemistry Tools',
  'Docking Tools',
  'Report / Export Tools',
]);

const internalAgentSchema = z.object({
  agentId: identifierSchema,
  displayName: identifierSchema,
  role: identifierSchema,
  status: z.enum(['ACTIVE']),
  scope: identifierSchema,
  responsibilities: z.array(identifierSchema).min(1),
  allowedToolGroups: z.array(toolGroupNameSchema).min(1),
  maxIterations: positiveInteger,
  contextBudget: identifierSchema,
  retryPolicy: identifierSchema,
  abstentionConditions: z.array(identifierSchema).min(1),
  forbiddenActions: z.array(identifierSchema).min(1),
  decisionPolicy: z
    .object({
      mayGenerateScientificValues: z.boolean(),
      mustUseMcpToolsForEvidence: z.boolean(),
      mustExposeProvenance: z.boolean(),
      abstainWhenEvidenceMissing: z.boolean(),
      llmOutputTrustedWithoutValidation: z.boolean(),
    })
    .strict(),
});

const workflowPlanNodeSchema = z.object({
  nodeId: identifierSchema,
  label: identifierSchema,
  agentId: identifierSchema,
  toolNames: z.array(identifierSchema),
  approvalRequired: z.boolean(),
  output: identifierSchema,
});

const workflowPlanEdgeSchema = z.object({
  from: identifierSchema,
  to: identifierSchema,
  condition: identifierSchema,
});

export const describeAgenticWorkflowContract = defineContract({
  name: 'describe_agentic_workflow',
  description:
    'Describe the single NitroStack MCP app internal agent graph, tool permissions, approvals, and final package contract.',
  inputSchema: z
    .object({
      runId: identifierSchema,
      runIntent: z.literal('MVP_EPITOPE_PRIORITIZATION'),
      includeFutureInterfaces: z.boolean(),
    })
    .strict(),
  dataSchema: z
    .object({
      deploymentBoundary: z.literal('ONE_NITROSTACK_MCP_APP'),
      manifestVersion: identifierSchema,
      planVersion: identifierSchema,
      runId: identifierSchema,
      runIntent: z.literal('MVP_EPITOPE_PRIORITIZATION'),
      agents: z.array(internalAgentSchema).min(1),
      workflowPlan: z
        .object({
          nodes: z.array(workflowPlanNodeSchema).min(1),
          edges: z.array(workflowPlanEdgeSchema),
          humanApprovalGates: z.array(identifierSchema).min(1),
        })
        .strict(),
      guardrails: z
        .object({
          authRequired: z.literal(false),
          langGraphRequired: z.literal(true),
          llmAgentModeRequiredWhenConfigured: z.literal(true),
          deterministicFallbackRequired: z.literal(true),
          graphBepiMode: z.literal('FIXTURE_ONLY'),
          syntheticScientificUse: z.literal(false),
        })
        .strict(),
      finalResearchPackage: z
        .object({
          requiredArtifact: z.literal('research-package.zip'),
          includesCsvExports: z.literal(true),
          requiredSections: z.array(identifierSchema).min(1),
        })
        .strict(),
    })
    .strict(),
  exampleInput: {
    runId: 'run-1',
    runIntent: 'MVP_EPITOPE_PRIORITIZATION' as const,
    includeFutureInterfaces: true,
  },
});

const agentModeSchema = z.enum(['LLM', 'DETERMINISTIC']);
const persistedPackageSnapshotSchema = z
  .object({
    project: jsonRecord.optional(),
    run: jsonRecord.optional(),
    configuration: jsonRecord.optional(),
    originalFasta: z.string().optional(),
    normalizedSequence: jsonRecord.optional(),
    inputChecksums: jsonRecord.optional(),
    predictions: z
      .object({
        mhci: jsonRecord.optional(),
        mhcii: jsonRecord.optional(),
        bcell: jsonRecord.optional(),
        populationCoverage: z.unknown().optional(),
        connectorProvenance: z.unknown().optional(),
      })
      .strict()
      .optional(),
    candidates: z
      .object({
        ranked: z.unknown().optional(),
        shortlisted: z.unknown().optional(),
        rejected: z.unknown().optional(),
        evidenceLinks: z.unknown().optional(),
        csv: z.string().optional(),
      })
      .strict()
      .optional(),
    structure: z
      .object({
        structures: z.unknown().optional(),
        epitopeStructureMap: z.unknown().optional(),
        surfaceAccessibility: z.unknown().optional(),
        structureConfidence: z.unknown().optional(),
      })
      .strict()
      .optional(),
    compounds: z
      .object({
        compounds: z.unknown().optional(),
        descriptors: z.unknown().optional(),
        ligandPreparation: z.unknown().optional(),
      })
      .strict()
      .optional(),
    docking: z
      .object({
        receptorPdbqt: z.string().optional(),
        ligandPdbqt: z.string().optional(),
        dockingOutputPdbqt: z.string().optional(),
        dockingPoses: z.unknown().optional(),
        dockingSummary: z.unknown().optional(),
        dockingProvenance: z.unknown().optional(),
        dockingViewPngBase64: z.string().optional(),
      })
      .strict()
      .optional(),
    construct: z
      .object({
        fasta: z.string().optional(),
        json: jsonRecord.optional(),
        optimization: z.unknown().optional(),
      })
      .strict()
      .optional(),
    evidence: z
      .object({
        evidenceGraph: jsonRecord.optional(),
        workflowTrace: jsonRecord.optional(),
        agentTrace: jsonRecord.optional(),
        approvals: z.unknown().optional(),
        auditEvents: z.unknown().optional(),
      })
      .strict()
      .optional(),
    reports: z
      .object({
        summaryMarkdown: z.string().optional(),
        report: jsonRecord.optional(),
        limitationsMarkdown: z.string().optional(),
        reportCsv: z.string().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
const reactLoopSchema = z.tuple([
  z.literal('PLAN'),
  z.literal('ACT'),
  z.literal('OBSERVE'),
  z.literal('VERIFY'),
  z.literal('DECIDE'),
]);
const agentStepSchema = z
  .object({
    agentId: identifierSchema,
    iteration: positiveInteger,
    loop: reactLoopSchema,
    selectedAction: identifierSchema,
    toolNames: z.array(identifierSchema),
    observation: identifierSchema,
    verification: z.enum(['PASSED', 'REQUIRES_APPROVAL', 'ABSTAINED']),
    decision: z.enum(['CONTINUE', 'REQUEST_APPROVAL', 'ABSTAIN', 'COMPLETE']),
    inputHash: sha256Schema,
    outputHash: sha256Schema,
  })
  .strict();

export const runAgenticWorkflowContract = defineContract({
  name: 'run_agentic_workflow',
  description:
    'Run the strict PRD v1.1 LangGraph bounded-agent workflow inside the single NitroStack MCP app.',
  inputSchema: z
    .object({
      runId: identifierSchema,
      objective: identifierSchema,
      agentMode: agentModeSchema,
      approvedToolNames: z.array(identifierSchema).min(1),
      requireHumanApproval: z.boolean(),
    })
    .strict(),
  dataSchema: z
    .object({
      runtime: z.literal('LANGGRAPH'),
      agentMode: agentModeSchema,
      llmUsed: z.boolean(),
      status: z.enum(['COMPLETED', 'AWAITING_APPROVAL', 'ABSTAINED']),
      nextApprovalGate: identifierSchema.nullable(),
      steps: z.array(agentStepSchema).min(1),
      warnings: z.array(identifierSchema),
    })
    .strict(),
  exampleInput: {
    runId: 'run-1',
    objective: 'Prioritize epitopes with complete provenance.',
    agentMode: 'DETERMINISTIC' as const,
    approvedToolNames: ['validate_sequence', 'rank_candidates'],
    requireHumanApproval: true,
  },
});

export const chatWithResearchAgentContract = defineContract({
  name: 'chat_with_research_agent',
  description:
    'Answer researcher or judge questions through the bounded agent policy using supplied evidence only.',
  inputSchema: z
    .object({
      runId: identifierSchema,
      question: identifierSchema,
      evidenceSummary: jsonRecord,
      agentMode: agentModeSchema,
    })
    .strict(),
  dataSchema: z
    .object({
      answer: identifierSchema,
      grounded: z.boolean(),
      citedEvidenceKeys: z.array(identifierSchema),
      limitations: z.array(identifierSchema),
      agentMode: agentModeSchema,
      llmUsed: z.boolean(),
    })
    .strict(),
  exampleInput: {
    runId: 'run-1',
    question: 'What is agentic about this workflow?',
    evidenceSummary: { workflow: 'LangGraph bounded agents call typed MCP tools.' },
    agentMode: 'DETERMINISTIC' as const,
  },
});

export const exportResearchPackageContract = defineContract({
  name: 'export_research_package',
  description:
    'Return the PRD v1.1 final research package contract and deterministic artifact metadata.',
  inputSchema: z
    .object({
      runId: identifierSchema,
      idempotencyKey: identifierSchema,
      includeStructure: z.boolean(),
      includeChemistry: z.boolean(),
      includeDocking: z.boolean(),
      includeAgentTrace: z.boolean(),
      packageSnapshot: persistedPackageSnapshotSchema.optional(),
    })
    .strict(),
  dataSchema: z
    .object({
      artifact: artifactSchema,
      requiredSections: z.array(identifierSchema).min(1),
      includesCsvExports: z.literal(true),
      includesAgentTrace: z.boolean(),
    })
    .strict(),
  exampleInput: {
    runId: 'run-1',
    idempotencyKey: 'research-package-run-1',
    includeStructure: true,
    includeChemistry: true,
    includeDocking: true,
    includeAgentTrace: true,
  },
});
