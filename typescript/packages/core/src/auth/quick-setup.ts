import { Express } from 'express';
import { createSimpleJWTAuth, SimpleJWTConfig, generateJWT } from './simple-jwt.js';
import { createAPIKeyAuth, APIKeyConfig, generateAPIKey, hashAPIKey } from './api-key.js';
import { configureServerAuth, McpAuthConfig } from './server-integration.js';

/**
 * Quick Setup Helpers
 * 
 * Make it dead simple to add authentication to NitroStack servers
 */

/**
 * Setup Simple JWT Authentication (1-liner!)
 * 
 * @example
 * ```typescript
 * const server = createServer({...});
 * 
 * // That's it! JWT auth enabled
 * setupJWTAuth(server.app, {
 *   secret: process.env.JWT_SECRET!,
 * });
 * 
 * server.start();
 * ```
 */
export function setupJWTAuth(
  app: Express,
  config: SimpleJWTConfig,
  path: string = '/mcp'
): void {
  const middleware = createSimpleJWTAuth(config);
  app.use(path, middleware);
  
  console.error(`✅ Simple JWT auth enabled on ${path}`);
  console.error(`   Audience: ${config.audience || 'any'}`);
  console.error(`   Issuer: ${config.issuer || 'any'}`);
  console.error(`   Algorithm: ${config.algorithm || 'HS256'}`);
}

/**
 * Setup API Key Authentication (1-liner!)
 * 
 * @example
 * ```typescript
 * const server = createServer({...});
 * 
 * // That's it! API key auth enabled
 * setupAPIKeyAuth(server.app, {
 *   keys: [process.env.API_KEY!],
 * });
 * 
 * server.start();
 * ```
 */
export function setupAPIKeyAuth(
  app: Express,
  config: APIKeyConfig,
  path: string = '/mcp'
): void {
  const middleware = createAPIKeyAuth(config);
  app.use(path, middleware);
  
  console.error(`✅ API Key auth enabled on ${path}`);
  console.error(`   Header: ${config.headerName || 'X-API-Key'}`);
  console.error(`   Keys: ${config.keys.length} configured`);
  console.error(`   Query param: ${config.allowQueryParam ? 'enabled' : 'disabled'}`);
}

/**
 * Setup OAuth 2.1 Authentication (full enterprise setup)
 * 
 * @example
 * ```typescript
 * const server = createServer({...});
 * 
 * // Full OAuth 2.1 with PKCE
 * setupOAuthAuth(server.app, {
 *   resourceUri: 'https://mcp.example.com',
 *   authorizationServers: ['https://auth.example.com'],
 *   tokenIntrospectionEndpoint: '...',
 *   tokenIntrospectionClientId: '...',
 *   tokenIntrospectionClientSecret: process.env.INTROSPECTION_SECRET,
 * });
 * 
 * server.start();
 * ```
 */
export function setupOAuthAuth(
  app: Express,
  config: McpAuthConfig,
  path: string = '/mcp'
): void {
  configureServerAuth(app, config, {
    protectRoutes: [path],
  });
  
  console.error(`✅ OAuth 2.1 auth enabled on ${path}`);
  console.error(`   Resource URI: ${config.resourceUri}`);
  console.error(`   Auth Servers: ${config.authorizationServers.join(', ')}`);
  console.error(`   Scopes: ${config.scopesSupported?.join(', ') || 'none'}`);
}

import { ClientIdMetadataDocument, mountCimdEndpoint } from './cimd.js';
import { OAuth2Client } from './client.js';

/**
 * Setup Client ID Metadata Document (CIMD) hosting on an Express server.
 * Enables Method 1: Just-in-Time Dynamic Discovery for zero-onboarding Auth0 / Stytch connections.
 *
 * @example
 * ```typescript
 * const server = createServer({...});
 * setupCimdHosting(server.app, {
 *   client_id: 'https://my-agent.com/oauth/client-metadata.json',
 *   client_name: 'My AI Agent',
 *   redirect_uris: ['https://my-agent.com/oauth/callback'],
 * });
 * ```
 */
