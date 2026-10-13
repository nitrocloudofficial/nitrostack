/**
 * SentinelPay AI — Bounded In-Memory Map
 *
 * Several services (`audit.service.ts`, `risk.service.ts`,
 * `investigation.service.ts`, `approval.tools.ts`) keep a process-wide,
 * request-scoped `Map` per case ID as their MVP "storage" (§9.7 — this
 * is explicitly not a durable store). Left as a plain `Map`, each of
 * these grows forever for the life of the process — a real resource
 * leak in any long-running deployment, even though it is invisible in
 * short-lived tests/demos.
 *
 * `BoundedMap` is a drop-in `Map`-like wrapper that evicts the
 * least-recently-used entry once a configured capacity is exceeded, so
 * memory stays bounded regardless of how many cases are ever created.
 * This is a capacity safeguard only, not a correctness change: within
 * the configured capacity, behavior is identical to a plain `Map`.
 */

export class BoundedMap<K, V> {
  private readonly store = new Map<K, V>();

  constructor(private readonly maxEntries: number) {
    if (!Number.isInteger(maxEntries) || maxEntries <= 0) {
      throw new RangeError("BoundedMap maxEntries must be a positive integer.");
    }
  }

  get(key: K): V | undefined {
    const value = this.store.get(key);
    if (value !== undefined) {
      // Refresh recency: delete + re-insert moves this key to the "most
      // recently used" end of the Map's iteration order.
      this.store.delete(key);
      this.store.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    this.store.delete(key);
    this.store.set(key, value);
    if (this.store.size > this.maxEntries) {
      const oldestKey = this.store.keys().next().value as K;
      this.store.delete(oldestKey);
    }
  }

  get size(): number {
    return this.store.size;
  }
}
