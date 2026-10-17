/**
 * Small HTTP helpers for the public npm and OSV APIs: timeout, one retry on transient
 * failures, a size cap, and errors that say which upstream failed.
 */

export class UpstreamError extends Error {
  constructor(
    readonly upstream: string,
    message: string,
    readonly status?: number,
  ) {
    super(`${upstream}: ${message}`);
    this.name = 'UpstreamError';
  }
}

export interface FetchOptions {
  timeoutMs?: number;
  /** Reject bodies larger than this many bytes. */
  maxBytes?: number;
  method?: 'GET' | 'POST';
  body?: unknown;
  headers?: Record<string, string>;
}

const USER_AGENT = 'dep-bouncer (+https://github.com/harsha31bs07-blip/dep-bouncer)';
const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const ALLOWED_ORIGINS = new Set(['https://registry.npmjs.org', 'https://api.npmjs.org', 'https://api.osv.dev']);
const REDIRECTS = new Set([301, 302, 303, 307, 308]);

/** Follow only a bounded chain on the original, allowed public API origin. */
export async function fetchSameOrigin(upstream: string, url: string, options: RequestInit): Promise<Response> {
  let current = new URL(url);
  const origin = current.origin;
  if (!ALLOWED_ORIGINS.has(origin) || current.username || current.password) {
    throw new UpstreamError(upstream, `Refusing to fetch from ${origin}`);
  }
  let request = options;
  for (let redirects = 0; ; redirects++) {
    const response = await fetch(current.href, { ...request, redirect: 'manual' });
    if (!REDIRECTS.has(response.status)) return response;
    await response.body?.cancel().catch(() => undefined);
    const location = response.headers.get('location');
    if (redirects >= 3 || !location) throw new UpstreamError(upstream, 'redirect limit exceeded or missing Location');
    const next = new URL(location, current);
    if (next.origin !== origin || next.username || next.password) {
      throw new UpstreamError(upstream, `Refusing redirect to ${next.origin}`);
    }
    if (response.status === 303 || ((response.status === 301 || response.status === 302) && request.method === 'POST')) {
      request = { ...request, method: 'GET', body: undefined };
    }
    current = next;
  }
}

/** Returns the response body as bytes, or null on HTTP 404. */
export async function fetchBytes(
  upstream: string,
  url: string,
  opts: FetchOptions = {},
): Promise<Uint8Array | null> {
  const { timeoutMs = 15_000, maxBytes = 64 * 1024 * 1024, method = 'GET' } = opts;
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetchSameOrigin(upstream, url, {
        method,
        headers: {
          'user-agent': USER_AGENT,
          ...(opts.body !== undefined ? { 'content-type': 'application/json' } : {}),
          ...opts.headers,
        },
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.status === 404) {
        await res.body?.cancel().catch(() => undefined);
        return null;
      }
      if (!res.ok) {
        await res.body?.cancel().catch(() => undefined);
        lastError = new UpstreamError(upstream, `HTTP ${res.status}`, res.status);
        if (RETRYABLE.has(res.status)) continue;
        throw lastError;
      }
      const declared = Number(res.headers.get('content-length') ?? 0);
      if (declared > maxBytes) {
        await res.body?.cancel().catch(() => undefined);
        throw new UpstreamError(upstream, `response too large (${declared} bytes)`);
      }
      if (!res.body) return new Uint8Array();
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          size += part.value.byteLength;
          if (size > maxBytes) throw new UpstreamError(upstream, `response too large (${size} bytes)`);
          chunks.push(part.value);
        }
      } catch (err) {
        await reader.cancel().catch(() => undefined);
        throw err;
      } finally {
        reader.releaseLock();
      }
      return Buffer.concat(chunks, size);
    } catch (err) {
      if (err instanceof UpstreamError && !RETRYABLE.has(err.status ?? 0)) throw err;
      lastError = err;
    }
  }
  if (lastError instanceof UpstreamError) throw lastError;
  const reason = lastError instanceof Error ? lastError.message : String(lastError);
  throw new UpstreamError(upstream, reason);
}

/** Fetches and parses JSON, or returns null on HTTP 404. */
export async function fetchJson<T>(
  upstream: string,
  url: string,
  opts: FetchOptions = {},
): Promise<T | null> {
  const bytes = await fetchBytes(upstream, url, opts);
  if (bytes === null) return null;
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  } catch {
    throw new UpstreamError(upstream, 'invalid JSON response');
  }
}
