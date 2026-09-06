/**
 * Client ID Metadata Documents (CIMD).
 *
 * The final MCP 2026-07-28 authorization spec **deprecates Dynamic Client
 * Registration (DCR)** in favor of CIMD: a client uses an HTTPS URL as its
 * `client_id`, and that URL resolves to a JSON document describing the client
 * (redirect URIs, grant types, etc.). Authorization servers fetch and cache the
 * document instead of running a registration endpoint.
 *
 * This module provides:
 * - a publisher that serves a client's own metadata document at a stable URL, and
 * - a resolver that fetches and validates a client's CIMD URL.
 *
 * DCR remains available on the legacy path and as an opt-in; CIMD is the
 * recommended mechanism on 2026-07-28.
 *
 * @module
 */

/**
 * A Client ID Metadata Document (OAuth client metadata, RFC 7591 shape).
 * The `client_id` MUST equal the HTTPS URL the document is served from.
 */
export interface ClientIdMetadataDocument {
  /** The HTTPS URL this document is published at (also the OAuth `client_id`). */
  client_id: string;
  client_name?: string;
  redirect_uris: string[];
  grant_types?: string[];
  response_types?: string[];
  token_endpoint_auth_method?: string;
  scope?: string;
  application_type?: 'web' | 'native';
  logo_uri?: string;
  client_uri?: string;
  contacts?: string[];
  [key: string]: unknown;
}

/**
 * Strict validation of a Client Identifier URL per draft-ietf-oauth-client-id-metadata-document-02 §2.
 */
export function validateClientIdentifierUrl(urlStr: string, allowLoopback = true): URL {
  if (typeof urlStr !== 'string' || !urlStr) {
    throw new Error(`Invalid Client Identifier URL: "${urlStr}"`);
  }

  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    throw new Error(`Invalid Client Identifier URL: "${urlStr}"`);
  }

  // Scheme check
  if (parsed.protocol !== 'https:') {
    const isLoopback = allowLoopback && parsed.protocol === 'http:' &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '[::1]' || parsed.hostname === '::1');
    if (!isLoopback) {
      throw new Error(`CIMD client_id must be an HTTPS URL, got: "${urlStr}"`);
    }
  }

  // Userinfo check
  if (parsed.username || parsed.password) {
    throw new Error(`CIMD client_id URL must not contain userinfo: "${urlStr}"`);
  }

  // Fragment check
  if (parsed.hash) {
    throw new Error(`CIMD client_id URL must not contain a fragment component: "${urlStr}"`);
  }

  // Path check (must not be bare domain / empty path)
  const rawPath = urlStr.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^/?#]+/, '');
  if (!rawPath || rawPath === '/' || !parsed.pathname || parsed.pathname === '/') {
    throw new Error(`CIMD client_id URL must contain a path component (cannot be bare domain): "${urlStr}"`);
  }

  // Dot segments check
  const pathWithoutQuery = rawPath.split('?')[0].split('#')[0];
  const segments = pathWithoutQuery.split('/');
  if (segments.some((seg) => seg === '.' || seg === '..')) {
    throw new Error(`CIMD client_id URL must not contain single-dot or double-dot path segments: "${urlStr}"`);
  }

  return parsed;
}

/**
 * Build a Client ID Metadata Document for this client.
 *
 * @param clientIdUrl - The HTTPS URL the document will be served from. Becomes
 *   the `client_id`.
 */
export function createClientIdMetadataDocument(
  clientIdUrl: string,
  metadata: { redirect_uris: string[] } & Partial<Omit<ClientIdMetadataDocument, 'client_id' | 'redirect_uris'>>,
  options?: { allowLoopback?: boolean },
): ClientIdMetadataDocument {
  validateClientIdentifierUrl(clientIdUrl, options?.allowLoopback ?? true);
  return { ...metadata, client_id: clientIdUrl };
}

/**
 * Validate that a resolved document is a well-formed CIMD whose `client_id`
 * matches the URL it was fetched from (prevents impersonation).
 */
