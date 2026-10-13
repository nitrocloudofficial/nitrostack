import { Client, type ClientOptions } from '@elastic/elasticsearch';
import { createHash, randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import { getEnv, type AppEnv } from '../config/env.js';
import { environmentMetaSchema, type EnvironmentMeta } from '../domain/knowledge-card.js';

dotenv.config();

/**
 * Server-owned Verification Run storage (Decision 009, Phase 3). A `verify_fix` call
 * creates one of these as immutable proof that a candidate patch actually ran and
 * produced a given outcome; a later `submit_fix` call looks it up and matches it —
 * never trusts a caller-supplied status directly. Lives in a second Elasticsearch
 * index (`hacksmymachine-verification-runs`) rather than in-memory, since nothing
 * about the PRD scopes this as single-instance-only and Decision 008's NitroCloud
 * context implies more than one stateless replica is possible.
 */

export const VERIFICATION_RUN_INDEX_NAME = 'hacksmymachine-verification-runs';

/** Decision 009's accepted default. A run older than this is treated as gone, never deleted outright. */
export const DEFAULT_VERIFICATION_RUN_TTL_MS = 24 * 60 * 60 * 1000;

export type VerificationRunStatus = 'PASS' | 'FAIL' | 'TIMEOUT';

export interface VerificationRun {
  verificationRunId: string;
  status: VerificationRunStatus;
  /** SHA-256 hex digest of the exact patch/diff this run verified. */
  patchDigest: string;
  testCommand: string;
  environment: EnvironmentMeta;
  diff: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  durationMs: number | null;
  sandbox: string;
  createdAt: string;
  expiresAt: string;
}

export interface CreateVerificationRunInput {
  status: VerificationRunStatus;
  patch: string;
  testCommand: string;
  environment: EnvironmentMeta;
  diff: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  durationMs: number | null;
  sandbox: string;
}

/**
 * The seam every `VerificationRunClient` call goes through — narrow on purpose so
 * unit tests can supply a deterministic in-memory fake without a live cluster,
 * mirroring `ElasticClientLike` in `elastic.client.ts`.
 */
export interface VerificationRunClientLike {
  indices: {
    exists(params: { index: string }): Promise<boolean>;
    create(params: {
      index: string;
      mappings: { properties: Record<string, unknown> };
    }): Promise<unknown>;
  };
  index(params: { index: string; id: string; document: unknown }): Promise<unknown>;
  get(params: { index: string; id: string }): Promise<{ _source?: unknown }>;
}

export class VerificationRunClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VerificationRunClientError';
  }
}

function buildMappingProperties(): Record<string, unknown> {
  return {
    verificationRunId: { type: 'keyword' },
    status: { type: 'keyword' },
    patchDigest: { type: 'keyword' },
    testCommand: { type: 'text', index: false },
    'environment.language': { type: 'keyword' },
    'environment.version': { type: 'keyword' },
    'environment.framework': { type: 'keyword' },
    'environment.packageVersions': { type: 'flattened' },
    diff: { type: 'text', index: false },
    stdout: { type: 'text', index: false },
    stderr: { type: 'text', index: false },
    exitCode: { type: 'integer' },
    durationMs: { type: 'integer' },
    sandbox: { type: 'keyword' },
    createdAt: { type: 'date' },
    expiresAt: { type: 'date' },
  };
}

/** SHA-256 hex digest — the canonical patch identity a later `submit_fix` must match against. */
export function computePatchDigest(patch: string): string {
  return createHash('sha256').update(patch, 'utf8').digest('hex');
}

export interface VerificationRunClientOptions {
  env?: AppEnv;
  client?: VerificationRunClientLike;
  indexName?: string;
  ttlMs?: number;
}

export class VerificationRunClient {
  private readonly client: VerificationRunClientLike | null;
  private readonly indexName: string;
  private readonly ttlMs: number;
  private readonly apiKey?: string;

