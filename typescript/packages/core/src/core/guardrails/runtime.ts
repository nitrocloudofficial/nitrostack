import type { ExecutionContext } from '../types.js';
import { assertValidPolicy } from './index.js';
import type { GuardrailsConfig, Policy, PolicyProvider, VerifiedIdentity } from './index.js';

/** Where policies live at runtime (database, HTTP service, file, memory). */
export interface PolicySource {
  /** Return the active policy, or null when none is active. Throw when the source is unreachable. */
  load(tenantId: string, policyId: string, opts: { signal?: AbortSignal }): Promise<Policy | null>;
  /** Optional push channel. Call `onChange` whenever a policy may have changed. Returns an unsubscribe function. */
  watch?(onChange: (key: { tenantId: string; policyId?: string }) => void): () => void;
}

export type PolicyChangeEvent = { tenantId: string; policyId: string; from?: number; to: number };

export interface CachedPolicyProviderOptions {
  /** Refresh a cached policy after this long even without a push. Default 30 s. */
  ttlMs?: number;
  /** On source errors, keep serving the last valid policy this long after it was loaded, then fail closed. Default 5 min. */
  maxStaleMs?: number;
  /** policyId -> allowed fact names. Loaded policies that reference anything else are rejected. */
  catalog?: Readonly<Record<string, readonly string[]>>;
  /** Called when a newer policy version replaces the cached one. */
  onChange?: (event: PolicyChangeEvent) => void;
  /** Called when a load fails or a loaded policy is rejected. */
  onError?: (error: unknown, key: { tenantId: string; policyId: string }) => void;
  /** Clock override for tests. */
  now?: () => number;
}

type Entry = { policy: Policy; loadedAt: number; expiresAt: number };
const keyOf = (tenantId: string, policyId: string) => `${tenantId}\0${policyId}`;

/**
 * PolicyProvider that caches policies from a PolicySource and refreshes them at runtime.
 * - single-flight loads per key
 * - every loaded policy is validated before it is cached
 * - a cached version is never replaced by an older one
 * - serves last-known-good during source outages for up to `maxStaleMs`, then throws (Tool maps that to UNAVAILABLE)
 */
export class CachedPolicyProvider implements PolicyProvider {
  private readonly entries = new Map<string, Entry>();
  private readonly inflight = new Map<string, Promise<Policy>>();
  private readonly generations = new Map<string, number>();
  private readonly ttlMs: number;
  private readonly maxStaleMs: number;
  private readonly now: () => number;
  private readonly unwatch?: () => void;
  private closed = false;

  constructor(private readonly source: PolicySource, private readonly opts: CachedPolicyProviderOptions = {}) {
    this.ttlMs = opts.ttlMs ?? 30_000;
    this.maxStaleMs = opts.maxStaleMs ?? 300_000;
    this.now = opts.now ?? Date.now;
    if (!(this.ttlMs >= 0) || !(this.maxStaleMs >= 0)) throw new Error('Invalid cache options');
    this.unwatch = source.watch?.(({ tenantId, policyId }) => this.invalidate(tenantId, policyId));
  }

