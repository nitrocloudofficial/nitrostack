import crypto from 'crypto';
import {
  ProtectedResourceMetadata,
  AuthorizationServerMetadata,
  ClientRegistrationRequest,
  ClientRegistrationResponse,
  TokenResponse,
  TokenRequest,
  AuthorizationRequest,
  OAuth2Error,
  McpAuthClientConfig,
  CimdConnectOptions,
  CimdConnectResult,
} from './types.js';
import { generatePKCEParams, PKCEParams, validatePKCESupport } from './pkce.js';
import { parseWWWAuthenticateHeader, getWellKnownMetadataUris } from './server-metadata.js';
import { isClientIdMetadataUrl, validateClientIdentifierUrl } from './cimd.js';

/**
 * OAuth 2.1 Client for MCP
 * 
 * Handles:
 * - Protected Resource Metadata discovery (RFC 9728)
 * - Authorization Server Metadata discovery (RFC 8414)
 * - Dynamic Client Registration (RFC 7591)
 * - Authorization Code Flow with PKCE (OAuth 2.1)
 * - Token refresh and revocation
 */

export class OAuth2Client {
  private config: McpAuthClientConfig;

  constructor(config: McpAuthClientConfig) {
    this.config = config;
  }

  /**
   * Discover Protected Resource Metadata (RFC 9728)
   * 
   * Tries:
   * 1. WWW-Authenticate header from 401 response
   * 2. Well-known URI at resource path
   * 3. Well-known URI at root
   * 
   * @param resourceUrl - URL of the MCP server
   */
  async discoverProtectedResourceMetadata(
    resourceUrl: string
  ): Promise<ProtectedResourceMetadata> {
    // Step 1: Try making a request to get 401 with WWW-Authenticate header
    try {
      const response = await fetch(resourceUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (response.status === 401) {
        const wwwAuth = response.headers.get('WWW-Authenticate');
        if (wwwAuth) {
          const parsed = parseWWWAuthenticateHeader(wwwAuth);
          if (parsed?.resourceMetadata) {
            // Found metadata URL in header
            return await this.fetchMetadata<ProtectedResourceMetadata>(parsed.resourceMetadata);
          }
        }
      }
    } catch (error) {
      // Ignore errors, try well-known URIs
    }

    // Step 2: Try well-known URIs
    const url = new URL(resourceUrl);
    const wellKnownUris = getWellKnownMetadataUris(url);

    for (const uri of wellKnownUris) {
      try {
        return await this.fetchMetadata<ProtectedResourceMetadata>(uri);
      } catch (error) {
        // Try next URI
        continue;
      }
    }

    throw new Error(
      `Failed to discover protected resource metadata for ${resourceUrl}. ` +
      'Server must implement RFC 9728 (Protected Resource Metadata).'
    );
  }

  /**
   * Discover Authorization Server Metadata (RFC 8414)
   * 
   * Supports both:
   * - OAuth 2.0 Authorization Server Metadata (RFC 8414)
   * - OpenID Connect Discovery 1.0
   * 
   * @param issuer - Authorization server issuer URL
   */
  async discoverAuthorizationServerMetadata(
    issuer: string
  ): Promise<AuthorizationServerMetadata> {
    const issuerUrl = new URL(issuer);
    const wellKnownUrls: string[] = [];

    // For issuer URLs with path components
    if (issuerUrl.pathname && issuerUrl.pathname !== '/') {
      const path = issuerUrl.pathname;
      // OAuth 2.0 with path insertion
      wellKnownUrls.push(
        `${issuerUrl.origin}/.well-known/oauth-authorization-server${path}`
      );
      // OpenID Connect with path insertion
      wellKnownUrls.push(
        `${issuerUrl.origin}/.well-known/openid-configuration${path}`
      );
      // OpenID Connect with path appending
      wellKnownUrls.push(`${issuer}/.well-known/openid-configuration`);
    } else {
      // For issuer URLs without path components
      wellKnownUrls.push(
        `${issuerUrl.origin}/.well-known/oauth-authorization-server`
      );
      wellKnownUrls.push(`${issuerUrl.origin}/.well-known/openid-configuration`);
    }

    // Try each URL
    for (const url of wellKnownUrls) {
      try {
        const metadata = await this.fetchMetadata<AuthorizationServerMetadata>(url);
        
        // Validate PKCE support (REQUIRED by OAuth 2.1)
        if (!validatePKCESupport(metadata.code_challenge_methods_supported)) {
          throw new Error(
            'Authorization server does not support PKCE (S256). ' +
            'OAuth 2.1 requires PKCE support. Cannot proceed.'
          );
        }

        return metadata;
      } catch (error) {
        // Try next URL
        continue;
      }
    }

    throw new Error(
      `Failed to discover authorization server metadata for ${issuer}. ` +
      'Server must implement RFC 8414 or OpenID Connect Discovery.'
    );
  }

  /**
   * Register client dynamically (RFC 7591)
   * 
   * @param registrationEndpoint - Client registration endpoint
   * @param metadata - Client metadata
   */
  async registerClient(
    registrationEndpoint: string,
    metadata: ClientRegistrationRequest
  ): Promise<ClientRegistrationResponse> {
    // SEP-837: default application_type to 'native' when every redirect URI is
    // loopback (CLI/desktop), so the AS accepts localhost redirects; otherwise
    // 'web'. An explicit value from the caller always wins.
    if (metadata.application_type === undefined) {
      const allLoopback =
        Array.isArray(metadata.redirect_uris) &&
        metadata.redirect_uris.length > 0 &&
        metadata.redirect_uris.every((uri) => OAuth2Client.isLoopbackRedirect(uri));
      metadata = { ...metadata, application_type: allLoopback ? 'native' : 'web' };
    }

    const response = await fetch(registrationEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(metadata),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as { error_description?: string; error?: string };
      throw new Error(
        `Client registration failed: ${response.status} - ${error.error_description || error.error || 'Unknown error'}`
      );
    }

    const result = await response.json() as ClientRegistrationResponse;
    return result;
  }

  /**
   * Whether the authorization server or client configuration indicates support for CIMD
   * (Client ID Metadata Documents / Just-in-Time Dynamic Discovery).
   */
  supportsClientIdMetadataDocument(asMetadata?: AuthorizationServerMetadata): boolean {
    if (asMetadata?.client_id_metadata_document_supported === true) {
      return true;
    }
    const cid = this.config.clientMetadataUrl || this.config.clientId;
    return isClientIdMetadataUrl(cid || '');
  }

  /**
   * Initiate a Just-in-Time Dynamic Discovery (CIMD) OAuth connection (Method 1).
   *
   * High-level orchestrator for third-party applications and AI agents connecting to
   * Auth0, Stytch, or compliant OAuth 2.1 authorization servers:
   * 1. Resolves authorization server metadata (via PRM discovery or direct AS URL).
   * 2. Validates CIMD URL syntax and PKCE S256 support.
   * 3. Generates PKCE code challenge and CSRF state.
   * 4. Assembles authorization URL with `client_id = clientMetadataUrl`.
   * 5. Returns `{ authUrl, state, pkce, clientId }`.
   *
   * @example
   * ```typescript
   * const client = new OAuth2Client({ authorizationServerUrl: 'https://tenant.us.auth0.com' });
   * const connectResult = await client.initiateCimdConnect({
   *   clientMetadataUrl: 'https://my-agent.com/oauth/client-metadata.json',
   *   redirectUri: 'https://my-agent.com/oauth/callback',
   *   scope: 'openid profile email mcp:read',
   * });
   * // Direct user to connectResult.authUrl, and save connectResult.pkce.code_verifier
   * ```
   */
  async initiateCimdConnect(options: CimdConnectOptions): Promise<CimdConnectResult> {
    const metadataUrl = options.clientMetadataUrl || this.config.clientMetadataUrl || this.config.clientId;
    if (!metadataUrl || !isClientIdMetadataUrl(metadataUrl)) {
      throw new Error(
        `CIMD Just-in-Time discovery requires a valid HTTPS metadata URL as client_id, got: "${metadataUrl}"`
      );
    }
    validateClientIdentifierUrl(metadataUrl, true);

    let asUrl = options.authorizationServerUrl || this.config.authorizationServerUrl;
    if (!asUrl && options.resourceUrl) {
      const prm = await this.discoverProtectedResourceMetadata(options.resourceUrl);
      if (prm.authorization_servers && prm.authorization_servers.length > 0) {
        asUrl = prm.authorization_servers[0];
      }
    }

    if (!asUrl) {
      throw new Error('initiateCimdConnect: authorizationServerUrl or resourceUrl is required');
    }

    const asMeta = await this.discoverAuthorizationServerMetadata(asUrl);
    const redirectUri = options.redirectUri || this.config.redirectUri;
    if (!redirectUri) {
      throw new Error('initiateCimdConnect: redirectUri is required');
    }

    const state = options.state || this.generateState();
    const pkce = generatePKCEParams('S256');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: metadataUrl,
      redirect_uri: redirectUri,
      state,
      code_challenge: pkce.code_challenge,
      code_challenge_method: pkce.code_challenge_method,
    });

