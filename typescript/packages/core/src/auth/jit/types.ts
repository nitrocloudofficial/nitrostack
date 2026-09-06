import { ClientIdMetadataDocument } from '../cimd.js';

/**
 * Configuration options for the Multi-Provider JIT Dynamic Discovery Bridge
 */
export interface JitBridgeConfig {
  /**
   * Whether the JIT bridge is enabled.
   * Defaults to true if management credentials or JIT env vars are detected.
   */
  enabled?: boolean;

  /**
   * Target Identity Provider adapter type.
   * - 'auto': Auto-detect based on auth server domain and available credentials.
   * - 'auth0': Auth0 Management API adapter.
   * - 'okta': Okta Dynamic Client Registration / Apps API adapter.
   * - 'keycloak': Keycloak OpenID Connect registration service.
   * - 'generic-dcr': Standard RFC 7591 Dynamic Client Registration (Zitadel, Hydra, etc.).
   * - 'passthrough': Passthrough for native CIMD authorization servers (Stytch, etc.).
   */
  provider?: 'auto' | 'auth0' | 'okta' | 'keycloak' | 'generic-dcr' | 'passthrough';

  /**
   * Custom path for the JIT authorization proxy endpoint.
   * Defaults to '/oauth/v2/authorize'.
   */
  bridgePath?: string;

  /**
   * Custom path for the JIT token proxy endpoint.
   * Defaults to '/oauth/v2/token'.
   */
  bridgeTokenPath?: string;

  /**
   * Auth0 specific management credentials
   */
  auth0?: {
    domain?: string;
    managementClientId?: string;
    managementClientSecret?: string;
    audience?: string;
  };

  /**
   * Okta specific credentials
   */
  okta?: {
    domain?: string;
    apiToken?: string;
  };

  /**
   * Generic RFC 7591 / Keycloak / Zitadel DCR configuration
   */
  genericDcr?: {
    registrationEndpoint?: string;
    initialAccessToken?: string;
  };

  /**
   * In-memory cache TTL for registered clients in milliseconds.
   * Default: 24 hours (86,400,000 ms).
   */
  cacheTtlMs?: number;

  /**
   * Allow loopback HTTP URLs for client metadata (dev mode). Default: true.
   */
  allowLoopback?: boolean;
}

/**
 * Result returned from a provider adapter after client registration
 */
export interface JitClientRegistrationResult {
  /**
   * The client ID in the upstream IdP (e.g. Auth0 client_id 'abc123xyz').
   * If not provided, defaults to the external client_id (CIMD URL).
   */
  idpClientId?: string;

  /**
   * Client secret if provisioned (for confidential clients)
   */
  clientSecret?: string;
}

/**
 * Context passed to JIT provider adapters during client registration
 */
export interface JitContext {
  /**
   * Primary upstream authorization server URL (e.g., 'https://dev-xxx.us.auth0.com')
   */
  authServerUrl: string;

  /**
   * The MCP server resource URI (RFC 8707 audience identifier)
   */
  resourceUri?: string;

  /**
   * Scopes supported by the MCP server (to attach to client grants)
   */
  scopesSupported?: string[];

  /**
   * Logger instance for debug/info logging
   */
  logger?: {
    info(message: string, meta?: any): void;
    warn(message: string, meta?: any): void;
    error(message: string, meta?: any): void;
    debug(message: string, meta?: any): void;
  };
}

/**
 * Pluggable Identity Provider Adapter interface
 */
export interface JitProviderAdapter {
  /**
   * Unique name of the provider adapter
   */
  readonly name: string;

  /**
   * Whether this adapter can handle the given authorization server and configuration
   */
  canHandle(authServerUrl: string, config: JitBridgeConfig): boolean;

  /**
   * Register or ensure a client exists in the upstream IdP with proper callback URIs and API grants
   */
  registerClient(
    clientDoc: ClientIdMetadataDocument,
    context: JitContext,
    config: JitBridgeConfig
  ): Promise<JitClientRegistrationResult | void>;

  /**
   * Ensure a dynamic callback URI (e.g. desktop loopback port) is allowed for an existing client
   */
  registerCallback?(clientId: string, redirectUri: string, context: JitContext, config: JitBridgeConfig): Promise<void>;
}
