import 'reflect-metadata';

/**
 * OAuth 2.1 Module Configuration
 * 
 * Compliant with:
 * - OAuth 2.1 (draft-ietf-oauth-v2-1-13)
 * - RFC 9728 - Protected Resource Metadata
 * - RFC 8414 - Authorization Server Metadata
 * - RFC 7591 - Dynamic Client Registration
 * - RFC 8707 - Resource Indicators (Token Audience Binding)
 * - RFC 7636 - PKCE
 * - RFC 7662 - Token Introspection
 */
export interface OAuthModuleConfig {
  /**
   * Resource URI - The MCP server's public URL
   * Used for token audience validation (RFC 8707)
   */
  resourceUri: string;

  /**
   * Authorization Server(s)
   * The OAuth 2.1 authorization server URLs
   */
  authorizationServers: string[];

  /**
   * Supported scopes for this MCP server
   * Example: ['mcp:read', 'mcp:write', 'tools:execute']
   */
  scopesSupported?: string[];

  /**
   * HTTP server configuration
   * OAuth requires HTTP transport - port will be extracted from resourceUri or use this
   */
  http?: {
    port?: number;
    host?: string;
    basePath?: string;
  };

  /**
   * Token Introspection Endpoint (RFC 7662)
   * Required for validating opaque tokens
   */
  tokenIntrospectionEndpoint?: string;

  /**
   * Client ID for token introspection
   */
  tokenIntrospectionClientId?: string;

  /**
   * Client Secret for token introspection
   * Should be stored in environment variable
   */
  tokenIntrospectionClientSecret?: string;

  /**
   * Expected audience for tokens (RFC 8707)
   * If not provided, defaults to resourceUri
   */
  audience?: string;

  /**
   * Issuer validation
   * If provided, tokens must be from this issuer
   */
  issuer?: string;

  /**
   * Custom token validation
   * Additional validation logic beyond spec requirements
   */
  customValidation?: (token: unknown) => Promise<boolean> | boolean;

  /**
   * JWKS URI (RFC 7517)
   * The authorization server's JWKS endpoint for signature verification
   */
  jwksUri?: string;

  /**
   * Token Cache Seconds
   * In-memory cache expiration for token introspection (defaults to 300)
   */
  tokenCacheSeconds?: number;

  /**
   * Enable the Dynamic Client Registration endpoint (RFC 7591) at /oauth/v2/register.
   * Disabled by default. When disabled, the endpoint responds 404 and
   * `registration_endpoint` is omitted from advertised metadata.
   * Can also be enabled via the OAUTH_ENABLE_CLIENT_REGISTRATION=true env var.
   */
  enableClientRegistration?: boolean;

  /**
   * Static client id returned by the registration endpoint.
   * Falls back to the OAUTH_CLIENT_ID environment variable. No literal default.
   */
  staticClientId?: string;

  /**
   * Static client secret returned by the registration endpoint.
   * Falls back to the OAUTH_CLIENT_SECRET environment variable. No literal default.
   */
  staticClientSecret?: string;

  /**
   * Allow the insecure, signature-less JWT decode fallback in `validateToken`
   * when neither `tokenIntrospectionEndpoint` nor `jwksUri` is configured.
   *
   * Disabled by default: without a configured verifier, tokens are rejected
   * (fail closed). Only enable for local development or tests where unsigned
   * tokens are intentionally used. NEVER enable in production.
   */
  allowInsecureTokenDecode?: boolean;

  /**
   * Whether OAuth authentication is enforced.
   *
   * Resolved from the `OAUTH_REQUIRED` environment variable when not set
   * explicitly, and defaults to `false` (dev-friendly). When `false`, the OAuth
   * module and its discovery endpoints stay configured, but requests are NOT
   * required to carry a valid token (protected endpoints are reachable openly).
   *
   * When `true`, auth is enforced (fail-closed). If no token verifier
   * (`jwksUri` or `tokenIntrospectionEndpoint`) is configured, the server still
   * starts and logs a warning, but all protected requests are rejected until a
   * verifier is configured.
   */
  required?: boolean;
}