export function validateClientIdMetadataDocument(
  doc: unknown,
  sourceUrl: string,
): ClientIdMetadataDocument {
  if (!doc || typeof doc !== 'object') {
    throw new Error('CIMD is not an object');
  }
  const d = doc as Record<string, unknown>;
  if (typeof d.client_id !== 'string') {
    throw new Error('CIMD is missing a string `client_id`');
  }
  const normalize = (u: string): string => u.replace(/\/+$/, '');
  if (normalize(d.client_id) !== normalize(sourceUrl)) {
    throw new Error(
      `CIMD client_id "${d.client_id}" does not match the document URL "${sourceUrl}"`,
    );
  }
  if (!Array.isArray(d.redirect_uris) || d.redirect_uris.some((u) => typeof u !== 'string')) {
    throw new Error('CIMD `redirect_uris` must be an array of strings');
  }
  return d as ClientIdMetadataDocument;
}

import net from 'net';
import dns from 'dns/promises';

/**
 * Checks whether an IPv4 or IPv6 address belongs to RFC 6890 special-use or private ranges.
 */
export function isSpecialUseIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some((n) => isNaN(n) || n < 0 || n > 255)) {
      return true;
    }
    const [b0, b1] = parts;
    // 0.0.0.0/8 (This host)
    if (b0 === 0) return true;
    // 10.0.0.0/8 (Private)
    if (b0 === 10) return true;
    // 100.64.0.0/10 (Carrier-Grade NAT)
    if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;
    // 127.0.0.0/8 (Loopback)
    if (b0 === 127) return true;
    // 169.254.0.0/16 (Link-Local / Cloud Metadata)
    if (b0 === 169 && b1 === 254) return true;
    // 172.16.0.0/12 (Private)
    if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;
    // 192.0.0.0/24, 192.0.2.0/24, 192.88.99.0/24
    if (b0 === 192 && b1 === 0) return true;
    // 192.168.0.0/16 (Private)
    if (b0 === 192 && b1 === 168) return true;
    // 198.18.0.0/15 (Benchmarking)
    if (b0 === 198 && (b1 === 18 || b1 === 19)) return true;
    // 198.51.100.0/24 (TEST-NET-2)
    if (b0 === 198 && b1 === 51) return true;
    // 203.0.113.0/24 (TEST-NET-3)
    if (b0 === 203 && b1 === 0) return true;
    // 224.0.0.0/4 (Multicast) and 240.0.0.0/4 (Reserved / Broadcast)
    if (b0 >= 224) return true;
    return false;
  }

  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase().trim();
    // :: and ::1
    if (normalized === '::' || normalized === '::1' || normalized === '0:0:0:0:0:0:0:0' || normalized === '0:0:0:0:0:0:0:1') {
      return true;
    }
    // IPv4-mapped IPv6 (::ffff:x.x.x.x)
    if (normalized.includes('::ffff:')) {
      const v4Part = normalized.split('::ffff:')[1];
      if (v4Part && net.isIPv4(v4Part)) {
        return isSpecialUseIp(v4Part);
      }
    }
    // Unique-Local fc00::/7 (fc.. or fd..)
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
      return true;
    }
    // Link-Local fe80::/10 (fe8, fe9, fea, feb)
    if (/^fe[89ab]/i.test(normalized)) {
      return true;
    }
    // Multicast ff00::/8
    if (normalized.startsWith('ff')) {
      return true;
    }
    // Discard 100::/64
    if (normalized.startsWith('100:')) {
      return true;
    }
    // Documentation 2001:db8::/32
    if (normalized.startsWith('2001:db8:') || normalized.startsWith('2001:0db8:')) {
      return true;
    }
    return false;
  }

  return true;
}

/**
 * Asserts that a target URL does not resolve to an RFC 6890 special-use or private IP address.
 */
