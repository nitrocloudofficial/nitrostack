import { z } from 'zod';

const JSON_VALUE_MESSAGE = 'must contain valid JSON';
const STANDARD_AMINO_ACIDS = /^[ACDEFGHIKLMNPQRSTVWY]+$/;

export const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/, 'must be a lowercase SHA-256 hash');
export const identifierSchema = z.string().trim().min(1);
export const positiveIntegerSchema = z.number().int().positive();
export const unitIntervalSchema = z.number().finite().min(0).max(1);

export const jsonStringSchema = z.string().superRefine((value, context) => {
  try {
    JSON.parse(value);
  } catch {
    context.addIssue({ code: z.ZodIssueCode.custom, message: JSON_VALUE_MESSAGE });
  }
});

export const profileMetadataSchema = z
  .object({
    name: identifierSchema,
    version: identifierSchema,
    hash: sha256Schema,
  })
  .strict();

export const runConfigurationSnapshotSchema = z
  .object({
    profiles: z.record(profileMetadataSchema).superRefine((profiles, context) => {
      for (const requiredProfile of ['biologicalConstraints', 'ranking']) {
        if (profiles[requiredProfile] === undefined) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `missing ${requiredProfile} profile metadata`,
          });
        }
      }
    }),
  })
  .passthrough();

const profileWeight = unitIntervalSchema;
const unitWeightTotal = <T extends Record<string, number>>(value: T) =>
  Math.abs(Object.values(value).reduce((sum, weight) => sum + weight, 0) - 1) <= 1e-12;
const exactWeight = (actual: number, expected: number) => Math.abs(actual - expected) <= 1e-12;

export const rankingProfileSchema = z
  .object({
    name: z.literal('ranking'),
    version: identifierSchema,
    tCell: z
      .object({
        binding: profileWeight,
        consensus: profileWeight,
        populationCoverage: profileWeight,
        completeness: profileWeight,
      })
      .strict()
      .refine(unitWeightTotal, 'T-cell ranking weights must sum to 1')
      .refine(
        (weights) =>
          exactWeight(weights.binding, 0.4) &&
          exactWeight(weights.consensus, 0.3) &&
          exactWeight(weights.populationCoverage, 0.2) &&
          exactWeight(weights.completeness, 0.1),
        'T-cell ranking weights must match the frozen MVP v1.0 profile',
      ),
    bCell: z
      .object({
        graphBepi: profileWeight,
        completeness: profileWeight,
      })
      .strict()
      .refine(unitWeightTotal, 'B-cell ranking weights must sum to 1')
      .refine(
        (weights) => exactWeight(weights.graphBepi, 0.9) && exactWeight(weights.completeness, 0.1),
        'B-cell ranking weights must match the frozen MVP v1.0 profile',
      ),
  })
  .strict();

export const biologicalConstraintProfileSchema = z
  .object({
    name: z.literal('biological-constraints'),
    version: z.literal('mvp-v1.0'),
    scientificUse: z.literal(false),
    mhci: z.object({ peptideLengths: z.array(z.number().int()).min(1) }).strict(),
    mhcii: z.object({ peptideLengths: z.array(z.number().int()).min(1) }).strict(),
    binding: z.object({ percentileRankMaximum: z.number().finite().positive() }).strict(),
    agreement: z.object({ reviewBelow: unitIntervalSchema }).strict(),
    overlap: z.object({ containmentMaximum: unitIntervalSchema }).strict(),
    populationCoverage: z.object({ enabled: z.boolean() }).strict(),
  })
  .strict();

export const projectCreateSchema = z
  .object({
    id: identifierSchema.optional(),
    name: z.string().trim().min(1).max(120),
    organism: z.string().trim().min(1).max(200).optional(),
    proteinName: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().min(1).max(2_000).optional(),
    createdAt: z.date().optional(),
  })
  .strict();

