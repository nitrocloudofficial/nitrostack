import { describe, expect, it, vi } from 'vitest';
import { SearchTools } from '../../src/tools/search.tool.js';
import { RetrieveTools } from '../../src/tools/retrieve.tool.js';
import { VerifyTools } from '../../src/tools/verify.tool.js';
import { SubmitTools } from '../../src/tools/submit.tool.js';
import { SandboxClient } from '../../src/services/sandbox.client.js';
import { ElasticService, type ElasticClientLike } from '../../src/services/elastic.client.js';
import { VerificationRunClient, type VerificationRunClientLike } from '../../src/services/verification-run.client.js';
import { loadEnv, type AppEnv } from '../../src/config/env.js';
import { CONTRACT_VERSION } from '../../src/domain/response-envelope.js';

/**
 * Closure-level conformance gate (Checkpoint 6 of Phase 3): every tool's response,
 * on every status it can return, must be a genuine `hm.v1` envelope — not just
 * individually spot-checked per tool, but swept generically here in one place.
 * Deliberately exercises only paths that don't require a live sandbox/Elasticsearch
 * cluster, so this runs in any environment, including CI.
 */
function assertEnvelopeShape(response: unknown): void {
  const envelope = response as Record<string, unknown>;
  expect(envelope.contractVersion).toBe(CONTRACT_VERSION);
  expect(typeof envelope.requestId).toBe('string');
  expect((envelope.requestId as string).length).toBeGreaterThan(0);
  expect(typeof envelope.ok).toBe('boolean');
  expect(typeof envelope.status).toBe('string');
  expect((envelope.status as string).length).toBeGreaterThan(0);
  expect(Array.isArray(envelope.warnings)).toBe(true);
  if (envelope.ok === false) {
    expect(envelope.error).toBeDefined();
    const error = envelope.error as Record<string, unknown>;
    expect(typeof error.code).toBe('string');
    expect(typeof error.message).toBe('string');
    expect(typeof error.retryable).toBe('boolean');
  }
}

function disconnectedEnv(): AppEnv {
  return loadEnv({} as NodeJS.ProcessEnv);
}

function connectedEnv(): AppEnv {
  return loadEnv({ ELASTICSEARCH_URL: 'https://es.example.com:9243' } as NodeJS.ProcessEnv);
}

function fakeElasticClient(seed?: { id: string; document: unknown }): ElasticClientLike {
  const store = new Map<string, unknown>();
  if (seed) store.set(seed.id, seed.document);
  return {
    indices: {
      exists: vi.fn(async () => true),
      create: vi.fn(async () => ({})),
      getMapping: vi.fn(async () => ({})),
      refresh: vi.fn(async () => ({})),
    },
    index: vi.fn(async ({ id, document }: { id: string; document: unknown }) => {
      store.set(id, document);
      return {};
    }),
    get: vi.fn(async ({ id }: { id: string }) => {
      if (!store.has(id)) throw new Error('404: not found');
      return { _source: store.get(id) };
    }),
    search: vi.fn(async () => ({ hits: { hits: [] } })),
    bulk: vi.fn(),
  } as ElasticClientLike;
}

function fakeVerificationRunClientLike(): VerificationRunClientLike {
  const store = new Map<string, unknown>();
  let indexExists = false;
  return {
    indices: {
      exists: vi.fn(async () => indexExists),
      create: vi.fn(async () => {
        indexExists = true;
        return {};
      }),
    },
    index: vi.fn(async ({ id, document }: { id: string; document: unknown }) => {
      store.set(id, document);
      return {};
    }),
    get: vi.fn(async ({ id }: { id: string }) => {
      if (!store.has(id)) throw new Error('404: not found');
      return { _source: store.get(id) };
    }),
  };
}

