import type { ExceptionRateLimiterConfig } from '@posthog/types';
import { Logger } from '../types';
export declare const DEFAULT_EXCEPTION_RATE_LIMITER_REFILL_RATE = 1;
export declare const DEFAULT_EXCEPTION_RATE_LIMITER_BUCKET_SIZE = 10;
/**
 * Resolves the error tracking rate limiter's `refillRate` and `bucketSize` from SDK config,
 * applying the shared defaults. The deprecated double-underscore options are honoured as a
 * fallback so existing browser SDK configs keep working after the rename.
 */
export declare function resolveExceptionRateLimiterConfig(config?: ExceptionRateLimiterConfig & {
    /** @deprecated use exceptionRateLimiterRefillRate */
    __exceptionRateLimiterRefillRate?: number;
    /** @deprecated use exceptionRateLimiterBucketSize */
    __exceptionRateLimiterBucketSize?: number;
}): {
    refillRate: number;
    bucketSize: number;
};
export declare class BucketedRateLimiter<T extends string | number> {
    private _bucketSize;
    private _refillRate;
    private _refillInterval;
    private _onBucketRateLimited?;
    private _buckets;
    constructor(options: {
        bucketSize: number;
        refillRate: number;
        refillInterval: number;
        _logger: Logger;
        _onBucketRateLimited?: (key: T) => void;
    });
    private _applyRefill;
    consumeRateLimit(key: T): boolean;
    stop(): void;
}
//# sourceMappingURL=bucketed-rate-limiter.d.ts.map