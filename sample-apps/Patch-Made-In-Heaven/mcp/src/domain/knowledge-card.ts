import { z } from 'zod';

/**
 * The `hm.v1` Knowledge Card contract: the one runtime-validated shape every
 * fix — seeded or agent-submitted — must satisfy before it can be trusted.
 * A card is only eligible for indexing/search when `isTrustedForIndexing`
 * returns true, which requires a real PASS verification with captured
 * execution evidence, not just a caller-supplied status flag.
 */

export const KNOWLEDGE_CARD_SCHEMA_VERSION = 'hm.v1' as const;

const STABLE_ID_PATTERN = /^[a-z][a-z0-9]*(?:[_-][a-z0-9]+)*$/;
const UNIFIED_DIFF_HEADER_PATTERN = /^--- .+\n\+\+\+ .+/m;

function isUnifiedDiff(patch: string): boolean {
  return UNIFIED_DIFF_HEADER_PATTERN.test(patch);
}

export const environmentMetaSchema = z.object({
  language: z.string().trim().min(1),
  version: z.string().trim().min(1).optional(),
  framework: z.string().trim().min(1).optional(),
  packageVersions: z.record(z.string().trim().min(1)).optional(),
});
export type EnvironmentMeta = z.infer<typeof environmentMetaSchema>;

export const sandboxTypeSchema = z.enum(['docker']);
export type SandboxType = z.infer<typeof sandboxTypeSchema>;

export const verificationStatusSchema = z.enum(['PASS', 'FAIL']);
export type VerificationStatus = z.infer<typeof verificationStatusSchema>;

export const verificationMetaSchema = z.object({
  status: verificationStatusSchema,
  score: z.number().min(0).max(1),
  lastVerified: z.string().datetime({ offset: true }),
  sandbox: sandboxTypeSchema,
  // Execution evidence. Optional at the type level so pre-Phase-1 prototype
  // records still structurally satisfy this contract; `isTrustedForIndexing`
  // and the superRefine below are what actually enforce the trust rule.
  exitCode: z.number().int().optional(),
  durationMs: z.number().int().nonnegative().optional(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
});
export type VerificationMeta = z.infer<typeof verificationMetaSchema>;

export const provenanceSchema = z.object({
  source: z.enum(['seed', 'agent-submitted']),
  category: z.enum(['python', 'node', 'docker', 'general']).optional(),
  addedAt: z.string().datetime({ offset: true }),
  addedBy: z.string().trim().min(1).optional(),
});
export type Provenance = z.infer<typeof provenanceSchema>;

export const knowledgeCardSchema = z
  .object({
    schemaVersion: z.literal(KNOWLEDGE_CARD_SCHEMA_VERSION).optional(),
    id: z
      .string()
      .trim()
      .regex(STABLE_ID_PATTERN, 'id must be a stable lowercase slug (letters, numbers, hyphen, underscore)'),
    problem: z.string().trim().min(1),
    errorType: z.string().trim().min(1),
    stacktrace: z.string().optional(),
    environment: environmentMetaSchema,
    patch: z
      .string()
      .trim()
      .min(1)
      .refine(isUnifiedDiff, { message: 'patch must be a unified diff containing "--- " and "+++ " headers' }),
    verification: verificationMetaSchema,
    metrics: z.object({ reuseCount: z.number().int().nonnegative() }),
    embedding: z.array(z.number().finite()).optional(),
    embeddingModel: z.string().trim().min(1).optional(),
    embeddingDimensions: z.number().int().positive().optional(),
    provenance: provenanceSchema.optional(),
  })
  .superRefine((card, ctx) => {
    if (card.verification.status === 'PASS') {
      if (card.verification.exitCode === undefined || card.verification.exitCode !== 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['verification', 'exitCode'],
          message: 'A PASS verification requires a captured exit code of 0.',
        });
      }
      if (card.verification.durationMs === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['verification', 'durationMs'],
          message: 'A PASS verification requires a captured execution duration.',
        });
      }
      const hasLogEvidence = Boolean(card.verification.stdout?.trim() || card.verification.stderr?.trim());
      if (!hasLogEvidence) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['verification'],
          message: 'A PASS verification requires captured stdout/stderr execution log evidence.',
        });
      }
    }
    if (card.embedding && card.embeddingDimensions && card.embedding.length !== card.embeddingDimensions) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['embedding'],
        message: 'embedding length must match embeddingDimensions.',
      });
    }
  });

export type KnowledgeCard = z.infer<typeof knowledgeCardSchema>;

export function parseKnowledgeCard(input: unknown): KnowledgeCard {
  return knowledgeCardSchema.parse(input);
}

export function safeParseKnowledgeCard(input: unknown) {
  return knowledgeCardSchema.safeParse(input);
}

/** True only for a schema-valid card with a real, evidenced PASS verification. */
export function isTrustedForIndexing(card: unknown): boolean {
  const result = knowledgeCardSchema.safeParse(card);
  return result.success && result.data.verification.status === 'PASS';
}
