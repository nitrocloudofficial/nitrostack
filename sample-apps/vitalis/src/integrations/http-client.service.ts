/**
 * HttpClientService — shared outbound HTTP client for all upstream APIs.
 * Contract per shared HTTP policy:
 *  - 8s timeout per attempt (AbortController)
 *  - max 2 retries, exponential backoff 250ms → 1s → 4s (+25% jitter),
 *    only on network errors / 429 / 5xx; never retries other 4xx
 *  - per-host concurrency semaphore (rxnav 4, openfda 4, ncbi 2, trials 2,
 *    fhir 2, default 2)
 *  - 1 MB response cap (typed UpstreamError, see plan amendment in §10)
 *  - identifying User-Agent on every request
 *  - every call returns observability metadata for the audit record
 *
 * Cache-unaware by design — caching lives at the tool layer (@Cache).
 */
import { Injectable } from '@nitrostack/core';
import { env } from '../config/env.js';
import { recordExternalCall } from '../gateway/request-context.js';

export interface HttpRequestOptions {
  /** Short upstream name for logs/audit, e.g. 'openfda'. */
  api: string;
  /** Absolute URL (query string allowed; values are redacted in metadata). */
  url: string;
  /** Extra request headers. */
  headers?: Record<string, string>;
  /** Per-attempt timeout in ms. Default 8000. */
  timeoutMs?: number;
  /** Overall request deadline in ms. Default 20000. */
  deadlineMs?: number;
  /** Retries after the first attempt. Default 2. */
  maxRetries?: number;
  /** HTTP method; GET by default. */
  method?: 'GET' | 'POST';
  /** Optional request body for POST calls. */
  body?: string;
  /** Concurrency key override (defaults to URL hostname). */
  concurrencyKey?: string;
  /** Max concurrent requests for the key (defaults per §4.3 map). */
  maxConcurrency?: number;
}

export interface HttpCallMetadata {
  api: string;
  /** URL with query param VALUES redacted (keys kept for debugging). */
  sanitizedUrl: string;
  status: number;
  latencyMs: number;
  attempts: number;
}

export interface HttpResponse<T> {
  data: T;
  meta: HttpCallMetadata;
}

export class UpstreamError extends Error {
  constructor(
    message: string,
    public readonly api: string,
    public readonly code:
      | 'UPSTREAM_UNAVAILABLE'
      | 'UPSTREAM_CLIENT_ERROR'
      | 'UPSTREAM_TIMEOUT'
      | 'RESPONSE_TOO_LARGE'
      | 'INVALID_RESPONSE',
    public readonly status?: number,
    public readonly attempts: number = 1,
  ) {
    super(message);
    this.name = 'UpstreamError';
  }
}

/** FIFO semaphore capping concurrent requests per upstream host. */
class Semaphore {
  private active = 0;
  private readonly queue: Array<() => void> = [];

  constructor(private readonly max: number) {}

  async acquire(): Promise<() => void> {
    if (this.active >= this.max) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.active++;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.active--;
      this.queue.shift()?.();
    };
  }
}

const DEFAULT_HOST_CONCURRENCY: Record<string, number> = {
  'rxnav.nlm.nih.gov': 4,
  'api.fda.gov': 4,
  'eutils.ncbi.nlm.nih.gov': 2,
  'clinicaltrials.gov': 2,
  'clinicaltables.nlm.nih.gov': 2,
  'hapi.fhir.org': 2,
  'r4.smarthealthit.org': 2,
};
const FALLBACK_CONCURRENCY = 2;

const MAX_RESPONSE_BYTES = 1_048_576; // 1 MB
const BASE_BACKOFF_MS = 250; // 250 → 1000 → 4000
const MAX_RETRY_AFTER_MS = 5_000;

type FetchImpl = typeof fetch;
type SleepFn = (ms: number) => Promise<void>;

@Injectable({ deps: [] })
export class HttpClientService {
  private static readonly semaphores = new Map<string, Semaphore>();
  private readonly customFetch?: FetchImpl;
  private readonly customSleep?: SleepFn;

  constructor(arg1?: any, arg2?: any) {
    if (typeof arg1 === 'function' && arg1 !== (Object as unknown)) {
      this.customFetch = arg1;
    }
    if (typeof arg2 === 'function' && arg2 !== (Object as unknown)) {
      this.customSleep = arg2;
    }
  }

