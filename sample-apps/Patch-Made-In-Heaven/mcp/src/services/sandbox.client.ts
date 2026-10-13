import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { getEnv, type AppEnv } from '../config/env.js';

const execFileAsync = promisify(execFile);

/**
 * Locked-down Docker (or Docker-compatible) execution primitive. Never runs a
 * caller-controlled command on the host: every verification runs inside a
 * disposable, network-isolated, capability-dropped container built from an
 * allowlisted runtime image, with a read-only source mount and bounded logs.
 *
 * This provides only the execution primitive needed to verify Phase 1 seeds
 * (Checkpoints 6-9). The public, trust-chain-complete `verify_fix`/`submit_fix`
 * MCP tools remain unregistered until Phase 3 (see `app.module.ts`).
 */

export interface SandboxOptions {
  code: string;
  testCommand: string;
  environment: {
    language: string;
    version?: string;
  };
  timeoutMs?: number;
}

export interface SandboxResult {
  status: 'PASS' | 'FAIL';
  exitCode: number;
  stdout: string;
  stderr: string;
  executionTimeMs: number;
  sandboxType: 'docker';
  /** True if stdout and/or stderr were cut off at the configured byte cap. */
  truncated: boolean;
  /** True if execution was killed for exceeding the configured timeout — distinct from an ordinary non-zero exit (`status` stays 'FAIL' either way for backward compatibility; callers needing a three-way PASS/FAIL/TIMEOUT split read this field). */
  timedOut: boolean;
}

export class SandboxImageNotAllowedError extends Error {
  constructor(language: string) {
    super(`No allowlisted sandbox image for language "${language}".`);
    this.name = 'SandboxImageNotAllowedError';
  }
}

/** Small, explicit allowlist. Never derive an image name from caller input. */
export const IMAGE_ALLOWLIST: Record<string, string> = {
  python: 'python:3.11-slim',
  javascript: 'node:20-slim',
  typescript: 'node:20-slim',
  node: 'node:20-slim',
  go: 'golang:1.22-alpine',
  docker: 'alpine:3.19',
  general: 'alpine:3.19',
};

const EXTENSION_BY_LANGUAGE: Record<string, string> = {
  python: 'py',
  javascript: 'js',
  typescript: 'ts',
  node: 'js',
  go: 'go',
  general: 'sh',
};

/** Shared with scripts (e.g. verify-seeds.ts) that need to pre-pull images before verifying. */
export function resolveSandboxImage(language: string): string | undefined {
  return IMAGE_ALLOWLIST[language.toLowerCase()];
}

export interface SandboxClientOptions {
  env?: AppEnv;
  containerRuntime?: string;
  timeoutMs?: number;
  memoryLimit?: string;
  cpuLimit?: string;
  pidsLimit?: number;
  maxOutputBytes?: number;
}

function appendBounded(current: string, chunk: string, maxBytes: number): { text: string; truncated: boolean } {
  if (current.length >= maxBytes) {
    return { text: current, truncated: true };
  }
  const combined = current + chunk;
  if (combined.length > maxBytes) {
    return { text: combined.slice(0, maxBytes), truncated: true };
  }
  return { text: combined, truncated: false };
}

interface SpawnResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  truncated: boolean;
  timedOut: boolean;
}

export class SandboxClient {
  private readonly containerRuntime: string;
  private readonly timeoutMs: number;
  private readonly memoryLimit: string;
  private readonly cpuLimit: string;
  private readonly pidsLimit: number;
  private readonly maxOutputBytes: number;

  constructor(options: SandboxClientOptions = {}) {
    const env = options.env ?? getEnv();
    this.containerRuntime = options.containerRuntime ?? env.sandbox.containerRuntime;
    this.timeoutMs = options.timeoutMs ?? env.sandbox.timeoutMs;
    this.memoryLimit = options.memoryLimit ?? env.sandbox.memoryLimit;
    this.cpuLimit = options.cpuLimit ?? env.sandbox.cpuLimit;
    this.pidsLimit = options.pidsLimit ?? env.sandbox.pidsLimit;
    this.maxOutputBytes = options.maxOutputBytes ?? env.sandbox.maxOutputBytes;
  }

  private resolveImage(language: string): string {
    const image = resolveSandboxImage(language);
    if (!image) {
      throw new SandboxImageNotAllowedError(language);
    }
    return image;
  }

