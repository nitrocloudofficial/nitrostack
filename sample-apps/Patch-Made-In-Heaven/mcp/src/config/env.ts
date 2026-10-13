import * as path from 'path';
import dotenv from 'dotenv';

// Load root .env file if available, followed by local .env
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

import { z } from 'zod';


/**
 * Centralized, Zod-validated runtime configuration for the Patch Made In Heaven MCP server.
 *
 * `loadEnv` never touches `process.env` unless called with no arguments, so tests can
 * validate arbitrary configurations without mutating global state. `getEnv` is the
 * memoized accessor application code should use.
 */

const booleanFromString = () =>
  z.preprocess((value) => {
    if (value === undefined) return undefined;
    if (typeof value === 'boolean') return value;
    return String(value).trim().toLowerCase() === 'true';
  }, z.boolean());

const optionalUrl = () => z.string().trim().url().optional();

/**
 * `dotenv` parses a blank `KEY=` line (exactly what `.env.example`'s optional
 * fields look like) as an empty string, not `undefined`. Without this, every
 * optional field here would reject that empty string as invalid input (e.g.
 * `ELASTICSEARCH_URL=` failing `.url()`) instead of treating it as "not
 * configured" — meaning copying `.env.example` to `.env` exactly as
 * documented would crash the server on startup. Blank means unset, uniformly.
 */
function blankStringsToUndefined(input: unknown): unknown {
  if (typeof input !== 'object' || input === null) {
    return input;
  }
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    cleaned[key] = typeof value === 'string' && value.trim() === '' ? undefined : value;
  }
  return cleaned;
}

const rawEnvSchema = z.preprocess(
  blankStringsToUndefined,
  z
    .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    NITRO_LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    NITROSTACK_APP_MODE: z.string().trim().min(1).default('universal'),

    ELASTICSEARCH_URL: optionalUrl(),
    ELASTICSEARCH_API_KEY: z.string().trim().min(1).optional(),
    ELASTICSEARCH_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),

    OPENROUTER_API_KEY: z.string().trim().min(1).optional(),
    // Fallback embedding key for when the primary runs out of credits (Phase 7).
    // Purely optional — never required even when OPENROUTER_API_KEY is set.
    OPENROUTER_API_KEY_2: z.string().trim().min(1).optional(),
    OPENROUTER_BASE_URL: optionalUrl().default('https://openrouter.ai/api/v1'),
    OPENROUTER_EMBEDDING_MODEL: z.string().trim().min(1).default('nvidia/nemotron-3-embed-1b:free'),
    EMBEDDING_VECTOR_DIMENSIONS: z.coerce.number().int().positive().optional(),
    EMBEDDING_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),

    GROQ_API_KEY: z.string().trim().min(1).optional(),
    GROQ_REASONING_MODEL: z.string().trim().min(1).default('qwen/qwen3.6-27b'),

    SEARCH_RESULT_LIMIT_DEFAULT: z.coerce.number().int().positive().default(5),
    SEARCH_RESULT_LIMIT_MAX: z.coerce.number().int().positive().default(25),

    MCP_TRANSPORT_TYPE: z.enum(['stdio', 'http', 'dual']).optional(),
    PORT: z.coerce.number().int().positive().optional(),
    HOST: z.string().trim().min(1).optional(),
    ENABLE_CORS: booleanFromString().optional(),

    // Decision 005: Docker, not Modal. The binary name is configurable so a local
    // dev machine without `docker` installed can substitute an OCI-compatible
    // engine (e.g. podman) without changing the production default.
    SANDBOX_CONTAINER_RUNTIME: z.string().trim().min(1).default('docker'),
    SANDBOX_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
    SANDBOX_MEMORY_LIMIT: z.string().trim().min(1).default('256m'),
    SANDBOX_CPU_LIMIT: z.string().trim().min(1).default('1'),
    SANDBOX_PIDS_LIMIT: z.coerce.number().int().positive().default(128),
    SANDBOX_MAX_OUTPUT_BYTES: z.coerce.number().int().positive().default(65536),

    // Decision 010 (Phase 6): production sandbox provider selection. Explicit
    // opt-in only — always defaults to 'local' (Docker/podman, Decision 005).
    // NitroCloud's serverless runtime has no container engine at all (confirmed
    // live: `verify_fix` returned `spawn docker ENOENT`), so the production
    // deployment must explicitly set SANDBOX_PROVIDER=e2b; nothing here
    // auto-detects or silently switches providers based on E2B_API_KEY's
    // presence alone, so a local dev machine with a key configured for testing
    // can never accidentally run production verification against a paid remote.
    SANDBOX_PROVIDER: z.enum(['local', 'e2b']).default('local'),
    E2B_API_KEY: z.string().trim().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.OPENROUTER_API_KEY && !value.EMBEDDING_VECTOR_DIMENSIONS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['EMBEDDING_VECTOR_DIMENSIONS'],
        message:
          'EMBEDDING_VECTOR_DIMENSIONS is required once OPENROUTER_API_KEY is set, so the Elasticsearch dense_vector mapping matches the configured embedding model.',
      });
    }
    if (value.SEARCH_RESULT_LIMIT_DEFAULT > value.SEARCH_RESULT_LIMIT_MAX) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SEARCH_RESULT_LIMIT_DEFAULT'],
        message: 'SEARCH_RESULT_LIMIT_DEFAULT cannot exceed SEARCH_RESULT_LIMIT_MAX.',
      });
    }
    if (value.SANDBOX_PROVIDER === 'e2b' && !value.E2B_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['E2B_API_KEY'],
        message: 'E2B_API_KEY is required once SANDBOX_PROVIDER=e2b is set.',
      });
    }
  })
);

