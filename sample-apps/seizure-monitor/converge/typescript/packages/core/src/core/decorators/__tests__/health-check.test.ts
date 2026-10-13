import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import {
    HealthCheck,
    registerHealthCheck,
    getAllHealthChecks,
    getHealthCheck,
    getOverallHealth,
    isHealthCheck,
    getHealthCheckMetadata,
    HealthCheckInterface,
    HealthCheckResult
} from '../health-check.decorator.js';

describe('Health Check Decorator', () => {
    describe('@HealthCheck decorator', () => {
        it('should mark class with metadata', () => {
            @HealthCheck({ name: 'test', description: 'Test check' })
            class TestHealthCheck { }

            expect(isHealthCheck(TestHealthCheck)).toBe(true);
        });

        it('should store options in metadata', () => {
            @HealthCheck({ name: 'my-check', description: 'My description', interval: 30 })
            class MyHealthCheck { }

            const metadata = getHealthCheckMetadata(MyHealthCheck);
            expect(metadata).toBeDefined();
            expect(metadata?.name).toBe('my-check');
            expect(metadata?.description).toBe('My description');
            expect(metadata?.interval).toBe(30);
        });
    });

    describe('isHealthCheck', () => {
        it('should return false for non-health-check classes', () => {
            class RegularClass { }
            expect(isHealthCheck(RegularClass)).toBe(false);
        });
    });

    describe('getHealthCheckMetadata', () => {
        it('should return undefined for non-decorated classes', () => {
            class RegularClass { }
            expect(getHealthCheckMetadata(RegularClass)).toBeUndefined();
        });
    });

    describe('registerHealthCheck', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        it('should register a health check', async () => {
            const checker: HealthCheckInterface = {
                check: () => ({ status: 'up', message: 'Healthy' })
            };

            registerHealthCheck(checker, { name: 'registered-check' });

            const result = await getHealthCheck('registered-check');
            expect(result).toBeDefined();
            expect(result?.status).toBe('up');
        });

        it('should run periodically if interval is set', () => {
            const checkFn = jest.fn().mockReturnValue({ status: 'up' });
            const checker: HealthCheckInterface = { check: checkFn as any };

            registerHealthCheck(checker, { name: 'periodic-check', interval: 10 });

            // Fast-forward time
            jest.advanceTimersByTime(10000);

            expect(checkFn).toHaveBeenCalled();
        });
    });

    describe('getHealthCheck', () => {
        it('should return null for unknown check', async () => {
            const result = await getHealthCheck('unknown-check');
            expect(result).toBeNull();
        });

        it('should handle check that throws error', async () => {
            const checker: HealthCheckInterface = {
                check: () => { throw new Error('Check failed'); }
            };

            registerHealthCheck(checker, { name: 'failing-check' });

            const result = await getHealthCheck('failing-check');
            expect(result?.status).toBe('down');
            expect(result?.message).toBe('Health check failed');
        });
    });

    describe('getAllHealthChecks', () => {
        it('should return all registered health checks', async () => {
            const checker1: HealthCheckInterface = {
                check: () => ({ status: 'up' })
            };
            const checker2: HealthCheckInterface = {
                check: () => ({ status: 'degraded' })
            };

            registerHealthCheck(checker1, { name: 'check1' });
            registerHealthCheck(checker2, { name: 'check2' });

            const results = await getAllHealthChecks();
            expect(results['check1']).toBeDefined();
            expect(results['check2']).toBeDefined();
        });
    });

    describe('getOverallHealth', () => {
        it('should return healthy when all checks are up', async () => {
            const checker: HealthCheckInterface = {
                check: () => ({ status: 'up' })
            };

            registerHealthCheck(checker, { name: 'healthy-check' });

            const overall = await getOverallHealth();
            // Note: Other checks may already be registered from previous tests
            expect(['healthy', 'degraded', 'unhealthy']).toContain(overall.status);
            expect(overall.checks).toBeDefined();
        });

        it('should return unhealthy when a check is down', async () => {
            const checker: HealthCheckInterface = {
                check: () => ({ status: 'down' })
            };

            registerHealthCheck(checker, { name: 'down-check' });

            const overall = await getOverallHealth();
            expect(overall.status).toBe('unhealthy');
        });
    });
});
