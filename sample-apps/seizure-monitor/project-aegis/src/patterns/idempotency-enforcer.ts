// ============================================================================
// Project Aegis — Idempotency Enforcer
// Catches duplicate transaction payloads from impatient users during latency
// spikes. Maintains a short-lived SHA-256 hash registry that intercepts
// matching payloads to prevent double-billing.
// ============================================================================

import { createHash } from 'crypto';

/**
 * A cached result entry in the idempotency registry.
 */
interface IdempotencyEntry<T> {
  /** The cached result from the original execution. */
  readonly result: T;
  /** Timestamp (ms since epoch) when this entry was created. */
  readonly createdAt: number;
  /** The idempotency key (SHA-256 hash). */
  readonly key: string;
}

/**
 * Metrics snapshot for the idempotency enforcer's operational state.
 */
export interface IdempotencyMetrics {
  /** Total duplicate requests intercepted (served from cache). */
  duplicatesIntercepted: number;
  /** Total unique requests that were executed normally. */
  uniqueExecutions: number;
  /** Current number of entries in the hash registry. */
  registrySize: number;
  /** Total entries evicted by the TTL sweep. */
  evictedCount: number;
}

/**
 * IdempotencyEnforcer prevents duplicate transaction execution by computing
 * a SHA-256 hash of the request payload and maintaining a short-lived registry.
 * If a matching hash is found within the TTL window, the cached result is
 * returned immediately without re-executing the transaction.
 *
 * The enforcer automatically sweeps expired entries on a configurable interval
 * to prevent memory leaks during sustained traffic.
 *
 * @template T The return type of the idempotent operation.
 *
 * @example
 * ```typescript
 * const enforcer = new IdempotencyEnforcer<TransactionResult>({ ttlMs: 30000 });
 *
 * // First call: executes the transaction
 * const r1 = await enforcer.intercept(payload, () => processTransaction(payload));
 *
 * // Second call with identical payload within 30s: returns cached result
 * const r2 = await enforcer.intercept(payload, () => processTransaction(payload));
 * // r2 === r1, no double-billing
 *
 * enforcer.destroy(); // Clean up the sweep interval
 * ```
 */
export class IdempotencyEnforcer<T> {
  /** Active hash registry mapping SHA-256 keys to cached results. */
  private readonly registry = new Map<string, IdempotencyEntry<T>>();

  /** TTL for idempotency entries in milliseconds. */
  private readonly ttlMs: number;

  /** Interval handle for the periodic sweep. */
  private readonly sweepInterval: ReturnType<typeof setInterval>;

  /** Running metrics counters. */
  private _duplicatesIntercepted = 0;
  private _uniqueExecutions = 0;
  private _evictedCount = 0;

  constructor(options: { ttlMs?: number; sweepIntervalMs?: number } = {}) {
    this.ttlMs = options.ttlMs ?? 30_000; // Default: 30 seconds
    const sweepMs = options.sweepIntervalMs ?? 5_000; // Default: sweep every 5s

    // Start the periodic eviction sweep
    this.sweepInterval = setInterval(() => this.sweep(), sweepMs);
    // Ensure the interval doesn't prevent Node process exit
    if (this.sweepInterval.unref) {
      this.sweepInterval.unref();
    }
  }

  /**
   * Intercept a potentially duplicate request.
   *
   * Computes a SHA-256 hash of the payload. If a matching entry exists in the
   * registry and hasn't expired, returns the cached result immediately.
   * Otherwise, executes `fn` and caches the result.
   *
   * @param payload - The request payload to hash (must be JSON-serializable)
   * @param fn      - The operation to execute if this is not a duplicate
   * @returns       The result (either cached or freshly computed)
   */
  async intercept(payload: unknown, fn: () => Promise<T>): Promise<T> {
    const key = this.computeHash(payload);
    const now = Date.now();

    // Check for existing entry within TTL
    const existing = this.registry.get(key);
    if (existing && now - existing.createdAt < this.ttlMs) {
      this._duplicatesIntercepted++;
      return existing.result;
    }

    // Execute the operation and cache the result
    this._uniqueExecutions++;
    const result = await fn();

    this.registry.set(key, {
      result,
      createdAt: now,
      key,
    });

    return result;
  }

  /**
   * Manually evict a specific key from the registry.
   * Useful when a corrective action invalidates a previous result.
   */
  evict(payload: unknown): boolean {
    const key = this.computeHash(payload);
    return this.registry.delete(key);
  }

  /**
   * Returns current operational metrics.
   */
  getMetrics(): IdempotencyMetrics {
    return {
      duplicatesIntercepted: this._duplicatesIntercepted,
      uniqueExecutions: this._uniqueExecutions,
      registrySize: this.registry.size,
      evictedCount: this._evictedCount,
    };
  }

  /**
   * Reset all metrics counters to zero.
   */
  resetMetrics(): void {
    this._duplicatesIntercepted = 0;
    this._uniqueExecutions = 0;
    this._evictedCount = 0;
  }

  /**
   * Clean up the sweep interval timer. Must be called when the enforcer
   * is no longer needed to prevent resource leaks.
   */
  destroy(): void {
    clearInterval(this.sweepInterval);
    this.registry.clear();
  }

  /**
   * Compute a SHA-256 hash of the payload for use as the idempotency key.
   * Normalizes the payload via deterministic JSON serialization.
   */
  private computeHash(payload: unknown): string {
    const normalized = JSON.stringify(payload, Object.keys(payload as object).sort());
    return createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Periodic sweep to evict expired entries from the registry.
   * Prevents unbounded memory growth during sustained traffic.
   */
  private sweep(): void {
    const now = Date.now();
    for (const [key, entry] of this.registry.entries()) {
      if (now - entry.createdAt >= this.ttlMs) {
        this.registry.delete(key);
        this._evictedCount++;
      }
    }
  }
}
