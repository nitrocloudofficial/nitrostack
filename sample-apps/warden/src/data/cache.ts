/**
 * Simple in-memory cache with a time-to-live (TTL), so repeated lookups of
 * the same CVE / indicator don't hit the network twice inside one process
 * lifetime. Not persisted across restarts — that's fine for a hackathon
 * demo and for a stateless MCP server process.
 */

interface Entry<T> {
  value: T;
  expiresAt: number;
}

export class TtlCache<T = unknown> {
  private store = new Map<string, Entry<T>>();

  constructor(private defaultTtlMs = 15 * 60 * 1000) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMs?: number) {
    this.store.set(key, { value, expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs) });
  }

  async getOrLoad(key: string, loader: () => Promise<T>, ttlMs?: number): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) return cached;
    const value = await loader();
    this.set(key, value, ttlMs);
    return value;
  }

  size(): number {
    return this.store.size;
  }
}

// Shared caches used across modules.
export const epssCache = new TtlCache(15 * 60 * 1000); // EPSS scores
