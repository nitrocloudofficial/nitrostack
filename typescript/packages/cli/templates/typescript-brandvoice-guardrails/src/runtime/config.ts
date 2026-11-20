/**
 * Copyright 2025 Nitrostack Inc
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Runtime configuration. Demo by default, production by environment variables.
 *
 *   demo        file store, demo bearer tokens, generated admin key and webhook secret
 *   production  database store, real identity, secrets from the environment
 */

export type StoreKind = 'file' | 'memory' | 'mongodb' | 'postgres';
export type IdentityKind = 'demo' | 'jwt' | 'api-key';

export interface RuntimeConfig {
  profile: 'demo' | 'production';
  host: string;
  port: number;
  adminPort: number;
  stateDir: string;
  store: StoreKind;
  mongodbUri?: string;
  databaseUrl?: string;
  identity: IdentityKind[];
  allowDemoIdentities: boolean;
  jwt?: { issuer: string; audience: string; jwksUrl?: string; tenantClaim: string; adminScope: string };
  /** sha256(key) -> identity, from GUARDRAILS_API_KEYS. */
  apiKeys: Map<string, { tenantId: string; principalId: string; role: 'agent' | 'admin' }>;
  admin: { key: string; generated: boolean };
  webhook: { secrets: string[]; generated: boolean; mode: 'invalidate' | 'activate' };
  cache: { ttlMs: number; maxStaleMs: number; pollMs: number };
}

const env = (name: string) => {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
};

const int = (name: string, fallback: number, min: number, max: number) => {
  const raw = env(name);
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return value;
};

export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

const isLoopback = (host: string) => ['127.0.0.1', '::1', 'localhost'].includes(host);

/** Reads or creates a secret under the state directory, so demo restarts keep the same values. */
function demoSecret(stateDir: string, file: string, prefix: string) {
  const path = join(stateDir, file);
  try {
    return readFileSync(path, 'utf8').trim();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    mkdirSync(stateDir, { recursive: true, mode: 0o700 });
    const secret = prefix + randomBytes(24).toString('base64url');
    writeFileSync(path, secret + '\n', { mode: 0o600, flag: 'wx' });
    return secret;
  }
}

function parseApiKeys(raw: string | undefined): RuntimeConfig['apiKeys'] {
  // Format: <sha256 of key>:<team>:<agent|admin>[:<principal>], comma separated.
  const keys: RuntimeConfig['apiKeys'] = new Map();
  for (const entry of (raw ?? '').split(',').map((s) => s.trim()).filter(Boolean)) {
    const [hash, tenantId, role, principalId] = entry.split(':');
    if (!/^[a-f0-9]{64}$/.test(hash ?? '') || !tenantId || (role !== 'agent' && role !== 'admin')) {
      throw new Error('GUARDRAILS_API_KEYS entries must be <sha256>:<team>:<agent|admin>[:<principal>]');
    }
    keys.set(hash, { tenantId, role, principalId: principalId || `${tenantId}-${role}-key` });
  }
  return keys;
}

