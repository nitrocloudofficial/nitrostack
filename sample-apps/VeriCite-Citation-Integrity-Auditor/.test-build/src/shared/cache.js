// src/shared/cache.ts
export class TtlCache {
    ttlMs;
    maxEntries;
    entries = new Map();
    hits = 0;
    misses = 0;
    evictions = 0;
    /**
     * @param ttlMs      Entry lifetime. Zero or less disables caching entirely.
     * @param maxEntries Hard cap; the least recently used entry is evicted first.
     */
    constructor(ttlMs, maxEntries) {
        this.ttlMs = ttlMs;
        this.maxEntries = maxEntries;
    }
    get enabled() {
        return this.ttlMs > 0 && this.maxEntries > 0;
    }
    get(key) {
        if (!this.enabled)
            return undefined;
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
    set(key, value) {
        if (!this.enabled)
            return;
        if (this.entries.has(key))
            this.entries.delete(key);
        if (this.entries.size >= this.maxEntries) {
            this.sweepExpired();
            // Still full: drop the least recently used key.
            while (this.entries.size >= this.maxEntries) {
                const oldest = this.entries.keys().next();
                if (oldest.done)
                    break;
                this.entries.delete(oldest.value);
                this.evictions++;
            }
        }
        this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    }
    /** Remove every expired entry, including ones never read again. */
    sweepExpired() {
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
    clear() {
        this.entries.clear();
    }
    stats() {
        return {
            size: this.entries.size,
            hits: this.hits,
            misses: this.misses,
            evictions: this.evictions,
        };
    }
}
//# sourceMappingURL=cache.js.map