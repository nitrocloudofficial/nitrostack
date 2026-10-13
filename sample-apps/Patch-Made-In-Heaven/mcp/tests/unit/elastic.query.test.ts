import { describe, expect, it, vi } from 'vitest';
import {
  ElasticService,
  ElasticServiceError,
  ElasticMappingIncompatibleError,
  INDEX_NAME,
  buildLexicalQuery,
  buildRrfRetrieverRequest,
  type ElasticClientLike,
  type QueryEmbedder,
} from '../../src/services/elastic.client.js';
import { loadEnv, type AppEnv } from '../../src/config/env.js';
import type { KnowledgeCard } from '../../src/domain/knowledge-card.js';

function testEnv(overrides: Record<string, string | undefined> = {}): AppEnv {
  return loadEnv({
    ELASTICSEARCH_URL: 'https://es.example.com:9243',
    ...overrides,
  } as NodeJS.ProcessEnv);
}

function sampleCard(id: string): KnowledgeCard {
  return {
    id,
    problem: 'sample problem',
    errorType: 'ImportError',
    environment: { language: 'python' },
    patch: '--- a/x.py\n+++ b/x.py\n@@ -1 +1 @@\n-old\n+new',
    verification: {
      status: 'PASS',
      score: 0.9,
      lastVerified: '2026-07-25T14:00:00.000Z',
      sandbox: 'docker',
      exitCode: 0,
      durationMs: 100,
      stdout: 'OK',
      stderr: '',
    },
    metrics: { reuseCount: 1 },
  } as KnowledgeCard;
}

function baseFakeClient(overrides: Partial<ElasticClientLike> = {}): ElasticClientLike {
  return {
    indices: {
      exists: vi.fn(),
      create: vi.fn(),
      getMapping: vi.fn(),
      refresh: vi.fn(),
    },
    index: vi.fn(),
    get: vi.fn(),
    search: vi.fn(),
    bulk: vi.fn(),
    ...overrides,
  } as ElasticClientLike;
}

