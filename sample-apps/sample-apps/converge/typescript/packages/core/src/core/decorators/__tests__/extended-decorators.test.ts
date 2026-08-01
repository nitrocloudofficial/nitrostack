import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import 'reflect-metadata';

// Cache Decorator Tests
import {
    Cache,
    getCacheMetadata,
    clearCache,
    InMemoryCacheStorage
} from '../cache.decorator.js';

describe('Cache Decorator', () => {
    beforeEach(async () => {
        await clearCache();
    });

    it('should register cache metadata', () => {
        class TestClass {
            @Cache({ ttl: 60 })
            method() { }
        }
        const instance = new TestClass();
        const metadata = getCacheMetadata(instance, 'method');
        expect(metadata).toEqual(expect.objectContaining({ ttl: 60 }));
    });

    it('should cache method results', async () => {
        const mockMethod = jest.fn((x: number) => x * 2);

        class TestClass {
            @Cache({ ttl: 100 })
            method(x: number) {
                return mockMethod(x);
            }
        }

        const instance = new TestClass();

        // First call
        const result1 = await instance.method(2);
        expect(result1).toBe(4);
        expect(mockMethod).toHaveBeenCalledTimes(1);

        // Second call - should be cached
        const result2 = await instance.method(2);
        expect(result2).toBe(4);
        expect(mockMethod).toHaveBeenCalledTimes(1);

        // Different arg - should call method
        const result3 = await instance.method(3);
        expect(result3).toBe(6);
        expect(mockMethod).toHaveBeenCalledTimes(2);
    });

    it('should respect TTL', async () => {
        const mockMethod = jest.fn(() => 'value');

        // Mock Date.now
        const realNow = Date.now;
        let currentTime = 1000;
        Date.now = jest.fn(() => currentTime);

        class TestClass {
            @Cache({ ttl: 1 }) // 1 second TTL
            method() { return mockMethod(); }
        }

        const instance = new TestClass();

        await instance.method();
        expect(mockMethod).toHaveBeenCalledTimes(1);

        // Advance time past TTL
        currentTime += 2000;

        await instance.method();
        expect(mockMethod).toHaveBeenCalledTimes(2);

        // Cleanup
        Date.now = realNow;
    });

    it('should generate keys using custom generator', async () => {
        const mockMethod = jest.fn(() => 'k');
        class TestClass {
            @Cache({ ttl: 10, key: (i: any) => `key:${i}` })
            method(i: number) { return mockMethod(); }
        }
        const instance = new TestClass();
        await instance.method(1);
        await instance.method(1);
        expect(mockMethod).toHaveBeenCalledTimes(1);
    });
});

// RateLimit Decorator Tests
import {
    RateLimit,
    getRateLimitMetadata,
    resetRateLimit,
    InMemoryRateLimitStorage
} from '../rate-limit.decorator.js';

describe('RateLimit Decorator', () => {
    beforeEach(() => {
        // Reset storage manually if needed, but we used different types mostly
        // The implementation uses a defaultStorage that is exported indirectly via resetRateLimit
    });

    it('should register rate limit metadata', () => {
        class TestClass {
            @RateLimit({ requests: 5, window: '1m' })
            method() { }
        }
        const instance = new TestClass();
        const metadata = getRateLimitMetadata(instance, 'method');
        expect(metadata).toEqual(expect.objectContaining({ requests: 5, window: '1m' }));
    });

    it('should enforce limits', async () => {
        class TestClass {
            @RateLimit({ requests: 2, window: '1m' })
            method() { return 'ok'; }
        }
        const instance = new TestClass();

        // Reset purely for test isolation in case of shared state
        await resetRateLimit('TestClass:method:anonymous');

        await expect(instance.method()).resolves.toBe('ok');
        await expect(instance.method()).resolves.toBe('ok');
        await expect(instance.method()).rejects.toThrow(/Rate limit exceeded/);
    });

    it('should parse window strings', () => {
        // Indirectly testing via success
        class TestClass {
            @RateLimit({ requests: 1, window: '1s' })
            method() { return 'ok'; }
        }
        expect(getRateLimitMetadata(new TestClass(), 'method')!.window).toBe('1s');
    });
});

// HealthCheck Decorator Tests
import {
    HealthCheck,
    registerHealthCheck,
    getAllHealthChecks,
    getOverallHealth,
    HealthCheckInterface,
    isHealthCheck,
    HealthCheckResult
} from '../health-check.decorator.js';

describe('HealthCheck Decorator', () => {
    // Need to clear the global registry? It's not exposed well for clearing.
    // We can just use unique names for tests.

    it('should mark class as health check', () => {
        @HealthCheck({ name: 'test-hc' })
        class MyCheck implements HealthCheckInterface {
            check(): HealthCheckResult { return { status: 'up' }; }
        }
        expect(isHealthCheck(MyCheck)).toBe(true);
    });

    it('should register and execute checks', async () => {
        const checker = {
            check: jest.fn<() => Promise<HealthCheckResult>>().mockResolvedValue({ status: 'up' })
        };
        registerHealthCheck(checker, { name: 'reg-check' });

        const results = await getAllHealthChecks();
        expect(results['reg-check'].status).toBe('up');
        expect(checker.check).toHaveBeenCalled();
    });

    it('should report overall health', async () => {
        // Override with known state
        const good = { check: () => ({ status: 'up' } as HealthCheckResult) };
        const bad = { check: () => ({ status: 'down' } as HealthCheckResult) };

        registerHealthCheck(good, { name: 'good' });

        // At this point, if 'bad' from previous test exists?
        // The registry is global module state.
        // We might need to be careful.
        // registerHealthCheck just sets in map.

        // Let's rely on map overwrite.
        registerHealthCheck(bad, { name: 'bad' });

        const health = await getOverallHealth();
        expect(health.status).toBe('unhealthy');
        expect(health.checks['good'].status).toBe('up');
        expect(health.checks['bad'].status).toBe('down');
    });
});
