import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock token-validation
const mockValidateToken = jest.fn() as any;
const mockExtractBearerToken = jest.fn() as any;
const mockValidateScopes = jest.fn() as any;

jest.unstable_mockModule('../token-validation.js', () => ({
    validateToken: mockValidateToken,
    extractBearerToken: mockExtractBearerToken,
    validateScopes: mockValidateScopes,
}));

// Mock server-metadata
const mockGenerateHeader = jest.fn() as any;

jest.unstable_mockModule('../server-metadata.js', () => ({
    generateWWWAuthenticateHeader: mockGenerateHeader,
}));


const {
    createAuthMiddleware,
    requireScopes,
    optionalAuth,
    isAuthenticated,
    hasScope,
    hasAnyScope,
    hasAllScopes,
    RequireScopes
} = await import('../middleware.js');

describe('Auth Middleware', () => {
    let req: any;
    let res: any;
    let next: any;

    const mockConfig = {
        resourceUri: 'https://api',
        authorizationServers: ['https://auth']
    };

    beforeEach(() => {
        jest.clearAllMocks();
        req = { headers: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            header: jest.fn().mockReturnThis(),
        };
        next = jest.fn();
        (mockGenerateHeader as any).mockReturnValue('Bearer realm="test"');
        (mockValidateScopes as any).mockReturnValue(true);
    });

    describe('createAuthMiddleware', () => {
        it('should reject missing token', async () => {
            const middleware = createAuthMiddleware(mockConfig);
            (mockExtractBearerToken as any).mockReturnValue(null);

            await middleware(req, res, next);

            expect(mockExtractBearerToken).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(401);
            expect(next).not.toHaveBeenCalled();
        });

        it('should accept valid token with and without scope', async () => {
            const middleware = createAuthMiddleware(mockConfig);
            (mockExtractBearerToken as any).mockReturnValue('valid');

            // Case 1: With scope
            (mockValidateToken as any).mockResolvedValue({
                valid: true,
                introspection: { client_id: 'client', sub: 'user', scope: 'read' }
            });
            await middleware(req, res, next);
            expect(req.auth.scopes).toEqual(['read']);

            // Case 2: Without scope
            (mockValidateToken as any).mockResolvedValue({
                valid: true,
                introspection: { client_id: 'client', sub: 'user' }
            });
            await middleware(req, res, next);
            expect(req.auth.scopes).toEqual([]);
        });

        it('should handle invalid validation result with and without error message', async () => {
            const middleware = createAuthMiddleware(mockConfig);
            (mockExtractBearerToken as any).mockReturnValue('invalid');

            // Case 1: With error
            (mockValidateToken as any).mockResolvedValue({ valid: false, error: 'Custom error' });
            await middleware(req, res, next);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error_description: 'Custom error' }));

            // Case 2: Without error
            (mockValidateToken as any).mockResolvedValue({ valid: false });
            await middleware(req, res, next);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error_description: 'Invalid token' }));
        });

        it('should handle token validation server error', async () => {
            const middleware = createAuthMiddleware(mockConfig);
            (mockExtractBearerToken as any).mockReturnValue('valid');
            (mockValidateToken as any).mockRejectedValue(new Error('DB Fail'));

            await middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'server_error' }));
        });

        it('should enforce HTTPS in production', () => {
            const prevEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';
            jest.spyOn(console, 'warn').mockImplementation(() => { });

            createAuthMiddleware(mockConfig);

            expect(console.warn).toHaveBeenCalled();
            process.env.NODE_ENV = prevEnv;
        });
    });

    describe('optionalAuth', () => {
        it('should proceed unauthenticated if no token', async () => {
            const middleware = optionalAuth(mockConfig);
            (mockExtractBearerToken as any).mockReturnValue(null);

            await middleware(req, res, next);
            expect(next).toHaveBeenCalled();
            expect(req.auth.authenticated).toBe(false);
        });

        it('should authenticate if token valid with and without scope', async () => {
            const middleware = optionalAuth(mockConfig);
            (mockExtractBearerToken as any).mockReturnValue('valid');

            // With scope
            (mockValidateToken as any).mockResolvedValue({
                valid: true,
                introspection: { client_id: 'c', scope: 's' }
            });
            await middleware(req, res, next);
            expect(req.auth.authenticated).toBe(true);
            expect(req.auth.scopes).toEqual(['s']);

            // Without scope
            (mockValidateToken as any).mockResolvedValue({
                valid: true,
                introspection: { client_id: 'c' }
            });
            await middleware(req, res, next);
            expect(req.auth.scopes).toEqual([]);
        });

        it('should handle invalid token in optional auth', async () => {
            const middleware = optionalAuth(mockConfig);
            (mockExtractBearerToken as any).mockReturnValue('invalid');
            (mockValidateToken as any).mockResolvedValue({ valid: false });

            await middleware(req, res, next);
            expect(next).toHaveBeenCalled();
            expect(req.auth.authenticated).toBe(false);
        });

        it('should handle error in optional auth', async () => {
            const middleware = optionalAuth(mockConfig);
            (mockExtractBearerToken as any).mockReturnValue('error');
            (mockValidateToken as any).mockRejectedValue(new Error('fail'));

            await middleware(req, res, next);
            expect(next).toHaveBeenCalled();
            expect(req.auth.authenticated).toBe(false);
        });
    });

    describe('Helpers', () => {
        it('should handle invalid resourceUri in getWellKnownMetadataUrl', async () => {
            const middleware = createAuthMiddleware({ ...mockConfig, resourceUri: 'invalid-uri' });
            (mockExtractBearerToken as any).mockReturnValue(null);
            await middleware(req, res, next);
            expect(mockGenerateHeader).toHaveBeenCalledWith(expect.objectContaining({ resourceMetadataUrl: '' }));
        });

        it('isAuthenticated', () => {
            expect(isAuthenticated({ auth: { authenticated: true } } as any)).toBe(true);
            expect(isAuthenticated({ auth: { authenticated: false } } as any)).toBe(false);
            expect(isAuthenticated({} as any)).toBe(false);
        });
    });

    describe('requireScopes', () => {
        it('should allow if scopes present', () => {
            req.auth = { authenticated: true, scopes: ['read', 'write'], tokenInfo: {} };
            (mockValidateScopes as any).mockReturnValue(true);

            const middleware = requireScopes('read');
            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should reject if scopes missing', () => {
            req.auth = { authenticated: true, scopes: ['read'], tokenInfo: {} };
            (mockValidateScopes as any).mockReturnValue(false);

            const middleware = requireScopes('write');
            middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(next).not.toHaveBeenCalled();
        });

        it('should reject not authenticated', () => {
            req.auth = { authenticated: false };
            const middleware = requireScopes('read');
            middleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
        });
    });

    describe('Scoping Helpers', () => {
        const req = { auth: { scopes: ['read', 'write'] } } as any;

        it('hasScope', () => {
            expect(hasScope(req, 'read')).toBe(true);
            expect(hasScope(req, 'admin')).toBe(false);
        });

        it('hasAnyScope', () => {
            expect(hasAnyScope(req, ['admin', 'read'])).toBe(true);
            expect(hasAnyScope(req, ['a', 'b'])).toBe(false);
        });

        it('hasAllScopes', () => {
            expect(hasAllScopes(req, ['read', 'write'])).toBe(true);
            expect(hasAllScopes(req, ['read', 'admin'])).toBe(false);
        });
    });

    describe('@RequireScopes Decorator', () => {
        class TestController {
            @RequireScopes('admin')
            async check(req: any, res: any) { }
        }

        it('should restrict access', async () => {
            const ctrl = new TestController();
            (mockValidateScopes as any).mockReturnValue(false);
            const req = { auth: { authenticated: true, tokenInfo: {}, scopes: ['user'] } };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn(), header: jest.fn().mockReturnThis() };
            await ctrl.check(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        it('should allow access', async () => {
            const ctrl = new TestController();
            (mockValidateScopes as any).mockReturnValue(true);
            const req = { auth: { authenticated: true, tokenInfo: {}, scopes: ['admin'] } };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            await ctrl.check(req, res);
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should 401 if not authenticated', async () => {
            const ctrl = new TestController();
            const req = { auth: { authenticated: false } };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            await ctrl.check(req, res);
            expect(res.status).toHaveBeenCalledWith(401);
        });
    });
});
