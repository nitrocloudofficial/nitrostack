import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock middleware
const mockCreateAuthMiddleware = jest.fn() as any;
const mockRequireScopes = jest.fn() as any;
jest.unstable_mockModule('../middleware.js', () => ({
    createAuthMiddleware: mockCreateAuthMiddleware,
    requireScopes: mockRequireScopes,
}));

// Mock metadata
const mockCreateMetadata = jest.fn() as any;
jest.unstable_mockModule('../server-metadata.js', () => ({
    createProtectedResourceMetadata: mockCreateMetadata,
}));

const {
    configureServerAuth,
    createScopeGuards,
    createMCPScopeGuards,
    getStandardMCPScopes,
    validateAuthConfig
} = await import('../server-integration.js');

describe('Server Integration', () => {
    let app: any;
    const config: any = {
        resourceUri: 'https://api',
        authorizationServers: ['https://auth'],
        tokenIntrospectionEndpoint: 'https://auth/introspect',
        audience: 'api'
    };

    beforeEach(() => {
        jest.clearAllMocks();
        app = {
            get: jest.fn(),
            use: jest.fn()
        };
        mockCreateAuthMiddleware.mockReturnValue((req: any, res: any, next: any) => next());
        mockRequireScopes.mockReturnValue((req: any, res: any, next: any) => next());
        mockCreateMetadata.mockReturnValue({ resource: 'api' });
        jest.spyOn(console, 'log').mockImplementation(() => { });
        jest.spyOn(console, 'warn').mockImplementation(() => { });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('configureServerAuth', () => {
        it('should setup metadata and middleware', () => {
            configureServerAuth(app, config);
            expect(app.get).toHaveBeenCalledWith('/.well-known/oauth-protected-resource', expect.any(Function));
            expect(app.use).toHaveBeenCalledWith('/mcp/*', expect.any(Function));
            expect(mockCreateAuthMiddleware).toHaveBeenCalledWith(config);
        });

        it('should use custom paths', () => {
            configureServerAuth(app, config, {
                metadataPath: '/custom/meta',
                protectRoutes: ['/api/*']
            });
            expect(app.get).toHaveBeenCalledWith('/custom/meta', expect.any(Function));
            expect(app.use).toHaveBeenCalledWith('/api/*', expect.any(Function));
        });

        it('should return metadata on GET request', async () => {
            configureServerAuth(app, config);
            const handler = app.get.mock.calls.find((c: any) => c[0] === '/.well-known/oauth-protected-resource')[1];
            const res = { json: jest.fn() };
            handler({}, res);
            expect(mockCreateMetadata).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalled();
        });
    });

    describe('Guards', () => {
        it('createScopeGuards', () => {
            const guards = createScopeGuards({ read: ['mcp:read'], empty: [] });
            expect(guards.read).toBeDefined();
            expect(guards.empty).toBeUndefined();
            expect(mockRequireScopes).toHaveBeenCalledWith('mcp:read');
        });

        it('createMCPScopeGuards', () => {
            // Test with default prefix
            const guardsDefault = createMCPScopeGuards();
            expect(guardsDefault.read).toBeDefined();
            expect(mockRequireScopes).toHaveBeenCalledWith('mcp:read');

            // Test with custom prefix
            const guardsCustom = createMCPScopeGuards('my');
            expect(guardsCustom.read).toBeDefined();
            expect(mockRequireScopes).toHaveBeenCalledWith('my:read');
        });

        it('getStandardMCPScopes', () => {
            // Test with default prefix
            const standardDefault = getStandardMCPScopes();
            expect(standardDefault.scopes).toContain('mcp:read');

            // Test with custom prefix
            const standardCustom = getStandardMCPScopes('my');
            expect(standardCustom.scopes).toContain('my:read');
            expect(standardCustom.descriptions['my:read']).toBeDefined();
        });
    });

    describe('validateAuthConfig', () => {
        const containsError = (result: any, sub: string) => result.errors.some((e: string) => e.includes(sub));
        const containsWarning = (result: any, sub: string) => result.warnings.some((w: string) => w.includes(sub));

        it('should detect missing required fields', () => {
            const result = validateAuthConfig({} as any);
            expect(result.valid).toBe(false);
            expect(containsError(result, 'resourceUri is required')).toBe(true);
            expect(containsError(result, 'At least one authorization server is required')).toBe(true);
        });

        it('should detect missing validation method', () => {
            const result = validateAuthConfig({
                resourceUri: 'https://api',
                authorizationServers: ['s']
            } as any);
            expect(containsError(result, 'Either tokenIntrospectionEndpoint or jwksUri must be configured')).toBe(true);
        });

        it('should warn for missing introspection credentials', () => {
            const result = validateAuthConfig({
                ...config,
                tokenIntrospectionClientId: undefined,
                tokenIntrospectionClientSecret: undefined
            });
            expect(containsWarning(result, 'tokenIntrospectionClientId not set')).toBe(true);
            expect(containsWarning(result, 'tokenIntrospectionClientSecret not set')).toBe(true);
        });

        it('should error for missing JWT audience', () => {
            const result = validateAuthConfig({
                resourceUri: 'https://api',
                authorizationServers: ['s'],
                jwksUri: 'http://jwks',
                audience: undefined
            } as any);
            expect(containsError(result, 'audience is required for JWT validation')).toBe(true);
        });

        it('should warn for missing JWT issuer', () => {
            const result = validateAuthConfig({
                resourceUri: 'https://api',
                authorizationServers: ['s'],
                jwksUri: 'http://jwks',
                audience: 'a',
                issuer: undefined
            } as any);
            expect(containsWarning(result, 'issuer not set')).toBe(true);
        });

        it('should warn for missing overall audience', () => {
            const result = validateAuthConfig({
                ...config,
                audience: undefined
            });
            expect(containsWarning(result, 'audience not set')).toBe(true);
        });

        it('should validate HTTPS in production', () => {
            const originalNodeEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';

            // Invalid URL
            const r1 = validateAuthConfig({ ...config, resourceUri: 'invalid' });
            expect(containsError(r1, 'resourceUri is not a valid URL')).toBe(true);

            // HTTP URL
            const r2 = validateAuthConfig({ ...config, resourceUri: 'http://api' });
            expect(containsError(r2, 'resourceUri must use HTTPS in production')).toBe(true);

            // Valid HTTPS
            const r3 = validateAuthConfig({ ...config, resourceUri: 'https://api' });
            expect(r3.errors.some(e => e.includes('HTTPS'))).toBe(false);

            process.env.NODE_ENV = originalNodeEnv;
        });
    });
});
