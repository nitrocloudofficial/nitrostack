/**
 * Authentication Types for NitroStack
 * Based on OAuth 2.1 and MCP Authorization Specification
 */

/**
 * OAuth 2.1 Token Response
 */
export interface TokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

/**
 * Token introspection result
 */
export interface TokenIntrospection {
  active: boolean;
  scope?: string;
  client_id?: string;
  username?: string;
  token_type?: string;
  exp?: number;
  iat?: number;
  nbf?: number;
  sub?: string;
  aud?: string | string[];
  iss?: string;
  jti?: string;
}

/**
 * Protected Resource Metadata (RFC 9728)
 */
export interface ProtectedResourceMetadata {
  resource: string;
  authorization_servers: string[];
  scopes_supported?: string[];
  bearer_methods_supported?: ('header' | 'body' | 'query')[];
  resource_signing_alg_values_supported?: string[];
  resource_encryption_alg_values_supported?: string[];
  resource_encryption_enc_values_supported?: string[];
}

/**
 * Authorization Server Metadata (RFC 8414)
 */
export interface AuthorizationServerMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri?: string;
  registration_endpoint?: string;
  scopes_supported?: string[];
  response_types_supported: string[];
  response_modes_supported?: string[];
  grant_types_supported?: string[];
  token_endpoint_auth_methods_supported?: string[];
  revocation_endpoint?: string;
  revocation_endpoint_auth_methods_supported?: string[];
  introspection_endpoint?: string;
  introspection_endpoint_auth_methods_supported?: string[];
  code_challenge_methods_supported: string[]; // PKCE required
  service_documentation?: string;
  ui_locales_supported?: string[];
}

/**
 * Dynamic Client Registration Request (RFC 7591)
 */
export interface ClientRegistrationRequest {
  redirect_uris: string[];
  token_endpoint_auth_method?: string;
  grant_types?: string[];
  response_types?: string[];
  client_name?: string;
  client_uri?: string;
  logo_uri?: string;
  scope?: string;
  contacts?: string[];
  tos_uri?: string;
  policy_uri?: string;
  jwks_uri?: string;
  software_id?: string;
  software_version?: string;
}

/**
 * Dynamic Client Registration Response
 */
export interface ClientRegistrationResponse {
  client_id: string;
  client_secret?: string;
  client_id_issued_at?: number;
  client_secret_expires_at?: number;
  redirect_uris: string[];
  token_endpoint_auth_method?: string;
  grant_types?: string[];
  response_types?: string[];
  client_name?: string;
  client_uri?: string;
  logo_uri?: string;
  scope?: string;
  contacts?: string[];
  tos_uri?: string;
  policy_uri?: string;
  jwks_uri?: string;
  software_id?: string;
  software_version?: string;
  registration_client_uri?: string;
  registration_access_token?: string;
}

/**
 * PKCE (Proof Key for Code Exchange) parameters
 */
export interface PKCEParams {
  code_verifier: string;
  code_challenge: string;
  code_challenge_method: 'S256' | 'plain';
}

/**
 * Authorization request parameters
 */
export interface AuthorizationRequest {
  response_type: 'code';
  client_id: string;
  redirect_uri: string;
  scope?: string;
  state: string;
  code_challenge: string;
  code_challenge_method: 'S256' | 'plain';
  resource?: string; // RFC 8707 - Token audience binding
}

/**
 * Token request parameters
 */
export interface TokenRequest {
  grant_type: 'authorization_code' | 'refresh_token' | 'client_credentials';
  code?: string;
  redirect_uri?: string;
  client_id: string;
  client_secret?: string;
  code_verifier?: string; // PKCE
  refresh_token?: string;
  resource?: string; // RFC 8707
  scope?: string;
}

/**
 * OAuth 2.1 Error Response
 */
export interface OAuth2Error {
  error: string;
  error_description?: string;
  error_uri?: string;
  state?: string;
}

/**
 * WWW-Authenticate Challenge (RFC 6750)
 */
export interface WWWAuthenticateChallenge {
  scheme: 'Bearer';
  realm?: string;
  scope?: string;
  error?: string;
  error_description?: string;
  resource_metadata?: string;
}

/**
 * Auth configuration for MCP Server
 */
export interface McpAuthConfig {
  // Protected resource config
  resourceUri: string;
  authorizationServers: string[];
  scopesSupported?: string[];
  
  // Token validation
  tokenIntrospectionEndpoint?: string;
  tokenIntrospectionClientId?: string;
  tokenIntrospectionClientSecret?: string;
  
  // Or JWT validation
  jwksUri?: string;
  audience?: string;
  issuer?: string;
  
  // Advanced
  requireHttps?: boolean;
  tokenCacheSeconds?: number;
}

/**
 * Auth configuration for MCP Client
 */
export interface McpAuthClientConfig {
  // Client credentials
  clientId?: string;
  clientSecret?: string;
  
  // Authorization server
  authorizationServerUrl: string;
  
  // Optional: Pre-registered redirect URI
  redirectUri?: string;
  
  // Scopes
  scopes?: string[];
  
  // Resource indicator (RFC 8707)
  resource?: string;
  
  // Auto-register client if not provided
  autoRegister?: boolean;
  registrationMetadata?: Partial<ClientRegistrationRequest>;
}

/**
 * Stored token information
 */
export interface StoredToken {
  access_token: string;
  token_type: 'Bearer';
  expires_at: number;
  refresh_token?: string;
  scope?: string;
  resource?: string;
}

/**
 * Auth context passed to handlers
 */
export interface AuthContext {
  authenticated: boolean;
  tokenInfo?: TokenIntrospection;
  scopes: string[];
  clientId?: string;
  subject?: string;
}

