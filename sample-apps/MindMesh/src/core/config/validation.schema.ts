import { z } from 'zod';

/**
 * Environment Configuration Schema
 *
 * Validates all required environment variables at startup.
 */
export const EnvSchema = z.object({
  // Core
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Semantic Scholar
  SEMANTIC_SCHOLAR_API_KEY: z.string().optional(),

  // GitHub
  GITHUB_TOKEN: z.string().optional(),

  // Embeddings
  EMBEDDING_PROVIDER: z.enum(['local', 'openai']).default('local'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),

  // Overleaf
  OVERLEAF_GIT_URL: z.string().url().optional().or(z.literal('')),
  OVERLEAF_GIT_TOKEN: z.string().optional(),

  // Memory Persistence
  MEMORY_PERSIST_PATH: z.string().default('./data/memory.json'),
  MEMORY_PERSIST_INTERVAL_MS: z.coerce.number().default(30000),
});

export type EnvConfig = z.infer<typeof EnvSchema>;

/**
 * Validates and parses environment variables.
 * Throws on validation failure with descriptive error.
 */
export function validateEnv(): EnvConfig {
  const result = EnvSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors.map(e =>
      `${e.path.join('.')}: ${e.message}`
    ).join('\n');
    throw new Error(`Environment validation failed:\n${errors}`);
  }

  return result.data;
}