export const projectUpdateSchema = projectCreateSchema
  .omit({ id: true, createdAt: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'at least one metadata field is required');

export const proteinInputCreateSchema = z
  .object({
    id: identifierSchema.optional(),
    projectId: identifierSchema,
    originalFasta: z.string().min(1).max(1_048_576),
    header: z.string().min(1).max(500),
    normalizedSequence: z.string().regex(STANDARD_AMINO_ACIDS),
    sequenceLength: positiveIntegerSchema,
    sha256: sha256Schema,
    validationProfileVersion: identifierSchema,
    createdAt: z.date().optional(),
  })
  .strict()
  .refine((value) => value.normalizedSequence.length === value.sequenceLength, {
    message: 'sequenceLength must match normalizedSequence length',
    path: ['sequenceLength'],
  });

const runStatusSchema = z.enum([
  'DRAFT',
  'AWAITING_CONFIGURATION_APPROVAL',
  'QUEUED',
  'RUNNING',
  'AWAITING_SHORTLIST_APPROVAL',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
]);

export const workflowRunCreateSchema = z
  .object({
    id: identifierSchema.optional(),
    projectId: identifierSchema,
    proteinInputId: identifierSchema,
    revision: positiveIntegerSchema,
    status: runStatusSchema,
    quality: z.enum(['COMPLETE', 'PARTIAL', 'FIXTURE_ONLY']).optional(),
    configurationJson: jsonStringSchema,
    configurationHash: sha256Schema,
    ruleProfileVersion: identifierSchema,
    rankingProfileVersion: identifierSchema,
    requestedExecutionMode: z.enum(['AUTO', 'LIVE', 'SYNTHETIC', 'FIXTURE']).optional(),
    executionMode: z.enum(['LIVE', 'SYNTHETIC', 'FIXTURE', 'HYBRID']).optional(),
    replayHash: sha256Schema.optional(),
    failureCode: identifierSchema.optional(),
    createdAt: z.date().optional(),
    startedAt: z.date().optional(),
    completedAt: z.date().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    try {
      runConfigurationSnapshotSchema.parse(JSON.parse(value.configurationJson));
    } catch (error) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: error instanceof Error ? error.message : 'invalid run configuration snapshot',
        path: ['configurationJson'],
      });
    }
  });

export const workflowRunControlUpdateSchema = z
  .object({
    status: runStatusSchema.optional(),
    quality: z.enum(['COMPLETE', 'PARTIAL', 'FIXTURE_ONLY']).nullable().optional(),
    executionMode: z.enum(['LIVE', 'SYNTHETIC', 'FIXTURE', 'HYBRID']).nullable().optional(),
    replayHash: sha256Schema.nullable().optional(),
    failureCode: identifierSchema.nullable().optional(),
    startedAt: z.date().nullable().optional(),
    completedAt: z.date().nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'at least one control field is required');

export const workflowStageCreateSchema = z
  .object({
    id: identifierSchema.optional(),
    runId: identifierSchema,
    stageKey: identifierSchema,
    attempt: positiveIntegerSchema,
    status: identifierSchema,
    dependencyKeysJson: jsonStringSchema,
    inputHash: sha256Schema,
    outputHash: sha256Schema.optional(),
    progress: unitIntervalSchema.optional(),
    errorCode: identifierSchema.optional(),
    startedAt: z.date().optional(),
    completedAt: z.date().optional(),
    createdAt: z.date().optional(),
  })
  .strict();

export const workflowEventCreateSchema = z
  .object({
    id: identifierSchema.optional(),
    runId: identifierSchema,
    stageId: identifierSchema.optional(),
    sequenceNumber: positiveIntegerSchema,
    eventType: identifierSchema,
    level: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR']),
    message: z.string().min(1),
    payloadJson: jsonStringSchema,
    createdAt: z.date().optional(),
  })
  .strict();

export const predictorExecutionCreateSchema = z
  .object({
    id: identifierSchema.optional(),
    runId: identifierSchema,
    stageId: identifierSchema,
    connectorId: identifierSchema,
    connectorVersion: identifierSchema,
    method: identifierSchema,
    methodVersion: identifierSchema,
    status: identifierSchema,
    sourceStatus: z.enum(['LIVE', 'CACHED', 'SYNTHETIC', 'FIXTURE', 'FAILED']),
    parametersJson: jsonStringSchema,
    inputHash: sha256Schema,
    outputHash: sha256Schema.optional(),
    cacheKey: sha256Schema.optional(),
    fixtureId: identifierSchema.optional(),
    attemptCount: positiveIntegerSchema,
    errorCode: identifierSchema.optional(),
    startedAt: z.date(),
    completedAt: z.date().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.sourceStatus === 'CACHED' && value.cacheKey === undefined) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'CACHED requires cacheKey' });
    }
    if (value.sourceStatus === 'FIXTURE' && value.fixtureId === undefined) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'FIXTURE requires fixtureId' });
    }
    if (
      value.connectorId.toLowerCase() === 'graphbepi' &&
      !['FIXTURE', 'FAILED'].includes(value.sourceStatus)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'GraphBepi supports FIXTURE or FAILED only',
      });
    }
  });