export function setupCimdHosting(
  app: Express,
  metadata: ClientIdMetadataDocument,
  options?: { path?: string; maxAgeSeconds?: number; allowLoopback?: boolean }
): string {
  const mountPath = mountCimdEndpoint(app, metadata, options);
  console.error(`✅ CIMD Metadata endpoint mounted on ${mountPath}`);
  console.error(`   Client ID URL: ${metadata.client_id}`);
  console.error(`   Redirect URIs: ${metadata.redirect_uris.join(', ')}`);
  return mountPath;
}

/**
 * Helper to configure an OAuth2Client with Auth0 Just-in-Time Dynamic Discovery (CIMD).
 *
 * @example
 * ```typescript
 * const auth0Client = setupAuth0CimdClient({
 *   auth0Domain: 'your-tenant.us.auth0.com',
 *   clientMetadataUrl: 'https://my-agent.com/oauth/client-metadata.json',
 *   redirectUri: 'https://my-agent.com/oauth/callback',
 *   scopes: ['openid', 'profile', 'email', 'offline_access'],
 * });
 * ```
 */
export function setupAuth0CimdClient(options: {
  auth0Domain: string;
  clientMetadataUrl: string;
  redirectUri?: string;
  scopes?: string[];
  audience?: string;
}): OAuth2Client {
  const domain = options.auth0Domain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const authServerUrl = `https://${domain}`;

  return new OAuth2Client({
    authorizationServerUrl: authServerUrl,
    clientMetadataUrl: options.clientMetadataUrl,
    redirectUri: options.redirectUri,
    scopes: options.scopes || ['openid', 'profile', 'email'],
    resource: options.audience,
    preferCimd: true,
  });
}

/**
 * Generate test credentials (for development)
 * 
 * @example
 * ```typescript
 * const creds = generateTestCredentials();
 * console.log('JWT Secret:', creds.jwtSecret);
 * console.log('API Key:', creds.apiKey);
 * console.log('Sample Token:', creds.sampleToken);
 * ```
 */
export function generateTestCredentials(options?: {
  jwtAudience?: string;
  jwtIssuer?: string;
  apiKeyPrefix?: string;
}) {
  const jwtSecret = generateAPIKey('jwt_secret');
  const apiKey = generateAPIKey(options?.apiKeyPrefix);
  
  const sampleToken = generateJWT({
    secret: jwtSecret,
    payload: {
      sub: 'test-user',
      scopes: ['mcp:read', 'mcp:write'],
    },
    expiresIn: '1h',
    audience: options?.jwtAudience,
    issuer: options?.jwtIssuer,
  });
  
  return {
    jwtSecret,
    apiKey,
    apiKeyHashed: hashAPIKey(apiKey),
    sampleToken,
  };
}

/**
 * Print auth setup instructions
 */
