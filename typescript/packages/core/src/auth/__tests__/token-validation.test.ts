import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock jose
const mockJwtVerify = jest.fn() as any;
const mockCreateRemoteJWKSet = jest.fn() as any;
jest.unstable_mockModule('jose', () => ({
    jwtVerify: mockJwtVerify,
    createRemoteJWKSet: mockCreateRemoteJWKSet,
}));

// Mock fetch
const mockFetch = jest.fn() as any;
global.fetch = mockFetch as any;

const {
    validateToken,
    extractBearerToken,
    validateAudience,
    validateScopes,
    isTokenExpired,
    clearTokenCache,
    introspectToken,
    validateJWT
} = await import('../token-validation.js');

describe('Token Validation', () => {
    const baseConfig = {
        resourceUri: 'http://resource',
        authorizationServers: ['http://auth'],
    };

    beforeEach(() => {
        jest.clearAllMocks();
        clearTokenCache();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should extract bearer token', () => {
        expect(extractBearerToken('Bearer token')).toBe('token');
        expect(extractBearerToken('bearer token')).toBe('token');
        expect(extractBearerToken('Invalid token')).toBeNull();
        expect(extractBearerToken(undefined)).toBeNull();
    });

    it('should validate audience', () => {
        const intro = { active: true, aud: ['aud1', 'aud2'] };
        expect(validateAudience(intro, 'aud1')).toBe(true);
        expect(validateAudience(intro, ['aud3', 'aud1'])).toBe(true);
        expect(validateAudience(intro, 'aud3')).toBe(false);
        expect(validateAudience(intro, undefined)).toBe(true);
        expect(validateAudience({ active: true }, 'aud')).toBe(false);
    });

    it('should validate scopes', () => {
        const intro = { active: true, scope: 'read write' };
        expect(validateScopes(intro, ['read'])).toBe(true);
        expect(validateScopes(intro, ['read', 'write'])).toBe(true);
        expect(validateScopes(intro, ['admin'])).toBe(false);
        expect(validateScopes(intro, [])).toBe(true);
        expect(validateScopes({ active: true } as any, ['read'])).toBe(false);
    });

    it('should check if token is expired', () => {
        const now = Math.floor(Date.now() / 1000);
        expect(isTokenExpired({ active: true, exp: now - 10 })).toBe(true);
        expect(isTokenExpired({ active: true, exp: now + 10 })).toBe(false);
        expect(isTokenExpired({ active: true })).toBe(false);
    });

    describe('validateToken via Introspection', () => {
        it('should validate via introspection endpoint', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => ({ active: true, sub: 'user1', aud: ['aud1'] })
            });

            const config = {
                ...baseConfig,
                tokenIntrospectionEndpoint: 'http://auth/introspect',
                audience: 'aud1'
            };

            const result = await validateToken('token123', config);
            expect(result.valid).toBe(true);
            expect(result.introspection?.sub).toBe('user1');
            expect(mockFetch).toHaveBeenCalled();

            // Should be cached now
            mockFetch.mockClear();
            const result2 = await validateToken('token123', config);
            expect(result2.valid).toBe(true);
            expect(mockFetch).not.toHaveBeenCalled();

            // Should expire from cache
            jest.advanceTimersByTime(301000);
            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => ({ active: true, sub: 'user1' })
            });
            const result3 = await validateToken('token123', config);
            expect(mockFetch).toHaveBeenCalled();
        });

        it('should handle introspection failure', async () => {
            mockFetch.mockResolvedValue({
                ok: false,
                status: 401,
                statusText: 'Unauthorized'
            });

            const config = { ...baseConfig, tokenIntrospectionEndpoint: 'http://auth/introspect' };
            const result = await validateToken('token123', config);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('401');
        });

        it('should use client credentials if provided', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => ({ active: true })
            });

            const config = {
                ...baseConfig,
                tokenIntrospectionEndpoint: 'http://auth/introspect',
                tokenIntrospectionClientId: 'id',
                tokenIntrospectionClientSecret: 'sec'
            };

            await validateToken('token123', config);
            const headers = (mockFetch.mock.calls[0][1] as any).headers;
            expect(headers['Authorization']).toBeDefined();
        });
    });

    describe('validateToken via JWT', () => {
        it('should validate via JWT/JWKS with various payload formats', async () => {
            mockCreateRemoteJWKSet.mockReturnValue(() => { });

            // Test case 1: Complex payload with azp and array audience
            mockJwtVerify.mockResolvedValue({
                payload: {
                    active: true,
                    azp: 'client-azp',
                    aud: ['aud1', 'aud2'],
                    scope: 'read write',
                    exp: Date.now() / 1000 + 100,
                    sub: 'user1'
                }
            });

            const config = { ...baseConfig, jwksUri: 'http://auth/jwks', audience: 'aud1' };
            const result = await validateToken('jwt1', config);
            expect(result.valid).toBe(true);
            expect(result.introspection?.client_id).toBe('client-azp');
            expect(result.introspection?.aud).toEqual(['aud1', 'aud2']);

            // Test case 2: String audience and client_id
            mockJwtVerify.mockResolvedValue({
                payload: {
                    active: true,
                    client_id: 'client-id',
                    aud: 'aud3',
                    username: 'user@example.com',
                    jti: 'unique-id'
                }
            });
            const result2 = await validateToken('jwt2', { ...config, audience: 'aud3' });
            expect(result2.introspection?.client_id).toBe('client-id');
            expect(result2.introspection?.aud).toEqual(['aud3']);
            expect(result2.introspection?.username).toBe('user@example.com');
            expect(result2.introspection?.jti).toBe('unique-id');

            // Test case 3: No audience and no client_id/azp
            mockJwtVerify.mockResolvedValue({
                payload: { active: true }
            });
            const result3 = await validateToken('jwt3', { ...baseConfig, jwksUri: 'http://auth/jwks' });
            expect(result3.introspection?.aud).toBeUndefined();
            expect(result3.introspection?.client_id).toBeUndefined();
        });

        it('should handle JWT verification error (non-Error)', async () => {
            // Throwing a string instead of an Error to hit line 84 branch
            mockJwtVerify.mockImplementation(() => { throw 'String error'; });

            const config = { ...baseConfig, jwksUri: 'http://auth/jwks' };
            const result = await validateToken('bad-jwt', config);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('String error');
        });
    });

    it('should return error if token is inactive', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ active: false })
        });

        const config = { ...baseConfig, tokenIntrospectionEndpoint: 'http://auth/introspect' };
        const result = await validateToken('inactive-token', config);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Token is not active');
    });

    it('should return error for audience mismatch', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ active: true, aud: 'other' })
        });

        const config = {
            ...baseConfig,
            tokenIntrospectionEndpoint: 'http://auth/introspect',
            audience: 'expected'
        };
        const result = await validateToken('token', config);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('audience mismatch');
    });

    it('should return error if no method configured', async () => {
        const config = { ...baseConfig };
        const result = await validateToken('token', config);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('No token validation method configured');
    });

    describe('Internals (Exported for Testing)', () => {
        it('introspectToken should throw if endpoint missing', async () => {
            await expect(introspectToken('t', {} as any)).rejects.toThrow('introspection endpoint not configured');
        });

        it('validateJWT should throw if jwksUri missing', async () => {
            await expect(validateJWT('t', {} as any)).rejects.toThrow('JWKS URI not configured');
        });
    });

    describe('Cache Management', () => {
        it('should trigger cleanup when cache is large', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => ({ active: true })
            });
            const config = { ...baseConfig, tokenIntrospectionEndpoint: 'http://auth/introspect' };

            // Fill cache with 1001 items
            // We need to advance time for some to be "expired" during cleanup
            for (let i = 0; i < 1001; i++) {
                await validateToken(`token-${i}`, config);
            }

            // Make some expired
            jest.advanceTimersByTime(600000); // 10 minutes

            // Add another item to hit potential branch in cleanupLoop
            // Note: size > 1000 check is during cacheToken
            await validateToken('token-trigger', config);
        });
    });
});
