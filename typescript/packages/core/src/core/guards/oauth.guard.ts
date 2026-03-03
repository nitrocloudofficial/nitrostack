/**
 * OAuth Token Payload Interface
 * 
 * Standard OAuth 2.1 / JWT claims (RFC 9068)
 * 
 * This is exported from the SDK for type definitions.
 * The actual OAuthGuard implementation should be in your project's guards folder.
 * 
 * @example
 * See templates/typescript-oauth/src/guards/oauth.guard.ts for implementation
 */
export interface OAuthTokenPayload {
  /** Subject - typically the user ID */
  sub: string;
  
  /** Issuer - the authorization server that issued the token */
  iss?: string;
  
  /** Audience - who the token is intended for (RFC 8707) */
  aud?: string | string[];
  
  /** Expiration time (Unix timestamp) */
  exp?: number;
  
  /** Issued at time (Unix timestamp) */
  iat?: number;
  
  /** Not before time (Unix timestamp) */
  nbf?: number;
  
  /** JWT ID - unique identifier for the token */
  jti?: string;
  
  /** Scopes - permissions granted to the token */
  scope?: string; // Space-separated string
  scopes?: string[]; // Or array format
  
  /** Client ID that requested the token */
  client_id?: string;
  
  /** Custom claims */
  [key: string]: unknown;
}