export function printAuthSetupInstructions(type: 'jwt' | 'apikey' | 'oauth' | 'cimd'): void {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    AUTH SETUP INSTRUCTIONS                   ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  if (type === 'jwt') {
    console.log('📝 Simple JWT Authentication Setup:\n');
    console.log('1. Generate a secret:');
    console.log('   const creds = generateTestCredentials();');
    console.log('   console.log(creds.jwtSecret);\n');
    console.log('2. Add to .env:');
    console.log('   JWT_SECRET=jwt_secret_...\n');
    console.log('3. Enable in server:');
    console.log('   setupJWTAuth(server.app, {');
    console.log('     secret: process.env.JWT_SECRET!,');
    console.log('     audience: "my-mcp-server",');
    console.log('   });\n');
    console.log('4. Generate tokens:');
    console.log('   const token = generateJWT({');
    console.log('     secret: process.env.JWT_SECRET!,');
    console.log('     payload: { sub: "user123" },');
    console.log('     expiresIn: "1h",');
    console.log('   });\n');
    console.log('5. Use in client:');
    console.log('   Authorization: Bearer <token>\n');
  }
  
  if (type === 'apikey') {
    console.log('📝 API Key Authentication Setup:\n');
    console.log('1. Generate API keys:');
    console.log('   const key1 = generateAPIKey();');
    console.log('   const key2 = generateAPIKey();\n');
    console.log('2. Add to .env:');
    console.log('   API_KEY_1=sk_...');
    console.log('   API_KEY_2=sk_...\n');
    console.log('3. Enable in server:');
    console.log('   setupAPIKeyAuth(server.app, {');
    console.log('     keys: [');
    console.log('       process.env.API_KEY_1!,');
    console.log('       process.env.API_KEY_2!,');
    console.log('     ],');
    console.log('   });\n');
    console.log('4. Use in client:');
    console.log('   X-API-Key: sk_...\n');
  }
  
  if (type === 'oauth') {
    console.log('📝 OAuth 2.1 Authentication Setup:\n');
    console.log('1. Deploy an OAuth 2.1 authorization server');
    console.log('   (e.g., Auth0, Keycloak, Azure AD)\n');
    console.log('2. Configure in server:');
    console.log('   setupOAuthAuth(server.app, {');
    console.log('     resourceUri: "https://mcp.example.com",');
    console.log('     authorizationServers: ["https://auth.example.com"],');
    console.log('     tokenIntrospectionEndpoint: "...",');
    console.log('     tokenIntrospectionClientId: "...",');
    console.log('     tokenIntrospectionClientSecret: process.env.SECRET,');
    console.log('   });\n');
    console.log('3. Use the inspector AUTH tab to test\n');
  }

  if (type === 'cimd') {
    console.log('📝 Method 1: Just-in-Time Dynamic Discovery (CIMD) Setup:\n');
    console.log('1. Host your Client ID Metadata Document:');
    console.log('   const doc = createClientIdMetadataDocument("https://agent.example.com/oauth/client-metadata.json", {');
    console.log('     client_name: "My AI Agent",');
    console.log('     redirect_uris: ["https://agent.example.com/oauth/callback"],');
    console.log('   });');
    console.log('   mountCimdEndpoint(app, doc);\n');
    console.log('2. Initiate connection with zero dashboard onboarding:');
    console.log('   const client = setupAuth0CimdClient({');
    console.log('     auth0Domain: "tenant.us.auth0.com",');
    console.log('     clientMetadataUrl: "https://agent.example.com/oauth/client-metadata.json",');
    console.log('     redirectUri: "https://agent.example.com/oauth/callback",');
    console.log('   });');
    console.log('   const { authUrl, state, pkce } = await client.initiateCimdConnect({...});');
    console.log('   // Redirect user to authUrl\n');
    console.log('3. On callback redirect:');
    console.log('   const tokens = await client.exchangeCodeForToken({ code, pkce, redirectUri, tokenEndpoint });\n');
  }
  
  console.log('═══════════════════════════════════════════════════════════════\n');
}

/**
 * Validate auth environment variables
 */
export function validateAuthEnv(type: 'jwt' | 'apikey' | 'oauth' | 'cimd'): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  if (type === 'jwt') {
    if (!process.env.JWT_SECRET) {
      missing.push('JWT_SECRET');
    }
  }
  
  if (type === 'apikey') {
    if (!process.env.API_KEY_1 && !process.env.API_KEY) {
      missing.push('API_KEY_1 or API_KEY');
    }
  }
  
  if (type === 'oauth') {
    const required = [
      'OAUTH_RESOURCE_URI',
      'OAUTH_AUTH_SERVER',
      'OAUTH_INTROSPECTION_ENDPOINT',
      'OAUTH_CLIENT_ID',
      'OAUTH_CLIENT_SECRET',
    ];
    
    for (const key of required) {
      if (!process.env[key]) {
        missing.push(key);
      }
    }
  }

  if (type === 'cimd') {
    if (!process.env.CIMD_CLIENT_METADATA_URL && !process.env.OAUTH_CLIENT_ID) {
      missing.push('CIMD_CLIENT_METADATA_URL or OAUTH_CLIENT_ID');
    }
  }
  
  return {
    valid: missing.length === 0,
    missing,
  };
}

