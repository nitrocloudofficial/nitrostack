import { describe, expect, it, vi } from 'vitest';
import { CommandExitError, TimeoutError as E2BTimeoutError } from 'e2b';
import {
  E2BSandboxClient,
  E2BSandboxImageNotAllowedError,
  resolveE2BExtension,
  type E2BSandboxLike,
} from '../../src/services/e2b-sandbox.client.js';
import { loadEnv, type AppEnv } from '../../src/config/env.js';

function testEnv(overrides: Record<string, string | undefined> = {}): AppEnv {
  return loadEnv({ SANDBOX_PROVIDER: 'e2b', E2B_API_KEY: 'e2b_test_key', ...overrides } as NodeJS.ProcessEnv);
}

interface FakeSandboxControls {
  writes: Array<{ path: string; content: string }>;
  killCalls: number;
  runCalls: Array<{ cmd: string; timeoutMs?: number }>;
}

function makeFakeSandbox(
  behavior: (cmd: string) => Promise<{ exitCode: number; stdout: string; stderr: string }>
): { sandbox: E2BSandboxLike; controls: FakeSandboxControls } {
  const controls: FakeSandboxControls = { writes: [], killCalls: 0, runCalls: [] };
  const sandbox: E2BSandboxLike = {
    files: {
      write: vi.fn(async (path: string, content: string) => {
        controls.writes.push({ path, content });
        return {};
      }),
    },
    commands: {
      run: vi.fn(async (cmd: string, opts?: { timeoutMs?: number; onStdout?: (d: string) => void; onStderr?: (d: string) => void }) => {
        controls.runCalls.push({ cmd, timeoutMs: opts?.timeoutMs });
        return behavior(cmd);
      }),
    },
    kill: vi.fn(async () => {
      controls.killCalls += 1;
      return true;
    }),
  };
  return { sandbox, controls };
}

describe('E2BSandboxClient', () => {
  it('rejects an unsupported language before ever creating a sandbox', async () => {
    const factory = vi.fn();
    const client = new E2BSandboxClient({ env: testEnv(), sandboxFactory: factory });

    await expect(
      client.runVerification({ code: 'irrelevant', testCommand: 'true', environment: { language: 'go' } })
    ).rejects.toThrow(E2BSandboxImageNotAllowedError);
    expect(factory).not.toHaveBeenCalled();
  });

  it('genuine PASS: real exit code 0 resolves normally', async () => {
    const { sandbox, controls } = makeFakeSandbox(async () => ({ exitCode: 0, stdout: 'hello\n', stderr: '' }));
    const factory = vi.fn(async () => sandbox);
    const client = new E2BSandboxClient({ env: testEnv(), sandboxFactory: factory });

    const result = await client.runVerification({
      code: 'print("hi")',
      testCommand: 'python3 main.py',
      environment: { language: 'python' },
    });

    expect(result.status).toBe('PASS');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('hello');
    expect(result.timedOut).toBe(false);
    expect(result.sandboxType).toBe('docker');
    expect(controls.writes[0]?.path).toBe('/home/user/main.py');
    expect(controls.killCalls).toBe(1);
  });

  it('genuine FAIL: CommandExitError is caught and mapped, not rethrown', async () => {
    const { sandbox, controls } = makeFakeSandbox(async () => {
      throw new CommandExitError({ exitCode: 7, stdout: '', stderr: 'boom\n', error: 'exit status 7' });
    });
    const factory = vi.fn(async () => sandbox);
    const client = new E2BSandboxClient({ env: testEnv(), sandboxFactory: factory });

    const result = await client.runVerification({
      code: 'irrelevant',
      testCommand: 'exit 7',
      environment: { language: 'general' },
    });

    expect(result.status).toBe('FAIL');
    expect(result.exitCode).toBe(7);
    expect(result.stderr).toContain('boom');
    expect(result.timedOut).toBe(false);
    expect(controls.killCalls).toBe(1);
  });

  it('genuine TIMEOUT: E2B TimeoutError maps to timedOut:true, distinct from FAIL exit code', async () => {
    const { sandbox } = makeFakeSandbox(async () => {
      throw new E2BTimeoutError('the operation timed out: deadline_exceeded');
    });
    const factory = vi.fn(async () => sandbox);
    const client = new E2BSandboxClient({ env: testEnv(), timeoutMs: 1500, sandboxFactory: factory });

    const result = await client.runVerification({
      code: 'irrelevant',
      testCommand: 'sleep 60',
      environment: { language: 'general' },
    });

    expect(result.status).toBe('FAIL');
    expect(result.timedOut).toBe(true);
    expect(result.exitCode).toBe(-1);
    expect(result.stderr).toMatch(/timed out/i);
  });

  it('an unexpected error type is never swallowed — rethrown, sandbox still killed', async () => {
    const { sandbox, controls } = makeFakeSandbox(async () => {
      throw new Error('unexpected connection reset');
    });
    const factory = vi.fn(async () => sandbox);
    const client = new E2BSandboxClient({ env: testEnv(), sandboxFactory: factory });

    await expect(
      client.runVerification({ code: 'x', testCommand: 'true', environment: { language: 'general' } })
    ).rejects.toThrow('unexpected connection reset');
    expect(controls.killCalls).toBe(1);
  });

  it('bounds stdout/stderr at the configured byte cap and reports truncated:true', async () => {
    const bigOutput = 'x'.repeat(200);
    const { sandbox } = makeFakeSandbox(async () => ({ exitCode: 0, stdout: bigOutput, stderr: '' }));
    const factory = vi.fn(async () => sandbox);
    const client = new E2BSandboxClient({ env: testEnv(), maxOutputBytes: 50, sandboxFactory: factory });

    const result = await client.runVerification({
      code: 'x',
      testCommand: 'x',
      environment: { language: 'general' },
    });

    expect(result.truncated).toBe(true);
    expect(result.stdout.length).toBeLessThanOrEqual(50);
  });

  it('kills the sandbox even when writing the candidate file throws', async () => {
    const controls = { killCalls: 0 };
    const sandbox: E2BSandboxLike = {
      files: { write: vi.fn(async () => { throw new Error('disk full'); }) },
      commands: { run: vi.fn() },
      kill: vi.fn(async () => {
        controls.killCalls += 1;
        return true;
      }),
    };
    const factory = vi.fn(async () => sandbox);
    const client = new E2BSandboxClient({ env: testEnv(), sandboxFactory: factory });

    await expect(
      client.runVerification({ code: 'x', testCommand: 'true', environment: { language: 'general' } })
    ).rejects.toThrow('disk full');
    expect(controls.killCalls).toBe(1);
  });

  it('constructor requires an E2B_API_KEY', () => {
    const envNoKey = loadEnv({} as NodeJS.ProcessEnv);
    expect(() => new E2BSandboxClient({ env: envNoKey })).toThrow(/E2B_API_KEY/);
  });
});

describe('resolveE2BExtension', () => {
  it('resolves known languages and returns undefined for unsupported ones', () => {
    expect(resolveE2BExtension('python')).toBe('py');
    expect(resolveE2BExtension('NODE')).toBe('js');
    expect(resolveE2BExtension('go')).toBeUndefined();
    expect(resolveE2BExtension('docker')).toBeUndefined();
  });
});