export const candidateCreateSchema = z
  .object({
    id: identifierSchema.optional(),
    runId: identifierSchema,
    candidateKey: identifierSchema,
    candidateType: z.enum(['MHCI', 'MHCII', 'BCELL']),
    peptide: z.string().regex(STANDARD_AMINO_ACIDS),
    start: positiveIntegerSchema,
    end: positiveIntegerSchema,
    length: positiveIntegerSchema,
    allele: identifierSchema.optional(),
    createdAt: z.date().optional(),
  })
  .strict()
  .refine((value) => value.end - value.start + 1 === value.length, {
    message: 'coordinates must match candidate length',
  });

export const predictionObservationCreateSchema = z
  .object({
    id: identifierSchema.optional(),
    runId: identifierSchema,
    candidateId: identifierSchema,
    predictorExecutionId: identifierSchema,
    rawScoresJson: jsonStringSchema,
    unitsJson: jsonStringSchema,
    inputHash: sha256Schema,
    outputHash: sha256Schema,
    observedAt: z.date(),
    createdAt: z.date().optional(),
    supersedesId: identifierSchema.optional(),
  })
  .strict();

export const normalizedObservationCreateSchema = z
  .object({
    id: identifierSchema.optional(),
    runId: identifierSchema,
    candidateId: identifierSchema,
    predictionObservationId: identifierSchema,
    field: identifierSchema,
    rawValue: z.number().finite(),
    normalizedValue: unitIntervalSchema,
    profileVersion: identifierSchema,
    transformationJson: jsonStringSchema,
    createdAt: z.date().optional(),
  })
  .strict();

export const evidenceSummaryCreateSchema = z
  .object({
    id: identifierSchema.optional(),
    runId: identifierSchema,
    candidateId: identifierSchema,
    snapshotHash: sha256Schema,
    bindingQuality: unitIntervalSchema.optional(),
    weightedMean: z.number().finite().optional(),
    variance: z.number().finite().nonnegative().optional(),
    agreement: unitIntervalSchema.optional(),
    completeness: unitIntervalSchema,
    consensus: unitIntervalSchema.optional(),
    detailsJson: jsonStringSchema,
    createdAt: z.date().optional(),
  })
  .strict();

export const constraintOutcomeCreateSchema = z
  .object({
    id: identifierSchema.optional(),
    runId: identifierSchema,
    candidateId: identifierSchema,
    snapshotHash: sha256Schema,
    ruleId: identifierSchema,
    ruleVersion: identifierSchema,
    severity: z.enum(['HARD', 'SOFT']),
    outcome: z.enum(['PASS', 'FAIL', 'REVIEW']),
    message: z.string().min(1),
    evidenceRefsJson: jsonStringSchema,
    relatedCandidateId: identifierSchema.optional(),
    createdAt: z.date().optional(),
  })
  .strict();

export const rankingResultCreateSchema = z
  .object({
    id: identifierSchema.optional(),
    runId: identifierSchema,
    candidateId: identifierSchema,
    snapshotHash: sha256Schema,
    profileVersion: identifierSchema,
    track: z.enum(['MHCI', 'MHCII', 'BCELL']),
    componentScoresJson: jsonStringSchema,
    penaltiesJson: jsonStringSchema,
    finalScore: z.number().finite(),
    category: z.enum(['RECOMMENDED', 'REVIEW', 'REJECTED']),
    confidence: unitIntervalSchema,
    rank: positiveIntegerSchema,
    createdAt: z.date().optional(),
  })
  .strict();

