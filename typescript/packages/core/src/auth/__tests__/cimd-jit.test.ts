import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import {
  createClientIdMetadataDocument,
  validateClientIdMetadataDocument,
  validateClientIdentifierUrl,
  validateRedirectUriWithCimd,
  isClientIdMetadataUrl,
  mountCimdEndpoint,
  createCimdHandler,
  CimdCache,
  setupCimdHosting,
  setupAuth0CimdClient,
  printAuthSetupInstructions,
  validateAuthEnv,
  OAuth2Client,
} from '../index.js';

// Mock global fetch
const mockFetch = jest.fn() as any;
(global as any).fetch = mockFetch;

describe('CIMD Method 1: Just-in-Time Dynamic Discovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('CIMD Validation & Helpers', () => {
    it('creates a valid CIMD document and validates redirect URIs', () => {
      const doc = createClientIdMetadataDocument('https://my-agent.com/oauth/client-metadata.json', {
        client_name: 'My AI Agent',
        redirect_uris: ['https://my-agent.com/oauth/callback'],
        scope: 'openid profile email mcp:read',
      });

      expect(doc.client_id).toBe('https://my-agent.com/oauth/client-metadata.json');
      expect(doc.client_name).toBe('My AI Agent');
      expect(validateRedirectUriWithCimd(doc, 'https://my-agent.com/oauth/callback')).toBe(true);
      expect(validateRedirectUriWithCimd(doc, 'https://attacker.com/callback')).toBe(false);
    });

    it('validates client identifier URLs correctly', () => {
      expect(isClientIdMetadataUrl('https://my-agent.com/oauth/client-metadata.json')).toBe(true);
      expect(isClientIdMetadataUrl('http://localhost:3000/client.json')).toBe(true);
      expect(isClientIdMetadataUrl('opaque-dcr-client-id-12345')).toBe(false);
      expect(isClientIdMetadataUrl('')).toBe(false);
    });
  });

  describe('CIMD Endpoint Mounting & Handler', () => {
    const validDoc = createClientIdMetadataDocument('https://my-agent.com/oauth/client-metadata.json', {
      client_name: 'My AI Agent',
      redirect_uris: ['https://my-agent.com/oauth/callback'],
    });

    it('creates an HTTP handler with proper CORS, JSON content-type and cache headers', () => {
      const handler = createCimdHandler(validDoc, { maxAgeSeconds: 1800 });
      const headers: Record<string, string> = {};
      let sentBody = '';
      let statusCode = 0;

      const mockReq = { method: 'GET' };
      const mockRes = {
        setHeader: (k: string, v: string) => { headers[k] = v; },
        status: (code: number) => {
          statusCode = code;
          return {
            send: (body: string) => { sentBody = body; }
          };
        },
      };

      handler(mockReq, mockRes);

      expect(headers['Access-Control-Allow-Origin']).toBe('*');
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['Cache-Control']).toBe('public, max-age=1800');
      expect(statusCode).toBe(200);
      const parsed = JSON.parse(sentBody);
      expect(parsed.client_id).toBe('https://my-agent.com/oauth/client-metadata.json');
      expect(parsed.client_name).toBe('My AI Agent');
    });

    it('handles OPTIONS preflight with 204 or 200 and CORS headers', () => {
      const handler = createCimdHandler(validDoc);
      let ended = false;
      let statusCode = 0;

      const mockReq = { method: 'OPTIONS' };
      const mockRes = {
        writeHead: (code: number) => { statusCode = code; },
        end: () => { ended = true; },
      };

      handler(mockReq, mockRes);
      expect(statusCode).toBe(204);
      expect(ended).toBe(true);
    });

    it('mounts onto express-like app instance', () => {
      const routes: Record<string, Function> = {};
      const mockApp = {
        get: (path: string, h: Function) => { routes[path] = h; }
      };

      const path = mountCimdEndpoint(mockApp, validDoc, { path: '/custom/metadata.json' });
      expect(path).toBe('/custom/metadata.json');
      expect(routes['/custom/metadata.json']).toBeDefined();
    });

    it('setupCimdHosting helper works seamlessly', () => {
      const routes: Record<string, Function> = {};
      const mockApp = {
        get: (path: string, h: Function) => { routes[path] = h; }
      };

      const path = setupCimdHosting(mockApp as any, validDoc);
      expect(path).toBe('/.well-known/oauth-client-metadata.json');
      expect(routes['/.well-known/oauth-client-metadata.json']).toBeDefined();
    });
  });

  describe('CimdCache (In-memory Caching & Request Deduplication)', () => {
    it('caches successful resolutions and respects TTL', async () => {
      const cache = new CimdCache({ defaultTtlMs: 1000 });
      const doc = createClientIdMetadataDocument('https://my-agent.com/oauth/client-metadata.json', {
        redirect_uris: ['https://my-agent.com/callback'],
      });

      cache.set('https://my-agent.com/oauth/client-metadata.json', doc);
      expect(cache.get('https://my-agent.com/oauth/client-metadata.json')).toEqual(doc);

      // Advance time beyond TTL
      const originalNow = Date.now;
      try {
        Date.now = () => originalNow() + 2000;
        expect(cache.get('https://my-agent.com/oauth/client-metadata.json')).toBeUndefined();
      } finally {
        Date.now = originalNow;
      }
    });

    it('deduplicates concurrent in-flight fetches', async () => {
      const cache = new CimdCache();
      let fetchCount = 0;

      const mockFetchImpl = jest.fn(async () => {
        fetchCount++;
        return {
          status: 200,
          body: null,
          text: async () => JSON.stringify({
            client_id: 'https://my-agent.com/oauth/client-metadata.json',
            redirect_uris: ['https://my-agent.com/callback'],
          }),
        } as any;
      });

      const [res1, res2] = await Promise.all([
        cache.resolve('https://my-agent.com/oauth/client-metadata.json', { fetchImpl: mockFetchImpl }),
        cache.resolve('https://my-agent.com/oauth/client-metadata.json', { fetchImpl: mockFetchImpl }),
      ]);

      expect(res1.client_id).toBe('https://my-agent.com/oauth/client-metadata.json');
      expect(res2.client_id).toBe('https://my-agent.com/oauth/client-metadata.json');
      expect(fetchCount).toBe(1);
    });

    it('caches failures temporarily (negative cache)', async () => {
      const cache = new CimdCache({ negativeTtlMs: 500 });
      const mockFailFetch = jest.fn(async () => {
        return {
          status: 404,
          text: async () => 'Not Found',
        } as any;
      });

      await expect(
        cache.resolve('https://my-agent.com/oauth/missing.json', { fetchImpl: mockFailFetch })
      ).rejects.toThrow();

      // Subsequent call hits negative cache
      await expect(
        cache.resolve('https://my-agent.com/oauth/missing.json', { fetchImpl: mockFailFetch })
      ).rejects.toThrow('cached failure');
      expect(mockFailFetch).toHaveBeenCalledTimes(1);
    });

    it('evicts oldest entries when exceeding maxEntries', () => {
      const cache = new CimdCache({ maxEntries: 2 });
      const doc1 = createClientIdMetadataDocument('https://my-agent.com/client1.json', { redirect_uris: ['https://my-agent.com/cb'] });
      const doc2 = createClientIdMetadataDocument('https://my-agent.com/client2.json', { redirect_uris: ['https://my-agent.com/cb'] });
      const doc3 = createClientIdMetadataDocument('https://my-agent.com/client3.json', { redirect_uris: ['https://my-agent.com/cb'] });

      cache.set('https://my-agent.com/client1.json', doc1);
      cache.set('https://my-agent.com/client2.json', doc2);
      expect(cache.get('https://my-agent.com/client1.json')).toEqual(doc1);

      cache.set('https://my-agent.com/client3.json', doc3);
      // client1.json should be evicted as oldest
      expect(cache.get('https://my-agent.com/client1.json')).toBeUndefined();
      expect(cache.get('https://my-agent.com/client2.json')).toEqual(doc2);
      expect(cache.get('https://my-agent.com/client3.json')).toEqual(doc3);
    });
  });

  describe('OAuth2Client JIT Dynamic Discovery Flow', () => {
    it('initiates CIMD connection against Auth0 with zero onboarding', async () => {
      // Mock Auth0 AS Discovery
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          issuer: 'https://tenant.us.auth0.com/',
          authorization_endpoint: 'https://tenant.us.auth0.com/authorize',
          token_endpoint: 'https://tenant.us.auth0.com/oauth/token',
          code_challenge_methods_supported: ['S256'],
          client_id_metadata_document_supported: true,
        }),
      });

      const client = setupAuth0CimdClient({
        auth0Domain: 'tenant.us.auth0.com',
        clientMetadataUrl: 'https://my-agent.com/oauth/client-metadata.json',
        redirectUri: 'https://my-agent.com/oauth/callback',
        scopes: ['openid', 'profile', 'email', 'mcp:tools'],
        audience: 'https://api.my-mcp.com',
      });

      expect(client.supportsClientIdMetadataDocument()).toBe(true);

      const result = await client.initiateCimdConnect({
        clientMetadataUrl: 'https://my-agent.com/oauth/client-metadata.json',
        redirectUri: 'https://my-agent.com/oauth/callback',
      });

      expect(result.clientId).toBe('https://my-agent.com/oauth/client-metadata.json');
      expect(result.authUrl).toContain('https://tenant.us.auth0.com/authorize');
      expect(result.authUrl).toContain('client_id=https%3A%2F%2Fmy-agent.com%2Foauth%2Fclient-metadata.json');
      expect(result.authUrl).toContain('redirect_uri=https%3A%2F%2Fmy-agent.com%2Foauth%2Fcallback');
      expect(result.authUrl).toContain('code_challenge_method=S256');
      expect(result.authUrl).toContain('resource=https%3A%2F%2Fapi.my-mcp.com');
      expect(result.authUrl).toContain('scope=openid+profile+email+mcp%3Atools');
      expect(result.pkce.code_verifier).toBeDefined();
      expect(result.state).toBeDefined();
    });

    it('safely merges query parameters when authorization endpoint already contains a query string', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          issuer: 'https://tenant.us.auth0.com/',
          authorization_endpoint: 'https://tenant.us.auth0.com/authorize?organization=org_123',
          token_endpoint: 'https://tenant.us.auth0.com/oauth/token',
          code_challenge_methods_supported: ['S256'],
          client_id_metadata_document_supported: true,
        }),
      });

      const client = new OAuth2Client({
        authorizationServerUrl: 'https://tenant.us.auth0.com',
        clientMetadataUrl: 'https://my-agent.com/oauth/client-metadata.json',
      });

      const result = await client.initiateCimdConnect({
        clientMetadataUrl: 'https://my-agent.com/oauth/client-metadata.json',
        redirectUri: 'https://my-agent.com/oauth/callback',
      });

      expect(result.authUrl).toContain('https://tenant.us.auth0.com/authorize?organization=org_123&response_type=code');
      expect(result.authUrl.split('?').length).toBe(2);

      const flowResult = await client.startAuthorizationFlow({
        authorizationEndpoint: 'https://tenant.us.auth0.com/authorize?org=456',
        redirectUri: 'https://my-agent.com/oauth/callback',
      });
      expect(flowResult.authUrl).toContain('https://tenant.us.auth0.com/authorize?org=456&response_type=code');
    });

    it('exchanges code for token using CIMD metadata URL as client_id', async () => {
      const client = new OAuth2Client({
        authorizationServerUrl: 'https://tenant.us.auth0.com',
        clientMetadataUrl: 'https://my-agent.com/oauth/client-metadata.json',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test-jwt-access-token',
          token_type: 'Bearer',
          expires_in: 3600,
          refresh_token: 'test-refresh-token',
        }),
      });

      const tokens = await client.exchangeCodeForToken({
        code: 'auth-code-123',
        pkce: {
          code_verifier: 'verifier-12345',
          code_challenge: 'challenge-12345',
          code_challenge_method: 'S256',
        },
        tokenEndpoint: 'https://tenant.us.auth0.com/oauth/token',
        redirectUri: 'https://my-agent.com/oauth/callback',
      });

      expect(tokens.access_token).toBe('test-jwt-access-token');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://tenant.us.auth0.com/oauth/token',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('client_id=https%3A%2F%2Fmy-agent.com%2Foauth%2Fclient-metadata.json'),
        })
      );
    });

    it('refreshes token using CIMD metadata URL as client_id', async () => {
      const client = new OAuth2Client({
        authorizationServerUrl: 'https://tenant.us.auth0.com',
        clientMetadataUrl: 'https://my-agent.com/oauth/client-metadata.json',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new-access-token',
          token_type: 'Bearer',
          expires_in: 3600,
        }),
      });

      const tokens = await client.refreshToken({
        refreshToken: 'refresh-token-abc',
        tokenEndpoint: 'https://tenant.us.auth0.com/oauth/token',
      });

      expect(tokens.access_token).toBe('new-access-token');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://tenant.us.auth0.com/oauth/token',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('client_id=https%3A%2F%2Fmy-agent.com%2Foauth%2Fclient-metadata.json'),
        })
      );
    });

    it('revokes token using configured clientMetadataUrl and sends proper Basic auth', async () => {
      const client = new OAuth2Client({
        authorizationServerUrl: 'https://tenant.us.auth0.com',
        clientMetadataUrl: 'https://my-agent.com/oauth/client-metadata.json',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      await client.revokeToken({
        token: 'token-to-revoke',
        revocationEndpoint: 'https://tenant.us.auth0.com/oauth/revoke',
        clientSecret: 'my-secret',
      });

      const expectedCredentials = Buffer.from('https://my-agent.com/oauth/client-metadata.json:my-secret').toString('base64');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://tenant.us.auth0.com/oauth/revoke',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: `Basic ${expectedCredentials}`,
          }),
          body: expect.stringContaining('client_id=https%3A%2F%2Fmy-agent.com%2Foauth%2Fclient-metadata.json'),
        })
      );
    });
  });

  describe('Quick Setup Instructions & Env Validation', () => {
    it('prints CIMD instructions without crashing', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      printAuthSetupInstructions('cimd');
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('Method 1: Just-in-Time Dynamic Discovery'));
      spy.mockRestore();
    });

    it('validates environment for CIMD', () => {
      const origEnv = { ...process.env };
      try {
        delete process.env.CIMD_CLIENT_METADATA_URL;
        delete process.env.OAUTH_CLIENT_ID;
        const res1 = validateAuthEnv('cimd');
        expect(res1.valid).toBe(false);

        process.env.CIMD_CLIENT_METADATA_URL = 'https://my-agent.com/oauth/client-metadata.json';
        const res2 = validateAuthEnv('cimd');
        expect(res2.valid).toBe(true);
      } finally {
        process.env = origEnv;
      }
    });
  });
});
