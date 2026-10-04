/**
 * SEP-2549 cache hints (`ttlMs` / `cacheScope`).
 *
 * On the 2026-07-28 revision, `tools/list`, `prompts/list`, `resources/list`,
 * `resources/templates/list`, `resources/read`, and `server/discover` results
 * carry `ttlMs` (freshness hint in ms) and `cacheScope` (`public` | `private`).
 *
 * NitroStack maps its existing caching signals onto these hints:
 * - a tool's `@Cache({ ttl })` (seconds) or explicit `cacheHint` → per-tool hint
 * - a resource's `metadata.cacheMaxAge` (seconds) or explicit `cacheHint` → hint
 *
 * The 2025-era path never emits these fields, so this module is only consulted
 * by the modern adapter. The conservative default (`ttlMs: 0`,
 * `cacheScope: 'private'`) is left to the SDK when no hint is resolved.
 *
 * @module
 */

/**
 * Cache scope for a cacheable result (SEP-2549).
 */
export type CacheScope = 'public' | 'private';

/**
 * A NitroStack cache hint. Mirrors the v2 SDK `CacheHint` shape so it can be
 * handed to `registerResource(..., { cacheHint })` / `ServerOptions.cacheHints`
 * without coupling non-modern code to the v2 types.
 */
export interface NitroCacheHint {
  /** Cache lifetime in milliseconds (non-negative). */
  ttlMs?: number;
  /** Whether shared caches may store the result. */
  cacheScope?: CacheScope;
}

/**
 * Minimal shape of a tool for hint resolution (avoids importing the Tool class
 * to keep this feature dependency-light and testable).
 */
export interface CacheHintToolLike {
  cacheHint?: NitroCacheHint;
  /** Seconds — typically propagated from `@Cache({ ttl })`. */
  cacheTtlSeconds?: number;
}

/**
 * Minimal shape of a resource for hint resolution.
 */
export interface CacheHintResourceLike {
  cacheHint?: NitroCacheHint;
  metadata?: { cacheable?: boolean; cacheMaxAge?: number };
}

/**
 * Resolve a cache hint for a tool, or `undefined` when it has no caching signal.
 */
export function resolveToolCacheHint(tool: CacheHintToolLike): NitroCacheHint | undefined {
  if (tool.cacheHint && (tool.cacheHint.ttlMs !== undefined || tool.cacheHint.cacheScope !== undefined)) {
    return normalizeHint(tool.cacheHint);
  }
  if (typeof tool.cacheTtlSeconds === 'number' && tool.cacheTtlSeconds > 0) {
    return { ttlMs: Math.round(tool.cacheTtlSeconds * 1000), cacheScope: 'private' };
  }
  return undefined;
}

/**
 * Resolve a cache hint for a resource, or `undefined` when it has none.
 */
export function resolveResourceCacheHint(resource: CacheHintResourceLike): NitroCacheHint | undefined {
  if (resource.cacheHint && (resource.cacheHint.ttlMs !== undefined || resource.cacheHint.cacheScope !== undefined)) {
    return normalizeHint(resource.cacheHint);
  }
  const maxAge = resource.metadata?.cacheMaxAge;
  if (typeof maxAge === 'number' && maxAge > 0) {
    return { ttlMs: Math.round(maxAge * 1000), cacheScope: 'private' };
  }
  return undefined;
}

/**
 * Clamp/validate a hint into safe values.
 */
export function normalizeHint(hint: NitroCacheHint): NitroCacheHint {
  const out: NitroCacheHint = {};
  if (typeof hint.ttlMs === 'number' && Number.isFinite(hint.ttlMs) && hint.ttlMs >= 0) {
    out.ttlMs = Math.floor(hint.ttlMs);
  }
  if (hint.cacheScope === 'public' || hint.cacheScope === 'private') {
    out.cacheScope = hint.cacheScope;
  }
  return out;
}
