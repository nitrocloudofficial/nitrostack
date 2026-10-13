import { describe, expect, it, vi } from 'vitest';
import {
  VerificationRunClient,
  computePatchDigest,
  type VerificationRunClientLike,
  type CreateVerificationRunInput,
} from '../../src/services/verification-run.client.js';
import { loadEnv, type AppEnv } from '../../src/config/env.js';

// Deterministic test env — never rely on ambient `getEnv()`/process.env, which
// now reflects this machine's real root `.env` (real OPENROUTER_API_KEY, etc.)
// since `config/env.ts` was changed to also load the monorepo root `.env`.
function testEnv(): AppEnv {
  return loadEnv({ ELASTICSEARCH_URL: 'https://es.example.com:9243' } as NodeJS.ProcessEnv);
}

function baseEnvironment() {
  return { language: 'python', version: '3.11.4', framework: 'fastapi' };
}

function baseInput(overrides: Partial<CreateVerificationRunInput> = {}): CreateVerificationRunInput {
  return {
    status: 'PASS',
    patch: '--- a/main.py\n+++ b/main.py\n@@ -1 +1 @@\n-old\n+new',
    testCommand: 'pytest',
    environment: baseEnvironment(),
    diff: '--- a/main.py\n+++ b/main.py\n@@ -1 +1 @@\n-old\n+new',
    stdout: 'OK\n',
    stderr: '',
    exitCode: 0,
    durationMs: 120,
    sandbox: 'docker:python:3.11',
    ...overrides,
  };
}

/** In-memory fake satisfying `VerificationRunClientLike`, plus a `delete` spy the real client never declares or calls. */
function makeFakeClient(): VerificationRunClientLike & { delete: ReturnType<typeof vi.fn> } {
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
      if (!store.has(id)) {
        throw new Error('404: not found');
      }
      return { _source: store.get(id) };
    }),
    delete: vi.fn(),
  };
}

describe('VerificationRunClient', () => {
  it('creates a run then retrieves it by id', async () => {
    const fake = makeFakeClient();
    const client = new VerificationRunClient({ env: testEnv(), client: fake });
    await client.initIndex();

    const created = await client.create(baseInput());

    expect(created.verificationRunId).toBeTruthy();
    expect(created.patchDigest).toBe(computePatchDigest(baseInput().patch));
    expect(created.status).toBe('PASS');

    const found = await client.lookup(created.verificationRunId);
    expect(found).not.toBeNull();
    expect(found?.verificationRunId).toBe(created.verificationRunId);
    expect(found?.stdout).toBe('OK\n');
    expect(fake.delete).not.toHaveBeenCalled();
  });

  it('rejects an expired run at lookup time without ever deleting it', async () => {
    vi.useFakeTimers();
    try {
      const fake = makeFakeClient();
      const client = new VerificationRunClient({ env: testEnv(), client: fake, ttlMs: 1000 });
      const created = await client.create(baseInput());

      vi.setSystemTime(Date.now() + 2000);

      const found = await client.lookup(created.verificationRunId);
      expect(found).toBeNull();
      expect(fake.delete).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects lookup on a patch-digest mismatch and accepts a matching one', async () => {
    const fake = makeFakeClient();
    const client = new VerificationRunClient({ env: testEnv(), client: fake });
    const created = await client.create(baseInput({ patch: 'AAA' }));

    const mismatched = await client.lookup(created.verificationRunId, computePatchDigest('BBB'));
    expect(mismatched).toBeNull();

    const matched = await client.lookup(created.verificationRunId, computePatchDigest('AAA'));
    expect(matched).not.toBeNull();
    expect(matched?.verificationRunId).toBe(created.verificationRunId);
  });

  it('returns null for an unknown verificationRunId', async () => {
    const fake = makeFakeClient();
    const client = new VerificationRunClient({ env: testEnv(), client: fake });
    const found = await client.lookup('00000000-0000-0000-0000-000000000000');
    expect(found).toBeNull();
  });

  it('initIndex is idempotent: never recreates an existing index', async () => {
    const fake = makeFakeClient();
    const client = new VerificationRunClient({ env: testEnv(), client: fake });

    await client.initIndex();
    await client.initIndex();

    expect(fake.indices.create).toHaveBeenCalledTimes(1);
  });

  it('computePatchDigest is a deterministic SHA-256 hex digest', () => {
    const digestA = computePatchDigest('same patch text');
    const digestB = computePatchDigest('same patch text');
    const digestC = computePatchDigest('different patch text');

    expect(digestA).toBe(digestB);
    expect(digestA).not.toBe(digestC);
    expect(digestA).toMatch(/^[0-9a-f]{64}$/);
  });
});
