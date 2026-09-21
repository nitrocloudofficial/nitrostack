import { describe, expect, it, vi } from 'vitest';
import { env } from '../../src/config/env.js';
import { FhirService } from '../../src/integrations/fhir.service.js';
import { UpstreamError } from '../../src/integrations/http-client.service.js';

describe('FhirService failover', () => {
  it('uses the fallback server after a primary upstream failure', async () => {
    const previousPrimary = env.FHIR_BASE_URL;
    const previousFallback = env.FHIR_BASE_URL_FALLBACK;
    (env as any).FHIR_BASE_URL = 'https://primary.fhir.test';
    (env as any).FHIR_BASE_URL_FALLBACK = 'https://fallback.fhir.test';

    const getJson = vi
      .fn()
      .mockRejectedValueOnce(new UpstreamError('primary unavailable', 'fhir', 'UPSTREAM_UNAVAILABLE', 503))
      .mockResolvedValueOnce({
        data: {
          entry: [
            {
              resource: {
                id: 'patient-1',
                name: [{ given: ['Ada'], family: 'Lovelace', use: 'official' }],
                gender: 'female',
                birthDate: '1815-12-10',
              },
            },
          ],
        },
      });
    const service = new FhirService({ getJson } as any);

    try {
      const result = await service.searchPatients({ name: 'Ada', maxResults: 1 });
      expect(result.server_used).toBe('https://fallback.fhir.test');
      expect(result.patients[0].fhir_id).toBe('patient-1');
      expect(getJson).toHaveBeenCalledTimes(2);
      expect(getJson.mock.calls[0][0].url).toContain('primary.fhir.test');
      expect(getJson.mock.calls[1][0].url).toContain('fallback.fhir.test');
    } finally {
      (env as any).FHIR_BASE_URL = previousPrimary;
      (env as any).FHIR_BASE_URL_FALLBACK = previousFallback;
    }
  });

  it('maps patient-specific 404 to PATIENT_NOT_FOUND without trying fallback', async () => {
    const getJson = vi.fn().mockRejectedValue(
      new UpstreamError('not found', 'fhir', 'UPSTREAM_CLIENT_ERROR', 404),
    );
    const service = new FhirService({ getJson } as any);

    await expect(service.getPatient('missing-patient')).rejects.toThrow('PATIENT_NOT_FOUND');
    expect(getJson).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid patient IDs across allergy lookups instead of querying upstreams', async () => {
    const getJson = vi.fn();
    const service = new FhirService({ getJson } as any);

    await expect(service.getAllergies('../secret')).rejects.toThrow('VALIDATION_ERROR');
    expect(getJson).not.toHaveBeenCalled();
  });
});
