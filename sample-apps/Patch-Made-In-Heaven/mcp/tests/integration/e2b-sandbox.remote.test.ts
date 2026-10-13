import { describe, expect, it } from 'vitest';
import { E2BSandboxClient } from '../../src/services/e2b-sandbox.client.js';
import { loadEnv, type AppEnv } from '../../src/config/env.js';

/**
 * Real, credential-gated integration test against actual E2B infrastructure —
 * self-skips honestly (no fabricated pass) when no real E2B_API_KEY is
 * configured, matching this project's established pattern for every other
 * credential-gated suite (Elasticsearch, embeddings). Proves the same
 * assertion set `sandbox.docker.test.ts` proves for local Docker/podman:
 * genuine PASS, FAIL, TIMEOUT distinct from FAIL, network denial, and output
 * capping — but against a real Firecracker microVM, not a mock.
 */

function testEnv(): AppEnv {
  return loadEnv({
    SANDBOX_PROVIDER: 'e2b',
    E2B_API_KEY: process.env.E2B_API_KEY,
  } as NodeJS.ProcessEnv);
}

const hasRealE2BKey = Boolean(process.env.E2B_API_KEY);

describe.skipIf(!hasRealE2BKey)('E2BSandboxClient (real E2B infrastructure)', () => {
  it('rejects an unsupported language before ever creating a sandbox', async () => {
    const client = new E2BSandboxClient({ env: testEnv() });
    await expect(
      client.runVerification({ code: 'irrelevant', testCommand: 'true', environment: { language: 'go' } })
    ).rejects.toThrow(/no supported runtime/i);
  });

  it('returns PASS with real captured stdout and exit code 0', async () => {
    const client = new E2BSandboxClient({ env: testEnv() });
    const result = await client.runVerification({
      code: 'irrelevant for this shell test',
      testCommand: 'echo hello-from-e2b-sandbox',
      environment: { language: 'general' },
    });

    expect(result.status).toBe('PASS');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('hello-from-e2b-sandbox');
    expect(result.timedOut).toBe(false);
  }, 30000);

  it('returns FAIL with a real non-zero exit code and captured stderr', async () => {
    const client = new E2BSandboxClient({ env: testEnv() });
    const result = await client.runVerification({
      code: 'irrelevant',
      testCommand: 'echo boom 1>&2; exit 7',
      environment: { language: 'general' },
    });

    expect(result.status).toBe('FAIL');
    expect(result.exitCode).toBe(7);
    expect(result.stderr).toContain('boom');
    expect(result.timedOut).toBe(false);
  }, 30000);

  it('times out a hanging command distinctly from an ordinary FAIL', async () => {
    const client = new E2BSandboxClient({ env: testEnv(), timeoutMs: 3000 });
    const result = await client.runVerification({
      code: 'irrelevant',
      testCommand: 'sleep 60',
      environment: { language: 'general' },
    });

    expect(result.status).toBe('FAIL');
    expect(result.timedOut).toBe(true);
    expect(result.exitCode).toBe(-1);
    expect(result.stderr).toMatch(/timed out/i);
  }, 30000);

  it('denies network access: an outbound connection attempt fails', async () => {
    const client = new E2BSandboxClient({ env: testEnv() });
    const result = await client.runVerification({
      code: 'irrelevant',
      testCommand: 'curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://example.com',
      environment: { language: 'general' },
    });

    expect(result.status).toBe('FAIL');
    expect(result.exitCode).not.toBe(0);
  }, 30000);

  it('caps output at the configured byte limit and reports truncated: true', async () => {
    const client = new E2BSandboxClient({ env: testEnv(), maxOutputBytes: 1024 });
    const result = await client.runVerification({
      code: 'irrelevant',
      testCommand: "yes 'this line is here to pad output size' | head -c 200000",
      environment: { language: 'general' },
    });

    expect(result.truncated).toBe(true);
    expect(result.stdout.length).toBeLessThanOrEqual(1024);
  }, 30000);

  it('writes real candidate code to the sandbox and executes it for real', async () => {
    const client = new E2BSandboxClient({ env: testEnv() });
    const result = await client.runVerification({
      code: 'print("hello-from-real-python-file")\n',
      testCommand: 'python3 /home/user/main.py',
      environment: { language: 'python' },
    });

    expect(result.status).toBe('PASS');
    expect(result.stdout).toContain('hello-from-real-python-file');
  }, 30000);
});
