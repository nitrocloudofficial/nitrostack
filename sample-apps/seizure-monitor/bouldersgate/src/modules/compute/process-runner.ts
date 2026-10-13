import { spawn } from 'node:child_process';

/** Command output is bounded so a runaway process cannot exhaust the server. */
export const MAX_OUTPUT_BYTES = 64 * 1024;

export interface ProcessResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  truncated: boolean;
  durationMs: number;
}

export interface RunOptions {
  timeoutMs: number;
  cwd?: string;
  /** Replaces the inherited environment outright when supplied. */
  env?: NodeJS.ProcessEnv;
}

export function runProcess(
  executable: string,
  args: string[],
  options: RunOptions,
): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const child = spawn(executable, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: options.env ?? process.env,
      ...(options.cwd ? { cwd: options.cwd } : {}),
    });

    let stdout: Buffer<ArrayBufferLike> = Buffer.alloc(0);
    let stderr: Buffer<ArrayBufferLike> = Buffer.alloc(0);
    let timedOut = false;
    let truncated = false;
    let settled = false;

    const append = (
      current: Buffer<ArrayBufferLike>,
      chunk: Buffer<ArrayBufferLike>,
    ): Buffer<ArrayBufferLike> => {
      const remaining = MAX_OUTPUT_BYTES - current.length;
      if (remaining <= 0) {
        truncated = true;
        return current;
      }
      if (chunk.length > remaining) {
        truncated = true;
        return Buffer.concat([current, chunk.subarray(0, remaining)]);
      }
      return Buffer.concat([current, chunk]);
    };

    child.stdout.on('data', (chunk: Buffer) => {
      stdout = append(stdout, chunk);
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr = append(stderr, chunk);
    });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, options.timeoutMs);

    child.once('error', (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      reject(error);
    });

    child.once('close', (code) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve({
        exitCode: code ?? (timedOut ? 124 : 1),
        stdout: stdout.toString('utf8'),
        stderr: stderr.toString('utf8'),
        timedOut,
        truncated,
        durationMs: Date.now() - startedAt,
      });
    });
  });
}