  async getActive(tenantId: string, policyId: string, opts: { signal?: AbortSignal } = {}): Promise<Policy> {
    if (this.closed) throw new Error('Policy provider closed');
    opts.signal?.throwIfAborted();
    const key = keyOf(tenantId, policyId);
    const entry = this.entries.get(key);
    if (entry && this.now() < entry.expiresAt) return entry.policy;
    let pending = this.inflight.get(key);
    if (!pending) {
      pending = this.refresh(key, tenantId, policyId).finally(() => {
        if (this.inflight.get(key) === pending) this.inflight.delete(key);
      });
      this.inflight.set(key, pending);
    }
    if (!opts.signal) return pending;
    const signal = opts.signal;
    return new Promise<Policy>((resolve, reject) => {
      const onAbort = () => reject(signal.reason ?? new Error('Aborted'));
      signal.addEventListener('abort', onAbort, { once: true });
      pending!.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort));
    });
  }

  /** Drop cached freshness for one policy, or for every policy of a tenant. Last-known-good copies are kept. */
  invalidate(tenantId: string, policyId?: string): void {
    if (policyId) this.bump(keyOf(tenantId, policyId));
    for (const [key, entry] of this.entries) {
      if (key === keyOf(tenantId, policyId ?? '') || (!policyId && key.startsWith(`${tenantId}\0`))) {
        entry.expiresAt = 0;
        this.bump(key);
      }
    }
    if (policyId) this.inflight.delete(keyOf(tenantId, policyId));
    else for (const key of [...this.inflight.keys()]) {
      if (key.startsWith(`${tenantId}\0`)) { this.bump(key); this.inflight.delete(key); }
    }
  }

  /** Drop freshness for everything (e.g. after a lost change stream). */
  invalidateAll(): void {
    for (const [key, entry] of this.entries) { entry.expiresAt = 0; this.bump(key); }
    for (const key of this.inflight.keys()) this.bump(key);
    this.inflight.clear();
  }

  /** Cached version per key, for health endpoints. */
  snapshot(): Array<{ tenantId: string; policyId: string; version: number; ageMs: number; fresh: boolean }> {
    const now = this.now();
    return [...this.entries.entries()].map(([key, e]) => {
      const [tenantId, policyId] = key.split('\0');
      return { tenantId, policyId, version: e.policy.version, ageMs: now - e.loadedAt, fresh: now < e.expiresAt };
    });
  }

  close(): void {
    this.closed = true;
    this.unwatch?.();
    this.entries.clear();
    this.inflight.clear();
  }

  private bump(key: string): void {
    this.generations.set(key, (this.generations.get(key) ?? 0) + 1);
  }

  private async refresh(key: string, tenantId: string, policyId: string): Promise<Policy> {
    const previous = this.entries.get(key);
    const generation = this.generations.get(key) ?? 0;
    let loaded: Policy | null;
    try {
      loaded = await this.source.load(tenantId, policyId, {});
      if (loaded) this.validate(loaded, tenantId, policyId);
    } catch (error) {
      this.opts.onError?.(error, { tenantId, policyId });
      const current = this.entries.get(key);
      if (current && this.now() - current.loadedAt <= this.maxStaleMs) return current.policy;
      throw new Error('Policy unavailable');
    }
    if (!loaded) {
      this.entries.delete(key);
      throw new Error('Policy unavailable');
    }
    const now = this.now();
    const current = this.entries.get(key);
    if (current && current.policy.version > loaded.version) {
      return current.policy;
    }
    const policy = deepFreeze(structuredClone(loaded));
    // A change was announced while this load was in flight: keep the result as last-known-good, but not as fresh.
    const fresh = (this.generations.get(key) ?? 0) === generation;
    this.entries.set(key, { policy, loadedAt: now, expiresAt: fresh ? now + this.ttlMs : 0 });
    const from = (current ?? previous)?.policy.version;
    if (from !== policy.version) this.opts.onChange?.({ tenantId, policyId, from, to: policy.version });
    return policy;
  }

  private validate(policy: Policy, tenantId: string, policyId: string): void {
    const facts = this.opts.catalog?.[policyId];
    if (this.opts.catalog && !facts) throw new Error(`Policy ${policyId} is not in the catalog`);
    const referenced = facts ?? [...new Set((policy.rules ?? []).flatMap(r => (r?.all ?? []).map(c => c?.field)).filter((f): f is string => typeof f === 'string'))];
    assertValidPolicy(policy, tenantId, policyId, referenced);
  }
}

/** PolicySource backed by a Map, with push notifications. For tests and local demos. */
export class InMemoryPolicySource implements PolicySource {
  private readonly policies = new Map<string, Policy>();
  private readonly listeners = new Set<(key: { tenantId: string; policyId?: string }) => void>();

  set(policy: Policy): void {
    this.policies.set(keyOf(policy.tenantId, policy.id), structuredClone(policy));
    this.emit({ tenantId: policy.tenantId, policyId: policy.id });
  }
  delete(tenantId: string, policyId: string): void {
    this.policies.delete(keyOf(tenantId, policyId));
    this.emit({ tenantId, policyId });
  }
  async load(tenantId: string, policyId: string): Promise<Policy | null> {
    const policy = this.policies.get(keyOf(tenantId, policyId));
    return policy ? structuredClone(policy) : null;
  }
  watch(onChange: (key: { tenantId: string; policyId?: string }) => void): () => void {
    this.listeners.add(onChange);
    return () => this.listeners.delete(onChange);
  }
  private emit(key: { tenantId: string; policyId?: string }): void {
    for (const listener of this.listeners) {
      try { listener(key); } catch { /* a listener must not break publishing */ }
    }
  }
}

type IdentityResolver = GuardrailsConfig['identityResolver'];

/**
 * Try identity resolvers in order; the first non-null identity wins.
 * A resolver that throws is treated as "not recognised" so one broken resolver cannot lock out the others.
 */
export function chainIdentity(resolvers: readonly IdentityResolver[]): IdentityResolver {
  return async (ctx: ExecutionContext): Promise<VerifiedIdentity | null> => {
    for (const resolve of resolvers) {
      let identity: VerifiedIdentity | null = null;
      try { identity = await resolve(ctx); } catch { identity = null; }
      if (identity?.principalId && identity.tenantId) return identity;
    }
    return null;
  };
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as object)) deepFreeze(child);
  }
  return value;
}
