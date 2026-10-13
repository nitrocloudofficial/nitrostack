/**
 * Typed environment accessor
 *
 * Zod-validated process.env. Import `env` anywhere instead of reading
 * process.env directly so misconfiguration fails loudly at boot, not
 * mid-request. All upstream base URLs have live defaults (verified in §4.1).
 */
import { z } from 'zod';

/** Converts empty strings ("") or whitespace-only env strings into undefined. */
const emptyToUndefined = (schema: z.ZodTypeAny) =>
  z.preprocess((v) => {
    if (typeof v === 'string' && v.trim() === '') {
      return undefined;
    }
    return v;
  }, schema);

/** Parses 'true'/'false'/'1'/'0'/'yes'/'on' style env strings into booleans. */
const boolFromString = (defaultValue: boolean) =>
  z.preprocess((v) => {
    if (typeof v === 'string') {
      const trimmed = v.trim().toLowerCase();
      if (trimmed === '') return defaultValue;
      return ['true', '1', 'yes', 'on'].includes(trimmed);
    }
    return v;
  }, z.boolean().default(defaultValue));

const envSchema = z.object({
  // Runtime / transport (framework reads these values too).
  NODE_ENV: emptyToUndefined(z.enum(['development', 'test', 'production']).default('development')),
  MCP_TRANSPORT_TYPE: emptyToUndefined(z.enum(['stdio', 'http', 'dual']).optional()),
  PORT: z.preprocess((v) => (v === '' ? undefined : v), z.coerce.number().int().min(1).max(65535).default(3000)),
  HOST: emptyToUndefined(z.string().min(1).default('localhost')),
  NITRO_LOG_LEVEL: emptyToUndefined(z.enum(['debug', 'info', 'warn', 'error']).default('info')),
  ENABLE_CORS: boolFromString(true),

  // Auth (§5.1) — optional at schema level; guards enforce presence per deployment
  API_KEY_CLINICIAN: emptyToUndefined(z.string().min(8).optional()),
  API_KEY_READONLY: emptyToUndefined(z.string().min(8).optional()),
  API_KEY_ADMIN: emptyToUndefined(z.string().min(8).optional()),
  VITALIS_ALLOW_ANONYMOUS_DEMO: boolFromString(false),
  // JWT is enabled when JWT_SECRET is configured. Issuer/audience checks are
  // optional and become mandatory when the corresponding deployment setting is
  // present.
  JWT_SECRET: emptyToUndefined(z.string().min(16).optional()),
  JWT_ISSUER: emptyToUndefined(z.string().min(1).optional()),
  JWT_AUDIENCE: emptyToUndefined(z.string().min(1).optional()),

  // Upstream APIs (§4.1 — all verified live)
  RXNORM_BASE_URL: emptyToUndefined(z.string().url().default('https://rxnav.nlm.nih.gov/REST')),
  RXCLASS_BASE_URL: emptyToUndefined(z.string().url().default('https://rxnav.nlm.nih.gov/REST/rxclass')),
  CLINTABLES_BASE_URL: emptyToUndefined(z.string().url().default('https://clinicaltables.nlm.nih.gov/api')),
  OPENFDA_BASE_URL: emptyToUndefined(z.string().url().default('https://api.fda.gov')),
  OPENFDA_API_KEY: emptyToUndefined(z.string().optional()),
  NCBI_BASE_URL: emptyToUndefined(z.string().url().default('https://eutils.ncbi.nlm.nih.gov/entrez/eutils')),
  NCBI_API_KEY: emptyToUndefined(z.string().optional()),
  NCBI_EMAIL: emptyToUndefined(z.string().email().optional()),
  TRIALS_BASE_URL: emptyToUndefined(z.string().url().default('https://clinicaltrials.gov/api/v2')),
  FHIR_BASE_URL: emptyToUndefined(z.string().url().default('https://hapi.fhir.org/baseR4')),
  FHIR_BASE_URL_FALLBACK: emptyToUndefined(z.string().url().default('https://r4.smarthealthit.org')),

  // Optional WHO ICD-11 upgrade (§13-S3)
  ICD_CLIENT_ID: emptyToUndefined(z.string().optional()),
  ICD_CLIENT_SECRET: emptyToUndefined(z.string().optional()),
  ICD_BASE_URL: emptyToUndefined(z.string().url().default('https://id.who.int/icd')),

  // Safety + ops
  VITALIS_SAFETY_LAYER: emptyToUndefined(z.enum(['on', 'off']).default('on')),
  AUDIT_LOG_PATH: emptyToUndefined(z.string().min(1).default('logs/audit.jsonl')),
  CONTACT_EMAIL: emptyToUndefined(z.string().email().optional()),
});

export type Env = z.infer<typeof envSchema>;

export type AuthEnvironmentConfig = Pick<
  Env,
  | 'NODE_ENV'
  | 'API_KEY_CLINICIAN'
  | 'API_KEY_READONLY'
  | 'API_KEY_ADMIN'
  | 'JWT_SECRET'
>;

export type DeploymentEnvironmentConfig = AuthEnvironmentConfig &
  Pick<Env, 'CONTACT_EMAIL' | 'NCBI_EMAIL'>;

/**
 * Returns deployment-time authentication configuration errors without reading
 * process.env. Keeping this pure makes the production fail-closed rule easy to
 * test without terminating the Vitest process.
 */
export function getAuthConfigurationErrors(config: AuthEnvironmentConfig): string[] {
  if (config.NODE_ENV !== 'production') return [];

  const hasConfiguredCredential = Boolean(
    config.API_KEY_CLINICIAN ||
      config.API_KEY_READONLY ||
      config.API_KEY_ADMIN ||
      config.JWT_SECRET,
  );

  return hasConfiguredCredential
    ? []
    : [
        'Production authentication requires at least one configured API key or JWT_SECRET. ' +
          'Anonymous access cannot be used as the only production authentication mode.',
      ];
}

export function getDeploymentConfigurationErrors(config: DeploymentEnvironmentConfig): string[] {
  if (config.NODE_ENV !== 'production') return [];

  const errors = [...getAuthConfigurationErrors(config)];
  if (!config.CONTACT_EMAIL) {
    errors.push('CONTACT_EMAIL is required in production for the outbound User-Agent policy.');
  }
  if (!config.NCBI_EMAIL) {
    errors.push('NCBI_EMAIL is required in production for PubMed/NCBI etiquette.');
  }
  return errors;
}

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error(
      '❌ Invalid environment configuration:',
      JSON.stringify(result.error.flatten().fieldErrors, null, 2),
    );
    process.exit(1);
  }

  const deploymentErrors = getDeploymentConfigurationErrors(result.data);
  if (deploymentErrors.length > 0) {
    console.error('❌ Invalid production configuration:', JSON.stringify(deploymentErrors, null, 2));
    process.exit(1);
  }

  return result.data;
}

export const env: Env = loadEnv();