export async function assertSafeFetchTarget(
  urlStr: string,
  allowLoopback = false,
  dnsLookupImpl?: typeof dns.lookup,
): Promise<void> {
  let url: URL;
  try {
    url = new URL(urlStr);
  } catch {
    throw new Error(`Invalid Client Identifier URL: "${urlStr}"`);
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, '');

  // Dev loopback exemption
  if (allowLoopback && (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1')) {
    return;
  }

  // If literal IP
  if (net.isIP(hostname)) {
    if (isSpecialUseIp(hostname)) {
      throw new Error(`Blocked connection to special-use IP address: ${hostname}`);
    }
    return;
  }

  // DNS lookup
  const lookupFn = dnsLookupImpl ?? dns.lookup;
  try {
    const res = await lookupFn(hostname, { all: true } as any);
    const addresses = Array.isArray(res) ? res : [res];
    if (!addresses || addresses.length === 0) {
      throw new Error(`DNS resolution failed for ${hostname}: no addresses found`);
    }
    for (const addr of addresses) {
      if (addr && addr.address && isSpecialUseIp(addr.address)) {
        throw new Error(`CIMD destination ${hostname} resolved to special-use IP address: ${addr.address}`);
      }
    }
  } catch (err: any) {
    if (err.message && err.message.includes('special-use IP')) {
      throw err;
    }
    throw new Error(`DNS lookup failed for ${hostname}: ${err.message || String(err)}`);
  }
}

export const MAX_CIMD_DOCUMENT_BYTES = 5120; // 5 KiB per draft-ietf-oauth-client-id-metadata-document-02 §4

/**
 * Reads response body up to maxBytes, throwing if exceeded.
 */
export async function readBoundedJson<T = unknown>(
  response: Response,
  maxBytes = MAX_CIMD_DOCUMENT_BYTES,
): Promise<T> {
  // Check Content-Length header first if present
  const contentLength = response.headers?.get?.('content-length');
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    throw new Error(`CIMD response exceeds maximum allowed size of ${maxBytes} bytes (Content-Length: ${contentLength})`);
  }

  if (response.body && typeof (response.body as any).getReader === 'function') {
    const reader = (response.body as ReadableStream<Uint8Array>).getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalBytes += value.byteLength;
          if (totalBytes > maxBytes) {
            throw new Error(`CIMD response exceeds maximum allowed size of ${maxBytes} bytes`);
          }
          chunks.push(value);
        }
      }
    } finally {
      reader.releaseLock();
    }

    const merged = Buffer.concat(chunks);
    const text = merged.toString('utf8');
    return JSON.parse(text) as T;
  }

  // Fallback if no streaming body or in mock environments
  if (typeof response.text === 'function') {
    const text = await response.text();
    if (Buffer.byteLength(text, 'utf8') > maxBytes) {
      throw new Error(`CIMD response exceeds maximum allowed size of ${maxBytes} bytes`);
    }
    return JSON.parse(text) as T;
  }

  if (typeof response.json === 'function') {
    const data = await response.json();
    const text = JSON.stringify(data);
    if (Buffer.byteLength(text, 'utf8') > maxBytes) {
      throw new Error(`CIMD response exceeds maximum allowed size of ${maxBytes} bytes`);
    }
    return data as T;
  }

  throw new Error('Unable to read response body');
}

export const DEFAULT_CIMD_FETCH_TIMEOUT_MS = 5000;

/**
 * Resolve a client's CIMD by fetching its `client_id` URL and validating it.
 * Authorization servers call this in place of a DCR lookup.
 */
