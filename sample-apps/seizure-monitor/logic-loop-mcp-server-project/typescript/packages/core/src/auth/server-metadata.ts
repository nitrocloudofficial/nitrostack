import { ProtectedResourceMetadata } from './types.js';

/**
 * Protected Resource Metadata (RFC 9728)
 * 
 * MCP servers MUST implement this to advertise their authorization servers
 * to MCP clients. This enables automatic discovery of auth configuration.
 */

/**
 * Create protected resource metadata document
 * 
 * @param resourceUri - The URI of this MCP server
 * @param authorizationServers - Array of authorization server issuer URLs
 * @param scopesSupported - Optional: scopes this resource supports
 */
export function createProtectedResourceMetadata(
  resourceUri: string,
  authorizationServers: string[],
  scopesSupported?: string[]
): ProtectedResourceMetadata {
  return {
    resource: resourceUri,
    authorization_servers: authorizationServers,
    scopes_supported: scopesSupported,
    bearer_methods_supported: ['header'], // MCP uses Bearer tokens in headers
  };
}

/**
 * Get well-known URI for protected resource metadata
 * Per RFC 9728, can be at:
 * 1. Resource path: /.well-known/oauth-protected-resource{path}
 * 2. Root: /.well-known/oauth-protected-resource
 */
export function getWellKnownMetadataUris(resourceUrl: URL): string[] {
  const urls: string[] = [];
  
  // Method 1: At the path of the resource
  if (resourceUrl.pathname && resourceUrl.pathname !== '/') {
    const pathUri = new URL('/.well-known/oauth-protected-resource' + resourceUrl.pathname, resourceUrl.origin);
    urls.push(pathUri.toString());
  }
  
  // Method 2: At the root
  const rootUri = new URL('/.well-known/oauth-protected-resource', resourceUrl.origin);
  urls.push(rootUri.toString());
  
  return urls;
}

/**
 * Generate WWW-Authenticate header value for 401 responses
 * Per RFC 6750 and MCP spec
 * 
 * @param resourceMetadataUrl - URL to protected resource metadata
 * @param scope - Optional: required scopes for this request
 * @param error - Optional: error code (invalid_token, insufficient_scope, etc.)
 * @param errorDescription - Optional: human-readable error description
 */
export function generateWWWAuthenticateHeader(options: {
  resourceMetadataUrl?: string;
  scope?: string;
  error?: string;
  errorDescription?: string;
  realm?: string;
}): string {
  const parts: string[] = ['Bearer'];
  
  if (options.realm) {
    parts.push(`realm="${options.realm}"`);
  }
  
  if (options.scope) {
    parts.push(`scope="${options.scope}"`);
  }
  
  if (options.resourceMetadataUrl) {
    parts.push(`resource_metadata="${options.resourceMetadataUrl}"`);
  }
  
  if (options.error) {
    parts.push(`error="${options.error}"`);
  }
  
  if (options.errorDescription) {
    parts.push(`error_description="${options.errorDescription}"`);
  }
  
  return parts.join(', ');
}

/**
 * Parse WWW-Authenticate header
 * Extracts Bearer auth challenge parameters
 */
export function parseWWWAuthenticateHeader(headerValue: string): {
  scheme: string;
  realm?: string;
  scope?: string;
  resourceMetadata?: string;
  error?: string;
  errorDescription?: string;
} | null {
  if (!headerValue) return null;
  
  // Parse Bearer scheme
  const bearerMatch = headerValue.match(/Bearer\s+(.+)/i);
  if (!bearerMatch) return null;
  
  const params = bearerMatch[1];
  const result: {
    scheme: string;
    realm?: string;
    scope?: string;
    resourceMetadata?: string;
    error?: string;
    errorDescription?: string;
  } = { scheme: 'Bearer' };
  
  // Parse key="value" pairs
  const paramRegex = /(\w+)="([^"]+)"/g;
  let match;
  
  while ((match = paramRegex.exec(params)) !== null) {
    const [, key, value] = match;
    switch (key) {
      case 'realm':
        result.realm = value;
        break;
      case 'scope':
        result.scope = value;
        break;
      case 'resource_metadata':
        result.resourceMetadata = value;
        break;
      case 'error':
        result.error = value;
        break;
      case 'error_description':
        result.errorDescription = value;
        break;
    }
  }
  
  return result;
}

