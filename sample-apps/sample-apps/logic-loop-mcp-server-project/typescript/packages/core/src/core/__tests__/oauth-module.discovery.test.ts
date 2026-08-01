import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { OAuthModule, OAuthModuleConfig } from '../oauth-module.js';

function createMockRes() {
    const res: any = { statusCode: 0, headers: {} as Record<string, string>, body: '' };
    res.writeHead = (status: number, headers: Record<string, string>) => {
        res.statusCode = status;
        res.headers = headers;
    };
    res.end = (data: string) => {
        res.body = data;
    };
    return res;
}

function createModule(config: Partial<OAuthModuleConfig> = {}) {
    const fullConfig: OAuthModuleConfig = {
        resourceUri: 'https://api.example.com',
        authorizationServers: ['https://auth.example.com'],
        ...config,
    };
    const mockServer = {
        _transportType: 'stdio',
        _httpTransport: null,
        getHttpTransport() {
            return this._httpTransport;
        },
    } as any;
    const mockLogger = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    } as any;
    return new OAuthModule(fullConfig, mockServer, mockLogger);
}

describe('OAuthModule discovery handlers', () => {
    const originalFetch = global.fetch;
    const originalEnv = { ...process.env };

    beforeEach(() => {
        (OAuthModule as any).config = null;
        (OAuthModule as any).discoveryMetadataCache?.clear?.();
        delete process.env.OAUTH_ENABLE_CLIENT_REGISTRATION;
        delete process.env.OAUTH_CLIENT_ID;
        delete process.env.OAUTH_CLIENT_SECRET;
    });

    afterEach(() => {
        global.fetch = originalFetch;
        process.env = { ...originalEnv };
    });

    describe('registrationHandler', () => {
        it('returns 404 when client registration is disabled (default)', async () => {
            const module = createModule();
            const res = createMockRes();

            await (module as any).registrationHandler({ method: 'POST', body: {} }, res);

            expect(res.statusCode).toBe(404);
            expect(res.body).not.toContain('378036683838275586');
        });

        it('returns 404 when enabled but no client id configured', async () => {
            const module = createModule({ enableClientRegistration: true });
            const res = createMockRes();

            await (module as any).registrationHandler({ method: 'POST', body: {} }, res);

            expect(res.statusCode).toBe(404);
        });

        it('never leaks a hardcoded client id/secret', async () => {
            const module = createModule({ enableClientRegistration: true, staticClientId: 'configured-client' });
            const res = createMockRes();

            await (module as any).registrationHandler({ method: 'POST', body: {} }, res);

            expect(res.statusCode).toBe(200);
            const payload = JSON.parse(res.body);
            expect(payload.client_id).toBe('configured-client');
            expect(res.body).not.toContain('378036683838275586');
        });

        it('honors OPTIONS preflight without exposing credentials', async () => {
            const module = createModule({ enableClientRegistration: true, staticClientId: 'configured-client' });
            const res = createMockRes();

            await (module as any).registrationHandler({ method: 'OPTIONS' }, res);

            expect(res.statusCode).toBe(200);
            expect(res.body).toBe('');
        });
    });

    describe('wellKnownHandler', () => {
        it('derives the registration endpoint from resourceUri (ignoring a spoofed Host) and caches upstream metadata', async () => {
            const fetchMock = jest.fn(async () => ({
                ok: true,
                json: async () => ({ issuer: 'https://auth.example.com' }),
            })) as any;
            global.fetch = fetchMock;

            const module = createModule({ enableClientRegistration: true, staticClientId: 'configured-client' });
            // A spoofed Host / X-Forwarded-Proto must NOT influence the advertised endpoint.
            const req = { headers: { host: 'mcp.example.com', 'x-forwarded-proto': 'https' } };

            const res1 = createMockRes();
            await (module as any).wellKnownHandler(req, res1);
            const meta1 = JSON.parse(res1.body);
            expect(meta1.registration_endpoint).toBe('https://api.example.com/oauth/v2/register');

            const res2 = createMockRes();
            await (module as any).wellKnownHandler(req, res2);

            // Second call should be served from cache (no additional fetch for the same auth server)
            expect(fetchMock).toHaveBeenCalledTimes(1);
        });

        it('omits registration_endpoint when registration is disabled', async () => {
            global.fetch = (jest.fn(async () => ({ ok: false, json: async () => ({}) })) as any);

            const module = createModule();
            const req = { headers: { host: 'mcp.example.com', 'x-forwarded-proto': 'https' } };
            const res = createMockRes();

            await (module as any).wellKnownHandler(req, res);
            const meta = JSON.parse(res.body);

            expect(meta.registration_endpoint).toBeUndefined();
        });

        it('derives the registration endpoint from resourceUri origin when enabled (fallback metadata path)', async () => {
            global.fetch = (jest.fn(async () => ({ ok: false, json: async () => ({}) })) as any);

            const module = createModule({ enableClientRegistration: true, staticClientId: 'configured-client' });
            const req = { headers: { host: 'mcp.example.com', 'x-forwarded-proto': 'https' } };
            const res = createMockRes();

            await (module as any).wellKnownHandler(req, res);
            const meta = JSON.parse(res.body);

            expect(meta.registration_endpoint).toBe('https://api.example.com/oauth/v2/register');
        });
    });
});
