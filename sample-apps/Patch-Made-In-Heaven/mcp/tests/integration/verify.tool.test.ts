import { describe, expect, it, vi, beforeEach } from 'vitest';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { VerifyTools } from '../../src/tools/verify.tool.js';
import { SandboxClient } from '../../src/services/sandbox.client.js';
import { VerificationRunClient, type VerificationRunClientLike } from '../../src/services/verification-run.client.js';
import { loadEnv, type AppEnv } from '../../src/config/env.js';

const execFileAsync = promisify(execFile);

// Deterministic test env carrying through only the real SANDBOX_CONTAINER_RUNTIME
// (podman on this machine) — never bare `loadEnv()`/`getEnv()`, which now reflects
// this machine's real root `.env` (real OPENROUTER_API_KEY without a matching
// EMBEDDING_VECTOR_DIMENSIONS) since `config/env.ts` also loads the monorepo root `.env`.
function testEnv(): AppEnv {
  return loadEnv({ SANDBOX_CONTAINER_RUNTIME: process.env.SANDBOX_CONTAINER_RUNTIME } as NodeJS.ProcessEnv);
}

// Runs the real sandbox (docker/podman, per SANDBOX_CONTAINER_RUNTIME) end to end,
// same as sandbox.docker.test.ts — but with an in-memory fake VerificationRunClientLike
// standing in for Elasticsearch, since no live cluster exists in this environment.
// This keeps sandbox execution genuinely real while persistence stays deterministic.
const runtime = testEnv().sandbox.containerRuntime;

async function runtimeAvailable(): Promise<boolean> {
  try {
    await execFileAsync(runtime, ['version']);
    return true;
  } catch {
    return false;
  }
}

function makeFakeVerificationRunClient(): VerificationRunClientLike {
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

describe('VerifyTools.verifyFix', () => {
  let hasRuntime = false;

  beforeEach(async () => {
    hasRuntime = await runtimeAvailable();
  });

  it('returns DEPENDENCY_UNAVAILABLE without ever touching the sandbox when persistence is not configured', async () => {
    const disconnectedEnv = testEnv(); // no ELASTICSEARCH_URL in this constructed env -> disconnected
    const tools = new VerifyTools({
      sandboxClient: new SandboxClient({ env: disconnectedEnv }),
      verificationRunClient: new VerificationRunClient({ env: disconnectedEnv }),
    });
    const result = await tools.verifyFix({
      code: 'print(1)',
      testCommand: 'python3 -c "print(1)"',
      environment: { language: 'python' },
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe('DEPENDENCY_UNAVAILABLE');
  });

  it('genuine PASS: real sandbox execution persisted as a real Verification Run', async () => {
    if (!hasRuntime) return;
    const tools = new VerifyTools({
      sandboxClient: new SandboxClient({ env: testEnv() }),
      verificationRunClient: new VerificationRunClient({ env: testEnv(), client: makeFakeVerificationRunClient() }),
    });

    const result = await tools.verifyFix({
      code: 'irrelevant for this shell test',
      testCommand: 'echo hello-from-verify-fix',
      environment: { language: 'general' },
      filePath: 'main.sh',
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe('PASS');
    expect((result as any).verificationRunId).toBeTruthy();
    expect((result as any).diff).toMatch(/^--- a\/main\.sh/m);
    expect((result as any).executionLog).toContain('hello-from-verify-fix');
    expect((result as any).evidence.stdout).toContain('hello-from-verify-fix');
    expect((result as any).evidence.exitCode).toBe(0);
  }, 30000);

  it('genuine FAIL: a real non-zero exit is reported as FAIL, not TIMEOUT', async () => {
    if (!hasRuntime) return;
    const tools = new VerifyTools({
      sandboxClient: new SandboxClient({ env: testEnv() }),
      verificationRunClient: new VerificationRunClient({ env: testEnv(), client: makeFakeVerificationRunClient() }),
    });

    const result = await tools.verifyFix({
      code: 'irrelevant',
      testCommand: 'echo boom 1>&2; exit 7',
      environment: { language: 'general' },
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe('FAIL');
    expect((result as any).evidence.exitCode).toBe(7);
    expect((result as any).evidence.stderr).toContain('boom');
  }, 30000);

  it('genuine TIMEOUT: distinct from FAIL when the sandbox kills a hanging command', async () => {
    if (!hasRuntime) return;
    const tools = new VerifyTools({
      sandboxClient: new SandboxClient({ env: testEnv(), timeoutMs: 1500 }),
      verificationRunClient: new VerificationRunClient({ env: testEnv(), client: makeFakeVerificationRunClient() }),
    });

    const result = await tools.verifyFix({
      code: 'irrelevant',
      testCommand: 'sleep 60',
      environment: { language: 'general' },
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe('TIMEOUT');
    expect(result.status).not.toBe('FAIL');
  }, 20000);

  it('an omitted baseline produces a full-file addition diff', async () => {
    if (!hasRuntime) return;
    const tools = new VerifyTools({
      sandboxClient: new SandboxClient({ env: testEnv() }),
      verificationRunClient: new VerificationRunClient({ env: testEnv(), client: makeFakeVerificationRunClient() }),
    });

    const result = await tools.verifyFix({
      code: 'line-one\nline-two\n',
      testCommand: 'true',
      environment: { language: 'general' },
    });

    expect(result.ok).toBe(true);
    const diff = (result as any).diff as string;
    expect(diff).toContain('+line-one');
    expect(diff).toContain('+line-two');
    expect(diff).not.toMatch(/^-line-one/m);
  }, 30000);
});