  constructor(options: VerificationRunClientOptions = {}) {
    const env = options.env ?? getEnv();
    this.indexName = options.indexName ?? VERIFICATION_RUN_INDEX_NAME;
    this.ttlMs = options.ttlMs ?? DEFAULT_VERIFICATION_RUN_TTL_MS;
    this.apiKey = env.elasticsearch.apiKey;

    if (options.client) {
      this.client = options.client;
    } else if (env.elasticsearch.url) {
      const clientOptions: ClientOptions = {
        node: env.elasticsearch.url,
        requestTimeout: env.elasticsearch.requestTimeoutMs,
      };
      if (env.elasticsearch.apiKey) {
        clientOptions.auth = { apiKey: env.elasticsearch.apiKey };
      }
      this.client = new Client(clientOptions) as unknown as VerificationRunClientLike;
    } else {
      this.client = null;
    }
  }

  public isConnected(): boolean {
    return this.client !== null;
  }

  /** Never deletes or recreates an existing index — creates it once if absent. */
  public async initIndex(): Promise<boolean> {
    if (!this.client) {
      console.warn('[VerificationRunClient] Elasticsearch not configured. Skipping index initialization.');
      return false;
    }

    let exists: boolean;
    try {
      exists = await this.client.indices.exists({ index: this.indexName });
    } catch (error) {
      throw this.wrapError('Failed to check Elasticsearch index existence', error);
    }

    if (exists) {
      return true;
    }

    try {
      await this.client.indices.create({
        index: this.indexName,
        mappings: { properties: buildMappingProperties() },
      });
    } catch (error) {
      throw this.wrapError('Failed to create Elasticsearch index', error);
    }

    return true;
  }

  /** Persists a new, immutable Verification Run and returns it, digest and expiry computed here. */
  public async create(input: CreateVerificationRunInput): Promise<VerificationRun> {
    if (!this.client) {
      throw new VerificationRunClientError('Cannot create a verification run: Elasticsearch is not configured.');
    }

    environmentMetaSchema.parse(input.environment);

    const now = Date.now();
    const run: VerificationRun = {
      verificationRunId: randomUUID(),
      status: input.status,
      patchDigest: computePatchDigest(input.patch),
      testCommand: input.testCommand,
      environment: input.environment,
      diff: input.diff,
      stdout: input.stdout,
      stderr: input.stderr,
      exitCode: input.exitCode,
      durationMs: input.durationMs,
      sandbox: input.sandbox,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + this.ttlMs).toISOString(),
    };

    try {
      await this.client.index({ index: this.indexName, id: run.verificationRunId, document: run });
    } catch (error) {
      throw this.wrapError('Failed to persist a verification run', error);
    }

    return run;
  }

  /**
   * Looks up a run by id. Returns `null` (never throws) for: not found, expired
   * (TTL elapsed — never actively deleted, just no longer honored), or — when
   * `expectedPatchDigest` is supplied — a patch digest mismatch. Callers (e.g.
   * `submit_fix`) must treat `null` as "no trustworthy verification exists",
   * not attempt to distinguish which case occurred from the return value alone.
   */
  public async lookup(verificationRunId: string, expectedPatchDigest?: string): Promise<VerificationRun | null> {
    if (!this.client) {
      return null;
    }

    let source: unknown;
    try {
      const res = await this.client.get({ index: this.indexName, id: verificationRunId });
      source = res._source;
    } catch {
      return null;
    }

    if (!source) {
      return null;
    }

    const run = source as VerificationRun;

    if (Date.parse(run.expiresAt) <= Date.now()) {
      return null;
    }

    if (expectedPatchDigest !== undefined && run.patchDigest !== expectedPatchDigest) {
      return null;
    }

    return run;
  }

  /** Strips the configured API key out of any error message before it can be logged or returned. */
  private sanitizeMessage(message: string): string {
    return this.apiKey ? message.split(this.apiKey).join('[REDACTED]') : message;
  }

  private wrapError(context: string, error: unknown): VerificationRunClientError {
    const rawMessage = error instanceof Error ? error.message : String(error);
    return new VerificationRunClientError(`${context}: ${this.sanitizeMessage(rawMessage)}`);
  }
}
