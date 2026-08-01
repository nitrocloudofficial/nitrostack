/**
 * APIs.guru registry integration — the ONLY place in this codebase permitted
 * to make network calls. Cache-first, 8s-timeout, never throws.
 *
 * Deviation from the build spec worth flagging: the spec describes the
 * document endpoint as "/{provider}/{service}.json". Verified against the
 * live API (curl, 2026-07-25) — that path 404s. The real v2 API lists a
 * provider's APIs at "/{provider}.json" as an `apis` map keyed either by the
 * bare provider (single-API providers, e.g. "stripe.com") or
 * "{provider}:{service}" (multi-API providers, e.g. "amazonaws.com:acm"),
 * where each entry carries a `swaggerUrl` pointing at the actual OpenAPI
 * document. fetchSpec resolves through that listing rather than guessing a
 * URL shape that would always fail.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export interface RegistryEntry {
  provider: string;
  service: string;
  title: string;
  endpointCount: number;
}

export interface RegistryResult<T> {
  data: T;
  fromCache: boolean;
  degraded: boolean;
}

const BASE_URL = 'https://api.apis.guru/v2';
const TIMEOUT_MS = 8000;
// Overridable only for tests, so they never touch the real committed cache.
const CACHE_DIR = process.env.APISGURU_CACHE_DIR ?? join(process.cwd(), 'fixtures/cache/apisguru');

function cachePath(slug: string): string {
  return join(CACHE_DIR, `${slug}.json`);
}

function readCache(slug: string): unknown {
  const path = cachePath(slug);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null; // corrupt cache file is treated as a miss, never thrown
  }
}

function writeCache(slug: string, data: unknown): void {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(cachePath(slug), JSON.stringify(data, null, 2) + '\n');
}

async function fetchJson(url: string): Promise<{ ok: true; data: unknown } | { ok: false }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return { ok: false };
    return { ok: true, data: await res.json() };
  } catch {
    return { ok: false }; // network error, timeout, or bad JSON — never throws upward
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// listProviders
// ---------------------------------------------------------------------------

function extractProviderList(v: unknown): string[] | null {
  if (typeof v !== 'object' || v === null) return null;
  const data = (v as { data?: unknown }).data;
  return Array.isArray(data) ? (data as string[]) : null;
}

export async function listProviders(): Promise<RegistryResult<string[]>> {
  const slug = 'list_providers';

  // Cache-first: a warm cache never touches the network at all.
  const cached = extractProviderList(readCache(slug));
  if (cached) return { data: cached, fromCache: true, degraded: false };

  const fetched = await fetchJson(`${BASE_URL}/providers.json`);
  if (fetched.ok) {
    const data = extractProviderList(fetched.data);
    if (data) {
      writeCache(slug, fetched.data);
      return { data, fromCache: false, degraded: false };
    }
  }
  return { data: [], fromCache: false, degraded: true };
}

// ---------------------------------------------------------------------------
// listServices
// ---------------------------------------------------------------------------

interface ApisGuruApiEntry {
  swaggerUrl?: string;
  info?: { title?: string };
}
interface ApisGuruProviderListing {
  apis: Record<string, ApisGuruApiEntry>;
}

function isProviderListing(v: unknown): v is ApisGuruProviderListing {
  return typeof v === 'object' && v !== null && typeof (v as { apis?: unknown }).apis === 'object' && (v as { apis: unknown }).apis !== null;
}

function listingSlug(provider: string): string {
  return `list_${provider}`;
}

async function getProviderListing(provider: string): Promise<{ listing: ApisGuruProviderListing; fromCache: boolean } | null> {
  const slug = listingSlug(provider);
  const cached = readCache(slug);
  if (isProviderListing(cached)) return { listing: cached, fromCache: true };

  const fetched = await fetchJson(`${BASE_URL}/${provider}.json`);
  if (fetched.ok && isProviderListing(fetched.data)) {
    writeCache(slug, fetched.data);
    return { listing: fetched.data, fromCache: false };
  }
  return null;
}

function specSlug(provider: string, service: string): string {
  return service ? `spec_${provider}__${service}` : `spec_${provider}`;
}

function endpointCountFromCache(provider: string, service: string): number {
  const cached = readCache(specSlug(provider, service));
  if (isValidSpec(cached)) return Object.keys(cached.paths).length;
  return 0; // not fetched yet — listing alone never carries a path count
}

export async function listServices(provider: string): Promise<RegistryResult<RegistryEntry[]>> {
  const result = await getProviderListing(provider);
  if (!result) return { data: [], fromCache: false, degraded: true };

  const entries: RegistryEntry[] = Object.entries(result.listing.apis).map(([key, api]) => {
    const [entryProvider, service] = key.includes(':') ? key.split(':', 2) : [key, ''];
    return {
      provider: entryProvider,
      service,
      title: api.info?.title ?? key,
      endpointCount: endpointCountFromCache(entryProvider, service),
    };
  });
  entries.sort((a, b) => (a.service || a.provider).localeCompare(b.service || b.provider));

  return { data: entries, fromCache: result.fromCache, degraded: false };
}

// ---------------------------------------------------------------------------
// fetchSpec
// ---------------------------------------------------------------------------

function isValidSpec(v: unknown): v is { paths: Record<string, unknown> } {
  return typeof v === 'object' && v !== null && typeof (v as { paths?: unknown }).paths === 'object' && (v as { paths: unknown }).paths !== null;
}

function resolveApiKey(listing: ApisGuruProviderListing, provider: string, service?: string): string | null {
  if (service) {
    const key = `${provider}:${service}`;
    return key in listing.apis ? key : null;
  }
  if (provider in listing.apis) return provider; // single-API provider, e.g. "stripe.com"
  // Multi-API provider with no service specified: fall back to the first
  // service alphabetically, deterministically, rather than refusing.
  const firstKey = Object.keys(listing.apis).sort()[0];
  return firstKey ?? null;
}

export async function fetchSpec(provider: string, service?: string): Promise<RegistryResult<unknown>> {
  const slug = specSlug(provider, service ?? '');
  const cached = readCache(slug);
  if (isValidSpec(cached)) return { data: cached, fromCache: true, degraded: false };

  const listingResult = await getProviderListing(provider);
  if (!listingResult) return { data: null, fromCache: false, degraded: true };

  const key = resolveApiKey(listingResult.listing, provider, service);
  if (!key) return { data: { error: `no matching API found for provider "${provider}"${service ? ` service "${service}"` : ''}` }, fromCache: false, degraded: true };

  const swaggerUrl = listingResult.listing.apis[key]?.swaggerUrl;
  if (!swaggerUrl) return { data: { error: `listing for "${key}" has no swaggerUrl` }, fromCache: false, degraded: true };

  const fetched = await fetchJson(swaggerUrl);
  if (fetched.ok && isValidSpec(fetched.data)) {
    writeCache(slug, fetched.data);
    return { data: fetched.data, fromCache: false, degraded: false };
  }
  if (fetched.ok) {
    return { data: { error: 'fetched document is not a valid OpenAPI spec (missing "paths")' }, fromCache: false, degraded: true };
  }
  return { data: null, fromCache: false, degraded: true };
}