export async function resolveClientIdMetadataDocument(
  clientIdUrl: string,
  options?: {
    fetchImpl?: typeof fetch;
    allowLoopback?: boolean;
    dnsLookupImpl?: typeof dns.lookup;
    maxDocumentBytes?: number;
    timeoutMs?: number;
    signal?: AbortSignal;
  },
): Promise<ClientIdMetadataDocument> {
  const allowLoopback = options?.allowLoopback ?? (process.env.NODE_ENV !== 'production');
  await assertSafeFetchTarget(clientIdUrl, allowLoopback, options?.dnsLookupImpl);

  if (!/^https:\/\//i.test(clientIdUrl)) {
    const isLoopback = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(clientIdUrl);
    if (!isLoopback || !allowLoopback) {
      throw new Error(`CIMD client_id must be an HTTPS URL, got: ${clientIdUrl}`);
    }
  }

  const timeoutMs = options?.timeoutMs ?? DEFAULT_CIMD_FETCH_TIMEOUT_MS;
  let cleanupTimer: (() => void) | undefined;
  let timeoutSignal: AbortSignal;

  if (typeof AbortSignal.timeout === 'function') {
    timeoutSignal = AbortSignal.timeout(timeoutMs);
  } else {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error(`CIMD request timed out after ${timeoutMs}ms`)), timeoutMs);
    if (typeof (timer as any).unref === 'function') (timer as any).unref();
    cleanupTimer = () => clearTimeout(timer);
    timeoutSignal = controller.signal;
  }

  let effectiveSignal = timeoutSignal;
  if (options?.signal) {
    if (typeof AbortSignal.any === 'function') {
      effectiveSignal = AbortSignal.any([options.signal, timeoutSignal]);
    } else {
      const controller = new AbortController();
      const onAbort = () => controller.abort();
      options.signal.addEventListener('abort', onAbort, { once: true });
      timeoutSignal.addEventListener('abort', onAbort, { once: true });
      effectiveSignal = controller.signal;
    }
  }

  const doFetch = options?.fetchImpl ?? fetch;
  try {
    const response = await doFetch(clientIdUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      redirect: 'error',
      signal: effectiveSignal,
    });
    if (response.status !== 200) {
      throw new Error(`Failed to resolve CIMD from ${clientIdUrl}: HTTP ${response.status} (expected 200 OK)`);
    }
    const maxBytes = options?.maxDocumentBytes ?? MAX_CIMD_DOCUMENT_BYTES;
    const doc = await readBoundedJson(response, maxBytes);
    return validateClientIdMetadataDocument(doc, clientIdUrl);
  } finally {
    cleanupTimer?.();
  }
}

/**
 * Whether a string looks like a CIMD-style client id (a valid HTTP/HTTPS URL) rather
 * than an opaque DCR-issued id.
 */