export function loadConfig(): RuntimeConfig {
  const profile = env('GUARDRAILS_PROFILE') ?? 'demo';
  if (profile !== 'demo' && profile !== 'production') throw new Error('GUARDRAILS_PROFILE must be demo or production');

  const stateDir = resolve(env('BRANDVOICE_STATE_DIR') ?? '.brandvoice');
  const port = int('PORT', 3100, 1, 65535);
  const host = env('HOST') ?? '127.0.0.1';

  const mongodbUri = env('MONGODB_URI');
  const databaseUrl = env('DATABASE_URL');
  const store = (env('GUARDRAILS_STORE') ??
    (mongodbUri ? 'mongodb' : databaseUrl ? 'postgres' : 'file')) as StoreKind;
  if (!['file', 'memory', 'mongodb', 'postgres'].includes(store)) {
    throw new Error('GUARDRAILS_STORE must be file, memory, mongodb or postgres');
  }
  if (store === 'mongodb' && !mongodbUri) throw new Error('GUARDRAILS_STORE=mongodb needs MONGODB_URI');
  if (store === 'postgres' && !databaseUrl) throw new Error('GUARDRAILS_STORE=postgres needs DATABASE_URL');

  const issuer = env('OIDC_ISSUER');
  const jwt = issuer
    ? {
        issuer,
        audience: env('OIDC_AUDIENCE') ?? 'brandvoice-guardian',
        jwksUrl: env('OIDC_JWKS_URL'),
        tenantClaim: env('GUARDRAILS_TENANT_CLAIM') ?? 'org_id',
        adminScope: env('GUARDRAILS_ADMIN_SCOPE') ?? 'guardrails:admin',
      }
    : undefined;
  const apiKeys = parseApiKeys(env('GUARDRAILS_API_KEYS'));

  const defaultIdentity = ['demo', ...(jwt ? ['jwt'] : []), ...(apiKeys.size ? ['api-key'] : [])].join(',');
  const identity = (env('GUARDRAILS_IDENTITY') ?? (profile === 'demo' ? defaultIdentity : defaultIdentity.replace(/^demo,?/, '')))
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean) as IdentityKind[];
  if (identity.some((i) => !['demo', 'jwt', 'api-key'].includes(i))) {
    throw new Error('GUARDRAILS_IDENTITY may list demo, jwt and api-key');
  }
  if (identity.includes('jwt') && !jwt) throw new Error('GUARDRAILS_IDENTITY includes jwt but OIDC_ISSUER is not set');

  const adminKey = env('GUARDRAILS_ADMIN_API_KEY');
  const webhookSecrets = (env('GUARDRAILS_WEBHOOK_SECRET') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const demo = profile === 'demo';
  const webhookMode = env('GUARDRAILS_WEBHOOK_MODE') ?? 'invalidate';
  if (webhookMode !== 'invalidate' && webhookMode !== 'activate') {
    throw new Error('GUARDRAILS_WEBHOOK_MODE must be invalidate or activate');
  }

  const config: RuntimeConfig = {
    profile,
    host,
    port,
    adminPort: int('GUARDRAILS_ADMIN_PORT', port + 1, 1, 65535),
    stateDir,
    store,
    mongodbUri,
    databaseUrl,
    identity,
    allowDemoIdentities: env('GUARDRAILS_ALLOW_DEMO_IDENTITIES') === 'true',
    jwt,
    apiKeys,
    admin: adminKey
      ? { key: adminKey, generated: false }
      : { key: demo ? demoSecret(stateDir, 'admin.key', 'nsk_admin_') : '', generated: true },
    webhook: webhookSecrets.length
      ? { secrets: webhookSecrets, generated: false, mode: webhookMode }
      : { secrets: demo ? [demoSecret(stateDir, 'webhook.secret', 'whsec_')] : [], generated: true, mode: webhookMode },
    cache: {
      ttlMs: int('GUARDRAILS_CACHE_TTL_MS', 30_000, 0, 3_600_000),
      maxStaleMs: int('GUARDRAILS_MAX_STALE_MS', 300_000, 0, 86_400_000),
      pollMs: int('GUARDRAILS_POLL_MS', 2_000, 250, 60_000),
    },
  };
  assertSafe(config);
  return config;
}

/** Refuses configurations that would expose demo shortcuts. One message per problem. */
function assertSafe(config: RuntimeConfig) {
  const problems: string[] = [];
  const demoIds = config.identity.includes('demo');

  if (config.profile === 'production') {
    if (config.store === 'file' || config.store === 'memory') {
      problems.push(`GUARDRAILS_STORE=${config.store} is for demos. Set MONGODB_URI or DATABASE_URL.`);
    }
    if (demoIds && !config.allowDemoIdentities) {
      problems.push('Demo identities are enabled. Remove "demo" from GUARDRAILS_IDENTITY or set GUARDRAILS_ALLOW_DEMO_IDENTITIES=true.');
    }
    if (config.admin.generated) problems.push('Set GUARDRAILS_ADMIN_API_KEY (control-plane admin key).');
    if (config.webhook.generated) problems.push('Set GUARDRAILS_WEBHOOK_SECRET (webhook HMAC secret).');
    if (!config.identity.some((i) => i !== 'demo')) {
      problems.push('No real identity is configured. Set OIDC_ISSUER or GUARDRAILS_API_KEYS.');
    }
  } else if (demoIds && !isLoopback(config.host) && !config.allowDemoIdentities) {
    problems.push(`Demo tokens are only accepted on loopback. HOST=${config.host} needs GUARDRAILS_ALLOW_DEMO_IDENTITIES=true.`);
  }
  if (config.adminPort === config.port) problems.push('GUARDRAILS_ADMIN_PORT must differ from PORT.');
  if (problems.length) {
    throw new Error('Unsafe guardrails configuration:\n  - ' + problems.join('\n  - '));
  }
}

let current: RuntimeConfig | undefined;

/** Loaded once per process. */
export function runtimeConfig(): RuntimeConfig {
  current ??= loadConfig();
  return current;
}
