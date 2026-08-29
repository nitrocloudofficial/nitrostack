import { describe, expect, it, vi } from 'vitest';
import { env } from '../../src/config/env.js';
import { FhirService } from '../../src/integrations/fhir.service.js';
import { UpstreamError } from '../../src/integrations/http-client.service.js';

describe('FHIR integration tools', () => {
  it('maps primary failure to fallback data with server_used metadata', async () => {
    const primary = env.FHIR_BASE_URL;
    const fallback = env.FHIR_BASE_URL_FALLBACK;
    (env as any).FHIR_BASE_URL = 'https://primary.fixture.fhir';
    (env as any).FHIR_BASE_URL_FALLBACK = 'https://fallback.fixture.fhir';
    const getJson = vi
      .fn()
      .mockRejectedValueOnce(new UpstreamError('primary down', 'fhir', 'UPSTREAM_UNAVAILABLE', 503))
      .mockResolvedValueOnce({ data: { entry: [{ resource: { id: 'synthetic-1', name: [{ given: ['Ada'], family: 'Lovelace' }], gender: 'female' } }] } });
    const service = new FhirService({ getJson } as any);

    try {
      const result = await service.searchPatients({ name: 'Ada' });
      expect(result.server_used).toBe('https://fallback.fixture.fhir');
      expect(result.patients[0].fhir_id).toBe('synthetic-1');
    } finally {
      (env as any).FHIR_BASE_URL = primary;
      (env as any).FHIR_BASE_URL_FALLBACK = fallback;
    }
  });

  it('maps a patient-specific 404 without querying a fallback server', async () => {
    const getJson = vi.fn().mockRejectedValue(new UpstreamError('missing', 'fhir', 'UPSTREAM_CLIENT_ERROR', 404));
    const service = new FhirService({ getJson } as any);
    await expect(service.getPatient('missing')).rejects.toThrow('PATIENT_NOT_FOUND');
    expect(getJson).toHaveBeenCalledTimes(1);
  });
});
