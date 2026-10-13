import { describe, expect, it, vi } from 'vitest';
import { SubmitTools } from '../../src/tools/submit.tool.js';
import { ElasticService, type ElasticClientLike } from '../../src/services/elastic.client.js';
import { VerificationRunClient, type VerificationRunClientLike } from '../../src/services/verification-run.client.js';
import { loadEnv, type AppEnv } from '../../src/config/env.js';

function testEnv(overrides: Record<string, string | undefined> = {}): AppEnv {
  return loadEnv({ ELASTICSEARCH_URL: 'https://es.example.com:9243', ...overrides } as NodeJS.ProcessEnv);
}

function disconnectedEnv(): AppEnv {
  return loadEnv({} as NodeJS.ProcessEnv);
}

function fakeElasticClient(): ElasticClientLike {
  const store = new Map<string, unknown>();
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
    search: vi.fn(),
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

function makeTools(ttlMs?: number) {
  const esClient = fakeElasticClient();
  const elasticService = new ElasticService({ env: testEnv(), client: esClient });
  const verificationRunClient = new VerificationRunClient({ env: testEnv(), client: fakeVerificationRunClientLike(), ttlMs });
  const tools = new SubmitTools({ elasticService, verificationRunClient });
  return { tools, esClient, elasticService, verificationRunClient };
}

const PATCH = '--- a/main.py\n+++ b/main.py\n@@ -1 +1 @@\n-old\n+new';

function baseVerifyInput(overrides: Record<string, unknown> = {}) {
  return {
    status: 'PASS' as const,
    patch: PATCH,
    testCommand: 'pytest',
    environment: { language: 'python' },
    diff: PATCH,
    stdout: 'OK\n',
    stderr: '',
    exitCode: 0,
    durationMs: 100,
    sandbox: 'docker',
    ...overrides,
  };
}

function baseSubmitInput(verificationLog: string, patch: string = PATCH) {
  return {
    problemDescription: 'Fixes a broken import',
    errorLog: "ImportError: cannot import name 'BaseSettings' from 'pydantic'",
    patch,
    verificationLog,
    environment: { language: 'python' },
  };
}

describe('SubmitTools.submitFix', () => {
  it('stores exactly one card when the patch matches a real PASS verification run', async () => {
    const { tools, esClient, verificationRunClient } = makeTools();
    const run = await verificationRunClient.create(baseVerifyInput());

    const result = await tools.submitFix(baseSubmitInput(run.verificationRunId));

    expect(result.ok).toBe(true);
    expect(result.status).toBe('STORED');
    expect((result as Record<string, unknown>).indexed).toBe(true);
    expect((result as Record<string, unknown>).knowledgeCardId).toBeTruthy();
    expect(esClient.index).toHaveBeenCalledTimes(1);
  });

  it('rejects when the matched run is FAIL, not PASS, and never indexes', async () => {
    const { tools, esClient, verificationRunClient } = makeTools();
    const run = await verificationRunClient.create(
      baseVerifyInput({ status: 'FAIL', stdout: '', stderr: 'boom', exitCode: 1 })
    );

    const result = await tools.submitFix(baseSubmitInput(run.verificationRunId));

    expect(result.ok).toBe(true);
    expect(result.status).toBe('REJECTED');
    expect((result as Record<string, unknown>).indexed).toBe(false);
    expect(esClient.index).not.toHaveBeenCalled();
  });

  it('rejects a TIMEOUT run the same way as FAIL', async () => {
    const { tools, esClient, verificationRunClient } = makeTools();
    const run = await verificationRunClient.create(baseVerifyInput({ status: 'TIMEOUT', exitCode: -1 }));

    const result = await tools.submitFix(baseSubmitInput(run.verificationRunId));

    expect(result.status).toBe('REJECTED');
    expect((result as Record<string, unknown>).indexed).toBe(false);
    expect(esClient.index).not.toHaveBeenCalled();
  });

  it('rejects a tampered patch that does not match the verified digest', async () => {
    const { tools, esClient, verificationRunClient } = makeTools();
    const run = await verificationRunClient.create(baseVerifyInput());
    const tamperedPatch = `${PATCH}\n# sneaky extra line not part of what was verified`;

    const result = await tools.submitFix(baseSubmitInput(run.verificationRunId, tamperedPatch));

    expect(result.status).toBe('REJECTED');
    expect((result as Record<string, unknown>).indexed).toBe(false);
    expect(esClient.index).not.toHaveBeenCalled();
  });

  it('rejects a submission whose environment does not match the verified run', async () => {
    const { tools, esClient, verificationRunClient } = makeTools();
    const run = await verificationRunClient.create(baseVerifyInput({ environment: { language: 'python' } }));

    const result = await tools.submitFix({
      ...baseSubmitInput(run.verificationRunId),
      environment: { language: 'node' },
    });

    expect(result.status).toBe('REJECTED');
    expect((result as Record<string, unknown>).indexed).toBe(false);
    expect(esClient.index).not.toHaveBeenCalled();
  });

  it('accepts environments that differ only in packageVersions key order', async () => {
    const { tools, verificationRunClient } = makeTools();
    const run = await verificationRunClient.create(
      baseVerifyInput({ environment: { language: 'python', packageVersions: { pydantic: '2.4.2', fastapi: '0.104.0' } } })
    );

    const result = await tools.submitFix({
      ...baseSubmitInput(run.verificationRunId),
      environment: { language: 'python', packageVersions: { fastapi: '0.104.0', pydantic: '2.4.2' } },
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe('STORED');
  });

  it('rejects an unknown verificationRunId', async () => {
    const { tools, esClient } = makeTools();
    const result = await tools.submitFix(baseSubmitInput('00000000-0000-0000-0000-000000000000'));

    expect(result.status).toBe('REJECTED');
    expect((result as Record<string, unknown>).indexed).toBe(false);
    expect(esClient.index).not.toHaveBeenCalled();
  });

  it('rejects an expired verificationRunId', async () => {
    vi.useFakeTimers();
    try {
      const { tools, esClient, verificationRunClient } = makeTools(1000);
      const run = await verificationRunClient.create(baseVerifyInput());
      vi.setSystemTime(Date.now() + 2000);

      const result = await tools.submitFix(baseSubmitInput(run.verificationRunId));

      expect(result.status).toBe('REJECTED');
      expect(esClient.index).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('a rejected submission never alters an existing card of the same id', async () => {
    const { tools, esClient, verificationRunClient } = makeTools();
    const existingId = 'fix_existing_one';
    await esClient.index({ index: 'unused', id: existingId, document: { id: existingId, marker: 'original' } });

    const run = await verificationRunClient.create(
      baseVerifyInput({ status: 'FAIL', stdout: '', stderr: 'boom', exitCode: 1 })
    );
    await tools.submitFix(baseSubmitInput(run.verificationRunId));

    const stored = await esClient.get({ index: 'unused', id: existingId });
    expect((stored._source as Record<string, unknown>).marker).toBe('original');
  });

  it('returns DEPENDENCY_UNAVAILABLE without evaluating the trust chain when Elasticsearch is not configured', async () => {
    const tools = new SubmitTools({
      elasticService: new ElasticService({ env: disconnectedEnv() }),
      verificationRunClient: new VerificationRunClient({ env: disconnectedEnv() }),
    });

    const result = await tools.submitFix(baseSubmitInput('anything'));

    expect(result.ok).toBe(false);
    expect(result.status).toBe('DEPENDENCY_UNAVAILABLE');
  });
});
