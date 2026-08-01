import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let cacheDir: string;
let originalFetch: typeof fetch;

async function freshModule() {
  vi.resetModules();
  return import('../src/integrations/apisguru.js');
}

beforeEach(() => {
  cacheDir = mkdtempSync(join(tmpdir(), 'apisguru-test-'));
  process.env.APISGURU_CACHE_DIR = cacheDir;
  originalFetch = globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.APISGURU_CACHE_DIR;
  rmSync(cacheDir, { recursive: true, force: true });
});

describe('listProviders', () => {
  it('reads a warm cache without ever calling fetch (cache-first)', async () => {
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(join(cacheDir, 'list_providers.json'), JSON.stringify({ data: ['stripe.com', 'slack.com'] }));
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const { listProviders } = await freshModule();
    const result = await listProviders();

    expect(result).toEqual({ data: ['stripe.com', 'slack.com'], fromCache: true, degraded: false });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fetches and caches on a cold cache when the network succeeds', async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ data: ['a.com', 'b.com'] }), { status: 200 })) as unknown as typeof fetch;

    const { listProviders } = await freshModule();
    const result = await listProviders();

    expect(result).toEqual({ data: ['a.com', 'b.com'], fromCache: false, degraded: false });

    // Second call, same process (module already cached the file to disk) — cache-first now applies.
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    const { listProviders: listProviders2 } = await freshModule();
    const second = await listProviders2();
    expect(second).toEqual({ data: ['a.com', 'b.com'], fromCache: true, degraded: false });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns degraded:true with no throw when there is no cache and the network fails', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error('network down');
    }) as unknown as typeof fetch;

    const { listProviders } = await freshModule();
    await expect(listProviders()).resolves.toEqual({ data: [], fromCache: false, degraded: true });
  });

  it('never throws even when fetch resolves with a non-JSON body', async () => {
    globalThis.fetch = vi.fn(async () => new Response('not json', { status: 200 })) as unknown as typeof fetch;
    const { listProviders } = await freshModule();
    await expect(listProviders()).resolves.toEqual({ data: [], fromCache: false, degraded: true });
  });
});

describe('fetchSpec', () => {
  it('validates the fetched document has a "paths" key, degrading with an explanatory message otherwise', async () => {
    globalThis.fetch = vi.fn(async (url: string) => {
      if (url.endsWith('/acme.com.json')) {
        return new Response(
          JSON.stringify({ apis: { 'acme.com': { swaggerUrl: 'https://example.test/acme-spec.json', info: { title: 'Acme' } } } }),
          { status: 200 },
        );
      }
      if (url === 'https://example.test/acme-spec.json') {
        return new Response(JSON.stringify({ notAnOpenApiDoc: true }), { status: 200 });
      }
      throw new Error(`unexpected url ${url}`);
    }) as unknown as typeof fetch;

    const { fetchSpec } = await freshModule();
    const result = await fetchSpec('acme.com');
    expect(result.degraded).toBe(true);
    expect(result.fromCache).toBe(false);
    expect(typeof (result.data as { error?: string }).error).toBe('string');
  });

  it('resolves through the provider listing swaggerUrl and caches the result', async () => {
    globalThis.fetch = vi.fn(async (url: string) => {
      if (url.endsWith('/acme.com.json')) {
        return new Response(
          JSON.stringify({ apis: { 'acme.com': { swaggerUrl: 'https://example.test/acme-spec.json', info: { title: 'Acme' } } } }),
          { status: 200 },
        );
      }
      if (url === 'https://example.test/acme-spec.json') {
        return new Response(JSON.stringify({ paths: { '/widgets': {} } }), { status: 200 });
      }
      throw new Error(`unexpected url ${url}`);
    }) as unknown as typeof fetch;

    const { fetchSpec } = await freshModule();
    const result = await fetchSpec('acme.com');
    expect(result).toEqual({ data: { paths: { '/widgets': {} } }, fromCache: false, degraded: false });
  });

  it('degrades without throwing when the provider listing itself is unreachable', async () => {
    globalThis.fetch = vi.fn(async () => new Response('', { status: 500 })) as unknown as typeof fetch;
    const { fetchSpec } = await freshModule();
    await expect(fetchSpec('nope.com')).resolves.toEqual({ data: null, fromCache: false, degraded: true });
  });

  it('resolves a multi-service provider via "provider:service" keys', async () => {
    globalThis.fetch = vi.fn(async (url: string) => {
      if (url.endsWith('/multi.com.json')) {
        return new Response(
          JSON.stringify({
            apis: {
              'multi.com:svcA': { swaggerUrl: 'https://example.test/svcA.json', info: { title: 'Svc A' } },
              'multi.com:svcB': { swaggerUrl: 'https://example.test/svcB.json', info: { title: 'Svc B' } },
            },
          }),
          { status: 200 },
        );
      }
      if (url === 'https://example.test/svcB.json') {
        return new Response(JSON.stringify({ paths: { '/b': {} } }), { status: 200 });
      }
      throw new Error(`unexpected url ${url}`);
    }) as unknown as typeof fetch;

    const { fetchSpec } = await freshModule();
    const result = await fetchSpec('multi.com', 'svcB');
    expect(result).toEqual({ data: { paths: { '/b': {} } }, fromCache: false, degraded: false });
  });
});

describe('listServices', () => {
  it('maps the apis map into RegistryEntry[] with title and endpointCount', async () => {
    globalThis.fetch = vi.fn(async (url: string) => {
      if (url.endsWith('/multi.com.json')) {
        return new Response(
          JSON.stringify({
            apis: {
              'multi.com:svcA': { swaggerUrl: 'https://example.test/svcA.json', info: { title: 'Svc A' } },
            },
          }),
          { status: 200 },
        );
      }
      throw new Error(`unexpected url ${url}`);
    }) as unknown as typeof fetch;

    const { listServices } = await freshModule();
    const result = await listServices('multi.com');
    expect(result.degraded).toBe(false);
    expect(result.data).toEqual([{ provider: 'multi.com', service: 'svcA', title: 'Svc A', endpointCount: 0 }]);
  });
});
