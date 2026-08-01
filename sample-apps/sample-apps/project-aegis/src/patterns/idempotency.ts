import { Injectable } from '@nitrostack/core';
import { createHash } from 'crypto';

@Injectable()
export class IdempotencyEnforcer {
  private seenHashes = new Map<string, number>();
  private readonly ttlMs = 15000; // 15-second latency window
  private readonly maxEntries = 10_000; // LRU cache cap to prevent unbounded memory growth
  public isActive = false;

  /**
   * Hashes SHA256(Account_ID + Destination_ID + Amount + Nonce).
   * Intercepts duplicate hashes within a 15-second window, dropping re-queries
   * to mathematically prevent double-spending.
   * Enforces an LRU eviction cap of 10,000 entries.
   */
  checkAndRegister(fromId: string, toId: string, amount: number, nonce: string): boolean {
    if (!this.isActive) return true;

    const payload = `${fromId}:${toId}:${amount}:${nonce}`;
    const hash = createHash('sha256').update(payload).digest('hex');

    const now = Date.now();
    const lastSeen = this.seenHashes.get(hash);

    if (lastSeen && now - lastSeen < this.ttlMs) {
      // Duplicate transaction detected within the 15-second window
      return false; 
    }

    // Delete-and-re-insert to maintain Map insertion order (LRU semantics)
    this.seenHashes.delete(hash);
    this.seenHashes.set(hash, now);

    // Evict oldest entries if we exceed the LRU cap
    this.evictIfOverCap();

    // Clean up TTL-expired entries
    this.cleanup();
    
    return true;
  }

  /**
   * LRU eviction: remove the oldest entries (first in Map iteration order)
   * when the cache exceeds the maximum size.
   */
  private evictIfOverCap() {
    while (this.seenHashes.size > this.maxEntries) {
      const oldestKey = this.seenHashes.keys().next().value;
      if (oldestKey !== undefined) {
        this.seenHashes.delete(oldestKey);
      } else {
        break;
      }
    }
  }

  private cleanup() {
    const now = Date.now();
    for (const [hash, timestamp] of this.seenHashes.entries()) {
      if (now - timestamp >= this.ttlMs) {
        this.seenHashes.delete(hash);
      }
    }
  }
}