  private async sleep(ms: number): Promise<void> {
    if (this.customSleep) {
      return this.customSleep(ms);
    }
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** GET and parse JSON. Throws UpstreamError on exhaustion or 4xx. */
  async getJson<T = unknown>(opts: HttpRequestOptions): Promise<HttpResponse<T>> {
    return this.execute(opts, async (response) => {
      const text = await this.readTextCapped(response, opts.api);
      try {
        return JSON.parse(text) as T;
      } catch {
        throw new UpstreamError(
          `${opts.api} returned non-JSON body`,
          opts.api,
          'INVALID_RESPONSE',
          response.status,
        );
      }
    });
  }

  /** GET raw text (e.g. PubMed EFetch XML). Same retry/timeout/caps as getJson. */
  async getText(opts: HttpRequestOptions): Promise<HttpResponse<string>> {
    return this.execute(opts, (response) => this.readTextCapped(response, opts.api));
  }

  /** Bounded form POST used by optional OAuth token acquisition. */
  async postForm<T = unknown>(
    opts: Omit<HttpRequestOptions, 'method' | 'body'> & { body: string },
  ): Promise<HttpResponse<T>> {
    return this.execute(
      {
        ...opts,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          ...opts.headers,
        },
      },
      async (response) => {
        const text = await this.readTextCapped(response, opts.api);
        try {
          return JSON.parse(text) as T;
        } catch {
          throw new UpstreamError(
            `${opts.api} returned non-JSON body`,
            opts.api,
            'INVALID_RESPONSE',
            response.status,
          );
        }
      },
    );
  }

  /**
   * Core request pipeline: semaphore → attempts with retry/backoff → parse.
   * Retries only on network errors / 429 / 5xx; other 4xx fail immediately.
   */
  private async execute<T>(
    opts: HttpRequestOptions,
    parse: (response: Response) => Promise<T>,
  ): Promise<HttpResponse<T>> {
    const release = await this.acquireSemaphore(opts);
    const startedAt = Date.now();
    const deadlineAt = startedAt + (opts.deadlineMs ?? 20_000);
    const maxAttempts = 1 + (opts.maxRetries ?? 2);
    let attempts = 0;

    try {
      let lastError: UpstreamError | null = null;

      for (attempts = 1; attempts <= maxAttempts; attempts++) {
        try {
          const remainingMs = deadlineAt - Date.now();
          if (remainingMs <= 0) {
            throw new UpstreamError(
              `${opts.api} request exceeded its overall deadline`,
              opts.api,
              'UPSTREAM_TIMEOUT',
              undefined,
              attempts,
            );
          }
          const response = await this.fetchWithTimeout(
            opts,
            Math.min(opts.timeoutMs ?? 8_000, remainingMs),
          );

          if (!response || typeof response.status !== 'number') {
            const respType = response ? typeof response : 'null/undefined';
            const keys = response ? Object.keys(response) : [];
            throw new Error(`fetch returned invalid response object (type: ${respType}, keys: ${keys.join(',')})`);
          }

          recordExternalCall({
            api: opts.api,
            path: this.sanitizeUrl(opts.url),
            status: response.status,
            latency_ms: Date.now() - startedAt,
          });

          if (response.status === 429 || response.status >= 500) {
            lastError = new UpstreamError(
              `${opts.api} returned ${response.status}`,
              opts.api,
              'UPSTREAM_UNAVAILABLE',
              response.status,
              attempts,
            );
            if (attempts < maxAttempts) {
              const delay = Math.min(this.retryDelayMs(attempts, response), deadlineAt - Date.now());
              if (delay <= 0) throw lastError;
              await this.sleep(delay);
              continue;
            }
            throw lastError;
          }

          if (response.status >= 400) {
            // 4xx (except 429): caller error — never retry.
            throw new UpstreamError(
              `${opts.api} returned ${response.status}`,
              opts.api,
              'UPSTREAM_CLIENT_ERROR',
              response.status,
              attempts,
            );
          }

          const data = await parse(response);
          return {
            data,
            meta: {
              api: opts.api,
              sanitizedUrl: this.sanitizeUrl(opts.url),
              status: response.status,
              latencyMs: Date.now() - startedAt,
              attempts,
            },
          };
        } catch (error) {
          if (error instanceof UpstreamError) throw error;

          // Network failure or abort → retryable.
          const isTimeout =
            error instanceof Error && error.name === 'AbortError';
          lastError = new UpstreamError(
            `${opts.api} ${isTimeout ? 'timed out' : 'network error'}: ${
              error instanceof Error ? error.message : String(error)
            }`,
            opts.api,
            isTimeout ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNAVAILABLE',
            undefined,
            attempts,
          );
          recordExternalCall({
            api: opts.api,
            path: this.sanitizeUrl(opts.url),
            status: 0,
            latency_ms: Date.now() - startedAt,
            error_code: lastError.code,
          });
          if (attempts < maxAttempts) {
            const delay = Math.min(this.retryDelayMs(attempts), deadlineAt - Date.now());
            if (delay <= 0) throw lastError;
            await this.sleep(delay);
            continue;
          }
          throw lastError;
        }
      }

      throw (
        lastError ??
        new UpstreamError(`${opts.api} request failed`, opts.api, 'UPSTREAM_UNAVAILABLE', undefined, attempts)
      );
    } finally {
      release();
    }
  }

