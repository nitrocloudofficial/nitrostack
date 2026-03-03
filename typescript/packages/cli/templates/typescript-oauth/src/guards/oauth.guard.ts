import { Guard, ExecutionContext, OAuthModule, OAuthTokenPayload } from '@nitrostack/core';

/**
 * OAuth Guard
 * 
 * Validates OAuth 2.1 access tokens according to MCP specification.
 * 
 * Performs:
 * - Token validation (introspection or JWT validation)
 * - Audience binding (RFC 8707) - CRITICAL for security
 * - Scope validation
 * - Expiration checking
 * 
 * Compatible with:
 * - OpenAI Apps SDK
 * - Any RFC-compliant OAuth 2.1 provider
 * 
 * Usage:
 * ```typescript
 * @Tool({
 *   name: 'protected_resource',
 *   description: 'A protected tool'
 * })
 * @UseGuards(OAuthGuard)
 * async protectedTool() {
 *   // Only accessible with valid OAuth token
 * }
 * ```
 */
export class OAuthGuard implements Guard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Extract token from metadata (sent by Studio or OAuth client)
    const authHeader = context.metadata?.authorization as string;
    const metaToken = context.metadata?._oauth || context.metadata?.token;
    
    let token: string | null = null;
    
    // Try Bearer token format first
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (metaToken) {
      token = metaToken as string;
    }
    
    if (!token) {
      throw new Error(
        'OAuth token required. Please authenticate in Studio (Auth → OAuth 2.1 tab) ' +
        'or provide token in Authorization header: "Bearer <token>"'
      );
    }
    
    // Validate token using OAuthModule
    const result = await OAuthModule.validateToken(token);
    
    if (!result.valid) {
      throw new Error(`OAuth token validation failed: ${result.error}`);
    }
    
    // Extract scopes from token payload
    const payload = result.payload as OAuthTokenPayload;
    const scopes = this.extractScopes(payload);
    
    // Populate context.auth with OAuth token information
    context.auth = {
      subject: payload.sub,
      scopes: scopes,
      clientId: payload.client_id,
      tokenPayload: payload,
    };
    
    return true;
  }
  
  /**
   * Extract scopes from token payload
   * Handles both "scope" (space-separated string) and "scopes" (array) formats
   */
  private extractScopes(payload: OAuthTokenPayload): string[] {
    if (payload.scopes && Array.isArray(payload.scopes)) {
      return payload.scopes;
    }
    
    if (payload.scope && typeof payload.scope === 'string') {
      return payload.scope.split(' ').filter(s => s.length > 0);
    }
    
    return [];
  }
}

/**
 * Scope Guard
 * 
 * Validates that the OAuth token has required scopes.
 * Use this in addition to OAuthGuard for fine-grained access control.
 * 
 * Usage:
 * ```typescript
 * @Tool({ name: 'admin_action' })
 * @UseGuards(OAuthGuard, createScopeGuard(['admin', 'write']))
 * async adminAction() {
 *   // Requires OAuth token with 'admin' AND 'write' scopes
 * }
 * ```
 */
export function createScopeGuard(requiredScopes: string[]): new () => Guard {
  return class ScopeGuard implements Guard {
    async canActivate(context: ExecutionContext): Promise<boolean> {
      const userScopes = context.auth?.scopes || [];
      
      const missingScopes = requiredScopes.filter(
        scope => !userScopes.includes(scope)
      );
      
      if (missingScopes.length > 0) {
        throw new Error(
          `Insufficient scope. Required: ${requiredScopes.join(', ')}. ` +
          `Missing: ${missingScopes.join(', ')}`
        );
      }
      
      return true;
    }
  };
}

