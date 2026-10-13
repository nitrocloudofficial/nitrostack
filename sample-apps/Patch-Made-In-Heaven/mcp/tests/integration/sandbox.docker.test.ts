import { beforeEach, describe, expect, it } from 'vitest';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { SandboxClient, SandboxImageNotAllowedError } from '../../src/services/sandbox.client.js';
import { loadEnv, type AppEnv } from '../../src/config/env.js';

const execFileAsync = promisify(execFile);

// Deterministic test env carrying through only the real SANDBOX_CONTAINER_RUNTIME
// (podman on this machine) — never bare `loadEnv()`/`getEnv()`, which now reflects
// this machine's real root `.env` (real OPENROUTER_API_KEY without a matching
// EMBEDDING_VECTOR_DIMENSIONS) since `config/env.ts` also loads the monorepo root `.env`.
function testEnv(): AppEnv {
  return loadEnv({ SANDBOX_CONTAINER_RUNTIME: process.env.SANDBOX_CONTAINER_RUNTIME } as NodeJS.ProcessEnv);
}

// Runs for real against whatever SANDBOX_CONTAINER_RUNTIME resolves to (docker
// in CI/production; podman here, via mcp/.env, since this dev machine has no
// `docker` binary — see DECISIONS.md Decision 005/008). Not credential-gated:
// a working container runtime is a stated Checkpoint 5 precondition.
const runtime = testEnv().sandbox.containerRuntime;

async function runtimeAvailable(): Promise<boolean> {
  try {
    await execFileAsync(runtime, ['version']);
    return true;
  } catch {
    return false;
  }
}

async function countSandboxTempDirs(): Promise<number> {
  const entries = await fs.promises.readdir(os.tmpdir());
  return entries.filter((entry) => entry.startsWith('patch-made-in-heaven-sandbox-')).length;
}

async function listContainersByPrefix(prefix: string): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync(runtime, ['ps', '-a', '--filter', `name=${prefix}`, '--format', '{{.Names}}']);
    return stdout.split('\n').map((line) => line.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

describe('SandboxClient (real container runtime)', () => {
  let hasRuntime = false;

  beforeEach(async () => {
    hasRuntime = await runtimeAvailable();
  });

  it('rejects a non-allowlisted language before touching the filesystem or spawning anything', async () => {
    const client = new SandboxClient({ env: testEnv() });
    await expect(
      client.runVerification({
        code: 'irrelevant',
        testCommand: 'true',
        environment: { language: 'ruby' },
      })
    ).rejects.toThrow(SandboxImageNotAllowedError);
  });

  it('returns PASS with real captured stdout and exit code 0', async () => {
    if (!hasRuntime) return;
    const client = new SandboxClient({ env: testEnv() });
    const result = await client.runVerification({
      code: 'irrelevant for this shell test',
      testCommand: 'echo hello-from-sandbox',
      environment: { language: 'general' },
    });

    expect(result.status).toBe('PASS');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('hello-from-sandbox');
    expect(result.sandboxType).toBe('docker');
    expect(result.timedOut).toBe(false);
  }, 30000);

  it('returns FAIL with a real non-zero exit code and captured stderr', async () => {
    if (!hasRuntime) return;
    const client = new SandboxClient({ env: testEnv() });
    const result = await client.runVerification({
      code: 'irrelevant',
      testCommand: 'echo boom 1>&2; exit 7',
      environment: { language: 'general' },
    });

    expect(result.status).toBe('FAIL');
    expect(result.exitCode).toBe(7);
    expect(result.stderr).toContain('boom');
  }, 30000);

  it('times out a hanging command, kills it, and cleans up the container', async () => {
    if (!hasRuntime) return;
    const client = new SandboxClient({ env: testEnv(), timeoutMs: 1500 });
    const result = await client.runVerification({
      code: 'irrelevant',
      testCommand: 'sleep 60',
      environment: { language: 'general' },
    });

    expect(result.status).toBe('FAIL');
    expect(result.timedOut).toBe(true);
    expect(result.stderr).toMatch(/timed out/i);

    // Guaranteed cleanup: no leftover container from this run, even after a kill.
    const leftovers = await listContainersByPrefix('hm-sandbox-');
    expect(leftovers).toHaveLength(0);
  }, 20000);

  it('caps output at the configured byte limit and reports truncated: true', async () => {
    if (!hasRuntime) return;
    const client = new SandboxClient({ env: testEnv(), maxOutputBytes: 1024 });
    const result = await client.runVerification({
      code: 'irrelevant',
      testCommand: "yes 'this line is here to pad output size' | head -c 200000",
      environment: { language: 'general' },
    });

    expect(result.truncated).toBe(true);
    expect(result.stdout.length).toBeLessThanOrEqual(1024);
  }, 30000);

  it('cleans up its temp directory after both a PASS and a FAIL run', async () => {
    if (!hasRuntime) return;
    const before = await countSandboxTempDirs();
    const client = new SandboxClient({ env: testEnv() });

    await client.runVerification({ code: 'x', testCommand: 'true', environment: { language: 'general' } });
    await client.runVerification({ code: 'x', testCommand: 'false', environment: { language: 'general' } });

    const after = await countSandboxTempDirs();
    expect(after).toBe(before);
  }, 30000);

  it('denies network access: an outbound connection attempt fails immediately', async () => {
    if (!hasRuntime) return;
    const client = new SandboxClient({ env: testEnv() });
    const result = await client.runVerification({
      code: 'irrelevant',
      testCommand: 'ping -c1 -W2 1.1.1.1',
      environment: { language: 'general' },
    });

    expect(result.status).toBe('FAIL');
    expect(result.exitCode).not.toBe(0);
  }, 30000);

  it('cannot read a real host file at the same path the container sees as /tmp', async () => {
    if (!hasRuntime) return;
    const sentinelName = `hm-host-sentinel-${Date.now()}.txt`;
    const sentinelPath = path.join(os.tmpdir(), sentinelName);
    fs.writeFileSync(sentinelPath, 'this must never be readable from inside the sandbox');

    try {
      const client = new SandboxClient({ env: testEnv() });
      const result = await client.runVerification({
        code: 'irrelevant',
        testCommand: `cat ${sentinelPath}`,
        environment: { language: 'general' },
      });

      // /tmp inside the container is a fresh, empty tmpfs (see sandbox.client.ts),
      // never a bind-mount of the host's real /tmp, so this must fail.
      expect(result.status).toBe('FAIL');
      expect(result.stdout).not.toContain('this must never be readable');
    } finally {
      fs.rmSync(sentinelPath, { force: true });
    }
  }, 30000);
});