  private getFileExtension(language: string): string {
    return EXTENSION_BY_LANGUAGE[language.toLowerCase()] ?? 'txt';
  }

  public async runVerification(options: SandboxOptions): Promise<SandboxResult> {
    const startTime = Date.now();
    // Resolve (and reject unknown languages) before touching the filesystem.
    const image = this.resolveImage(options.environment.language);
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'patch-made-in-heaven-sandbox-'));

    try {
      const ext = this.getFileExtension(options.environment.language);
      fs.writeFileSync(path.join(tempDir, `main.${ext}`), options.code);

      const containerName = `hm-sandbox-${crypto.randomBytes(6).toString('hex')}`;
      const timeoutMs = options.timeoutMs ?? this.timeoutMs;

      const args = [
        'run',
        '--rm',
        '--name',
        containerName,
        '--network',
        'none',
        '--cap-drop',
        'ALL',
        '--security-opt',
        'no-new-privileges',
        '--pids-limit',
        String(this.pidsLimit),
        '--memory',
        this.memoryLimit,
        '--cpus',
        this.cpuLimit,
        '--read-only',
        '-v',
        `${tempDir}:/workspace:ro`,
        '--tmpfs',
        '/tmp:rw,size=64m',
        '-w',
        '/workspace',
        image,
        'sh',
        '-c',
        options.testCommand,
      ];

      const result = await this.spawnBounded(args, timeoutMs, containerName);
      const executionTimeMs = Date.now() - startTime;

      return {
        status: !result.timedOut && result.exitCode === 0 ? 'PASS' : 'FAIL',
        exitCode: result.timedOut ? -1 : result.exitCode,
        stdout: result.stdout,
        stderr: result.timedOut
          ? `${result.stderr}\n[sandbox] execution timed out after ${timeoutMs}ms`.trim()
          : result.stderr,
        executionTimeMs,
        sandboxType: 'docker',
        truncated: result.truncated,
        timedOut: result.timedOut,
      };
    } finally {
      this.cleanupTempDir(tempDir);
    }
  }

  /** Spawns the container via argument-array exec (never a shell string), bounding output and guaranteeing cleanup on timeout. */
  private spawnBounded(args: string[], timeoutMs: number, containerName: string): Promise<SpawnResult> {
    return new Promise((resolve) => {
      const child = spawn(this.containerRuntime, args, { stdio: ['ignore', 'pipe', 'pipe'] });

      let stdout = '';
      let stderr = '';
      let truncated = false;
      let timedOut = false;
      let settled = false;
      // Once a timeout kill sequence starts, the close/error handlers must not
      // resolve early — resolution must wait for the forced container removal
      // to actually complete, or a caller could observe a leftover container.
      let killSequenceInProgress = false;

      const finish = (result: Omit<SpawnResult, 'stdout' | 'stderr' | 'truncated' | 'timedOut'> & Partial<SpawnResult>) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({ exitCode: result.exitCode ?? -1, stdout, stderr, truncated, timedOut });
      };

      const timer = setTimeout(async () => {
        timedOut = true;
        killSequenceInProgress = true;
        child.kill('SIGKILL');
        try {
          // Guaranteed cleanup: force-remove the container and wait for it to
          // finish before resolving, even if the runtime didn't tear it down
          // promptly after the kill signal.
          await execFileAsync(this.containerRuntime, ['rm', '-f', containerName]);
        } catch {
          // best-effort; the container may already be gone
        }
        finish({ exitCode: -1 });
      }, timeoutMs);

      child.stdout?.on('data', (chunk: Buffer) => {
        const appended = appendBounded(stdout, chunk.toString(), this.maxOutputBytes);
        stdout = appended.text;
        truncated = truncated || appended.truncated;
      });
      child.stderr?.on('data', (chunk: Buffer) => {
        const appended = appendBounded(stderr, chunk.toString(), this.maxOutputBytes);
        stderr = appended.text;
        truncated = truncated || appended.truncated;
      });

      child.on('close', (code) => {
        if (killSequenceInProgress) return; // let the timeout's own cleanup-then-finish flow resolve
        finish({ exitCode: code ?? -1 });
      });
      child.on('error', (error) => {
        stderr = `${stderr}\n${error.message}`.trim();
        if (killSequenceInProgress) return;
        finish({ exitCode: -1 });
      });
    });
  }

  private cleanupTempDir(dir: string): void {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // Best-effort cleanup; never let a teardown failure mask the real result.
    }
  }
}
