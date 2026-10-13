import type { AppEnv } from '../config/env.js';

/**
 * Injectable, OpenAI-compatible embedding client boundary.
 *
 * Never hardcodes a vector dimension — `dimensions` (when configured) is
 * validated against every returned vector so an index mapping built from
 * `AppEnv.embedding.dimensions` can never silently drift from what the
 * configured model actually returns.
 */

export interface EmbeddingClientOptions {
  baseUrl: string;
  apiKey: string;
  /**
   * Credits-exhaustion fallback (Phase 7): tried once, with its own full
   * retry budget, only after `apiKey`'s own bounded retries are exhausted —
   * regardless of why the primary key failed (rate limited, out of credits,
   * transient network error). Never used if `apiKey` succeeds.
   */
  fallbackApiKey?: string;
  model: string;
  /** Expected vector length. When set, any mismatch is a hard failure. */
  dimensions?: number;
  requestTimeoutMs?: number;
  /** Bounded retries for transient failures (timeouts, 429, 5xx). Not retried on 4xx auth/validation errors. */
  maxRetries?: number;
  maxBatchSize?: number;
  /** Injection point for tests; defaults to the global fetch. */
  fetchImpl?: typeof fetch;
}

/** The provider could not be reached, or returned a non-retryable/exhausted-retry HTTP error. */
export class EmbeddingProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmbeddingProviderError';
  }
}

/** The provider responded successfully but the payload failed validation. */
export class EmbeddingResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmbeddingResponseError';
  }
}

const DEFAULT_REQUEST_TIMEOUT_MS = 15000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_MAX_BATCH_SIZE = 64;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffMs(attempt: number): number {
  return Math.min(250 * 2 ** attempt, 4000);
}

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

interface RawEmbeddingItem {
  index?: number;
  embedding?: unknown;
}

interface RawEmbeddingResponse {
  data?: RawEmbeddingItem[];
}

export class EmbeddingClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fallbackApiKey?: string;
  private readonly model: string;
  private readonly dimensions?: number;
  private readonly requestTimeoutMs: number;
  private readonly maxRetries: number;
  private readonly maxBatchSize: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: EmbeddingClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.apiKey = options.apiKey;
    this.fallbackApiKey = options.fallbackApiKey;
    this.model = options.model;
    this.dimensions = options.dimensions;
    this.requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.maxBatchSize = options.maxBatchSize ?? DEFAULT_MAX_BATCH_SIZE;
    if (!options.fetchImpl && typeof fetch === 'undefined') {
      throw new EmbeddingProviderError('No fetch implementation available; pass fetchImpl explicitly.');
    }
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  /** Embeds one or more strings, preserving input order. Never returns an empty vector for a non-empty input. */
  async embed(input: string | string[]): Promise<number[][]> {
    const items = Array.isArray(input) ? input : [input];
    if (items.length === 0) {
      return [];
    }
    if (items.some((item) => item.trim().length === 0)) {
      throw new EmbeddingResponseError('Cannot embed an empty or whitespace-only string.');
    }

    const results: number[][] = [];
    for (const batch of chunk(items, this.maxBatchSize)) {
      const embeddings = await this.requestBatch(batch);
      results.push(...embeddings);
    }
    return results;
  }

  private async requestBatch(batch: string[], attempt = 0, usingFallback = false): Promise<number[][]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.requestTimeoutMs);
    const apiKey = usingFallback ? this.fallbackApiKey! : this.apiKey;

    // Any failure mode — non-retryable HTTP status, retries exhausted, or a
    // thrown network/timeout error — falls through here exactly once, to
    // retry the same batch fresh on the fallback key (its own full retry
    // budget) before giving up for good. Never used if the primary succeeds.
    const fallbackOnce = (): Promise<number[][]> | undefined => {
      if (!usingFallback && this.fallbackApiKey) {
        return this.requestBatch(batch, 0, true);
      }
      return undefined;
    };

    try {
      const response = await this.fetchImpl(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model: this.model, input: batch }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const retryable = response.status === 429 || response.status >= 500;
        if (retryable && attempt < this.maxRetries) {
          await delay(backoffMs(attempt));
          return this.requestBatch(batch, attempt + 1, usingFallback);
        }
        const fallback = fallbackOnce();
        if (fallback) return fallback;
        throw new EmbeddingProviderError(
          `Embedding provider responded with HTTP ${response.status} ${response.statusText}`.trim()
        );
      }

      const payload = (await response.json()) as RawEmbeddingResponse;
      return this.parseResponse(payload, batch.length);
    } catch (error) {
      if (error instanceof EmbeddingProviderError || error instanceof EmbeddingResponseError) {
        throw error;
      }
      const isTimeout = error instanceof Error && error.name === 'AbortError';
      if (attempt < this.maxRetries) {
        await delay(backoffMs(attempt));
        return this.requestBatch(batch, attempt + 1, usingFallback);
      }
      const fallback = fallbackOnce();
      if (fallback) return fallback;
      throw new EmbeddingProviderError(
        isTimeout
          ? `Embedding request timed out after ${this.requestTimeoutMs}ms.`
          : `Embedding request failed: ${(error as Error).message}`
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private parseResponse(payload: RawEmbeddingResponse, expectedCount: number): number[][] {
    const data = payload?.data;
    if (!Array.isArray(data)) {
      throw new EmbeddingResponseError('Embedding response is missing a "data" array.');
    }
    if (data.length !== expectedCount) {
      throw new EmbeddingResponseError(
        `Embedding response returned ${data.length} item(s) for ${expectedCount} input(s).`
      );
    }

    const ordered = [...data].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

    return ordered.map((item, position) => {
      const vector = item.embedding;
      if (!Array.isArray(vector) || vector.length === 0) {
        throw new EmbeddingResponseError(`Embedding item ${position} is missing a numeric vector.`);
      }
      if (!vector.every((value) => typeof value === 'number' && Number.isFinite(value))) {
        throw new EmbeddingResponseError(`Embedding item ${position} contains non-finite values.`);
      }
      if (this.dimensions !== undefined && vector.length !== this.dimensions) {
        throw new EmbeddingResponseError(
          `Embedding item ${position} has ${vector.length} dimensions, expected ${this.dimensions}.`
        );
      }
      return vector as number[];
    });
  }
}

/** Returns null when no embedding credential is configured (offline/degraded mode). */
export function createEmbeddingClientFromEnv(env: AppEnv, fetchImpl?: typeof fetch): EmbeddingClient | null {
  if (!env.embedding.apiKey) {
    return null;
  }
  return new EmbeddingClient({
    baseUrl: env.embedding.baseUrl,
    apiKey: env.embedding.apiKey,
    fallbackApiKey: env.embedding.fallbackApiKey,
    model: env.embedding.model,
    dimensions: env.embedding.dimensions,
    requestTimeoutMs: env.embedding.requestTimeoutMs,
    fetchImpl,
  });
}