export type RawAppEnv = z.infer<typeof rawEnvSchema>;

export interface AppEnv {
  nodeEnv: 'development' | 'test' | 'production';
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  appMode: string;
  elasticsearch: {
    url?: string;
    apiKey?: string;
    requestTimeoutMs: number;
  };
  embedding: {
    baseUrl: string;
    apiKey?: string;
    /** Credits-exhaustion fallback for `apiKey` (Phase 7) — tried once if the primary key's own retries are exhausted. */
    fallbackApiKey?: string;
    model: string;
    dimensions?: number;
    requestTimeoutMs: number;
  };
  reasoning: {
    apiKey?: string;
    model: string;
  };
  search: {
    defaultLimit: number;
    maxLimit: number;
  };
  transport: {
    type?: 'stdio' | 'http' | 'dual';
    port?: number;
    host?: string;
    corsEnabled?: boolean;
  };
  sandbox: {
    containerRuntime: string;
    timeoutMs: number;
    memoryLimit: string;
    cpuLimit: string;
    pidsLimit: number;
    maxOutputBytes: number;
    provider: 'local' | 'e2b';
    e2bApiKey?: string;
  };
}

export class EnvironmentConfigError extends Error {
  constructor(issues: string[]) {
    super(`Invalid environment configuration:\n- ${issues.join('\n- ')}`);
    this.name = 'EnvironmentConfigError';
  }
}

function toAppEnv(raw: RawAppEnv): AppEnv {
  return {
    nodeEnv: raw.NODE_ENV,
    logLevel: raw.NITRO_LOG_LEVEL,
    appMode: raw.NITROSTACK_APP_MODE,
    elasticsearch: {
      url: raw.ELASTICSEARCH_URL,
      apiKey: raw.ELASTICSEARCH_API_KEY,
      requestTimeoutMs: raw.ELASTICSEARCH_REQUEST_TIMEOUT_MS,
    },
    embedding: {
      baseUrl: raw.OPENROUTER_BASE_URL,
      apiKey: raw.OPENROUTER_API_KEY,
      fallbackApiKey: raw.OPENROUTER_API_KEY_2,
      model: raw.OPENROUTER_EMBEDDING_MODEL,
      dimensions: raw.EMBEDDING_VECTOR_DIMENSIONS,
      requestTimeoutMs: raw.EMBEDDING_REQUEST_TIMEOUT_MS,
    },
    reasoning: {
      apiKey: raw.GROQ_API_KEY,
      model: raw.GROQ_REASONING_MODEL,
    },
    search: {
      defaultLimit: raw.SEARCH_RESULT_LIMIT_DEFAULT,
      maxLimit: raw.SEARCH_RESULT_LIMIT_MAX,
    },
    transport: {
      type: raw.MCP_TRANSPORT_TYPE,
      port: raw.PORT,
      host: raw.HOST,
      corsEnabled: raw.ENABLE_CORS,
    },
    sandbox: {
      containerRuntime: raw.SANDBOX_CONTAINER_RUNTIME,
      timeoutMs: raw.SANDBOX_TIMEOUT_MS,
      memoryLimit: raw.SANDBOX_MEMORY_LIMIT,
      cpuLimit: raw.SANDBOX_CPU_LIMIT,
      pidsLimit: raw.SANDBOX_PIDS_LIMIT,
      maxOutputBytes: raw.SANDBOX_MAX_OUTPUT_BYTES,
      provider: raw.SANDBOX_PROVIDER,
      e2bApiKey: raw.E2B_API_KEY,
    },
  };
}

/**
 * Validates a raw environment record into a typed `AppEnv`. Pass an explicit `source`
 * (e.g. in tests) to avoid depending on process-wide `process.env` state.
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const result = rawEnvSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`);
    throw new EnvironmentConfigError(issues);
  }
  return toAppEnv(result.data);
}

export interface EnvCapabilities {
  elasticsearchConfigured: boolean;
  embeddingConfigured: boolean;
  embeddingFallbackConfigured: boolean;
  reasoningConfigured: boolean;
  embeddingModel: string;
  embeddingDimensions: number | null;
  searchDefaultLimit: number;
  searchMaxLimit: number;
}

/** Safe-to-log capability summary. Never includes credential values. */
export function describeCapabilities(appEnv: AppEnv): EnvCapabilities {
  return {
    elasticsearchConfigured: Boolean(appEnv.elasticsearch.url),
    embeddingConfigured: Boolean(appEnv.embedding.apiKey),
    embeddingFallbackConfigured: Boolean(appEnv.embedding.fallbackApiKey),
    reasoningConfigured: Boolean(appEnv.reasoning.apiKey),
    embeddingModel: appEnv.embedding.model,
    embeddingDimensions: appEnv.embedding.dimensions ?? null,
    searchDefaultLimit: appEnv.search.defaultLimit,
    searchMaxLimit: appEnv.search.maxLimit,
  };
}

let cachedEnv: AppEnv | undefined;

/** Memoized accessor for application code. Validates `process.env` on first call. */
export function getEnv(): AppEnv {
  if (!cachedEnv) {
    cachedEnv = loadEnv();
  }
  return cachedEnv;
}
