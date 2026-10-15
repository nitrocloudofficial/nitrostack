import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { StudioApiClient, StudioApiError } from '../client.js';

describe('StudioApiClient', () => {
  const mockApiUrl = 'https://api.nitrocloud.ai/api/v1';
  const mockToken = 'test_valid_bearer_token';

  it('throws StudioApiError(401) when no token is available', async () => {
    delete process.env.NITRO_TOKEN;
    delete process.env.NITRO_API_URL;
    process.env.NITRO_CONFIG_PATH = '/nonexistent/path/config.json';

    await expect(StudioApiClient.create({ token: undefined })).rejects.toThrow(StudioApiError);
  });

  it('fetches organizations successfully', async () => {
    const mockOrgs = [
      { _id: 'org_1', name: 'Acme Corp', slug: 'acme-corp' },
      { _id: 'org_2', name: 'Personal', slug: 'personal' },
    ];

    const mockFetch = jest.fn().mockImplementation(async (url: any, init: any) => {
      expect(String(url)).toBe('https://api.nitrocloud.ai/api/v1/studio/organizations');
      expect(init?.headers?.Authorization).toBe(`Bearer ${mockToken}`);
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: mockOrgs }),
      };
    }) as unknown as typeof fetch;

    const client = new StudioApiClient(mockApiUrl, mockToken, mockFetch);
    const orgs = await client.getOrganizations();
    expect(orgs).toEqual(mockOrgs);
  });

  it('falls back to /organizations if /studio/organizations returns 404', async () => {
    const mockOrgs = [{ _id: 'org_fallback', name: 'Fallback Org' }];

    const mockFetch = jest.fn().mockImplementation(async (url: any) => {
      if (String(url).includes('/studio/organizations')) {
        return {
          ok: false,
          status: 404,
          statusText: 'Not Found',
          json: async () => ({ message: 'Not Found' }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: mockOrgs }),
      };
    }) as unknown as typeof fetch;

    const client = new StudioApiClient(mockApiUrl, mockToken, mockFetch);
    const orgs = await client.getOrganizations();
    expect(orgs).toEqual(mockOrgs);
  });

  it('fetches organization apps', async () => {
    const mockApps = [
      { _id: 'app_1', name: 'weather-server', organizationId: 'org_1' },
      { _id: 'app_2', name: 'finance-server', organizationId: 'org_1' },
    ];

    const mockFetch = jest.fn().mockImplementation(async (url: any) => {
      expect(String(url)).toContain('/studio/organizations/org_1/apps');
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: mockApps }),
      };
    }) as unknown as typeof fetch;

    const client = new StudioApiClient(mockApiUrl, mockToken, mockFetch);
    const apps = await client.getOrganizationApps('org_1');
    expect(apps).toEqual(mockApps);
  });

  it('creates an app with POST body', async () => {
    const newAppPayload = {
      name: 'new-app',
      organizationId: 'org_1',
      description: 'Test server',
    };

    const mockFetch = jest.fn().mockImplementation(async (url: any, init: any) => {
      expect(String(url)).toBe('https://api.nitrocloud.ai/api/v1/studio/apps');
      expect(init?.method).toBe('POST');
      expect(JSON.parse(init?.body)).toEqual(newAppPayload);
      return {
        ok: true,
        status: 201,
        json: async () => ({
          data: { _id: 'app_created_99', ...newAppPayload },
        }),
      };
    }) as unknown as typeof fetch;

    const client = new StudioApiClient(mockApiUrl, mockToken, mockFetch);
    const app = await client.createApp(newAppPayload);
    expect(app._id).toBe('app_created_99');
    expect(app.name).toBe('new-app');
  });

  it('properly converts 401 and 403 HTTP errors to StudioApiError', async () => {
    const mockFetch401 = (jest.fn<any>().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ message: 'Token invalid' }),
    })) as unknown as typeof fetch;

    const client401 = new StudioApiClient(mockApiUrl, 'expired_token', mockFetch401);
    await expect(client401.getOrganizations()).rejects.toThrow('Session expired or invalid');

    const mockFetch403 = (jest.fn<any>().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: async () => ({ message: 'Insufficient roles' }),
    })) as unknown as typeof fetch;

    const client403 = new StudioApiClient(mockApiUrl, 'restricted_token', mockFetch403);
    await expect(client403.getOrganizations()).rejects.toThrow('Permission denied');
  });
});
