import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { JitBridge } from '../jit-bridge.js';
import { Auth0JitAdapter } from '../adapters/auth0.adapter.js';
import { OktaJitAdapter } from '../adapters/okta.adapter.js';
import { GenericDcrJitAdapter } from '../adapters/generic-dcr.adapter.js';
import { PassthroughJitAdapter } from '../adapters/passthrough.adapter.js';
import { JitContext } from '../types.js';
import { OAuthModule } from '../../../core/oauth-module.js';

// Mock global fetch
const mockFetch = jest.fn() as any;
(global as any).fetch = mockFetch;

describe('Multi-Provider JIT Dynamic Discovery Bridge', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Adapter Selection & Detection', () => {
    it('detects Auth0 adapter based on URL or environment credentials', () => {
      const bridge = new JitBridge();
      const adapter1 = bridge.getAdapter('https://dev-test.us.auth0.com');
      expect(adapter1).toBeInstanceOf(Auth0JitAdapter);
      expect(adapter1?.name).toBe('auth0');

      const bridgeCustom = new JitBridge({ provider: 'auth0' });
      const adapter2 = bridgeCustom.getAdapter('https://custom-auth.example.com');
      expect(adapter2).toBeInstanceOf(Auth0JitAdapter);
    });

    it('detects Okta adapter based on URL or configuration', () => {
      const bridge = new JitBridge();
      const adapter1 = bridge.getAdapter('https://dev-123456.okta.com');
      expect(adapter1).toBeInstanceOf(OktaJitAdapter);
      expect(adapter1?.name).toBe('okta');

      const bridgeCustom = new JitBridge({ provider: 'okta' });
      const adapter2 = bridgeCustom.getAdapter('https://my-idp.example.com');
      expect(adapter2).toBeInstanceOf(OktaJitAdapter);
    });

    it('detects Generic DCR adapter for Zitadel, Keycloak, or Hydra', () => {
      const bridge = new JitBridge();
      const adapterZitadel = bridge.getAdapter('https://my-instance.zitadel.cloud');
      expect(adapterZitadel).toBeInstanceOf(GenericDcrJitAdapter);
      expect(adapterZitadel?.name).toBe('generic-dcr');

      const adapterKeycloak = bridge.getAdapter('https://keycloak.company.com/auth/realms/master');
      expect(adapterKeycloak).toBeInstanceOf(GenericDcrJitAdapter);
    });

    it('detects Passthrough adapter for native CIMD providers', () => {
      const bridge = new JitBridge();
      const adapter = bridge.getAdapter('https://api.stytch.com');
      expect(adapter).toBeInstanceOf(PassthroughJitAdapter);
      expect(adapter?.name).toBe('passthrough');
    });

    it('allows registering a custom provider adapter with highest priority', () => {
      const bridge = new JitBridge();
      const customAdapter = {
        name: 'custom-enterprise',
        canHandle: () => true,
        registerClient: jest.fn<any>().mockResolvedValue({ idpClientId: 'custom-id' }),
      };

      bridge.registerAdapter(customAdapter);
      const resolved = bridge.getAdapter('https://dev-test.us.auth0.com');
      expect(resolved?.name).toBe('custom-enterprise');
    });
  });

  describe('Auth0 Adapter Client Provisioning', () => {
    it('acquires and caches Management API token', async () => {
      const adapter = new Auth0JitAdapter();
      const config = {
        auth0: {
          domain: 'tenant.us.auth0.com',
          managementClientId: 'm2m-client-id',
          managementClientSecret: 'm2m-client-secret',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'auth0_mgmt_access_token_123',
          expires_in: 86400,
        }),
      });

      const token1 = await adapter.getManagementToken('tenant.us.auth0.com', config);
      expect(token1).toBe('auth0_mgmt_access_token_123');

      // Second call should return cached token without fetch
      const token2 = await adapter.getManagementToken('tenant.us.auth0.com', config);
      expect(token2).toBe('auth0_mgmt_access_token_123');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('creates client and attaches client grants in Auth0 when client does not exist', async () => {
      const adapter = new Auth0JitAdapter();
      const context: JitContext = {
        authServerUrl: 'https://tenant.us.auth0.com',
        resourceUri: 'https://mcp-server.example.com/mcp',
        scopesSupported: ['read', 'write', 'admin'],
      };
      const config = {
        auth0: {
          domain: 'tenant.us.auth0.com',
          managementClientId: 'm2m-client-id',
          managementClientSecret: 'm2m-client-secret',
        },
      };

      // 1. Management token fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'mgmt_token', expires_in: 3600 }),
      });

      // 2. Client search fetch (none found)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      // 3. Client creation fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ client_id: 'auth0_generated_client_abc' }),
      });

      // 4. Client grant creation fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'grant_123' }),
      });

      const clientDoc = {
        client_id: 'https://chatgpt.com/oauth/AH_123/client.json',
        client_name: 'ChatGPT Agent',
        redirect_uris: ['https://chatgpt.com/connector/oauth/AH_123'],
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        token_endpoint_auth_method: 'none',
      };

      const result = await adapter.registerClient(clientDoc, context, config);
      expect(result.idpClientId).toBe('auth0_generated_client_abc');

      // Verify client creation payload
      expect(mockFetch).toHaveBeenCalledWith(
        'https://tenant.us.auth0.com/api/v2/clients',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"external_client_id":"https://chatgpt.com/oauth/AH_123/client.json"'),
        })
      );

      // Verify grant creation payload
      expect(mockFetch).toHaveBeenCalledWith(
        'https://tenant.us.auth0.com/api/v2/client-grants',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"audience":"https://mcp-server.example.com/mcp"'),
        })
      );
    });
  });

  describe('JIT Bridge Authorization & Token Proxying', () => {
    it('handles authorize request by resolving CIMD, provisioning in IdP, and 302 redirecting', async () => {
      const bridge = new JitBridge({
        auth0: {
          domain: 'tenant.us.auth0.com',
          managementClientId: 'mgmt-id',
          managementClientSecret: 'mgmt-secret',
        },
      });

      const context: JitContext = {
        authServerUrl: 'https://tenant.us.auth0.com',
        resourceUri: 'https://mcp.ai/mcp',
      };

      // Mock CIMD fetch
      const cimdDoc = {
        client_id: 'https://chatgpt.com/oauth/test-agent/client.json',
        client_name: 'ChatGPT Agent',
        redirect_uris: ['https://chatgpt.com/connector/oauth/test-agent'],
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        token_endpoint_auth_method: 'none',
      };

      mockFetch.mockResolvedValueOnce({
        status: 200,
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => cimdDoc,
        text: async () => JSON.stringify(cimdDoc),
      });

      // Mock Auth0 Mgmt Token
      mockFetch.mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ access_token: 'tok_123', expires_in: 3600 }),
      });

      // Mock Auth0 search clients (found existing)
      mockFetch.mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => [
          {
            client_id: 'auth0_client_id_456',
            name: 'ChatGPT Agent',
            callbacks: ['https://chatgpt.com/connector/oauth/test-agent'],
          },
        ],
      });

      // Mock Auth0 client grant
      mockFetch.mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ id: 'grant_1' }),
      });

      const mockReq = {
        method: 'GET',
        query: {
          response_type: 'code',
          client_id: 'https://chatgpt.com/oauth/test-agent/client.json',
          redirect_uri: 'https://chatgpt.com/connector/oauth/test-agent',
          scope: 'openid email read write',
          code_challenge: 'test_challenge',
          code_challenge_method: 'S256',
          state: 'state_xyz',
        },
      };

      let redirectStatus = 0;
      let redirectLocation = '';
      const mockRes = {
        writeHead: (status: number, headers: Record<string, string>) => {
          redirectStatus = status;
          redirectLocation = headers['Location'] || '';
        },
        end: jest.fn(),
      };

      await bridge.handleAuthorizeRequest(
        mockReq,
        mockRes,
        context,
        'https://tenant.us.auth0.com/authorize'
      );

      expect(redirectStatus).toBe(302);
      expect(redirectLocation).toContain('https://tenant.us.auth0.com/authorize?');
      expect(redirectLocation).toContain('client_id=auth0_client_id_456');
      expect(redirectLocation).toContain('code_challenge=test_challenge');
      expect(redirectLocation).toContain('state=state_xyz');
      expect(mockRes.end).toHaveBeenCalled();
    });

    it('rejects authorize request when redirect_uri is not authorized in CIMD', async () => {
      const bridge = new JitBridge();
      const context: JitContext = {
        authServerUrl: 'https://tenant.us.auth0.com',
      };

      const cimdDoc = {
        client_id: 'https://chatgpt.com/oauth/test-agent/client.json',
        redirect_uris: ['https://chatgpt.com/connector/oauth/legit'],
      };

      mockFetch.mockResolvedValueOnce({
        status: 200,
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => cimdDoc,
        text: async () => JSON.stringify(cimdDoc),
      });

      const mockReq = {
        method: 'GET',
        query: {
          client_id: 'https://chatgpt.com/oauth/test-agent/client.json',
          redirect_uri: 'https://attacker.com/oauth/callback',
        },
      };

      let responseStatus = 0;
      let responseBody = '';
      const mockRes = {
        writeHead: (status: number) => { responseStatus = status; },
        end: (body: string) => { responseBody = body; },
      };

      await bridge.handleAuthorizeRequest(
        mockReq,
        mockRes,
        context,
        'https://tenant.us.auth0.com/authorize'
      );

      expect(responseStatus).toBe(400);
      const parsed = JSON.parse(responseBody);
      expect(parsed.error).toBe('invalid_request');
      expect(parsed.error_description).toContain('not authorized in client metadata document');
    });

    it('bridges token exchange requests by translating CIMD client_id to upstream IdP client_id', async () => {
      const bridge = new JitBridge({
        auth0: {
          domain: 'tenant.us.auth0.com',
          managementClientId: 'mgmt-id',
          managementClientSecret: 'mgmt-secret',
        },
      });
      const context: JitContext = {
        authServerUrl: 'https://tenant.us.auth0.com',
        logger: console as any,
      };

      // 1. Mock CIMD fetch for token on-the-fly resolution
      const cimdDoc = {
        client_id: 'https://chatgpt.com/oauth/agent/client.json',
        client_name: 'ChatGPT Agent',
        redirect_uris: ['https://chatgpt.com/oauth/callback'],
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        token_endpoint_auth_method: 'none',
      };

      mockFetch.mockResolvedValueOnce({
        status: 200,
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => cimdDoc,
        text: async () => JSON.stringify(cimdDoc),
      });

      // 2. Mock Auth0 Mgmt Token
      mockFetch.mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ access_token: 'tok_123', expires_in: 3600 }),
      });

      // 3. Mock Auth0 search clients (found existing)
      mockFetch.mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => [
          {
            client_id: 'auth0_client_id_789',
            name: 'ChatGPT Agent',
            client_metadata: {
              external_client_id: 'https://chatgpt.com/oauth/agent/client.json',
            },
            callbacks: ['https://chatgpt.com/oauth/callback'],
          },
        ],
      });

      // 4. Mock upstream token response
      mockFetch.mockResolvedValueOnce({
        status: 200,
        ok: true,
        headers: { get: () => 'application/json' },
        text: async () => JSON.stringify({
          access_token: 'jwt_access_token_xyz',
          token_type: 'Bearer',
          expires_in: 86400,
        }),
      });

      const mockReq = {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: {
          grant_type: 'authorization_code',
          client_id: 'https://chatgpt.com/oauth/agent/client.json',
          code: 'auth_code_123',
          redirect_uri: 'https://chatgpt.com/oauth/callback',
          code_verifier: 'verifier_abc',
        },
      };

      let statusCode = 0;
      let sentBody = '';
      const mockRes = {
        writeHead: (status: number) => { statusCode = status; },
        end: (body: string) => { sentBody = body; },
      };

      await bridge.handleTokenRequest(
        mockReq,
        mockRes,
        context,
        'https://tenant.us.auth0.com/oauth/token'
      );

      expect(statusCode).toBe(200);
      const responseData = JSON.parse(sentBody);
      expect(responseData.access_token).toBe('jwt_access_token_xyz');
    });
  });

  describe('OAuthModule Integration with JIT Bridge', () => {
    it('auto-configures JIT bridge from Auth0 environment variables', () => {
      process.env.AUTH0_MANAGEMENT_CLIENT_ID = 'test-m2m-id';
      process.env.AUTH0_MANAGEMENT_CLIENT_SECRET = 'test-m2m-secret';

      const config = OAuthModule.forRoot({
        resourceUri: 'https://my-app.nitrocloud.ai/mcp',
        authorizationServers: ['https://dev-test.us.auth0.com/'],
      });

      const resolved = OAuthModule.getConfig();
      expect(resolved?.jitBridge).toBeDefined();
      expect(resolved?.jitBridge?.enabled).toBe(true);
      expect(resolved?.jitBridge?.provider).toBe('auth0');
      expect(resolved?.jitBridge?.auth0?.domain).toBe('dev-test.us.auth0.com');
      expect(resolved?.jitBridge?.auth0?.managementClientId).toBe('test-m2m-id');
    });

    it('advertises gateway baseUrl as authorization server in protected resource metadata when JIT bridge is enabled', () => {
      process.env.AUTH0_MANAGEMENT_CLIENT_ID = 'test-m2m-id';
      process.env.AUTH0_MANAGEMENT_CLIENT_SECRET = 'test-m2m-secret';

      const config = {
        resourceUri: 'https://my-app.nitrocloud.ai/mcp',
        authorizationServers: ['https://dev-test.us.auth0.com/'],
      };

      const oauth = new (OAuthModule as any)(config, {} as any, { debug: () => {}, info: () => {}, warn: () => {} } as any);
      let sentBody = '';
      const mockRes = {
        writeHead: jest.fn(),
        end: (body: string) => { sentBody = body; },
      };

      (oauth as any).resourceMetadataHandler({ headers: { host: 'my-app.nitrocloud.ai' } }, mockRes);
      const data = JSON.parse(sentBody);
      expect(data.authorization_servers).toEqual(['https://my-app.nitrocloud.ai']);
    });
  });
});
