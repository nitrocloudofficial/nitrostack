import { z } from 'zod';

import { identifierSchema, sha256Schema, unitIntervalSchema } from './validation.js';

export const FIXTURE_DISCLAIMER =
  'Computational demonstration only. Synthetic sequences, scores, rankings, and coverage are not experimental, clinical, efficacy, or pathogen-reference results.' as const;

const standardPeptideSchema = z.string().regex(/^[ACDEFGHIKLMNPQRSTVWY]+$/);
const relativeFileSchema = z
  .string()
  .min(1)
  .refine(
    (value) =>
      !value.startsWith('/') &&
      !value.startsWith('\\') &&
      !value.includes('..') &&
      !/^[a-z]:/i.test(value),
    'must be a safe relative path',
  );

const uniqueArray = <T extends z.ZodTypeAny>(item: T, minimum = 0) =>
  z
    .array(item)
    .min(minimum)
    .superRefine((values, context) => {
      if (new Set(values.map((value) => JSON.stringify(value))).size !== values.length) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: 'must not contain duplicates' });
      }
    });

export const fixtureProvenanceSchema = z
  .object({
    sourceKind: z.literal('SYNTHETIC'),
    scientificUse: z.literal(false),
    sourceStatus: z.literal('FIXTURE'),
    fixtureId: identifierSchema,
    sourceUri: z.string().regex(/^urn:immunograph:synthetic-fixture:/),
    disclaimer: z.literal(FIXTURE_DISCLAIMER),
  })
  .strict();

export const fixtureMethodSchema = z
  .object({ method: identifierSchema, version: identifierSchema })
  .strict();

export const fixtureRunProfileSchema = z
  .object({
    ruleProfileVersion: identifierSchema,
    rankingProfileVersion: identifierSchema,
  })
  .strict();

export const fixtureMatchQuerySchema = z
  .object({
    proteinSha256: sha256Schema,
    track: z.enum(['MHCI', 'MHCII', 'BCELL']),
    methods: uniqueArray(fixtureMethodSchema, 1),
    alleles: uniqueArray(identifierSchema),
    peptideLengths: uniqueArray(z.number().int().positive()),
    parametersHash: sha256Schema,
    outputSchemaVersion: identifierSchema,
    runProfile: fixtureRunProfileSchema,
  })
  .strict();

const fixtureMetadataSchema = z
  .object({
    scenarioName: identifierSchema,
    organismLabel: z.literal('Synthetic demonstration'),
    proteinName: identifierSchema,
    description: z.string().min(1),
    sequenceNature: z.literal('SYNTHETIC_NOT_PATHOGEN_REFERENCE'),
  })
  .strict();

export const fixtureCaseDocumentSchema = z
  .object({
    schemaVersion: z.literal('fixture-case.v1'),
    fixtureId: identifierSchema,
    reviewStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
    sourceKind: z.literal('SYNTHETIC'),
    scientificUse: z.literal(false),
    disclaimer: z.literal(FIXTURE_DISCLAIMER),
    proteinSha256: sha256Schema,
    metadata: fixtureMetadataSchema,
    selectors: z.array(fixtureMatchQuerySchema).min(1),
  })
  .strict()
  .superRefine((value, context) => {
    for (const [index, selector] of value.selectors.entries()) {
      if (selector.proteinSha256 !== value.proteinSha256) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['selectors', index, 'proteinSha256'],
          message: 'must equal the case proteinSha256',
        });
      }
    }
  });

const observationSchema = z
  .object({
    observationId: identifierSchema,
    candidateRef: identifierSchema,
    candidateType: z.enum(['MHCI', 'MHCII']),
    peptide: standardPeptideSchema,
    start: z.number().int().positive(),
    end: z.number().int().positive(),
    length: z.number().int().positive(),
    method: identifierSchema,
    methodVersion: identifierSchema,
    rawScore: z.number().finite(),
    percentileRank: z.number().finite().nonnegative(),
    allele: identifierSchema,
    rawFields: z.record(z.unknown()),
    sourceStatus: z.literal('FIXTURE'),
    provenance: fixtureProvenanceSchema,
  })
  .strict()
  .refine((value) => value.end - value.start + 1 === value.length, {
    message: 'coordinates must match candidate length',
  })
  .refine((value) => value.peptide.length === value.length, {
    message: 'peptide length must match length',
  });