/**
 * OAuth Module - Enable OAuth 2.1 authentication in your MCP server
 * 
 * This module provides:
 * - Protected Resource Metadata (RFC 9728)
 * - Token validation with audience binding (RFC 8707)
 * - Token introspection (RFC 7662)
 * - PKCE support (RFC 7636)
 * 
 * Compatible with OpenAI Apps SDK and MCP specification.
 * 
 * @example
 * ```typescript
 * import { McpApplicationFactory, OAuthModule } from 'nitrostack';
 * import { AppModule } from './app.module.js';
 * 
 * @McpApp({
 *   module: AppModule,
 *   server: {
 *     name: 'OAuth MCP Server',
 *     version: '1.0.0',
 *   },
 * })
 * @Module({
 *   name: 'app',
 *   imports: [
 *     // Enable OAuth 2.1 authentication
 *     OAuthModule.forRoot({
 *       resourceUri: process.env.RESOURCE_URI!,
 *       authorizationServers: [process.env.AUTH_SERVER_URL!],
 *       scopesSupported: ['mcp:read', 'mcp:write', 'tools:execute'],
 *       tokenIntrospectionEndpoint: process.env.INTROSPECTION_ENDPOINT,
 *       tokenIntrospectionClientId: process.env.INTROSPECTION_CLIENT_ID,
 *       tokenIntrospectionClientSecret: process.env.INTROSPECTION_CLIENT_SECRET,
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
import { Injectable, Inject } from './di/injectable.decorator.js';
import { NitroStackServer } from './server.js';
import { Logger } from './types.js';
import { DiscoveryHttpServer, DiscoveryServerOptions } from './transports/discovery-http-server.js';
import { createAuthMiddleware } from '../auth/middleware.js';
import { validateToken as authValidateToken } from '../auth/token-validation.js';

/**
 * OAuth discovery info that can be communicated to clients
 */
export interface OAuthDiscoveryInfo {
  /** Whether OAuth is enabled */
  enabled: boolean;
  /** The port the discovery server is running on */
  discoveryPort: number;
  /** Resource URI for token audience validation */
  resourceUri: string;
  /** Authorization server URLs */
  authorizationServers: string[];
  /** Supported scopes */
  scopesSupported?: string[];
}

/** Authorization-server metadata document (RFC 8414 / OIDC discovery). */
type UpstreamMetadata = Record<string, unknown> & { registration_endpoint?: string };

/** Minimal request shape shared by the discovery/registration handlers. */
interface DiscoveryRequest {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
}

/** Minimal response shape shared by the discovery/registration handlers. */
interface DiscoveryResponse {
  writeHead: (status: number, headers: Record<string, string>) => void;
  end: (data: string) => void;
}

@Injectable()
export class OAuthModule {
  private static config: OAuthModuleConfig | null = null;
  private static discoveryInfo: OAuthDiscoveryInfo | null = null;
  private discoveryServer: DiscoveryHttpServer | null = null;

  // Cache of upstream authorization-server metadata to avoid re-fetching on every request.
  // `data` is null for a (short-lived) negative cache entry.
  private static discoveryMetadataCache = new Map<string, { data: UpstreamMetadata | null; expires: number }>();
  // In-flight fetches, keyed by auth server, to de-duplicate concurrent cache misses.
  private static discoveryMetadataInflight = new Map<string, Promise<UpstreamMetadata | null>>();

  /** Max time to wait for an upstream metadata document before giving up. */
  private static readonly UPSTREAM_FETCH_TIMEOUT_MS = 4000;
  /** How long to remember that an upstream lookup failed, to avoid refetch storms. */
  private static readonly NEGATIVE_CACHE_TTL_MS = 30_000;

  private async fetchUpstreamMetadata(authServer: string): Promise<UpstreamMetadata | null> {
    const now = Date.now();
    const cached = OAuthModule.discoveryMetadataCache.get(authServer);
    if (cached && cached.expires > now) {
      return cached.data;
    }

    // De-duplicate concurrent cache-miss fetches for the same authorization server.
    const inflight = OAuthModule.discoveryMetadataInflight.get(authServer);
    if (inflight) {
      return inflight;
    }

    const fetchPromise = (async (): Promise<UpstreamMetadata | null> => {
      let metadata: UpstreamMetadata | null = null;
      for (const suffix of ['/.well-known/openid-configuration', '/.well-known/oauth-authorization-server']) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), OAuthModule.UPSTREAM_FETCH_TIMEOUT_MS);
        try {
          const response = await fetch(`${authServer}${suffix}`, { signal: controller.signal });
          if (response.ok) {
            metadata = (await response.json()) as UpstreamMetadata;
            break;
          }
        } catch (e) {
          this.logger.debug(`OAuthModule: upstream metadata fetch failed for ${authServer}${suffix}`, {
            error: e instanceof Error ? e.message : String(e),
          });
        } finally {
          clearTimeout(timeout);
        }
      }

