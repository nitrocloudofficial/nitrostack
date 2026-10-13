import { Sandbox, CommandExitError, TimeoutError as E2BTimeoutError } from 'e2b';
import type { SandboxProvider, SandboxOptions, SandboxResult } from './sandbox-provider.js';
import { getEnv, type AppEnv } from '../config/env.js';

/**
 * Production sandbox provider (Decision 010, Phase 6) — runs `verify_fix`
 * candidates via E2B's hosted Firecracker microVMs instead of a locally
 * spawned Docker/podman process, since NitroCloud's serverless runtime has
 * no container engine at all (confirmed live: `spawn docker ENOENT`).
 *
 * Deliberately reuses E2B's default `base` template (Debian bookworm, real
 * Python 3.11.6 and Node 20.9.0 already present — version-aligned with the
 * local `python:3.11-slim`/`node:20-slim` images) rather than building custom
 * Sandbox Templates: empirically confirmed via a real API call that `base`
 * already covers every language this project's real seed corpus and
 * `verify_fix` callers actually use. `go` is not supported by this provider
 * (not present in `base`, and never part of the real seed corpus) — see
 * DOUBTS.md for the full reasoning.
 */

export class E2BSandboxImageNotAllowedError extends Error {
  constructor(language: string) {
    super(`E2B sandbox provider has no supported runtime for language "${language}".`);
    this.name = 'E2BSandboxImageNotAllowedError';
  }
}

/**
 * Every one of these runs fine against E2B's default `base` template — confirmed
 * live. Deliberately mirrors local `SandboxClient`'s own gap: `docker` has no
 * extension mapping there either (never meaningfully used by `verify_fix` —
 * the seed corpus's Docker-build fixtures go through a separate host-verification
 * path, not this sandbox at all), and `go` isn't in `base`.
 */
const EXTENSION_BY_LANGUAGE: Record<string, string> = {
  python: 'py',
  javascript: 'js',
  typescript: 'ts',
  node: 'js',
  general: 'sh',
};

export function resolveE2BExtension(language: string): string | undefined {
  return EXTENSION_BY_LANGUAGE[language.toLowerCase()];
}

/** Narrow seam over the real `e2b` `Sandbox` instance — only what this client actually uses. */
export interface E2BSandboxLike {
  files: {
    write(path: string, content: string): Promise<unknown>;
  };
  commands: {
    run(
      cmd: string,
      opts?: {
        timeoutMs?: number;
        cwd?: string;
        onStdout?: (data: string) => void;
        onStderr?: (data: string) => void;
      }
    ): Promise<{ exitCode: number; stdout: string; stderr: string }>;
  };
  kill(): Promise<boolean>;
}

export interface E2BSandboxFactoryOptions {
  apiKey: string;
  timeoutMs: number;
  allowInternetAccess: boolean;
}

export type E2BSandboxFactory = (opts: E2BSandboxFactoryOptions) => Promise<E2BSandboxLike>;

const defaultSandboxFactory: E2BSandboxFactory = (opts) =>
  Sandbox.create(opts) as unknown as Promise<E2BSandboxLike>;

export interface E2BSandboxClientOptions {
  env?: AppEnv;
  apiKey?: string;
  timeoutMs?: number;
  maxOutputBytes?: number;
  sandboxFactory?: E2BSandboxFactory;
}

/** Sandbox-level lifetime headroom above the command timeout, so the sandbox itself never expires mid-command. */
const SANDBOX_LIFETIME_BUFFER_MS = 15000;
const MIN_SANDBOX_LIFETIME_MS = 30000;

export class E2BSandboxClient implements SandboxProvider {
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly maxOutputBytes: number;
  private readonly sandboxFactory: E2BSandboxFactory;

  constructor(options: E2BSandboxClientOptions = {}) {
    const env = options.env ?? getEnv();
    const apiKey = options.apiKey ?? env.sandbox.e2bApiKey;
    if (!apiKey) {
      throw new Error('E2BSandboxClient requires an E2B_API_KEY (set SANDBOX_PROVIDER=e2b together with a real key).');
    }
    this.apiKey = apiKey;
    this.timeoutMs = options.timeoutMs ?? env.sandbox.timeoutMs;
    this.maxOutputBytes = options.maxOutputBytes ?? env.sandbox.maxOutputBytes;
    this.sandboxFactory = options.sandboxFactory ?? defaultSandboxFactory;
  }

  public async runVerification(options: SandboxOptions): Promise<SandboxResult> {
    const startTime = Date.now();
    // Resolve (and reject unknown/unsupported languages) before ever creating a sandbox.
    const ext = resolveE2BExtension(options.environment.language);
    if (!ext) {
      throw new E2BSandboxImageNotAllowedError(options.environment.language);
    }

    const timeoutMs = options.timeoutMs ?? this.timeoutMs;
    const sandbox = await this.sandboxFactory({
      apiKey: this.apiKey,
      timeoutMs: Math.max(timeoutMs + SANDBOX_LIFETIME_BUFFER_MS, MIN_SANDBOX_LIFETIME_MS),
      allowInternetAccess: false,
    });

    try {
      const filePath = `/home/user/main.${ext}`;
      await sandbox.files.write(filePath, options.code);

      let stdout = '';
      let stderr = '';
      let exitCode = -1;
      let timedOut = false;

      try {
        const result = await sandbox.commands.run(options.testCommand, {
          timeoutMs,
          cwd: '/home/user',
          onStdout: (data) => {
            stdout += data;
          },
          onStderr: (data) => {
            stderr += data;
          },
        });
        exitCode = result.exitCode;
        stdout = result.stdout;
        stderr = result.stderr;
      } catch (error) {
        if (error instanceof CommandExitError) {
          exitCode = error.exitCode;
          stdout = error.stdout;
          stderr = error.stderr;
        } else if (error instanceof E2BTimeoutError) {
          // Partial output already accumulated via onStdout/onStderr up to the timeout.
          timedOut = true;
        } else {
          throw error;
        }
      }

      const truncated = stdout.length > this.maxOutputBytes || stderr.length > this.maxOutputBytes;
      const boundedStdout = stdout.slice(0, this.maxOutputBytes);
      const boundedStderr = timedOut
        ? `${stderr.slice(0, this.maxOutputBytes)}\n[sandbox] execution timed out after ${timeoutMs}ms`.trim()
        : stderr.slice(0, this.maxOutputBytes);

      return {
        status: !timedOut && exitCode === 0 ? 'PASS' : 'FAIL',
        exitCode: timedOut ? -1 : exitCode,
        stdout: boundedStdout,
        stderr: boundedStderr,
        executionTimeMs: Date.now() - startTime,
        // Stable external label for the trust-model's `verification.sandbox` field
        // (sandboxTypeSchema currently only allows 'docker') — see DOUBTS.md.
        sandboxType: 'docker',
        truncated,
        timedOut,
      };
    } finally {
      await sandbox.kill().catch(() => {
        // best-effort; the sandbox may already be gone (e.g. timed out and auto-expired)
      });
    }
  }
}