const graphBepiFixtureSchema = z
  .object({
    method: z.literal('GraphBepi'),
    methodVersion: z.literal('synthetic-fixture-v1'),
    sourceStatus: z.literal('FIXTURE'),
    residueScores: z.array(
      z.object({ position: z.number().int().positive(), score: unitIntervalSchema }).strict(),
    ),
    regions: z.array(
      z
        .object({
          start: z.number().int().positive(),
          end: z.number().int().positive(),
          score: unitIntervalSchema,
        })
        .strict()
        .refine((value) => value.end >= value.start, 'region end must not precede start'),
    ),
    rawMethodFields: z.record(z.unknown()),
    provenance: fixtureProvenanceSchema,
  })
  .strict();

const coverageFixtureSchema = z
  .object({
    projectedCoverage: unitIntervalSchema,
    populationIds: z.array(identifierSchema).min(1),
    classMode: z.enum(['CLASS_I', 'CLASS_II', 'COMBINED']),
    metrics: z.record(z.unknown()),
    provenance: fixtureProvenanceSchema,
  })
  .strict();

const optimizationFixtureSchema = z
  .object({
    steps: z.array(
      z
        .object({
          candidateId: identifierSchema,
          marginalGain: unitIntervalSchema,
          cumulativeCoverage: unitIntervalSchema,
        })
        .strict(),
    ),
    selectedCandidateIds: z.array(identifierSchema),
    finalCoverage: unitIntervalSchema,
    provenance: fixtureProvenanceSchema,
  })
  .strict();

export const expectedCandidatesSchema = z
  .object({
    schemaVersion: z.literal('prediction-observation.v1'),
    sourceKind: z.literal('SYNTHETIC'),
    scientificUse: z.literal(false),
    disclaimer: z.literal(FIXTURE_DISCLAIMER),
    observations: z.array(observationSchema).min(1),
    bcell: graphBepiFixtureSchema,
    coverage: coverageFixtureSchema,
    optimization: optimizationFixtureSchema,
  })
  .strict();

const rankingSchema = z
  .object({
    candidateId: identifierSchema,
    track: z.enum(['MHCI', 'MHCII', 'BCELL']),
    componentScores: z.record(unitIntervalSchema),
    finalScore: unitIntervalSchema,
    category: z.enum(['RECOMMENDED', 'REVIEW', 'REJECTED']),
    confidence: z.enum(['HIGH', 'MEDIUM', 'LOW', 'NOT_APPLICABLE']),
    rank: z.number().int().positive(),
  })
  .strict();

export const expectedFixtureReportSchema = z
  .object({
    schemaVersion: z.literal('fixture-report.v1'),
    sourceKind: z.literal('SYNTHETIC'),
    scientificUse: z.literal(false),
    disclaimer: z.literal(FIXTURE_DISCLAIMER),
    rankings: z.array(rankingSchema).min(1),
    estimatedPopulationCoverage: unitIntervalSchema,
    provenance: fixtureProvenanceSchema,
  })
  .strict();

const manifestFileSchema = z.object({ file: relativeFileSchema, sha256: sha256Schema }).strict();

export const fixtureManifestEntrySchema = z
  .object({
    fixtureId: identifierSchema,
    reviewStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
    scenarioName: identifierSchema,
    contentHash: sha256Schema,
    replayHash: sha256Schema,
    files: z
      .object({
        inputFasta: manifestFileSchema,
        case: manifestFileSchema,
        expectedCandidates: manifestFileSchema,
        expectedReport: manifestFileSchema,
      })
      .strict(),
  })
  .strict();

export const fixtureManifestSchema = z
  .object({
    schemaVersion: z.literal('reference-manifest.v1'),
    version: z.literal('mvp-v1.0'),
    sourceKind: z.literal('SYNTHETIC'),
    scientificUse: z.literal(false),
    disclaimer: z.literal(FIXTURE_DISCLAIMER),
    entries: z.array(fixtureManifestEntrySchema).min(1),
  })
  .strict()
  .superRefine((value, context) => {
    if (new Set(value.entries.map(({ fixtureId }) => fixtureId)).size !== value.entries.length) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'duplicate fixtureId' });
    }
  });

export type FixtureMatchQuery = z.infer<typeof fixtureMatchQuerySchema>;
export type FixtureCaseDocument = z.infer<typeof fixtureCaseDocumentSchema>;
export type ExpectedCandidates = z.infer<typeof expectedCandidatesSchema>;
export type ExpectedFixtureReport = z.infer<typeof expectedFixtureReportSchema>;
export type FixtureManifest = z.infer<typeof fixtureManifestSchema>;