describe('ElasticService.initIndex', () => {
  it('creates the index with the expected mapping when it does not exist', async () => {
    const client = baseFakeClient();
    (client.indices.exists as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    (client.indices.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const service = new ElasticService({ env: testEnv({ EMBEDDING_VECTOR_DIMENSIONS: undefined }), client });
    const created = await service.initIndex();

    expect(created).toBe(true);
    expect(client.indices.create).toHaveBeenCalledTimes(1);
    const createArgs = (client.indices.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(createArgs.mappings.properties.id).toEqual({ type: 'keyword' });
    expect(createArgs.mappings.properties.embedding).toBeUndefined(); // never hardcoded without a configured dimension
    expect(createArgs.settings.analysis.analyzer.hm_code_analyzer).toBeDefined();
  });

  it('includes a dense_vector mapping with the configured dimension when embeddings are enabled', async () => {
    const client = baseFakeClient();
    (client.indices.exists as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    (client.indices.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const env = testEnv({ OPENROUTER_API_KEY: 'k', EMBEDDING_VECTOR_DIMENSIONS: '1024' });
    const service = new ElasticService({ env, client });
    await service.initIndex();

    const createArgs = (client.indices.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(createArgs.mappings.properties.embedding).toEqual({
      type: 'dense_vector',
      dims: 1024,
      index: true,
      similarity: 'cosine',
    });
  });

  it('is idempotent: does not recreate an already-compatible existing index', async () => {
    // Shaped exactly like a real Elasticsearch getMapping response: dotted
    // field names (e.g. 'environment.language') are always returned already
    // expanded into real nested objects — never as flat dotted-string keys,
    // even though buildMappingProperties() *defines* them with dotted keys
    // (ES itself expands them on index creation). A flat-shaped fake here
    // would mask a real bug in the comparison logic (see DOUBTS.md, Phase 7
    // Checkpoint 3) rather than catch it.
    const client = baseFakeClient();
    (client.indices.exists as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (client.indices.getMapping as ReturnType<typeof vi.fn>).mockResolvedValue({
      [INDEX_NAME]: {
        mappings: {
          properties: {
            schemaVersion: { type: 'keyword' },
            id: { type: 'keyword' },
            problem: { type: 'text' },
            errorType: { type: 'keyword' },
            stacktrace: { type: 'text' },
            environment: {
              properties: {
                language: { type: 'keyword' },
                version: { type: 'keyword' },
                framework: { type: 'keyword' },
                packageVersions: { type: 'flattened' },
              },
            },
            patch: { type: 'text' },
            verification: {
              properties: {
                status: { type: 'keyword' },
                score: { type: 'float' },
                lastVerified: { type: 'date' },
                sandbox: { type: 'keyword' },
                exitCode: { type: 'integer' },
                durationMs: { type: 'integer' },
                stdout: { type: 'text' },
                stderr: { type: 'text' },
              },
            },
            metrics: { properties: { reuseCount: { type: 'integer' } } },
            embeddingModel: { type: 'keyword' },
            embeddingDimensions: { type: 'integer' },
            provenance: {
              properties: {
                source: { type: 'keyword' },
                category: { type: 'keyword' },
                addedAt: { type: 'date' },
                addedBy: { type: 'keyword' },
              },
            },
          },
        },
      },
    });

    const service = new ElasticService({ env: testEnv({ EMBEDDING_VECTOR_DIMENSIONS: undefined }), client });
    const result = await service.initIndex();

    expect(result).toBe(true);
    expect(client.indices.create).not.toHaveBeenCalled();
  });

  it('rejects a nested field with the wrong type, correctly resolved through a dotted path', async () => {
    const client = baseFakeClient();
    (client.indices.exists as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (client.indices.getMapping as ReturnType<typeof vi.fn>).mockResolvedValue({
      [INDEX_NAME]: {
        mappings: {
          properties: {
            schemaVersion: { type: 'keyword' },
            id: { type: 'keyword' },
            problem: { type: 'text' },
            errorType: { type: 'keyword' },
            stacktrace: { type: 'text' },
            environment: { properties: { language: { type: 'text' } } }, // wrong: should be keyword
            patch: { type: 'text' },
            verification: { properties: { status: { type: 'keyword' } } },
            metrics: { properties: { reuseCount: { type: 'integer' } } },
            embeddingModel: { type: 'keyword' },
            embeddingDimensions: { type: 'integer' },
            provenance: { properties: { source: { type: 'keyword' } } },
          },
        },
      },
    });

    const service = new ElasticService({ env: testEnv({ EMBEDDING_VECTOR_DIMENSIONS: undefined }), client });
    await expect(service.initIndex()).rejects.toThrow(ElasticMappingIncompatibleError);
  });

  it('rejects an incompatible existing mapping without modifying the index', async () => {
    const client = baseFakeClient();
    (client.indices.exists as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (client.indices.getMapping as ReturnType<typeof vi.fn>).mockResolvedValue({
      [INDEX_NAME]: {
        mappings: {
          properties: {
            id: { type: 'text' }, // wrong type: should be keyword
            // problem, verification.*, etc. all missing entirely
          },
        },
      },
    });

    const service = new ElasticService({ env: testEnv({ EMBEDDING_VECTOR_DIMENSIONS: undefined }), client });

    await expect(service.initIndex()).rejects.toThrow(ElasticMappingIncompatibleError);
    expect(client.indices.create).not.toHaveBeenCalled();
  });

  it('never calls index deletion, even on an incompatible mapping', async () => {
    const deletionTrap = new Proxy(
      {},
      {
        get(_target, prop) {
          throw new Error(`Unexpected access to indices.${String(prop)} — no deletion method should be called.`);
        },
      }
    );
    const client: ElasticClientLike = {
      indices: {
        exists: vi.fn().mockResolvedValue(true),
        create: deletionTrap as never,
        getMapping: vi.fn().mockResolvedValue({
          [INDEX_NAME]: { mappings: { properties: { id: { type: 'text' } } } },
        }),
        refresh: deletionTrap as never,
      },
      index: vi.fn(),
      get: vi.fn(),
      search: vi.fn(),
      bulk: vi.fn(),
    };

    const service = new ElasticService({ env: testEnv({ EMBEDDING_VECTOR_DIMENSIONS: undefined }), client });
    await expect(service.initIndex()).rejects.toThrow(ElasticMappingIncompatibleError);
  });
});

describe('ElasticService error redaction', () => {
  it('never leaks the configured API key in a wrapped error message', async () => {
    const secretApiKey = 'es-live-secret-9f8a7b6c';
    const client = baseFakeClient();
    (client.indices.exists as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error(`connection refused for https://es.example.com:9243 with apiKey ${secretApiKey}`)
    );

    const env = testEnv({ ELASTICSEARCH_API_KEY: secretApiKey, EMBEDDING_VECTOR_DIMENSIONS: undefined });
    const service = new ElasticService({ env, client });

    await expect(service.initIndex()).rejects.toThrow(ElasticServiceError);
    try {
      await service.initIndex();
      throw new Error('expected initIndex to throw');
    } catch (error) {
      const message = (error as Error).message;
      expect(message).not.toContain(secretApiKey);
      expect(message).toContain('[REDACTED]');
    }
  });
});

describe('ElasticService.bulkUpsertFixes', () => {
  it('reports created/updated counts and per-item failures without aborting the batch', async () => {
    const client = baseFakeClient();
    (client.bulk as ReturnType<typeof vi.fn>).mockResolvedValue({
      errors: true,
      items: [
        { update: { result: 'created', _id: 'fix_a' } },
        { update: { result: 'updated', _id: 'fix_b' } },
        { update: { error: { type: 'version_conflict_engine_exception', reason: 'conflict' }, _id: 'fix_c' } },
      ],
    });
    (client.indices.refresh as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const service = new ElasticService({ env: testEnv({ EMBEDDING_VECTOR_DIMENSIONS: undefined }), client });
    const result = await service.bulkUpsertFixes([sampleCard('fix_a'), sampleCard('fix_b'), sampleCard('fix_c')]);

    expect(result.created).toBe(1);
    expect(result.updated).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].id).toBe('fix_c');
    expect(client.indices.refresh).toHaveBeenCalledTimes(1); // one refresh per batch, not per item
  });

  it('performs no network writes and no refresh for an empty batch', async () => {
    const client = baseFakeClient();
    const service = new ElasticService({ env: testEnv({ EMBEDDING_VECTOR_DIMENSIONS: undefined }), client });

    const result = await service.bulkUpsertFixes([]);

    expect(result).toEqual({ created: 0, updated: 0, failed: 0, errors: [] });
    expect(client.bulk).not.toHaveBeenCalled();
    expect(client.indices.refresh).not.toHaveBeenCalled();
  });

  it('throws when Elasticsearch is not configured, rather than silently no-op-ing', async () => {
    const service = new ElasticService({ env: testEnv({ ELASTICSEARCH_URL: undefined }) });
    await expect(service.bulkUpsertFixes([sampleCard('fix_a')])).rejects.toThrow(ElasticServiceError);
  });

  it('attaches a real embedding to every card before writing, when an embedding client is configured (Phase 7)', async () => {
    const client = baseFakeClient();
    (client.bulk as ReturnType<typeof vi.fn>).mockResolvedValue({
      errors: false,
      items: [
        { update: { result: 'created', _id: 'fix_a' } },
        { update: { result: 'created', _id: 'fix_b' } },
      ],
    });

    const service = new ElasticService({
      env: testEnv({ EMBEDDING_VECTOR_DIMENSIONS: undefined }),
      client,
      embeddingClient: embedderThatReturnsMany([[0.1, 0.2], [0.3, 0.4]]),
    });
    await service.bulkUpsertFixes([sampleCard('fix_a'), sampleCard('fix_b')]);

    const bulkArgs = (client.bulk as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const docs = bulkArgs.operations.filter((op: Record<string, unknown>) => 'doc' in op).map((op: any) => op.doc);
    expect(docs[0].embedding).toEqual([0.1, 0.2]);
    expect(docs[0].embeddingDimensions).toBe(2);
    expect(typeof docs[0].embeddingModel).toBe('string');
    expect(docs[1].embedding).toEqual([0.3, 0.4]);
  });

  it('writes cards without an embedding, unchanged, when no embedding client is configured', async () => {
    const client = baseFakeClient();
    (client.bulk as ReturnType<typeof vi.fn>).mockResolvedValue({
      errors: false,
      items: [{ update: { result: 'created', _id: 'fix_a' } }],
    });

    const service = new ElasticService({
      env: testEnv({ EMBEDDING_VECTOR_DIMENSIONS: undefined }),
      client,
      embeddingClient: null,
    });
    await service.bulkUpsertFixes([sampleCard('fix_a')]);

    const bulkArgs = (client.bulk as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const doc = bulkArgs.operations.find((op: Record<string, unknown>) => 'doc' in op) as { doc: KnowledgeCard };
    expect(doc.doc.embedding).toBeUndefined();
  });

  it('still writes cards (without an embedding) when the embedding client throws — never fails the whole batch', async () => {
    const client = baseFakeClient();
    (client.bulk as ReturnType<typeof vi.fn>).mockResolvedValue({
      errors: false,
      items: [{ update: { result: 'created', _id: 'fix_a' } }],
    });

    const service = new ElasticService({
      env: testEnv({ EMBEDDING_VECTOR_DIMENSIONS: undefined }),
      client,
      embeddingClient: embedderThatFails(),
    });
    const result = await service.bulkUpsertFixes([sampleCard('fix_a')]);

    expect(result.created).toBe(1);
    const bulkArgs = (client.bulk as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const doc = bulkArgs.operations.find((op: Record<string, unknown>) => 'doc' in op) as { doc: KnowledgeCard };
    expect(doc.doc.embedding).toBeUndefined();
  });
});

describe('ElasticService.indexFix', () => {
  it('attaches a real embedding before writing, when an embedding client is configured (Phase 7)', async () => {
    const client = baseFakeClient();
    (client.index as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (client.indices.refresh as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const service = new ElasticService({
      env: testEnv({ EMBEDDING_VECTOR_DIMENSIONS: undefined }),
      client,
      embeddingClient: embedderThatReturnsMany([[0.5, 0.6, 0.7]]),
    });
    await service.indexFix(sampleCard('fix_a'));

    const indexArgs = (client.index as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(indexArgs.document.embedding).toEqual([0.5, 0.6, 0.7]);
    expect(indexArgs.document.embeddingDimensions).toBe(3);
  });

  it('degrades gracefully — still indexes the card — when the embedding client throws', async () => {
    const client = baseFakeClient();
    (client.index as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (client.indices.refresh as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const service = new ElasticService({
      env: testEnv({ EMBEDDING_VECTOR_DIMENSIONS: undefined }),
      client,
      embeddingClient: embedderThatFails(),
    });
    await service.indexFix(sampleCard('fix_a'));

    const indexArgs = (client.index as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(indexArgs.document.embedding).toBeUndefined();
    expect(client.index).toHaveBeenCalledTimes(1);
  });

  it('is a no-op (no embedding call) when Elasticsearch itself is not configured', async () => {
    const embeddingClient = embedderThatReturnsMany([[0.1]]);
    const service = new ElasticService({ env: testEnv({ ELASTICSEARCH_URL: undefined }), embeddingClient });
    await service.indexFix(sampleCard('fix_a'));
    expect(embeddingClient.embed as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
  });
});

describe('query builders', () => {
  it('buildLexicalQuery always includes the mandatory PASS filter', () => {
    const query = buildLexicalQuery('ImportError: x', ['stacktrace^2'], {});
    expect((query.bool as { filter: unknown[] }).filter).toContainEqual({ term: { 'verification.status': 'PASS' } });
  });

  it('buildLexicalQuery adds exact environment and package-version filters when provided', () => {
    const query = buildLexicalQuery('ImportError: x', ['stacktrace^2'], {
      language: 'Python',
      framework: 'FastAPI',
      packageVersions: { pydantic: '2.4.2' },
    });
    const filter = (query.bool as { filter: Record<string, unknown>[] }).filter;
    expect(filter).toContainEqual({ term: { 'environment.language': 'python' } });
    expect(filter).toContainEqual({ term: { 'environment.framework': 'fastapi' } });
    expect(filter).toContainEqual({ term: { 'environment.packageVersions.pydantic': '2.4.2' } });
  });

  it('buildRrfRetrieverRequest builds an RRF retriever with exactly a standard and a knn child, both filtered', () => {
    const request = buildRrfRetrieverRequest({
      queryText: 'ImportError: x',
      lexicalFields: ['stacktrace^2', 'problem'],
      queryVector: [0.1, 0.2, 0.3],
      filters: { language: 'python' },
      size: 5,
    });

    const rrf = (request.retriever as { rrf: Record<string, unknown> }).rrf;
    const retrievers = rrf.retrievers as Record<string, unknown>[];
    expect(retrievers).toHaveLength(2);

    const standard = retrievers.find((r) => 'standard' in r) as { standard: { query: { bool: { filter: unknown[] } } } };
    const knn = retrievers.find((r) => 'knn' in r) as { knn: { field: string; query_vector: number[]; filter: unknown } };

    expect(standard).toBeDefined();
    expect(standard.standard.query.bool.filter).toContainEqual({ term: { 'verification.status': 'PASS' } });
    expect(standard.standard.query.bool.filter).toContainEqual({ term: { 'environment.language': 'python' } });

    expect(knn).toBeDefined();
    expect(knn.knn.field).toBe('embedding');
    expect(knn.knn.query_vector).toEqual([0.1, 0.2, 0.3]);
    expect(rrf.rank_window_size).toBeGreaterThan(0);
    expect(rrf.rank_constant).toBe(60);
  });
});

function embedderThatReturns(vector: number[]): QueryEmbedder {
  return { embed: vi.fn().mockResolvedValue([vector]) };
}

/** For index-time (batch) embedding — returns one vector per input, in order. */
function embedderThatReturnsMany(vectors: number[][]): QueryEmbedder {
  return { embed: vi.fn().mockResolvedValue(vectors) };
}

function embedderThatFails(): QueryEmbedder {
  return { embed: vi.fn().mockRejectedValue(new Error('embedding provider unreachable')) };
}

function searchResponse(cards: Array<{ card: KnowledgeCard; score: number }>) {
  return { hits: { hits: cards.map(({ card, score }) => ({ _source: card, _score: score })) } };
}

describe('ElasticService hybrid retrieval', () => {
  it('runs a hybrid (RRF) search and reports mode: "hybrid" when embeddings are available', async () => {
    const client = baseFakeClient();
    (client.search as ReturnType<typeof vi.fn>).mockResolvedValue(
      searchResponse([{ card: sampleCard('fix_a'), score: 12.5 }])
    );

    const service = new ElasticService({
      env: testEnv({ EMBEDDING_VECTOR_DIMENSIONS: undefined }),
      client,
      embeddingClient: embedderThatReturns([0.1, 0.2, 0.3]),
    });

    const result = await service.searchFix({ stacktrace: 'ImportError: x', language: 'python' });

    expect(result.mode).toBe('hybrid');
    expect(result.hits).toHaveLength(1);
    expect(result.hits[0].card.id).toBe('fix_a');
    expect(result.hits[0].score).toBe(12.5);
    expect(result.hits[0].confidence).toBeGreaterThan(0);
    expect(result.hits[0].confidence).toBeLessThan(1);

    const searchArgs = (client.search as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(searchArgs.retriever.rrf).toBeDefined();
  });

  it('falls back to lexical-only search and reports mode: "lexical" when no embedder is configured', async () => {
    const client = baseFakeClient();
    (client.search as ReturnType<typeof vi.fn>).mockResolvedValue(
      searchResponse([{ card: sampleCard('fix_a'), score: 3.2 }])
    );

    const service = new ElasticService({
      env: testEnv({ EMBEDDING_VECTOR_DIMENSIONS: undefined }),
      client,
      embeddingClient: null,
    });

    const result = await service.searchFix({ stacktrace: 'ImportError: x', language: 'python' });

    expect(result.mode).toBe('lexical');
    const searchArgs = (client.search as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(searchArgs.retriever).toBeUndefined();
    expect(searchArgs.query.bool).toBeDefined();
  });

  it('degrades to lexical-only, never throwing, when the embedder fails at query time', async () => {
    const client = baseFakeClient();
    (client.search as ReturnType<typeof vi.fn>).mockResolvedValue(
      searchResponse([{ card: sampleCard('fix_a'), score: 3.2 }])
    );

    const service = new ElasticService({
      env: testEnv({ EMBEDDING_VECTOR_DIMENSIONS: undefined }),
      client,
      embeddingClient: embedderThatFails(),
    });

    const result = await service.searchFix({ stacktrace: 'ImportError: x', language: 'python' });

    expect(result.mode).toBe('lexical'); // never falsely claims semantic search occurred
    const searchArgs = (client.search as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(searchArgs.retriever).toBeUndefined();
  });

  it('always applies the mandatory PASS filter and the requested environment filter, in both modes', async () => {
    const client = baseFakeClient();
    (client.search as ReturnType<typeof vi.fn>).mockResolvedValue(searchResponse([]));

    const hybridService = new ElasticService({
      env: testEnv({ EMBEDDING_VECTOR_DIMENSIONS: undefined }),
      client,
      embeddingClient: embedderThatReturns([0.1, 0.2]),
    });
    await hybridService.searchFix({ stacktrace: 'x', language: 'python', framework: 'fastapi' });
    const hybridArgs = (client.search as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const hybridFilter = hybridArgs.retriever.rrf.retrievers[0].standard.query.bool.filter;
    expect(hybridFilter).toContainEqual({ term: { 'verification.status': 'PASS' } });
    expect(hybridFilter).toContainEqual({ term: { 'environment.framework': 'fastapi' } });

    const lexicalService = new ElasticService({
      env: testEnv({ EMBEDDING_VECTOR_DIMENSIONS: undefined }),
      client,
      embeddingClient: null,
    });
    await lexicalService.searchFix({ stacktrace: 'x', language: 'python', framework: 'fastapi' });
    const lexicalArgs = (client.search as ReturnType<typeof vi.fn>).mock.calls[1][0];
    expect(lexicalArgs.query.bool.filter).toContainEqual({ term: { 'verification.status': 'PASS' } });
    expect(lexicalArgs.query.bool.filter).toContainEqual({ term: { 'environment.framework': 'fastapi' } });
  });

  it('findSimilar applies the mandatory PASS filter with no language constraint', async () => {
    const client = baseFakeClient();
    (client.search as ReturnType<typeof vi.fn>).mockResolvedValue(searchResponse([]));
    const service = new ElasticService({
      env: testEnv({ EMBEDDING_VECTOR_DIMENSIONS: undefined }),
      client,
      embeddingClient: null,
    });

    await service.findSimilar('some exploratory query');
    const args = (client.search as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(args.query.bool.filter).toEqual([{ term: { 'verification.status': 'PASS' } }]);
  });

  it('returns an empty lexical result when Elasticsearch is not configured', async () => {
    const service = new ElasticService({ env: testEnv({ ELASTICSEARCH_URL: undefined }) });
    const result = await service.searchFix({ stacktrace: 'x', language: 'python' });
    expect(result).toEqual({ mode: 'lexical', hits: [] });
  });
});
