/**
 * RateLimiter
 *
 * Fixed-window counters, one map per bucket type, keyed by caller
 * identity (userId, API key hash, or IP). Implemented in-memory for a
 * single-process deployment; swap the `store` for a Redis-backed
 * implementation behind the same IRateLimiter interface to scale
 * horizontally without touching the gateway.
 */

import type { IRateLimiter } from '../interfaces/gateway.interfaces.js';
import { RateLimitBucket, RateLimitDecision } from '../types/gateway.types.js';

interface WindowConfig {
  limit: number;
  windowMs: number;
}

interface Counter {
  count: number;
  windowStart: number;
}

export class RateLimiter implements IRateLimiter {
  private readonly store = new Map<string, Counter>();

  constructor(private readonly windows: Record<RateLimitBucket, WindowConfig>) {}

  async check(bucket: RateLimitBucket, key: string): Promise<RateLimitDecision> {
    const config = this.windows[bucket];
    const storeKey = `${bucket}::${key}`;
    const now = Date.now();

    let counter = this.store.get(storeKey);
    if (!counter || now - counter.windowStart >= config.windowMs) {
      counter = { count: 0, windowStart: now };
    }

    const resetAtMs = counter.windowStart + config.windowMs;

    if (counter.count >= config.limit) {
      this.store.set(storeKey, counter);
      return { allowed: false, remaining: 0, resetAtMs };
    }

    counter.count += 1;
    this.store.set(storeKey, counter);

    return {
      allowed: true,
      remaining: Math.max(0, config.limit - counter.count),
      resetAtMs
    };
  }

  /** Periodic cleanup to prevent unbounded memory growth from stale keys. */
  sweepExpired(): void {
    const now = Date.now();
    for (const [key, counter] of this.store.entries()) {
      const bucket = key.split('::')[0] as RateLimitBucket;
      const config = this.windows[bucket];
      if (config && now - counter.windowStart >= config.windowMs) {
        this.store.delete(key);
      }
    }
  }
}

export function createRateLimiterFromEnv(env: NodeJS.ProcessEnv): RateLimiter {
  return new RateLimiter({
    user_requests: { limit: Number(env.RATE_LIMIT_USER_PER_MIN ?? 60), windowMs: 60_000 },
    api_requests: { limit: Number(env.RATE_LIMIT_API_PER_MIN ?? 300), windowMs: 60_000 },
    ai_requests: { limit: Number(env.RATE_LIMIT_AI_PER_MIN ?? 30), windowMs: 60_000 },
    auth_attempts: { limit: Number(env.RATE_LIMIT_AUTH_ATTEMPTS_PER_15MIN ?? 10), windowMs: 15 * 60_000 }
  });
}
