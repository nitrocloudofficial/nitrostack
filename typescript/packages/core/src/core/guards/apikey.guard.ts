/**
 * API Key Guard Interface
 * 
 * This is exported from the SDK for type definitions.
 * The actual ApiKeyGuard implementation should be in your project's guards folder.
 * 
 * @example
 * See templates/typescript-auth-api-key/src/guards/apikey.guard.ts for implementation
 */

export interface ApiKeyMetadata {
  /** The API key value (raw) */
  key: string;
  
  /** Optional: API key name/identifier */
  name?: string;
  
  /** Optional: Key prefix (e.g., 'sk' for secret key, 'pk' for public key) */
  prefix?: string;
  
  /** Optional: Scopes/permissions */
  scopes?: string[];
  
  /** Optional: Additional metadata */
  [key: string]: unknown;
}