describe('hm.v1 envelope conformance across all six tools', () => {
  it('search_fix: DEPENDENCY_UNAVAILABLE and MISS both conform', async () => {
    const disconnected = new SearchTools({ elasticService: new ElasticService({ env: disconnectedEnv() }) });
    assertEnvelopeShape(
      await disconnected.searchFix({ stacktrace: 'x', language: 'python', limit: 5 })
    );

    const connected = new SearchTools({
      elasticService: new ElasticService({ env: connectedEnv(), client: fakeElasticClient() }),
    });
    assertEnvelopeShape(await connected.searchFix({ stacktrace: 'x', language: 'python', limit: 5 }));
  });

  it('find_similar: DEPENDENCY_UNAVAILABLE and MISS both conform', async () => {
    const disconnected = new SearchTools({ elasticService: new ElasticService({ env: disconnectedEnv() }) });
    assertEnvelopeShape(await disconnected.findSimilar({ query: 'x', limit: 5 }));

    const connected = new SearchTools({
      elasticService: new ElasticService({ env: connectedEnv(), client: fakeElasticClient() }),
    });
    assertEnvelopeShape(await connected.findSimilar({ query: 'x', limit: 5 }));
  });

  it('get_patch: DEPENDENCY_UNAVAILABLE and NOT_FOUND both conform', async () => {
    const disconnected = new RetrieveTools({ elasticService: new ElasticService({ env: disconnectedEnv() }) });
    assertEnvelopeShape(await disconnected.getPatch({ knowledgeCardId: 'x' }));

    const connected = new RetrieveTools({
      elasticService: new ElasticService({ env: connectedEnv(), client: fakeElasticClient() }),
    });
    assertEnvelopeShape(await connected.getPatch({ knowledgeCardId: 'does-not-exist' }));
  });

  it('get_execution_log: DEPENDENCY_UNAVAILABLE and NOT_FOUND both conform', async () => {
    const disconnected = new RetrieveTools({ elasticService: new ElasticService({ env: disconnectedEnv() }) });
    assertEnvelopeShape(await disconnected.getExecutionLog({ knowledgeCardId: 'x' }));

    const connected = new RetrieveTools({
      elasticService: new ElasticService({ env: connectedEnv(), client: fakeElasticClient() }),
    });
    assertEnvelopeShape(await connected.getExecutionLog({ knowledgeCardId: 'does-not-exist' }));
  });

  it('verify_fix: DEPENDENCY_UNAVAILABLE conforms (no sandbox required for this status)', async () => {
    const tools = new VerifyTools({
      // VerifyTools's default constructor also builds a SandboxClient, which
      // independently calls getEnv() — must be given a deterministic env too,
      // not just verificationRunClient, or this test depends on ambient process.env.
      sandboxClient: new SandboxClient({ env: disconnectedEnv() }),
      verificationRunClient: new VerificationRunClient({ env: disconnectedEnv() }),
    });
    assertEnvelopeShape(
      await tools.verifyFix({ code: 'x', testCommand: 'true', environment: { language: 'general' } })
    );
  });

  it('submit_fix: DEPENDENCY_UNAVAILABLE and REJECTED both conform', async () => {
    const disconnected = new SubmitTools({
      elasticService: new ElasticService({ env: disconnectedEnv() }),
      verificationRunClient: new VerificationRunClient({ env: disconnectedEnv() }),
    });
    assertEnvelopeShape(
      await disconnected.submitFix({
        problemDescription: 'x',
        errorLog: 'Error: x',
        patch: '--- a/x\n+++ b/x\n@@ -1 +1 @@\n-a\n+b',
        verificationLog: 'anything',
        environment: { language: 'python' },
      })
    );

    const connected = new SubmitTools({
      elasticService: new ElasticService({ env: connectedEnv(), client: fakeElasticClient() }),
      verificationRunClient: new VerificationRunClient({ env: connectedEnv(), client: fakeVerificationRunClientLike() }),
    });
    assertEnvelopeShape(
      await connected.submitFix({
        problemDescription: 'x',
        errorLog: 'Error: x',
        patch: '--- a/x\n+++ b/x\n@@ -1 +1 @@\n-a\n+b',
        verificationLog: 'unknown-run-id',
        environment: { language: 'python' },
      })
    );
  });
});
