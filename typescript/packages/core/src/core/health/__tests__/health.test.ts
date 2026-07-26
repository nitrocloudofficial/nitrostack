import { jest, describe, it, expect } from '@jest/globals';

const mockGetAllHealthChecks = jest.fn();

jest.unstable_mockModule('../../decorators/health-check.decorator.js', () => ({
    getAllHealthChecks: mockGetAllHealthChecks,
}));

const { buildHealthChecksResource } = await import('../health-checks.resource.js');

describe('Health Checks', () => {
    it('should build health resource with checks', async () => {
        (mockGetAllHealthChecks as any).mockResolvedValue({
            db: { status: 'ok', latency: 10 },
            api: { status: 'ok' }
        });

        const resource = await buildHealthChecksResource();

        expect(resource.uri).toBe('health://checks');
        expect(resource.read).toBeDefined();

        const resultJson = await resource.read();
        const result = JSON.parse(resultJson);

        expect(result.count).toBe(2);
        expect(result.checks).toHaveLength(2);
        expect(result.checks[0].name).toBe('db');
        expect(result.checks[0].status).toBe('ok');
    });

    it('should handle empty checks', async () => {
        (mockGetAllHealthChecks as any).mockResolvedValue({});

        const resource = await buildHealthChecksResource();
        const result = JSON.parse(await resource.read());

        expect(result.count).toBe(0);
        expect(result.checks).toHaveLength(0);
    });
});
