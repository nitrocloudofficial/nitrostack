import { describe, expect, it, vi } from 'vitest';
import { env } from '../../src/config/env.js';
import { WhoIcdService } from '../../src/integrations/who-icd.service.js';

describe('WhoIcdService bounded authentication', () => {
  it('uses HttpClientService.postForm for token acquisition and labels reference fallback data', async () => {
    const previousId = env.ICD_CLIENT_ID;
    const previousSecret = env.ICD_CLIENT_SECRET;
    (env as any).ICD_CLIENT_ID = 'client-id';
    (env as any).ICD_CLIENT_SECRET = 'client-secret';

    const postForm = vi.fn().mockResolvedValue({
      data: { access_token: 'token', expires_in: 3600 },
    });
    const getJson = vi.fn().mockResolvedValue({ data: { destinationEntities: [] } });
    const service = new WhoIcdService({ postForm, getJson } as any);

    try {
      const result = await service.searchIcd11('diabetes');
      expect(postForm).toHaveBeenCalledTimes(1);
      expect(postForm.mock.calls[0][0]).toMatchObject({
        api: 'who_icd_auth',
        timeoutMs: 8000,
        deadlineMs: 20000,
      });
      expect(result.source).toBe('who_icd11_reference_table');
      expect(result.results[0].uri).toContain('id.who.int');
    } finally {
      (env as any).ICD_CLIENT_ID = previousId;
      (env as any).ICD_CLIENT_SECRET = previousSecret;
    }
  });
});
