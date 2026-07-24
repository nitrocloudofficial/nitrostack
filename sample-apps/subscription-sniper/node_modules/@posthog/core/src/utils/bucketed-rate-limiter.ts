import type { ExceptionRateLimiterConfig } from '@posthog/types'
import { Logger } from '../types'
import { clampToRange } from './number-utils'

type Bucket = { tokens: number; lastAccess: number }
const ONE_DAY_IN_MS = 86400000

export const DEFAULT_EXCEPTION_RATE_LIMITER_REFILL_RATE = 1
export const DEFAULT_EXCEPTION_RATE_LIMITER_BUCKET_SIZE = 10

/**
 * Resolves the error tracking rate limiter's `refillRate` and `bucketSize` from SDK config,
 * applying the shared defaults. The deprecated double-underscore options are honoured as a
 * fallback so existing browser SDK configs keep working after the rename.
 */
export function resolveExceptionRateLimiterConfig(
  config: ExceptionRateLimiterConfig & {
    /** @deprecated use exceptionRateLimiterRefillRate */
    __exceptionRateLimiterRefillRate?: number
    /** @deprecated use exceptionRateLimiterBucketSize */
    __exceptionRateLimiterBucketSize?: number
  } = {}
): { refillRate: number; bucketSize: number } {
  return {
    refillRate:
      config.exceptionRateLimiterRefillRate ??
      config.__exceptionRateLimiterRefillRate ??
      DEFAULT_EXCEPTION_RATE_LIMITER_REFILL_RATE,
    bucketSize:
      config.exceptionRateLimiterBucketSize ??
      config.__exceptionRateLimiterBucketSize ??
      DEFAULT_EXCEPTION_RATE_LIMITER_BUCKET_SIZE,
  }
}

export class BucketedRateLimiter<T extends string | number> {
  private _bucketSize: number
  private _refillRate: number
  private _refillInterval: number
  private _onBucketRateLimited?: (key: T) => void
  private _buckets: Record<string, Bucket> = {}

  constructor(options: {
    bucketSize: number
    refillRate: number
    refillInterval: number
    _logger: Logger
    _onBucketRateLimited?: (key: T) => void
  }) {
    this._onBucketRateLimited = options._onBucketRateLimited
    this._bucketSize = clampToRange(options.bucketSize, 0, 100, options._logger)
    this._refillRate = clampToRange(options.refillRate, 0, this._bucketSize, options._logger)
    this._refillInterval = clampToRange(options.refillInterval, 0, ONE_DAY_IN_MS, options._logger)
  }

  private _applyRefill(bucket: Bucket, now: number): void {
    const elapsedMs = now - bucket.lastAccess
    const refillIntervals = Math.floor(elapsedMs / this._refillInterval)

    if (refillIntervals > 0) {
      const tokensToAdd = refillIntervals * this._refillRate
      bucket.tokens = Math.min(bucket.tokens + tokensToAdd, this._bucketSize)
      bucket.lastAccess = bucket.lastAccess + refillIntervals * this._refillInterval
    }
  }

  public consumeRateLimit(key: T): boolean {
    const now = Date.now()
    const keyStr = String(key)

    let bucket = this._buckets[keyStr]

    if (!bucket) {
      bucket = { tokens: this._bucketSize, lastAccess: now }
      this._buckets[keyStr] = bucket
    } else {
      this._applyRefill(bucket, now)
    }

    if (bucket.tokens === 0) {
      return true
    }

    bucket.tokens--

    if (bucket.tokens === 0) {
      this._onBucketRateLimited?.(key)
    }

    return bucket.tokens === 0
  }

  public stop(): void {
    this._buckets = {}
  }
}
