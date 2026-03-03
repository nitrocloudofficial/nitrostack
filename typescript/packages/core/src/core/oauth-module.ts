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

@Injectable()
export class OAuthModule {
  private static config: OAuthModuleConfig | null = null;
  private static discoveryInfo: OAuthDiscoveryInfo | null = null;
  private discoveryServer: DiscoveryHttpServer | null = null;

  private wellKnownHandler = (req: unknown, res: { writeHead: (status: number, headers: Record<string, string>) => void; end: (data: string) => void }) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      issuer: this.config.issuer,
      token_endpoint: `${this.config.authorizationServers[0]}/oauth/token`,
      // Add other metadata as needed
    }));
  };

  private resourceMetadataHandler = (req: unknown, res: { writeHead: (status: number, headers: Record<string, string>) => void; end: (data: string) => void }) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    // RFC 9728 - Protected Resource Metadata format
    const metadata: { resource: string; authorization_servers: string[]; scopes_supported?: string[] } = {
      resource: this.config.resourceUri,
      authorization_servers: this.config.authorizationServers,
    };

    // Add optional fields
    if (this.config.scopesSupported && this.config.scopesSupported.length > 0) {
      metadata.scopes_supported = this.config.scopesSupported;
    }

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
    if (process.env.OAUTH_DISCOVERY_PORT) {
      return parseInt(process.env.OAUTH_DISCOVERY_PORT);
    }
    if (process.env.MCP_SERVER_PORT) {
      return parseInt(process.env.MCP_SERVER_PORT);
    }
    if (process.env.PORT) {
      return parseInt(process.env.PORT);
    }
    return this.config.http?.port || 3005;
  }

  public async start() {
    this.logger.info('OAuthModule: start method called');
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
      const httpTransport = (this.server as any)._httpTransport;
      if (httpTransport) {
        this.registerDiscoveryHandlers(httpTransport);
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

    // Set default audience to resourceUri if not provided
    if (!config.audience) {
      config.audience = config.resourceUri;
    }

    this.config = config;

    return {
      module: OAuthModule,
      providers: [
        { provide: 'OAUTH_CONFIG', useValue: config }
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

      // If introspection endpoint is configured, use it
      if (this.config.tokenIntrospectionEndpoint) {
        return await this.introspectToken(token);
      }

      // For JWT tokens without introspection, decode and validate
      // Note: In production, you should validate JWT signature
      const payload = this.decodeToken(token);

      if (!payload) {
        return { valid: false, error: 'Invalid token format' };
      }

      // Validate audience (RFC 8707 - critical for security)
      if (payload.aud) {
        const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
        if (!audiences.includes(this.config.audience!)) {
          return {
            valid: false,
            error: `Token audience mismatch. Expected: ${this.config.audience}, Got: ${audiences.join(', ')}`,
          };
        }
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
   * Introspect token using RFC 7662
   * @private
   */
  private static async introspectToken(token: string): Promise<{
    valid: boolean;
    payload?: Record<string, unknown>;
    error?: string;
  }> {
    if (!this.config?.tokenIntrospectionEndpoint) {
      return { valid: false, error: 'Introspection endpoint not configured' };
    }

    try {
      const auth = Buffer.from(
        `${this.config.tokenIntrospectionClientId}:${this.config.tokenIntrospectionClientSecret}`
      ).toString('base64');

      const response = await fetch(this.config.tokenIntrospectionEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${auth}`,
        },
        body: new URLSearchParams({
          token: token,
          token_type_hint: 'access_token',
        }),
      });

      if (!response.ok) {
        return {
          valid: false,
          error: `Introspection failed: ${response.status} ${response.statusText}`,
        };
      }

      const result = await response.json() as { active?: boolean; aud?: string | string[] };

      if (!result.active) {
        return { valid: false, error: 'Token is not active' };
      }

      // Validate audience from introspection response
      if (result.aud) {
        const audiences = Array.isArray(result.aud) ? result.aud : [result.aud];
        if (!audiences.includes(this.config.audience!)) {
          return {
            valid: false,
            error: `Token audience mismatch. Expected: ${this.config.audience}`,
          };
        }
      }

      return { valid: true, payload: result as Record<string, unknown> };

    } catch (error: unknown) {
      return { valid: false, error: `Introspection error: ${error instanceof Error ? error.message : String(error)}` };
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


