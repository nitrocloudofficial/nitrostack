// src/shared/cache.ts

/**
 * ============================================================
 * VeriCite — Bounded TTL Cache
 * ------------------------------------------------------------
 * A Map with an expiry and a hard entry cap.
 *
 * The cap is the point. The vendored engine shipped an unbounded
 * `Map` keyed by DOI with a 30-minute TTL and eviction only on read
 * — so a long-running server auditing many distinct documents would
 * grow that map without limit, and entries nobody reads again are
 * never evicted at all. That is a slow memory leak in exactly the
 * deployment shape an MCP server has: a process that stays up.
 *
 * This implementation evicts on three triggers:
 *   1. TTL expiry, checked on read
 *   2. Least-recently-used eviction when the cap is reached
 *   3. A sweep of expired entries whenever the cap is reached,
 *      which reclaims cold entries that are never read again
 *
 * Insertion order in a JS Map is stable, so re-inserting on read
 * gives LRU ordering without a second data structure.
 * ============================================================
 */

interface Entry<V> {
    value: V;
    expiresAt: number;
}

export interface CacheStats {
    size: number;
    hits: number;
    misses: number;
    evictions: number;
}

export class TtlCache<V> {
    private readonly entries = new Map<string, Entry<V>>();

    private hits = 0;
    private misses = 0;
    private evictions = 0;

    /**
     * @param ttlMs      Entry lifetime. Zero or less disables caching entirely.
     * @param maxEntries Hard cap; the least recently used entry is evicted first.
     */
    constructor(
        private readonly ttlMs: number,
        private readonly maxEntries: number,
    ) { }

    get enabled(): boolean {
        return this.ttlMs > 0 && this.maxEntries > 0;
    }

    get(key: string): V | undefined {
        if (!this.enabled) return undefined;

        const entry = this.entries.get(key);
        if (!entry) {
            this.misses++;
            return undefined;
        }

        if (Date.now() > entry.expiresAt) {
            this.entries.delete(key);
            this.misses++;
            this.evictions++;
            return undefined;
        }

        // Re-insert to move this key to the most-recently-used position.
        this.entries.delete(key);
        this.entries.set(key, entry);

        this.hits++;
        return entry.value;
    }

    set(key: string, value: V): void {
        if (!this.enabled) return;

        if (this.entries.has(key)) this.entries.delete(key);

        if (this.entries.size >= this.maxEntries) {
            this.sweepExpired();

            // Still full: drop the least recently used key.
            while (this.entries.size >= this.maxEntries) {
                const oldest = this.entries.keys().next();
                if (oldest.done) break;
                this.entries.delete(oldest.value);
                this.evictions++;
            }
        }

        this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    }

    /** Remove every expired entry, including ones never read again. */
    sweepExpired(): number {
        const now = Date.now();
        let removed = 0;

        for (const [key, entry] of this.entries) {
            if (now > entry.expiresAt) {
                this.entries.delete(key);
                removed++;
                this.evictions++;
            }
        }

        return removed;
    }

    clear(): void {
        this.entries.clear();
    }

    stats(): CacheStats {
        return {
            size: this.entries.size,
            hits: this.hits,
            misses: this.misses,
            evictions: this.evictions,
        };
    }
}
