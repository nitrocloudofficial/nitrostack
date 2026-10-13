/**
 * HttpClientService tests — focus on the retry/backoff contract (§4.3).
 * Fetch and sleep are injected mocks; no real network, no real waiting.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  HttpClientService,
  UpstreamError,
} from '../../src/integrations/http-client.service.js';
import { getExternalCalls, runWithExternalCallContext } from '../../src/gateway/request-context.js';

/** Build a minimal Response-like object. */
function fakeResponse(
  status: number,
  body: unknown = {},
  headers: Record<string, string> = {},
): Response {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
    text: () => Promise.resolve(text),
    json: () => Promise.resolve(JSON.parse(text)),
  } as unknown as Response;
}

function makeClient(fetchImpl: ReturnType<typeof vi.fn>) {
  const sleep = vi.fn<(ms: number) => Promise<void>>().mockResolvedValue();
  const client = new HttpClientService(
    fetchImpl as unknown as typeof fetch,
    sleep,
  );
  return { client, sleep };
}

const OPTS = { api: 'test-api', url: 'https://example.com/data?q=secret' };

describe('HttpClientService', () => {
  it('returns parsed JSON with observability metadata on first-try success', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(fakeResponse(200, { ok: true }));
    const { client } = makeClient(fetchImpl);

    const res = await client.getJson<{ ok: boolean }>(OPTS);

    expect(res.data.ok).toBe(true);
    expect(res.meta.status).toBe(200);
    expect(res.meta.attempts).toBe(1);
    expect(res.meta.latencyMs).toBeGreaterThanOrEqual(0);
    // URL sanitization: keys kept, values redacted
    expect(res.meta.sanitizedUrl).toBe('https://example.com/data?q=<redacted>');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('sends identifying User-Agent header', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(fakeResponse(200, {}));
    const { client } = makeClient(fetchImpl);

    await client.getJson(OPTS);

    const headers = fetchImpl.mock.calls[0][1].headers;
    expect(headers['User-Agent']).toMatch(/^vitalis-mcp\/1\.0/);
  });

  it('records sanitized outbound metadata for audit consumers', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(fakeResponse(200, 'xml'));
    const { client } = makeClient(fetchImpl);

    let calls: ReturnType<typeof getExternalCalls>;
    await runWithExternalCallContext(async () => {
      await client.getText({ ...OPTS, api: 'pubmed', headers: { Accept: 'application/xml' } });
      calls = getExternalCalls();
    });

    expect(calls).toEqual([
      expect.objectContaining({
        api: 'pubmed',
        path: 'https://example.com/data?q=<redacted>',
        status: 200,
      }),
    ]);
  });

  it('supports bounded form POSTs through the shared request policy', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(fakeResponse(200, { access_token: 'token' }));
    const { client } = makeClient(fetchImpl);

    const result = await client.postForm<{ access_token: string }>({
      api: 'token-service',
      url: 'https://example.com/token',
      body: 'grant_type=client_credentials',
    });

    expect(result.data.access_token).toBe('token');
    expect(fetchImpl.mock.calls[0][1]).toMatchObject({
      method: 'POST',
      body: 'grant_type=client_credentials',
    });
    expect(fetchImpl.mock.calls[0][1].headers['Content-Type']).toBe(
      'application/x-www-form-urlencoded',
    );
  });

  it('retries 5xx with exponential backoff and succeeds', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(fakeResponse(500))
      .mockResolvedValueOnce(fakeResponse(502))
      .mockResolvedValueOnce(fakeResponse(200, { ok: true }));
    const { client, sleep } = makeClient(fetchImpl);

    const res = await client.getJson(OPTS);

    expect(res.data).toEqual({ ok: true });
    expect(res.meta.attempts).toBe(3);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    // Backoff: 2 sleeps between 3 attempts, ~250ms then ~1000ms (±25% jitter)
    expect(sleep).toHaveBeenCalledTimes(2);
    const [d1, d2] = sleep.mock.calls.map((c) => c[0]);
    expect(d1).toBeGreaterThanOrEqual(187);
    expect(d1).toBeLessThanOrEqual(313);
    expect(d2).toBeGreaterThanOrEqual(750);
    expect(d2).toBeLessThanOrEqual(1250);
  });

  it('does NOT retry 4xx (except 429)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(fakeResponse(404));
    const { client, sleep } = makeClient(fetchImpl);

    const err = await client.getJson(OPTS).catch((e) => e);
    expect(err).toBeInstanceOf(UpstreamError);
    expect(err.code).toBe('UPSTREAM_CLIENT_ERROR');
    expect(err.status).toBe(404);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('retries 429 and honors Retry-After header (capped)', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(fakeResponse(429, {}, { 'retry-after': '2' }))
      .mockResolvedValueOnce(fakeResponse(200, { ok: true }));
    const { client, sleep } = makeClient(fetchImpl);

    await client.getJson(OPTS);

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(2000);
  });

  it('retries network errors then succeeds', async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(fakeResponse(200, { ok: true }));
    const { client } = makeClient(fetchImpl);

    const res = await client.getJson(OPTS);
    expect(res.meta.attempts).toBe(2);
  });

  it('throws UpstreamError after exhausting retries on persistent 5xx', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(fakeResponse(503));
    const { client, sleep } = makeClient(fetchImpl);

    const err = await client.getJson(OPTS).catch((e) => e);
    expect(err).toBeInstanceOf(UpstreamError);
    expect(err.code).toBe('UPSTREAM_UNAVAILABLE');
    expect(err.status).toBe(503);
    expect(fetchImpl).toHaveBeenCalledTimes(3); // 1 + 2 retries
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('times out a hung request and retries', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(abortError)
      .mockResolvedValueOnce(fakeResponse(200, { ok: true }));
    const { client } = makeClient(fetchImpl);

    const res = await client.getJson({ ...OPTS, timeoutMs: 50 });
    expect(res.meta.attempts).toBe(2);
  });

  it('rejects non-JSON bodies with INVALID_RESPONSE', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(fakeResponse(200, '<html>oops</html>'));
    const { client } = makeClient(fetchImpl);

    const err = await client.getJson(OPTS).catch((e) => e);
    expect(err).toBeInstanceOf(UpstreamError);
    expect(err.code).toBe('INVALID_RESPONSE');
    expect(fetchImpl).toHaveBeenCalledTimes(1); // not retryable
  });

  it('rejects oversized responses with RESPONSE_TOO_LARGE', async () => {
    const big = 'x'.repeat(1_048_577);
    const fetchImpl = vi.fn().mockResolvedValue(fakeResponse(200, big));
    const { client } = makeClient(fetchImpl);

    const err = await client.getJson(OPTS).catch((e) => e);
    expect(err).toBeInstanceOf(UpstreamError);
    expect(err.code).toBe('RESPONSE_TOO_LARGE');
  });

  it('enforces the response cap in bytes rather than UTF-16 code units', async () => {
    const bigUtf8Body = '😀'.repeat(300_000); // ~1.2 MB, but fewer than 1,048,577 JS characters
    const fetchImpl = vi.fn().mockResolvedValue(fakeResponse(200, bigUtf8Body));
    const { client } = makeClient(fetchImpl);

    const err = await client.getText(OPTS).catch((e) => e);
    expect(err).toBeInstanceOf(UpstreamError);
    expect(err.code).toBe('RESPONSE_TOO_LARGE');
  });

  it('caps concurrency per host', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const fetchImpl = vi.fn().mockImplementation(async () => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 20));
      inFlight--;
      return fakeResponse(200, {});
    });
    const { client } = makeClient(fetchImpl);
    const url = 'https://concurrency-test.example/x';

    await Promise.all(
      Array.from({ length: 6 }, () =>
        client.getJson({ api: 'test', url, maxConcurrency: 2 }),
      ),
    );

    expect(maxInFlight).toBeLessThanOrEqual(2);
  });

  it('applies default per-host concurrency limits from §4.3', async () => {
    // NCBI is capped at 2 concurrent per the plan
    let inFlight = 0;
    let maxInFlight = 0;
    const fetchImpl = vi.fn().mockImplementation(async () => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 20));
      inFlight--;
      return fakeResponse(200, {});
    });
    const { client } = makeClient(fetchImpl);

    await Promise.all(
      Array.from({ length: 5 }, () =>
        client.getJson({
          api: 'ncbi',
          url: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed',
        }),
      ),
    );

    expect(maxInFlight).toBeLessThanOrEqual(2);
  });
});