  private async fetchWithTimeout(opts: HttpRequestOptions, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const fn = this.customFetch ?? globalThis.fetch;
      return await fn(opts.url, {
        method: opts.method ?? 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': `vitalis-mcp/1.0 (hackathon; contact: ${env.CONTACT_EMAIL ?? 'unset'})`,
          Accept: 'application/json',
          ...opts.headers,
        },
        ...(opts.body !== undefined ? { body: opts.body } : {}),
      });
    } finally {
      clearTimeout(timer);
    }
  }

  /** Enforces the 1 MB response cap; counts bytes before buffering streams. */
  private async readTextCapped(response: Response, api: string): Promise<string> {
    if (response.body?.getReader) {
      const reader = response.body.getReader();
      const chunks: Buffer[] = [];
      let totalBytes = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = Buffer.from(value);
          totalBytes += chunk.byteLength;
          if (totalBytes > MAX_RESPONSE_BYTES) {
            await reader.cancel();
            throw new UpstreamError(
              `${api} response exceeded ${MAX_RESPONSE_BYTES} bytes`,
              api,
              'RESPONSE_TOO_LARGE',
              response.status,
            );
          }
          chunks.push(chunk);
        }
      } finally {
        reader.releaseLock();
      }
      return Buffer.concat(chunks, totalBytes).toString('utf8');
    }

    // Test doubles and older Response implementations may expose only text().
    // Still enforce the byte limit rather than JavaScript UTF-16 code units.
    const text = await response.text();
    if (Buffer.byteLength(text, 'utf8') > MAX_RESPONSE_BYTES) {
      throw new UpstreamError(
        `${api} response exceeded ${MAX_RESPONSE_BYTES} bytes`,
        api,
        'RESPONSE_TOO_LARGE',
        response.status,
      );
    }
    return text;
  }

  /** 250ms → 1s → 4s with ±25% jitter; Retry-After honored (capped at 5s). */
  private retryDelayMs(attempt: number, response?: Response): number {
    const retryAfter = response?.headers?.get?.('retry-after');
    if (retryAfter) {
      const seconds = Number(retryAfter);
      if (Number.isFinite(seconds) && seconds > 0) {
        return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS);
      }
    }
    const base = BASE_BACKOFF_MS * 4 ** (attempt - 1);
    return Math.round(base * (0.75 + Math.random() * 0.5));
  }

  private acquireSemaphore(opts: HttpRequestOptions): Promise<() => void> {
    const host = new URL(opts.url).hostname;
    // Explicit maxConcurrency gets its own bucket so it can't corrupt the default.
    const key =
      opts.concurrencyKey ??
      (opts.maxConcurrency ? `${host}:${opts.maxConcurrency}` : host);
    const max =
      opts.maxConcurrency ?? DEFAULT_HOST_CONCURRENCY[host] ?? FALLBACK_CONCURRENCY;
    let semaphore = HttpClientService.semaphores.get(key);
    if (!semaphore) {
      semaphore = new Semaphore(max);
      HttpClientService.semaphores.set(key, semaphore);
    }
    return semaphore.acquire();
  }

  /** Keeps path + query keys, redacts values: /x?a=<redacted>&b=<redacted> */
  private sanitizeUrl(url: string): string {
    try {
      const u = new URL(url);
      const keys = [...u.searchParams.keys()].map((k) => `${k}=<redacted>`);
      return `${u.origin}${u.pathname}${keys.length ? `?${keys.join('&')}` : ''}`;
    } catch {
      return '<unparseable-url>';
    }
  }
}
