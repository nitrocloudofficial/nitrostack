import { describe, expect, it, vi } from 'vitest';
import {
  EmbeddingClient,
  EmbeddingProviderError,
  EmbeddingResponseError,
  createEmbeddingClientFromEnv,
} from '../../src/services/embedding.client.js';
import { loadEnv } from '../../src/config/env.js';

function fakeResponse(body: unknown, init: { ok?: boolean; status?: number; statusText?: string } = {}): Response {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    statusText: init.statusText ?? 'OK',
    json: async () => body,
  } as unknown as Response;
}

function dataFor(batch: string[]): { data: { index: number; embedding: number[] }[] } {
  return {
    data: batch.map((_, index) => ({ index, embedding: [index + 0.1, index + 0.2, index + 0.3] })),
  };
}

describe('EmbeddingClient', () => {
  it('embeds a batch successfully, in order', async () => {
    const fetchImpl = vi.fn(async (_url, init) => {
      const body = JSON.parse(String((init as RequestInit).body));
      return fakeResponse(dataFor(body.input));
    });
    const client = new EmbeddingClient({
      baseUrl: 'https://embeddings.example.com/v1',
      apiKey: 'k',
      model: 'test-model',
      dimensions: 3,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const vectors = await client.embed(['a', 'b']);
    expect(vectors).toEqual([
      [0.1, 0.2, 0.3],
      [1.1, 1.2, 1.3],
    ]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('returns an empty array for empty input without calling the provider', async () => {
    const fetchImpl = vi.fn();
    const client = new EmbeddingClient({
      baseUrl: 'https://embeddings.example.com/v1',
      apiKey: 'k',
      model: 'test-model',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(await client.embed([])).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects an empty/whitespace-only string without calling the provider', async () => {
    const fetchImpl = vi.fn();
    const client = new EmbeddingClient({
      baseUrl: 'https://embeddings.example.com/v1',
      apiKey: 'k',
      model: 'test-model',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await expect(client.embed(['ok', '   '])).rejects.toThrow(EmbeddingResponseError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('splits large inputs into batches and preserves overall order', async () => {
    const fetchImpl = vi.fn(async (_url, init) => {
      const body = JSON.parse(String((init as RequestInit).body));
      return fakeResponse(dataFor(body.input));
    });
    const client = new EmbeddingClient({
      baseUrl: 'https://embeddings.example.com/v1',
      apiKey: 'k',
      model: 'test-model',
      maxBatchSize: 2,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const vectors = await client.embed(['a', 'b', 'c', 'd', 'e']);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(vectors).toHaveLength(5);
    expect(vectors[0]).toEqual([0.1, 0.2, 0.3]);
    expect(vectors[4]).toEqual([0.1, 0.2, 0.3]); // last batch of 1 restarts its own index at 0
  });

  it('times out and surfaces an EmbeddingProviderError', async () => {
    const fetchImpl = vi.fn(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          (init as RequestInit).signal?.addEventListener('abort', () => {
            const err = new Error('aborted');
            err.name = 'AbortError';
            reject(err);
          });
        })
    );
    const client = new EmbeddingClient({
      baseUrl: 'https://embeddings.example.com/v1',
      apiKey: 'k',
      model: 'test-model',
      requestTimeoutMs: 15,
      maxRetries: 0,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(client.embed('hello')).rejects.toThrow(/timed out/);
  });

  it('does not retry a non-retryable 401 provider error', async () => {
    const fetchImpl = vi.fn(async () => fakeResponse({}, { ok: false, status: 401, statusText: 'Unauthorized' }));
    const client = new EmbeddingClient({
      baseUrl: 'https://embeddings.example.com/v1',
      apiKey: 'bad-key',
      model: 'test-model',
      maxRetries: 2,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(client.embed('hello')).rejects.toThrow(EmbeddingProviderError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('retries a retryable 500 error and succeeds within the bound', async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async (_url, init) => {
      calls += 1;
      if (calls === 1) {
        return fakeResponse({}, { ok: false, status: 500, statusText: 'Internal Server Error' });
      }
      const body = JSON.parse(String((init as RequestInit).body));
      return fakeResponse(dataFor(body.input));
    });
    const client = new EmbeddingClient({
      baseUrl: 'https://embeddings.example.com/v1',
      apiKey: 'k',
      model: 'test-model',
      maxRetries: 1,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const vectors = await client.embed('hello');
    expect(vectors).toEqual([[0.1, 0.2, 0.3]]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('gives up after exhausting bounded retries', async () => {
    const fetchImpl = vi.fn(async () => fakeResponse({}, { ok: false, status: 503, statusText: 'Unavailable' }));
    const client = new EmbeddingClient({
      baseUrl: 'https://embeddings.example.com/v1',
      apiKey: 'k',
      model: 'test-model',
      maxRetries: 2,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(client.embed('hello')).rejects.toThrow(EmbeddingProviderError);
    expect(fetchImpl).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('rejects when the provider returns the wrong item count', async () => {
    const fetchImpl = vi.fn(async () => fakeResponse({ data: [{ index: 0, embedding: [0.1, 0.2] }] }));
    const client = new EmbeddingClient({
      baseUrl: 'https://embeddings.example.com/v1',
      apiKey: 'k',
      model: 'test-model',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(client.embed(['a', 'b'])).rejects.toThrow(EmbeddingResponseError);
  });

  it('rejects a vector containing non-finite values', async () => {
    const fetchImpl = vi.fn(async () => fakeResponse({ data: [{ index: 0, embedding: [0.1, NaN, 0.3] }] }));
    const client = new EmbeddingClient({
      baseUrl: 'https://embeddings.example.com/v1',
      apiKey: 'k',
      model: 'test-model',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(client.embed('hello')).rejects.toThrow(EmbeddingResponseError);
  });

  it('rejects a vector whose length does not match the configured dimensions', async () => {
    const fetchImpl = vi.fn(async () => fakeResponse({ data: [{ index: 0, embedding: [0.1, 0.2, 0.3] }] }));
    const client = new EmbeddingClient({
      baseUrl: 'https://embeddings.example.com/v1',
      apiKey: 'k',
      model: 'test-model',
      dimensions: 8,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(client.embed('hello')).rejects.toThrow(/expected 8/);
  });
});

describe('EmbeddingClient fallback API key (Phase 7 — credits exhaustion)', () => {
  it('falls back to the second key once the primary is exhausted after retries, and succeeds', async () => {
    const authHeaders: string[] = [];
    const fetchImpl = vi.fn(async (_url, init) => {
      const headers = (init as RequestInit).headers as Record<string, string>;
      authHeaders.push(headers.Authorization);
      if (headers.Authorization === 'Bearer fallback-key') {
        const body = JSON.parse(String((init as RequestInit).body));
        return fakeResponse(dataFor(body.input));
      }
      return fakeResponse({}, { ok: false, status: 500, statusText: 'Internal Server Error' });
    });
    const client = new EmbeddingClient({
      baseUrl: 'https://embeddings.example.com/v1',
      apiKey: 'primary-key',
      fallbackApiKey: 'fallback-key',
      model: 'test-model',
      maxRetries: 1,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const vectors = await client.embed(['a']);
    expect(vectors).toEqual([[0.1, 0.2, 0.3]]);
    // Primary attempted (initial + 1 retry = 2 calls), then fallback succeeded on its first try.
    expect(authHeaders).toEqual(['Bearer primary-key', 'Bearer primary-key', 'Bearer fallback-key']);
  });

  it('falls back immediately on a non-retryable primary failure (e.g. 401)', async () => {
    const authHeaders: string[] = [];
    const fetchImpl = vi.fn(async (_url, init) => {
      const headers = (init as RequestInit).headers as Record<string, string>;
      authHeaders.push(headers.Authorization);
      if (headers.Authorization === 'Bearer fallback-key') {
        const body = JSON.parse(String((init as RequestInit).body));
        return fakeResponse(dataFor(body.input));
      }
      return fakeResponse({}, { ok: false, status: 401, statusText: 'Unauthorized' });
    });
    const client = new EmbeddingClient({
      baseUrl: 'https://embeddings.example.com/v1',
      apiKey: 'primary-key',
      fallbackApiKey: 'fallback-key',
      model: 'test-model',
      maxRetries: 2,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const vectors = await client.embed(['a']);
    expect(vectors).toEqual([[0.1, 0.2, 0.3]]);
    expect(authHeaders).toEqual(['Bearer primary-key', 'Bearer fallback-key']);
  });

  it('throws if the fallback key also fails, without looping a third time', async () => {
    const authHeaders: string[] = [];
    const fetchImpl = vi.fn(async (_url, init) => {
      const headers = (init as RequestInit).headers as Record<string, string>;
      authHeaders.push(headers.Authorization);
      return fakeResponse({}, { ok: false, status: 401, statusText: 'Unauthorized' });
    });
    const client = new EmbeddingClient({
      baseUrl: 'https://embeddings.example.com/v1',
      apiKey: 'primary-key',
      fallbackApiKey: 'fallback-key',
      model: 'test-model',
      maxRetries: 0,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(client.embed('a')).rejects.toThrow(EmbeddingProviderError);
    expect(authHeaders).toEqual(['Bearer primary-key', 'Bearer fallback-key']);
  });

  it('behaves exactly as before when no fallback key is configured', async () => {
    const fetchImpl = vi.fn(async () => fakeResponse({}, { ok: false, status: 401, statusText: 'Unauthorized' }));
    const client = new EmbeddingClient({
      baseUrl: 'https://embeddings.example.com/v1',
      apiKey: 'primary-key',
      model: 'test-model',
      maxRetries: 0,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(client.embed('a')).rejects.toThrow(EmbeddingProviderError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe('createEmbeddingClientFromEnv', () => {
  it('returns null (degraded mode) when no embedding API key is configured', () => {
    const env = loadEnv({} as NodeJS.ProcessEnv);
    expect(createEmbeddingClientFromEnv(env)).toBeNull();
  });

  it('constructs a client when an embedding API key is configured', () => {
    const env = loadEnv({
      OPENROUTER_API_KEY: 'k',
      EMBEDDING_VECTOR_DIMENSIONS: '1024',
    } as NodeJS.ProcessEnv);
    expect(createEmbeddingClientFromEnv(env)).toBeInstanceOf(EmbeddingClient);
  });
});

const hasRealCredentials = Boolean(process.env.OPENROUTER_API_KEY && process.env.EMBEDDING_VECTOR_DIMENSIONS);

describe.skipIf(!hasRealCredentials)('embedding provider smoke test (credential-gated)', () => {
  it('produces a vector with the configured dimension against the real provider', async () => {
    const env = loadEnv();
    const client = createEmbeddingClientFromEnv(env);
    const [vector] = await client!.embed('patch made in heaven smoke test');
    expect(vector).toHaveLength(env.embedding.dimensions!);
  });
});
