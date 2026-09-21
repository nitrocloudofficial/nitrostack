import { describe, expect, it, vi } from 'vitest';
import { ExternalApiHealthCheck } from '../../src/health/external-api.health.js';

describe('ExternalApiHealthCheck', () => {
  it('uses the shared client with a 3-second single-attempt probe policy', async () => {
    const getJson = vi.fn().mockResolvedValue({ meta: { status: 200 } });
    const health = new ExternalApiHealthCheck({ getJson } as any);

    const result = await health.check();
    expect(result.status).toBe('up');
    expect(result.details.required_up_count).toBe(6);
    expect(getJson).toHaveBeenCalled();
    for (const [options] of getJson.mock.calls) {
      expect(options).toMatchObject({ timeoutMs: 3000, deadlineMs: 3000, maxRetries: 0 });
    }
  });

  it('distinguishes required failures from optional fallback failures', async () => {
    const getJson = vi.fn().mockImplementation(({ api }: { api: string }) => {
      if (api === 'health:fhir_primary') {
        return Promise.reject({ status: 503, code: 'UPSTREAM_UNAVAILABLE' });
      }
      if (api === 'health:fhir_fallback') {
        return Promise.reject({ status: 503, code: 'UPSTREAM_UNAVAILABLE' });
      }
      return Promise.resolve({ meta: { status: 200 } });
    });
    const health = new ExternalApiHealthCheck({ getJson } as any);

    const result = await health.check();
    expect(result.status).toBe('degraded');
    expect(result.details.required_down_count).toBe(1);
    expect(result.details.optional_down_count).toBe(1);
    const fhir = result.details.upstreams.find((item: any) => item.name === 'fhir_primary');
    const fallback = result.details.upstreams.find((item: any) => item.name === 'fhir_fallback');
    expect(fhir).toMatchObject({ required: true, up: false, status: 503 });
    expect(fallback).toMatchObject({ required: false, up: false, status: 503 });
  });
});
