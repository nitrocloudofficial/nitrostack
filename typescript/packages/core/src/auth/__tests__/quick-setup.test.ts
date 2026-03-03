import { jest, describe, it, expect } from '@jest/globals';

const { setupJWTAuth, setupAPIKeyAuth, setupOAuthAuth, generateTestCredentials, printAuthSetupInstructions, validateAuthEnv } = await import('../quick-setup.js');

describe('Quick Setup', () => {
    const mockApp = {
        use: jest.fn(),
        get: jest.fn()
    } as any;

    beforeEach(() => {
        jest.clearAllMocks();
        // Redirect console.log to avoid noise
        jest.spyOn(console, 'log').mockImplementation(() => { });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should setup JWT auth', () => {
        setupJWTAuth(mockApp, { secret: 'secret' });
        setupJWTAuth(mockApp, { secret: 'secret', audience: 'aud', issuer: 'iss', algorithm: 'HS256' });
        expect(mockApp.use).toHaveBeenCalled();
    });

    it('should setup API Key auth', () => {
        setupAPIKeyAuth(mockApp, { keys: ['key'], allowQueryParam: true });
        setupAPIKeyAuth(mockApp, { keys: ['key'], allowQueryParam: false });
        expect(mockApp.use).toHaveBeenCalledTimes(2);
    });

    it('should setup OAuth auth', () => {
        setupOAuthAuth(mockApp, {
            resourceUri: 'uri',
            authorizationServers: ['as'],
            tokenIntrospectionEndpoint: 'end',
            tokenIntrospectionClientId: 'id',
            tokenIntrospectionClientSecret: 'sec'
        });
        setupOAuthAuth(mockApp, {
            resourceUri: 'uri',
            authorizationServers: ['as'],
            tokenIntrospectionEndpoint: 'end',
            tokenIntrospectionClientId: 'id',
            tokenIntrospectionClientSecret: 'sec',
            scopesSupported: ['scope']
        });
        expect(mockApp.use).toHaveBeenCalled();
        expect(mockApp.get).toHaveBeenCalled();
    });

    it('should generate test credentials', () => {
        const creds = generateTestCredentials();
        expect(creds.jwtSecret).toBeDefined();
        expect(creds.apiKey).toContain('sk_');

        const creds2 = generateTestCredentials({ jwtAudience: 'aud', jwtIssuer: 'iss', apiKeyPrefix: 'test' });
        expect(creds2.apiKey).toContain('test_');
    });

    it('should print setup instructions', () => {
        printAuthSetupInstructions('jwt');
        printAuthSetupInstructions('apikey');
        printAuthSetupInstructions('oauth');
        expect(console.log).toHaveBeenCalled();
    });

    describe('validateAuthEnv', () => {
        const originalEnv = process.env;

        beforeEach(() => {
            process.env = { ...originalEnv };
        });

        afterEach(() => {
            process.env = originalEnv;
        });

        it('should validate JWT env', () => {
            delete process.env.JWT_SECRET;
            let result = validateAuthEnv('jwt');
            expect(result.valid).toBe(false);

            process.env.JWT_SECRET = 'secret';
            result = validateAuthEnv('jwt');
            expect(result.valid).toBe(true);
        });

        it('should validate API Key env', () => {
            delete process.env.API_KEY_1;
            delete process.env.API_KEY;
            let result = validateAuthEnv('apikey');
            expect(result.valid).toBe(false);

            process.env.API_KEY_1 = 'key';
            result = validateAuthEnv('apikey');
            expect(result.valid).toBe(true);
        });

        it('should validate OAuth env', () => {
            process.env.OAUTH_RESOURCE_URI = 'uri';
            process.env.OAUTH_AUTH_SERVER = 'as';
            const result = validateAuthEnv('oauth');
            expect(result.valid).toBe(false);

            process.env.OAUTH_INTROSPECTION_ENDPOINT = 'e';
            process.env.OAUTH_CLIENT_ID = 'id';
            process.env.OAUTH_CLIENT_SECRET = 's';
            expect(validateAuthEnv('oauth').valid).toBe(true);
        });
    });
});