    const requestedScope = options.scope || (this.config.scopes ? this.config.scopes.join(' ') : undefined);
    if (requestedScope) {
      params.append('scope', requestedScope);
    }

    const requestedResource = options.resource || this.config.resource;
    if (requestedResource) {
      params.append('resource', requestedResource);
    }

    if (options.prompt) {
      params.append('prompt', options.prompt);
    }

    if (options.extraParams) {
      for (const [k, v] of Object.entries(options.extraParams)) {
        params.append(k, v);
      }
    }

    const authUrl = `${asMeta.authorization_endpoint}?${params.toString()}`;

    return {
      authUrl,
      state,
      pkce,
      clientId: metadataUrl,
    };
  }

  /**
   * Start authorization flow
   * 
   * Generates authorization URL with PKCE parameters
   * 
   * @param authzEndpoint - Authorization endpoint
   * @param clientId - OAuth client ID (can be CIMD URL or registered client_id)
   * @param redirectUri - Redirect URI
   * @param scope - Requested scopes
   * @param resource - Resource indicator (RFC 8707)
   * @returns Authorization URL and PKCE parameters (store for token exchange)
   */
  async startAuthorizationFlow(options: {
    authorizationEndpoint: string;
    clientId?: string;
    redirectUri?: string;
    scope?: string;
    resource?: string;
    state?: string;
    /**
     * OIDC `prompt` value (SEP-2207). Set to `consent` when an OpenID Connect
     * authorization server requires re-consent to issue a refresh token
     * (typically alongside the `offline_access` scope).
     */
    prompt?: string;
  }): Promise<{
    authUrl: string;
    state: string;
    pkce: PKCEParams;
  }> {
    const clientId = options.clientId || this.config.clientMetadataUrl || this.config.clientId;
    if (!clientId) {
      throw new Error('startAuthorizationFlow: clientId or clientMetadataUrl is required');
    }

    const redirectUri = options.redirectUri || this.config.redirectUri;
    if (!redirectUri) {
      throw new Error('startAuthorizationFlow: redirectUri is required');
    }

    // Generate PKCE parameters (S256 required by OAuth 2.1)
    const pkce = generatePKCEParams('S256');

    // Generate state for CSRF protection
    const state = options.state || this.generateState();

    // Build authorization URL
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
      code_challenge: pkce.code_challenge,
      code_challenge_method: pkce.code_challenge_method,
    });

    if (options.scope) {
      params.append('scope', options.scope);
    }

    if (options.resource) {
      // RFC 8707 - Resource Indicators
      params.append('resource', options.resource);
    }

    if (options.prompt) {
      // SEP-2207: OIDC authorization servers may need prompt=consent to
      // (re-)issue a refresh token for offline_access.
      params.append('prompt', options.prompt);
    }

    const authUrl = `${options.authorizationEndpoint}?${params.toString()}`;

    return { authUrl, state, pkce };
  }

  /**
   * Exchange authorization code for access token
   * 
   * @param code - Authorization code from callback
   * @param pkce - PKCE parameters from startAuthorizationFlow
   * @param tokenEndpoint - Token endpoint
   * @param clientId - OAuth client ID
   * @param clientSecret - OAuth client secret (for confidential clients)
   * @param redirectUri - Redirect URI (must match authorization request)
   * @param resource - Resource indicator (RFC 8707)
   */
  async exchangeCodeForToken(options: {
    code: string;
    pkce: PKCEParams;
    tokenEndpoint: string;
    clientId?: string;
    clientSecret?: string;
    redirectUri: string;
    resource?: string;
  }): Promise<TokenResponse> {
    const clientId = options.clientId || this.config.clientMetadataUrl || this.config.clientId;
    if (!clientId) {
      throw new Error('exchangeCodeForToken: clientId or clientMetadataUrl is required');
    }

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: options.code,
      redirect_uri: options.redirectUri,
      client_id: clientId,
      code_verifier: options.pkce.code_verifier,
    });

    if (options.resource) {
      params.append('resource', options.resource);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    };

    // Client authentication
    if (options.clientSecret) {
      const credentials = Buffer.from(
        `${clientId}:${options.clientSecret}`
      ).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    return await this.tokenRequest(options.tokenEndpoint, params, headers);
  }

  /**
   * Refresh access token
   * 
   * @param refreshToken - Refresh token
   * @param tokenEndpoint - Token endpoint
   * @param clientId - OAuth client ID
   * @param clientSecret - OAuth client secret
   * @param scope - Optional: request different scopes
   * @param resource - Resource indicator (RFC 8707)
   */
  async refreshToken(options: {
    refreshToken: string;
    tokenEndpoint: string;
    clientId?: string;
    clientSecret?: string;
    scope?: string;
    resource?: string;
  }): Promise<TokenResponse> {
    const clientId = options.clientId || this.config.clientMetadataUrl || this.config.clientId;
    if (!clientId) {
      throw new Error('refreshToken: clientId or clientMetadataUrl is required');
    }

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: options.refreshToken,
      client_id: clientId,
    });

    if (options.scope) {
      params.append('scope', options.scope);
    }

    if (options.resource) {
      params.append('resource', options.resource);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    };

    if (options.clientSecret) {
      const credentials = Buffer.from(
        `${clientId}:${options.clientSecret}`
      ).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    return await this.tokenRequest(options.tokenEndpoint, params, headers);
  }

  /**
   * Get client credentials token (for server-to-server)
   * 
   * @param tokenEndpoint - Token endpoint
   * @param clientId - OAuth client ID
   * @param clientSecret - OAuth client secret
   * @param scope - Requested scopes
   * @param resource - Resource indicator (RFC 8707)
   */
  async getClientCredentialsToken(options: {
    tokenEndpoint: string;
    clientId?: string;
    clientSecret: string;
    scope?: string;
    resource?: string;
  }): Promise<TokenResponse> {
    const clientId = options.clientId || this.config.clientMetadataUrl || this.config.clientId;
    if (!clientId) {
      throw new Error('getClientCredentialsToken: clientId or clientMetadataUrl is required');
    }

    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
    });

    if (options.scope) {
      params.append('scope', options.scope);
    }

    if (options.resource) {
      params.append('resource', options.resource);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'Authorization': `Basic ${Buffer.from(
        `${clientId}:${options.clientSecret}`
      ).toString('base64')}`,
    };

    return await this.tokenRequest(options.tokenEndpoint, params, headers);
  }

  /**
   * Revoke token (access or refresh)
   * 
   * @param token - Token to revoke
   * @param revocationEndpoint - Revocation endpoint
   * @param clientId - OAuth client ID
   * @param clientSecret - OAuth client secret
   * @param tokenTypeHint - 'access_token' or 'refresh_token'
   */
  async revokeToken(options: {
    token: string;
    revocationEndpoint: string;
    clientId?: string;
    clientSecret?: string;
    tokenTypeHint?: 'access_token' | 'refresh_token';
  }): Promise<void> {
    const clientId = options.clientId || this.config.clientMetadataUrl || this.config.clientId;
    if (!clientId) {
      throw new Error('revokeToken: clientId or clientMetadataUrl is required');
    }

    const params = new URLSearchParams({
      token: options.token,
      client_id: clientId,
    });

    if (options.tokenTypeHint) {
      params.append('token_type_hint', options.tokenTypeHint);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    if (options.clientSecret) {
      const credentials = Buffer.from(
        `${options.clientId}:${options.clientSecret}`
      ).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    const response = await fetch(options.revocationEndpoint, {
      method: 'POST',
      headers,
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`Token revocation failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Make token request
   */
  private async tokenRequest(
    endpoint: string,
    params: URLSearchParams,
    headers: Record<string, string>
  ): Promise<TokenResponse> {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: params.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      const error = data as OAuth2Error;
      throw new Error(
        `Token request failed: ${error.error} - ${error.error_description || 'Unknown error'}`
      );
    }

    return data as TokenResponse;
  }

  /**
   * Fetch metadata from URL
   */
  private async fetchMetadata<T = unknown>(url: string): Promise<T> {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch metadata from ${url}: ${response.status}`);
    }

    return await response.json() as T;
  }

  /**
   * Generate random state for CSRF protection
   */
  private generateState(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Whether a redirect URI targets loopback (localhost / 127.0.0.1 / [::1]),
   * used to infer `application_type: 'native'` for DCR (SEP-837).
   */
  static isLoopbackRedirect(uri: string): boolean {
    try {
      const host = new URL(uri).hostname;
      return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';
    } catch {
      return false;
    }
  }

  /**
   * Validate the issuer returned on an authorization response (RFC 9207 /
   * SEP-2468). MCP 2026-07-28 clients MUST verify the `iss` parameter on the
   * authorization redirect matches the authorization server's issuer to defend
   * against mix-up attacks. Throws on mismatch.
   *
   * @param receivedIss - `iss` query parameter from the authorization redirect.
   * @param expectedIssuer - Issuer from the AS metadata used to start the flow.
   */
  static validateAuthorizationIssuer(receivedIss: string | undefined | null, expectedIssuer: string): void {
    // RFC 9207: if the AS advertised authorization_response_iss_parameter_supported
    // the client MUST validate iss. A missing iss from such an AS is a failure;
    // callers that know the AS omits it can skip this call.
    if (receivedIss === undefined || receivedIss === null || receivedIss === '') {
      throw new Error(
        'Authorization response is missing the required `iss` parameter (RFC 9207 / SEP-2468).'
      );
    }
    const normalize = (u: string): string => u.replace(/\/+$/, '');
    if (normalize(receivedIss) !== normalize(expectedIssuer)) {
      throw new Error(
        `Authorization response issuer mismatch (RFC 9207 / SEP-2468): expected "${expectedIssuer}", got "${receivedIss}".`
      );
    }
  }
}

