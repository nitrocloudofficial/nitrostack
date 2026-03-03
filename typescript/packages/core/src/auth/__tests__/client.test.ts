import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import crypto from 'crypto';

// Mock global fetch
const mockFetch = jest.fn() as any;
(global as any).fetch = mockFetch;

const { OAuth2Client } = await import('../client.js');

describe('OAuth2Client', () => {
    let client: any;
    const config = {
        name: 'test-app',
        version: '1.0.0',
        authorizationServerUrl: 'https://auth.example.com'
    };

    beforeEach(() => {
        jest.clearAllMocks();
        client = new OAuth2Client(config as any);
    });

    describe('discoverProtectedResourceMetadata', () => {
        it('should discover metadata via WWW-Authenticate header', async () => {
            mockFetch.mockResolvedValueOnce({
                status: 401,
                headers: {
                    get: (name: string) => name.toLowerCase() === 'www-authenticate' ? 'Bearer resource_metadata="https://auth.example.com/meta"' : null
                },
                ok: false
            });
            mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ issuer: 'https://auth' }) });
            const result = await client.discoverProtectedResourceMetadata('https://mcp/api');
            expect(result.issuer).toBe('https://auth');
        });

        it('should discovery via well-known and handle errors', async () => {
            mockFetch.mockRejectedValueOnce(new Error('401 fail'));
            mockFetch.mockRejectedValueOnce(new Error('WK 1 fail'));
            mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ issuer: 'https://auth' }) });
            // Use path to get 2 well-known URIs (total 3 attempts)
            const result = await client.discoverProtectedResourceMetadata('https://mcp/api');
            expect(result.issuer).toBe('https://auth');
        });

        it('should throw if all discovery fails', async () => {
            mockFetch.mockRejectedValue(new Error('fail'));
            await expect(client.discoverProtectedResourceMetadata('https://mcp')).rejects.toThrow('Failed to discover protected resource metadata');
        });
    });

    describe('discoverAuthorizationServerMetadata', () => {
        it('should discover with path in issuer', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ issuer: 'https://auth/t', code_challenge_methods_supported: ['S256'] })
            });
            await client.discoverAuthorizationServerMetadata('https://auth/t');
            expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/.well-known/oauth-authorization-server/t'), expect.anything());
        });

        it('should discover without path in issuer', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ issuer: 'https://auth', code_challenge_methods_supported: ['S256'] })
            });
            await client.discoverAuthorizationServerMetadata('https://auth');
            expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/.well-known/oauth-authorization-server'), expect.anything());
        });

        it('should throw if PKCE S256 not supported', async () => {
            mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ code_challenge_methods_supported: ['plain'] }) });
            await expect(client.discoverAuthorizationServerMetadata('https://auth')).rejects.toThrow();
        });

        it('should throw if metadata fetch fails', async () => {
            mockFetch.mockResolvedValue({ ok: false, status: 404 });
            await expect(client.discoverAuthorizationServerMetadata('https://auth')).rejects.toThrow('Failed to discover authorization server metadata');
        });
    });

    describe('registerClient', () => {
        it('should register client', async () => {
            mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ client_id: 'id' }) });
            const result = await client.registerClient('https://reg', { client_name: 'test' });
            expect(result.client_id).toBe('id');
        });

        it('should throw on fail', async () => {
            mockFetch.mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ error: 'bad' }) });
            await expect(client.registerClient('https://reg', {} as any)).rejects.toThrow('Client registration failed: 400 - bad');
        });

        it('should handle json parse error on fail', async () => {
            mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => { throw new Error('not json'); } });
            await expect(client.registerClient('https://reg', {} as any)).rejects.toThrow('Client registration failed: 500 - Unknown error');
        });
    });

    describe('startAuthorizationFlow', () => {
        it('should work with all options', async () => {
            const res = await client.startAuthorizationFlow({
                authorizationEndpoint: 'https://auth/auth',
                clientId: 'c',
                redirectUri: 'r',
                scope: 's',
                resource: 'res',
                state: 'st'
            });
            expect(res.authUrl).toContain('scope=s');
            expect(res.authUrl).toContain('resource=res');
            expect(res.state).toBe('st');
        });

        it('should generate state if missing', async () => {
            const res = await client.startAuthorizationFlow({ authorizationEndpoint: 'a', clientId: 'c', redirectUri: 'r' });
            expect(res.state).toBeDefined();
        });
    });

    describe('exchangeCodeForToken', () => {
        it('should work with all options', async () => {
            mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'at' }) });
            await client.exchangeCodeForToken({
                code: 'c',
                pkce: { code_verifier: 'v', code_challenge: 'ch', code_challenge_method: 'S256' },
                tokenEndpoint: 'https://token',
                clientId: 'c',
                clientSecret: 's',
                redirectUri: 'r',
                resource: 'res'
            });
            expect(mockFetch).toHaveBeenCalledWith('https://token', expect.objectContaining({
                headers: expect.objectContaining({ Authorization: expect.stringContaining('Basic ') }),
                body: expect.stringContaining('resource=res')
            }));
        });

        it('should throw on token request failure', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({ error: 'invalid_grant', error_description: 'bad' })
            });
            await expect(client.exchangeCodeForToken({
                code: 'c',
                pkce: { code_verifier: 'v', code_challenge: 'ch', code_challenge_method: 'S256' },
                tokenEndpoint: 'https://token',
                clientId: 'c',
                redirectUri: 'r'
            })).rejects.toThrow('Token request failed: invalid_grant - bad');
        });

        it('should throw on token request failure without description', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({ error: 'invalid_grant' })
            });
            await expect(client.exchangeCodeForToken({
                code: 'c',
                pkce: { code_verifier: 'v', code_challenge: 'ch', code_challenge_method: 'S256' },
                tokenEndpoint: 'https://token',
                clientId: 'c',
                redirectUri: 'r'
            })).rejects.toThrow('Token request failed: invalid_grant - Unknown error');
        });
    });

    describe('refreshToken', () => {
        it('should work', async () => {
            mockFetch.mockResolvedValue({ ok: true, json: async () => ({ access_token: 'at' }) });
            await client.refreshToken({ refreshToken: 'rt', tokenEndpoint: 'a', clientId: 'c', clientSecret: 's', scope: 's', resource: 'res' });
            expect(mockFetch).toHaveBeenCalled();
        });
    });

    describe('getClientCredentialsToken', () => {
        it('should work', async () => {
            mockFetch.mockResolvedValue({ ok: true, json: async () => ({ access_token: 'at' }) });
            await client.getClientCredentialsToken({ tokenEndpoint: 'a', clientId: 'c', clientSecret: 's', scope: 's', resource: 'res' });
            expect(mockFetch).toHaveBeenCalled();
        });
    });

    describe('revokeToken', () => {
        it('should work', async () => {
            mockFetch.mockResolvedValue({ ok: true });
            await client.revokeToken({ token: 't', revocationEndpoint: 'a', clientId: 'c', clientSecret: 's', tokenTypeHint: 'access_token' });
            expect(mockFetch).toHaveBeenCalled();
        });

        it('should throw on fail', async () => {
            mockFetch.mockResolvedValue({ ok: false, status: 500, statusText: 'error' });
            await expect(client.revokeToken({ token: 't', revocationEndpoint: 'a', clientId: 'c' })).rejects.toThrow('Token revocation failed');
        });
    });
});