export function isClientIdMetadataUrl(clientId: string): boolean {
  if (typeof clientId !== 'string' || !clientId.trim()) {
    return false;
  }
  try {
    const parsed = new URL(clientId);
    return (parsed.protocol === 'https:' || parsed.protocol === 'http:') && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

/**
 * Validate that a requested redirect_uri is explicitly listed in the client's CIMD metadata document.
 */
export function validateRedirectUriWithCimd(
  doc: ClientIdMetadataDocument,
  redirectUri: string,
): boolean {
  if (!doc || !Array.isArray(doc.redirect_uris)) {
    return false;
  }
  return doc.redirect_uris.includes(redirectUri);
}

/**
 * In-memory cache for resolved Client ID Metadata Documents (CIMD).
 * Provides positive TTL caching, short-lived negative caching, and
 * in-flight request deduplication to prevent stampedes.
 */
export interface CimdCacheEntry {
  document: ClientIdMetadataDocument | null;
  expires: number;
}

export class CimdCache {
  private cache = new Map<string, CimdCacheEntry>();
  private inflight = new Map<string, Promise<ClientIdMetadataDocument>>();
  private defaultTtlMs: number;
  private negativeTtlMs: number;
  private maxEntries: number;

  constructor(options?: { defaultTtlMs?: number; negativeTtlMs?: number; maxEntries?: number }) {
    this.defaultTtlMs = options?.defaultTtlMs ?? 10 * 60 * 1000; // 10 minutes
    this.negativeTtlMs = options?.negativeTtlMs ?? 30 * 1000; // 30 seconds
    this.maxEntries = options?.maxEntries ?? 1000;
  }

  /**
   * Get cached document if not expired
   */
  get(clientIdUrl: string): ClientIdMetadataDocument | null | undefined {
    const entry = this.cache.get(clientIdUrl);
    if (!entry) return undefined;
    if (Date.now() > entry.expires) {
      this.cache.delete(clientIdUrl);
      return undefined;
    }
    return entry.document;
  }

  /**
   * Store document (or null for negative caching)
   */
  set(clientIdUrl: string, document: ClientIdMetadataDocument | null, ttlMs?: number): void {
    if (this.cache.size >= this.maxEntries && !this.cache.has(clientIdUrl)) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    const ttl = ttlMs ?? (document ? this.defaultTtlMs : this.negativeTtlMs);
    this.cache.set(clientIdUrl, {
      document,
      expires: Date.now() + ttl,
    });
  }

  /**
   * Clear all cached entries and in-flight promises
   */
  clear(): void {
    this.cache.clear();
    this.inflight.clear();
  }

  /**
   * Resolve a client's CIMD with caching and de-duplication
   */
  async resolve(
    clientIdUrl: string,
    options?: Parameters<typeof resolveClientIdMetadataDocument>[1]
  ): Promise<ClientIdMetadataDocument> {
    const cached = this.get(clientIdUrl);
    if (cached !== undefined) {
      if (cached === null) {
        throw new Error(`CIMD lookup previously failed for ${clientIdUrl} (cached failure)`);
      }
      return cached;
    }

    const running = this.inflight.get(clientIdUrl);
    if (running) {
      return running;
    }

    const promise = (async () => {
      try {
        const doc = await resolveClientIdMetadataDocument(clientIdUrl, options);
        this.set(clientIdUrl, doc);
        return doc;
      } catch (err) {
        this.set(clientIdUrl, null);
        throw err;
      } finally {
        this.inflight.delete(clientIdUrl);
      }
    })();

    this.inflight.set(clientIdUrl, promise);
    return promise;
  }
}

/** Default singleton instance of CimdCache */
export const defaultCimdCache = new CimdCache();

/**
 * Create a standard Node.js HTTP / Express / Fastify compatible handler for serving a CIMD.
 * Automatically injects CORS headers (`Access-Control-Allow-Origin: *`) and caching headers.
 */
export function createCimdHandler(
  metadata: ClientIdMetadataDocument,
  options?: { maxAgeSeconds?: number; allowLoopback?: boolean }
) {
  // Validate the document structure
  validateClientIdentifierUrl(metadata.client_id, options?.allowLoopback ?? true);
  validateClientIdMetadataDocument(metadata, metadata.client_id);

  const payload = JSON.stringify(metadata, null, 2);
  const maxAge = options?.maxAgeSeconds ?? 3600;

  return (req: any, res: any) => {
    // Set CORS headers
    if (typeof res.setHeader === 'function') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
    }

    if (req.method === 'OPTIONS') {
      if (typeof res.writeHead === 'function') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization',
        });
        res.end();
      } else if (typeof res.status === 'function') {
        res.status(204).end();
      }
      return;
    }

    if (typeof res.status === 'function') {
      const target = res.status(200);
      if (target && typeof target.send === 'function') {
        target.send(payload);
        return;
      }
      if (target && typeof target.json === 'function') {
        target.json(metadata);
        return;
      }
      if (typeof res.send === 'function') {
        res.send(payload);
        return;
      }
    }

    if (typeof res.writeHead === 'function') {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${maxAge}`,
        'Access-Control-Allow-Origin': '*',
      });
      res.end(payload);
      return;
    }

    if (typeof res.end === 'function') {
      res.end(payload);
      return;
    }
  };
}

/**
 * Mount a Client ID Metadata Document endpoint on an Express or connect-compatible app.
 *
 * @param app - Express application or router
 * @param metadata - The Client ID Metadata Document to serve
 * @param options - Configuration options (path, maxAgeSeconds, allowLoopback)
 * @returns The mounted path
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { mountCimdEndpoint, createClientIdMetadataDocument } from 'nitrostack';
 *
 * const app = express();
 * const cimd = createClientIdMetadataDocument('https://my-agent.com/oauth/client-metadata.json', {
 *   client_name: 'My AI Agent',
 *   redirect_uris: ['https://my-agent.com/oauth/callback'],
 * });
 *
 * mountCimdEndpoint(app, cimd, { path: '/oauth/client-metadata.json' });
 * ```
 */
export function mountCimdEndpoint(
  app: any,
  metadata: ClientIdMetadataDocument,
  options?: { path?: string; maxAgeSeconds?: number; allowLoopback?: boolean }
): string {
  const mountPath = options?.path || '/.well-known/oauth-client-metadata.json';
  const handler = createCimdHandler(metadata, options);

  if (typeof app.get === 'function') {
    app.get(mountPath, handler);
  } else if (typeof app.use === 'function') {
    app.use(mountPath, handler);
  } else {
    throw new Error('mountCimdEndpoint: Unsupported app or router instance');
  }

  return mountPath;
}