      const positiveTtlMs = (this.config.tokenCacheSeconds ?? 300) * 1000;
      OAuthModule.discoveryMetadataCache.set(authServer, {
        data: metadata,
        expires: Date.now() + (metadata ? positiveTtlMs : OAuthModule.NEGATIVE_CACHE_TTL_MS),
      });
      return metadata;
    })();

    OAuthModule.discoveryMetadataInflight.set(authServer, fetchPromise);
    try {
      return await fetchPromise;
    } finally {
      OAuthModule.discoveryMetadataInflight.delete(authServer);
    }
  }

  private buildBaseUrl(req: DiscoveryRequest): string {
    // Prefer the configured, trusted resourceUri origin so advertised URLs are
    // not derived from client-controlled Host / X-Forwarded-Proto headers
    // (host-header injection). Fall back to request headers only if resourceUri
    // is missing or unparseable.
    try {
      if (this.config.resourceUri) {
        return new URL(this.config.resourceUri).origin;
      }
    } catch {
      // fall through to header-derived base
    }

    const reqHeaders = req?.headers ?? {};
    const rawHost = reqHeaders.host;
    const host = (Array.isArray(rawHost) ? rawHost[0] : rawHost) || 'localhost:3000';
    const rawProto = reqHeaders['x-forwarded-proto'];
    let proto = Array.isArray(rawProto) ? rawProto[0] : rawProto;
    if (!proto) {
      if (host.includes('localhost') || host.includes('127.0.0.1')) {
        proto = 'http';
      } else {
        proto = process.env.NODE_ENV === 'production' ? 'https' : 'http';
      }
    }
    return `${proto}://${host}`;
  }

  private wellKnownHandler = async (req: DiscoveryRequest, res: DiscoveryResponse) => {
    const headers = { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization',
    };

    const registrationEndpoint = this.isClientRegistrationEnabled()
      ? `${this.buildBaseUrl(req)}/oauth/v2/register`
      : undefined;

    try {
      const authServer = this.config.authorizationServers[0];
      const upstream = await this.fetchUpstreamMetadata(authServer);

      if (upstream) {
        // Clone before mutating so the cached object stays pristine
        const metadata = { ...upstream };
        // Inject registration_endpoint to satisfy strict client schema validation (Cursor/OpenAI)
        if (registrationEndpoint && !metadata.registration_endpoint) {
          metadata.registration_endpoint = registrationEndpoint;
        }
        res.writeHead(200, headers);
        res.end(JSON.stringify(metadata));
        return;
      }
    } catch (err) {
      this.logger.debug('OAuthModule: failed to serve upstream authorization-server metadata; using fallback', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // Fallback compliant with RFC 8414 / OIDC metadata schema
    const fallbackMetadata: Record<string, unknown> = {
      issuer: this.config.issuer || this.config.authorizationServers[0],
      authorization_endpoint: `${this.config.authorizationServers[0]}/oauth/v2/authorize`,
      token_endpoint: `${this.config.authorizationServers[0]}/oauth/v2/token`,
      introspection_endpoint: this.config.tokenIntrospectionEndpoint || `${this.config.authorizationServers[0]}/oauth/v2/introspect`,
      jwks_uri: this.config.jwksUri || `${this.config.authorizationServers[0]}/oauth/v2/keys`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'client_credentials', 'refresh_token'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
      code_challenge_methods_supported: ['S256'],
    };
    if (registrationEndpoint) {
      fallbackMetadata.registration_endpoint = registrationEndpoint;
    }

    res.writeHead(200, headers);
    res.end(JSON.stringify(fallbackMetadata));
  };

  /**
   * Whether the static Dynamic Client Registration endpoint is enabled.
   * Requires explicit opt-in AND a configured client id (never a literal default).
   */
  private isClientRegistrationEnabled(): boolean {
    const enabled = this.config.enableClientRegistration === true
      || process.env.OAUTH_ENABLE_CLIENT_REGISTRATION === 'true';
    const clientId = this.config.staticClientId || process.env.OAUTH_CLIENT_ID;
    return enabled && !!clientId;
  }

  private registrationHandler = async (
    req: any,
    res: DiscoveryResponse
  ) => {
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization',
    };

    if (req.method === 'OPTIONS') {
      res.writeHead(200, headers);
      res.end('');
      return;
    }

    // Registration is opt-in. Without explicit config + a configured client id we
    // must not hand out any client credentials.
    if (!this.isClientRegistrationEnabled()) {
      res.writeHead(404, headers);
      res.end(JSON.stringify({ error: 'not_found', error_description: 'Client registration is not enabled' }));
      return;
    }

    // Read and parse request body if not already parsed (for raw http.IncomingMessage)
    let body: any = {};
    if (req.body && typeof req.body === 'object') {
      body = req.body;
    } else {
      try {
        const buffers: Buffer[] = [];
        for await (const chunk of req) {
          buffers.push(chunk as Buffer);
        }
        const data = Buffer.concat(buffers).toString();
        if (data) {
          body = JSON.parse(data);
        }
      } catch (e) {
        this.logger.debug('OAuthModule: failed to parse client registration request body', {
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    // Client credentials come strictly from configuration / environment. No literal defaults.
    const clientId = this.config.staticClientId || process.env.OAUTH_CLIENT_ID!;
    const clientSecret = this.config.staticClientSecret || process.env.OAUTH_CLIENT_SECRET || '';

    const responsePayload = {
      client_id: clientId,
      client_secret: clientSecret,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_secret_expires_at: 0,
      grant_types: body.grant_types || ['authorization_code', 'refresh_token'],
      response_types: body.response_types || ['code'],
      token_endpoint_auth_method: body.token_endpoint_auth_method || (clientSecret ? 'client_secret_post' : 'none'),
      redirect_uris: body.redirect_uris || [],
    };

    res.writeHead(200, headers);
    res.end(JSON.stringify(responsePayload));
  };

  private resourceMetadataHandler = (req: DiscoveryRequest, res: DiscoveryResponse) => {
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization',
    };

    if (req?.method === 'OPTIONS') {
      res.writeHead(200, headers);
      res.end('');
      return;
    }

    // RFC 9728 - Protected Resource Metadata format
    const metadata: { resource: string; authorization_servers: string[]; scopes_supported?: string[] } = {
      resource: this.config.resourceUri,
      authorization_servers: this.config.authorizationServers,
    };

    // Add optional fields
    if (this.config.scopesSupported && this.config.scopesSupported.length > 0) {
      metadata.scopes_supported = this.config.scopesSupported;
    }

    res.writeHead(200, headers);
    res.end(JSON.stringify(metadata));
  };

  constructor(
    @Inject('OAUTH_CONFIG') private config: OAuthModuleConfig,
    private server: NitroStackServer,
    @Inject('Logger') private logger: Logger
  ) {
    OAuthModule.config = config;
  }

  public onModuleInit() {
    // Register the discovery endpoints
    // Handlers are now arrow functions, so no need to bind
  }

  /**
   * Get the preferred port for the OAuth discovery server
   * Priority: OAUTH_DISCOVERY_PORT > MCP_SERVER_PORT > PORT > config > 3005
   */
  private getPreferredPort(): number {
    const parsePort = (value: string | undefined): number | null => {
      if (!value) return null;
      const parsed = parseInt(value, 10);
      return Number.isNaN(parsed) ? null : parsed;
    };

    return (
      parsePort(process.env.OAUTH_DISCOVERY_PORT) ??
      parsePort(process.env.MCP_SERVER_PORT) ??
      parsePort(process.env.PORT) ??
      this.config.http?.port ??
      3005
    );
  }

  /**
   * Emit a clear, one-time startup log describing the current enforcement mode,
   * so a misconfigured or intentionally-open server is obvious in the logs.
   */
  private logEnforcementMode(): void {
    const hasVerifier = !!this.config.jwksUri || !!this.config.tokenIntrospectionEndpoint;

    if (!this.config.required) {
      this.logger.warn(
        'OAuthModule: authentication is NOT enforced (OAUTH_REQUIRED is not "true"). ' +
        'Protected endpoints are reachable without a token. ' +
        'Set OAUTH_REQUIRED=true (and configure JWKS_URI or INTROSPECTION_ENDPOINT) before deploying.'
      );
      return;
    }

    if (!hasVerifier) {
      this.logger.warn(
        'OAuthModule: OAUTH_REQUIRED is enabled but no token verifier is configured ' +
        '(set JWKS_URI or INTROSPECTION_ENDPOINT). The server will start, but ALL ' +
        'authenticated requests will be rejected (fail-closed) until a verifier is configured.'
      );
      return;
    }

    this.logger.info('OAuthModule: authentication is enforced (OAUTH_REQUIRED=true) with a configured token verifier.');
  }

  public async start() {
    this.logger.info('OAuthModule: start method called');
    this.logEnforcementMode();
    const transportType = (this.server as any)._transportType;
    const preferredPort = this.getPreferredPort();

    // Enable auto-retry by default in dev mode (stdio) to avoid port conflicts
    const autoRetry = process.env.OAUTH_DISCOVERY_AUTO_RETRY !== 'false';

    const serverOptions: DiscoveryServerOptions = {
      port: preferredPort,
      autoRetry: autoRetry,
      maxRetries: 50, // Try up to 50 ports to find an available one
    };

    if (transportType === 'stdio') {
      this.logger.info(`OAuthModule: Running in STDIO mode, starting DiscoveryHttpServer (preferred port: ${preferredPort})`);
      // In stdio mode, start a separate discovery server for OAuth endpoints
      this.discoveryServer = new DiscoveryHttpServer(serverOptions, this.logger);
      this.registerDiscoveryHandlers(this.discoveryServer);
      await this.discoveryServer.start();
      
      // Store the actual port for client discovery
      const actualPort = this.discoveryServer.getPort();
      this.updateDiscoveryInfo(actualPort);
      
      // Send notification to client about OAuth discovery info
      this.notifyClientAboutOAuth(actualPort);
    } else {
      this.logger.info(`OAuthModule: Running in ${transportType} mode, registering handlers with main server`);
      // In http or dual mode, register the handlers with the main server
      const httpTransport = this.server.getHttpTransport();
      if (httpTransport) {
        this.registerDiscoveryHandlers(httpTransport as any);

        // Retrieve Express app and register auth middleware BEFORE routes are compiled.
        // Enforcement is gated on `required`: when auth is not enforced, we leave the
        // discovery endpoints in place but do not mount the token-validating middleware.
        const app = httpTransport.getApp?.();
        if (app && this.config.required) {
          const authMiddleware = createAuthMiddleware({
            resourceUri: this.config.resourceUri,
            authorizationServers: this.config.authorizationServers,
            scopesSupported: this.config.scopesSupported,
            tokenIntrospectionEndpoint: this.config.tokenIntrospectionEndpoint,
            tokenIntrospectionClientId: this.config.tokenIntrospectionClientId,
            tokenIntrospectionClientSecret: this.config.tokenIntrospectionClientSecret,
            audience: this.config.audience,
            issuer: this.config.issuer,
            jwksUri: this.config.jwksUri,
            tokenCacheSeconds: this.config.tokenCacheSeconds,
          });
          const basePath = this.config.http?.basePath || '/mcp';
          // Express 4 `app.use(basePath, ...)` already matches basePath and all
          // of its subpaths, so a separate `${basePath}/*` mount is redundant.
          app.use(basePath, authMiddleware);
          app.use('/sse', authMiddleware);
          app.use('/mcp/messages', authMiddleware);
          this.logger.info(`OAuthModule: Registered auth middleware on ${basePath} (and subpaths), /sse, and /mcp/messages`);
        } else if (app && !this.config.required) {
          this.logger.info('OAuthModule: auth enforcement disabled (OAUTH_REQUIRED not set); skipping auth middleware');
        }

        // In HTTP mode, use the configured port
        this.updateDiscoveryInfo(preferredPort);
      } else {
        // Fallback: if httpTransport is not available, start a discovery server anyway
        // This handles edge cases where the transport setup fails or is delayed
        this.logger.warn(`OAuthModule: httpTransport not found for ${transportType} mode. Starting fallback DiscoveryHttpServer`);
        this.discoveryServer = new DiscoveryHttpServer(serverOptions, this.logger);
        this.registerDiscoveryHandlers(this.discoveryServer);
        await this.discoveryServer.start();
        
        const actualPort = this.discoveryServer.getPort();
        this.updateDiscoveryInfo(actualPort);
        this.notifyClientAboutOAuth(actualPort);
      }
    }
  }

  /**
   * Update the static discovery info
   */
  private updateDiscoveryInfo(port: number) {
    OAuthModule.discoveryInfo = {
      enabled: true,
      discoveryPort: port,
      resourceUri: this.config.resourceUri,
      authorizationServers: this.config.authorizationServers,
      scopesSupported: this.config.scopesSupported,
    };
  }

  /**
   * Notify the client about OAuth configuration via stderr
   * This uses a JSON format that clients can parse from stderr
   */
  private notifyClientAboutOAuth(port: number) {
    // Write OAuth discovery info to stderr in a parseable format
    // Clients can look for this JSON pattern to discover OAuth configuration
    const oauthInfo = {
      type: 'oauth_discovery',
      port: port,
      resourceUri: this.config.resourceUri,
      authorizationServers: this.config.authorizationServers,
      scopesSupported: this.config.scopesSupported,
      wellKnownEndpoints: {
        authorizationServer: `http://localhost:${port}/.well-known/oauth-authorization-server`,
        protectedResource: `http://localhost:${port}/.well-known/oauth-protected-resource`,
      },
    };
    
    // Output in a format that's easy to parse from stderr
    console.error(`[NITROSTACK_OAUTH]${JSON.stringify(oauthInfo)}[/NITROSTACK_OAUTH]`);
    this.logger.info(`OAuthModule: OAuth discovery info sent to client (port: ${port})`);
  }

  public async stop() {
    if (this.discoveryServer) {
      await this.discoveryServer.stop();
      this.discoveryServer = null;
    }
    OAuthModule.discoveryInfo = null;
  }

  private registerDiscoveryHandlers(server: DiscoveryHttpServer | { on: (path: string, handler: unknown) => void }) {
    server.on('/.well-known/oauth-authorization-server', this.wellKnownHandler);
    server.on('/.well-known/oauth-protected-resource', this.resourceMetadataHandler);
    if (this.isClientRegistrationEnabled()) {
      server.on('/oauth/v2/register', this.registrationHandler);
    }
  }

  /**
   * Get the current OAuth discovery info
   * Returns null if OAuth is not configured or not started
   */
  static getDiscoveryInfo(): OAuthDiscoveryInfo | null {
    return this.discoveryInfo;
  }

  /**
   * Configure OAuth module for the application
   */
  static forRoot(config: OAuthModuleConfig): { module: typeof OAuthModule; providers: { provide: string; useValue: OAuthModuleConfig }[] } {
    // Validate required fields
    if (!config.resourceUri) {
      throw new Error('OAuthModule: resourceUri is required');
    }

    if (!config.authorizationServers || config.authorizationServers.length === 0) {
      throw new Error('OAuthModule: at least one authorizationServer is required');
    }

    // Clone so env-derived defaults never mutate the caller's object.
    const resolved: OAuthModuleConfig = { ...config };

    // Resolve defaults from environment variables
    if (!resolved.jwksUri && process.env.JWKS_URI) {
      resolved.jwksUri = process.env.JWKS_URI;
    }

    if (!resolved.audience) {
      resolved.audience = process.env.TOKEN_AUDIENCE || resolved.resourceUri;
    }

    if (!resolved.issuer && process.env.TOKEN_ISSUER) {
      resolved.issuer = process.env.TOKEN_ISSUER;
    }

    // Enforcement gate: explicit config wins, otherwise OAUTH_REQUIRED env, default false.
    resolved.required = config.required ?? (process.env.OAUTH_REQUIRED === 'true');

    // Eager URL format checks
    if (resolved.jwksUri) {
      try {
        new URL(resolved.jwksUri);
      } catch (err: any) {
        throw new Error(`OAuthModule: Invalid configuration value for jwksUri: ${err.message}`);
      }
    }

    this.config = resolved;

    return {
      module: OAuthModule,
      providers: [
        { provide: 'OAUTH_CONFIG', useValue: resolved }
      ],
    };
  }

  /**
   * Get current OAuth configuration
   */
  static getConfig(): OAuthModuleConfig | null {
    return this.config;
  }

  /**
   * Whether OAuth authentication is enforced.
   *
   * Returns `false` when the module is unconfigured or `required` is not `true`,
   * in which case protected endpoints are reachable without a token.
   */
  static isAuthRequired(): boolean {
    return this.config?.required === true;
  }

  /**
   * Validate an access token
   * 
   * Performs:
   * 1. Token introspection (if endpoint configured)
   * 2. Audience validation (RFC 8807)
   * 3. Issuer validation (if configured)
   * 4. Custom validation (if configured)
   */
  static async validateToken(token: string): Promise<{
    valid: boolean;
    payload?: Record<string, unknown>;
    error?: string;
  }> {
    if (!this.config) {
      return { valid: false, error: 'OAuth module not configured' };
    }

    try {
      // Decode the header to check token type and provide helpful error message
      try {
        const headerPart = token.split('.')[0];
        const decodedHeader = JSON.parse(Buffer.from(headerPart, 'base64').toString());

        // Check if we received a JWE (encrypted) token instead of JWT
        if (decodedHeader.alg === 'dir' || decodedHeader.enc) {
          return {
            valid: false,
            error: 'Received encrypted JWE token. MCP servers require unencrypted JWT access tokens. Check your OAuth provider application settings to ensure ID Token Encryption is disabled and that the "audience" parameter is being sent in authorization requests.'
          };
        }
      } catch (headerError) {
        // If header decode fails, continue with normal validation
      }

      // If introspection or JWKS is configured, delegate to token-validation.ts pipeline
      if (this.config.tokenIntrospectionEndpoint || this.config.jwksUri) {
        const result = await authValidateToken(token, this.config);

        if (!result.valid || !result.introspection) {
          return { valid: false, error: result.error || 'Invalid token' };
        }

        // Custom validation
        if (this.config.customValidation) {
          const customValid = await this.config.customValidation(result.introspection);
          if (!customValid) {
            return { valid: false, error: 'Custom validation failed' };
          }
        }

        return { valid: true, payload: result.introspection as unknown as Record<string, unknown> };
      }

      // No cryptographic verifier configured. Fail closed unless the caller has
      // explicitly opted into the insecure, signature-less decode fallback.
      if (!this.config.allowInsecureTokenDecode) {
        return {
          valid: false,
          error: 'No token validation method configured. Set tokenIntrospectionEndpoint or jwksUri (or enable allowInsecureTokenDecode for local development).',
        };
      }

      // Insecure fallback: decode token directly WITHOUT signature verification.
      // Only reachable when allowInsecureTokenDecode is true.
      const payload = this.decodeToken(token);

      if (!payload) {
        return { valid: false, error: 'Invalid token format' };
      }

      // Validate audience (RFC 8707 - critical for security). Fail closed when
      // the token carries no audience claim.
      if (!payload.aud) {
        return { valid: false, error: 'Token missing required audience (aud) claim' };
      }
      const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
      if (!audiences.includes(this.config.audience!)) {
        return {
          valid: false,
          error: `Token audience mismatch. Expected: ${this.config.audience}, Got: ${audiences.join(', ')}`,
        };
      }

      // Validate issuer
      if (this.config.issuer && payload.iss !== this.config.issuer) {
        return {
          valid: false,
          error: `Token issuer mismatch. Expected: ${this.config.issuer}, Got: ${payload.iss}`,
        };
      }

      // Check expiration
      const expiration = payload.exp as number | undefined;
      if (expiration && expiration < Date.now() / 1000) {
        return { valid: false, error: 'Token expired' };
      }

      // Custom validation
      if (this.config.customValidation) {
        const customValid = await this.config.customValidation(payload);
        if (!customValid) {
          return { valid: false, error: 'Custom validation failed' };
        }
      }

      return { valid: true, payload };

    } catch (error: unknown) {
      return { valid: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Decode JWT token (without validation)
   * @private
   */
  private static decodeToken(token: string): Record<string, unknown> | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      // Convert base64url to base64 by replacing URL-safe characters
      let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');

      // Add padding if necessary
      const padding = base64.length % 4;
      if (padding === 2) {
        base64 += '==';
      } else if (padding === 3) {
        base64 += '=';
      }

      const payload = JSON.parse(
        Buffer.from(base64, 'base64').toString('utf8')
      );

      return payload;
    } catch {
      return null;
    }
  }
}


