import { z } from 'zod';

export const TOOL_VERSION = '1.0.0';
export const SERVER_VERSION = '0.1.0';
export const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
export const identifierSchema = z.string().trim().min(1);
export const unitIntervalSchema = z.number().finite().min(0).max(1);
export const candidateTypeSchema = z.enum(['MHCI', 'MHCII', 'BCELL']);
export const fallbackPolicySchema = z.enum([
  'LIVE_ONLY',
  'CACHE_THEN_LIVE',
  'CACHE_THEN_LIVE_THEN_FIXTURE',
  'LIVE_THEN_CACHE_THEN_FIXTURE',
  'FIXTURE_ONLY',
]);

export const toolMetaSchema = z.object({
  requestId: identifierSchema,
  runId: identifierSchema,
  toolName: identifierSchema,
  toolVersion: identifierSchema,
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime(),
  durationMs: z.number().finite().nonnegative(),
  inputHash: sha256Schema,
  outputHash: sha256Schema,
});

export const toolFailureSchema = z.object({
  ok: z.literal(false),
  error: z.object({
    code: identifierSchema,
    category: z.enum([
      'VALIDATION',
      'SCIENTIFIC',
      'CONNECTOR',
      'TIMEOUT',
      'RATE_LIMIT',
      'INTERNAL',
    ]),
    message: z.string().min(1),
    retryable: z.boolean(),
    details: z.record(z.unknown()).optional(),
  }),
  meta: toolMetaSchema.partial().extend({
    requestId: identifierSchema,
    runId: identifierSchema,
    toolName: identifierSchema,
    toolVersion: identifierSchema,
    startedAt: z.string().datetime(),
    inputHash: sha256Schema,
  }),
});

export const toolSuccessSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({ ok: z.literal(true), data: dataSchema, meta: toolMetaSchema });

export const toolResultSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.union([toolSuccessSchema(dataSchema), toolFailureSchema]);

export const ruleOutcomeSchema = z.object({
  ruleId: identifierSchema,
  ruleVersion: identifierSchema,
  severity: z.enum(['HARD', 'SOFT']),
  outcome: z.enum(['PASS', 'WARN', 'FAIL', 'NOT_EVALUATED']),
  evidenceRefs: z.array(identifierSchema),
  message: z.string().min(1),
});

export const connectorProvenanceSchema = z.object({
  connectorId: identifierSchema,
  connectorVersion: identifierSchema,
  method: identifierSchema,
  methodVersion: identifierSchema,
  status: z.enum(['LIVE', 'CACHED', 'SYNTHETIC', 'FIXTURE', 'FAILED']),
  sourceUri: z.string().url().optional(),
  cacheKey: sha256Schema.optional(),
  fixtureId: identifierSchema.optional(),
  parameters: z.record(z.unknown()),
  predictionSource: z.enum(['LIVE', 'CACHED', 'SYNTHETIC', 'FIXTURE']).optional(),
  scientificUse: z.boolean().optional(),
  validationStatus: z.enum(['SCIENTIFIC', 'DEMONSTRATION_ONLY', 'VERIFIED_FIXTURE']).optional(),
  algorithm: identifierSchema.optional(),
  algorithmVersion: identifierSchema.optional(),
  datasetVersion: identifierSchema.optional(),
  datasetHash: sha256Schema.optional(),
});

export function failureExample(toolName: string) {
  return {
    ok: false as const,
    error: {
      code: 'DEPENDENCY_UNAVAILABLE',
      category: 'INTERNAL' as const,
      message: 'The required capability is not configured.',
      retryable: false,
    },
    meta: {
      requestId: 'example-request',
      runId: 'example-run',
      toolName,
      toolVersion: TOOL_VERSION,
      startedAt: '2026-07-24T00:00:00.000Z',
      inputHash: '0'.repeat(64),
    },
  };
}
