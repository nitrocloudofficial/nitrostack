import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { OAuthModule } from '../oauth-module.js';
import { NitroStackServer } from '../server.js';
import { DiscoveryHttpServer } from '../transports/discovery-http-server.js';

describe('OAuthModule Extended Tests', () => {
    let mockServer: NitroStackServer;
    let mockLogger: any;

    beforeEach(() => {
        mockServer = {
            _transportType: 'stdio',
            _httpTransport: null
        } as any;
        mockLogger = {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        };
        // Reset singleton config
        (OAuthModule as any).config = null;
    });

    it('should throw on forRoot with missing fields', () => {
        expect(() => OAuthModule.forRoot({} as any)).toThrow('resourceUri is required');
        expect(() => OAuthModule.forRoot({ resourceUri: 'x' } as any)).toThrow('at least one authorizationServer is required');
    });

    it('should handle discovery server start in stdio mode', async () => {
        const config = {
            resourceUri: 'http://test/mcp',
            authorizationServers: ['http://auth'],
            http: { port: 5050 }
        };
        const module = new OAuthModule(config, mockServer, mockLogger);

        // Mock DiscoveryHttpServer
        const startSpy = jest.spyOn(DiscoveryHttpServer.prototype, 'start').mockResolvedValue(undefined);
        const onSpy = jest.spyOn(DiscoveryHttpServer.prototype, 'on').mockImplementation(() => { });

        await module.start();
        expect(startSpy).toHaveBeenCalled();
        expect(onSpy).toHaveBeenCalledTimes(2); // .well-known endpoints

        await module.stop();
    });

    it('should validate JWT tokens with various claims', async () => {
        OAuthModule.forRoot({
            resourceUri: 'http://res',
            authorizationServers: ['http://auth'],
            issuer: 'http://auth',
            audience: 'http://res'
        });

        const now = Math.floor(Date.now() / 1000);

        const createToken = (payload: any) => {
            const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
            const data = Buffer.from(JSON.stringify({
                iss: 'http://auth',
                aud: 'http://res',
                exp: now + 3600,
                ...payload
            })).toString('base64');
            return `${header}.${data}.signature`;
        };

        // Valid token
        const res1 = await OAuthModule.validateToken(createToken({
            iss: 'http://auth',
            aud: 'http://res',
            exp: now + 3600
        }));
        expect(res1.valid).toBe(true);

        // Expired
        const res2 = await OAuthModule.validateToken(createToken({ exp: now - 3600 }));
        expect(res2.valid).toBe(false);
        expect(res2.error).toContain('expired');

        // Audience mismatch
        const res3 = await OAuthModule.validateToken(createToken({ aud: 'wrong', exp: now + 3600 }));
        expect(res3.valid).toBe(false);
        expect(res3.error).toContain('audience mismatch');

        // Issuer mismatch
        const res4 = await OAuthModule.validateToken(createToken({ aud: 'http://res', iss: 'wrong', exp: now + 3600 }));
        expect(res4.valid).toBe(false);
        expect(res4.error).toContain('issuer mismatch');
    });

    it('should handle encrypted JWE tokens safely', async () => {
        OAuthModule.forRoot({ resourceUri: 'x', authorizationServers: ['y'] });

        const jweHeader = Buffer.from(JSON.stringify({ alg: 'dir', enc: 'A128GCM' })).toString('base64');
        const token = `${jweHeader}.body.tag.iv`;

        const res = await OAuthModule.validateToken(token);
        expect(res.valid).toBe(false);
        expect(res.error).toContain('encrypted JWE token');
    });

    it('should perform token introspection when configured', async () => {
        OAuthModule.forRoot({
            resourceUri: 'http://res',
            authorizationServers: ['http://auth'],
            tokenIntrospectionEndpoint: 'http://auth/introspect',
            tokenIntrospectionClientId: 'cid',
            tokenIntrospectionClientSecret: 'secret'
        });

        // Mock fetch
        // @ts-ignore
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ active: true, aud: 'http://res' })
        }) as any;

        const res = await OAuthModule.validateToken('some-token');
        expect(res.valid).toBe(true);
        expect(global.fetch).toHaveBeenCalledWith('http://auth/introspect', expect.any(Object));

        // Inactive token
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ active: false })
        });
        const res2 = await OAuthModule.validateToken('some-token');
        expect(res2.valid).toBe(false);
        expect(res2.error).toBe('Token is not active');
    });

    it('should handle custom validation', async () => {
        // @ts-ignore
        const customSpy = jest.fn().mockResolvedValue(false);
        OAuthModule.forRoot({
            resourceUri: 'http://res',
            authorizationServers: ['http://auth'],
            // @ts-ignore
            customValidation: customSpy
        });

        const token = `header.${Buffer.from(JSON.stringify({ aud: 'http://res' })).toString('base64')}.sig`;
        const res = await OAuthModule.validateToken(token);
        expect(res.valid).toBe(false);
        expect(customSpy).toHaveBeenCalled();
    });

    it('should handle discovery handlers in dual mode', async () => {
        const config = {
            resourceUri: 'http://test/mcp',
            authorizationServers: ['http://auth']
        };
        const dualServer = {
            _transportType: 'dual',
            _httpTransport: { on: jest.fn() }
        } as any;
        const module = new OAuthModule(config, dualServer, mockLogger);

        await module.start();
        expect(dualServer._httpTransport.on).toHaveBeenCalled();

        // Test discovery handlers directly for coverage
        const req = {};
        const res = { writeHead: jest.fn(), end: jest.fn() };
        (module as any).wellKnownHandler(req, res);
        expect(res.writeHead).toHaveBeenCalledWith(200, expect.any(Object));

        (module as any).resourceMetadataHandler(req, res);
        expect(res.writeHead).toHaveBeenCalledTimes(2);
    });
});