export const populationCoverageResultCreateSchema = z
  .object({
    id: identifierSchema.optional(),
    runId: identifierSchema,
    populationId: identifierSchema,
    classMode: identifierSchema,
    purpose: z.enum(['CANDIDATE_RANKING', 'SHORTLIST_OPTIMIZATION', 'FINAL_SHORTLIST']),
    candidateIdsJson: jsonStringSchema,
    projectedCoverage: unitIntervalSchema,
    averageHits: z.number().finite().nonnegative().optional(),
    pc90: z.number().finite().nonnegative().optional(),
    provenanceJson: jsonStringSchema,
    snapshotHash: sha256Schema,
    createdAt: z.date().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.purpose !== 'CANDIDATE_RANKING') return;
    try {
      const candidateIds: unknown = JSON.parse(value.candidateIdsJson);
      if (!Array.isArray(candidateIds) || candidateIds.length !== 1) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'CANDIDATE_RANKING requires exactly one candidate ID',
        });
      }
    } catch {
      return;
    }
  });

export const shortlistOptimizationResultCreateSchema = z
  .object({
    id: identifierSchema.optional(),
    runId: identifierSchema,
    track: z.enum(['MHCI', 'MHCII']),
    eligibleCandidateIdsJson: jsonStringSchema,
    finalCoverageResultId: identifierSchema,
    algorithmId: identifierSchema,
    algorithmVersion: identifierSchema,
    snapshotHash: sha256Schema,
    createdAt: z.date().optional(),
  })
  .strict();

export const shortlistSelectionStepCreateSchema = z
  .object({
    id: identifierSchema.optional(),
    shortlistOptimizationResultId: identifierSchema,
    step: positiveIntegerSchema,
    selectedCandidateId: identifierSchema,
    marginalCoverageGain: unitIntervalSchema,
    cumulativeCoverage: unitIntervalSchema,
    reasonCode: identifierSchema,
    createdAt: z.date().optional(),
  })
  .strict();

export const approvalCreateSchema = z
  .object({
    id: identifierSchema.optional(),
    runId: identifierSchema,
    type: z.enum(['CONFIGURATION', 'SHORTLIST']),
    status: z.enum(['APPROVED', 'REJECTED']),
    snapshotHash: sha256Schema,
    selectionJson: jsonStringSchema,
    note: z.string().max(2_000).optional(),
    createdAt: z.date().optional(),
  })
  .strict();

export const artifactCreateSchema = z
  .object({
    id: identifierSchema.optional(),
    runId: identifierSchema,
    type: identifierSchema,
    format: identifierSchema,
    relativePath: z
      .string()
      .min(1)
      .refine(
        (value) => !value.startsWith('/') && !value.startsWith('\\') && !value.includes('..'),
      ),
    mimeType: identifierSchema,
    byteSize: z.number().int().nonnegative(),
    sha256: sha256Schema,
    templateVersion: identifierSchema.optional(),
    createdAt: z.date().optional(),
  })
  .strict();

export const graphNodeCreateSchema = z
  .object({
    id: identifierSchema.optional(),
    runId: identifierSchema,
    nodeType: identifierSchema,
    entityId: identifierSchema,
    label: z.string().min(1),
    propertiesJson: jsonStringSchema,
    createdAt: z.date().optional(),
  })
  .strict();

export const graphEdgeCreateSchema = z
  .object({
    id: identifierSchema.optional(),
    runId: identifierSchema,
    edgeType: identifierSchema,
    sourceNodeId: identifierSchema,
    targetNodeId: identifierSchema,
    propertiesJson: jsonStringSchema,
    createdAt: z.date().optional(),
  })
  .strict()
  .refine(
    (value) => value.sourceNodeId !== value.targetNodeId,
    'self-referential graph edges are invalid',
  );

export const cacheEntryCreateSchema = z
  .object({
    id: identifierSchema.optional(),
    cacheKey: sha256Schema,
    connectorId: identifierSchema,
    connectorVersion: identifierSchema,
    method: identifierSchema,
    methodVersion: identifierSchema,
    inputHash: sha256Schema,
    outputHash: sha256Schema,
    schemaVersion: identifierSchema,
    valueJson: jsonStringSchema,
    createdAt: z.date().optional(),
    expiresAt: z.date(),
    lastAccessedAt: z.date(),
  })
  .strict()
  .refine((value) => value.expiresAt > (value.createdAt ?? new Date(0)), {
    message: 'expiresAt must be after createdAt',
  })
  .refine((value) => value.connectorId.toLowerCase() !== 'graphbepi', {
    message: 'GraphBepi fixture results cannot be cached',
  });

export type ProfileMetadata = z.infer<typeof profileMetadataSchema>;
export type RankingProfile = z.infer<typeof rankingProfileSchema>;
