import type { Guard } from './guard.interface.js';
import type { ExecutionContext } from '../types.js';
import { OAuthModule } from '../oauth-module.js';

/**
 * OAuth Token Payload Interface
 * 
 * Standard OAuth 2.1 / JWT claims (RFC 9068)
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

/**
 * Built-in Standard OAuth 2.1 Guard
 */
export class OAuthGuard implements Guard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. If request is already authenticated (via HTTP Bearer middleware or SDK metadata extraction), pass immediately
    if (context.auth?.authenticated || context.auth?.subject) {
      return true;
    }

    // 2. Extract token from metadata or Authorization header
    const authHeader = (context.metadata?.authorization || context.metadata?.Authorization) as string | undefined;
    const metaToken = (context.metadata?._oauth || context.metadata?.token || context.metadata?.jwtToken) as string | undefined;
    const inputMetaToken = (context as any).input?._meta?.jwtToken ||
      (context as any).input?._meta?.token ||
      (context as any).params?._meta?.jwtToken ||
      (context as any).params?._meta?.token;

    let token: string | null = null;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (authHeader) {
      token = authHeader;
    } else if (metaToken) {
      token = metaToken;
    } else if (inputMetaToken) {
      token = inputMetaToken;
    }

    // 3. If OAuth is not enforced (dev mode), allow through
    if (!OAuthModule.isAuthRequired()) {
      if (token) {
        const result = await OAuthModule.validateToken(token);
        if (result.valid && result.payload) {
          const payload = result.payload as unknown as OAuthTokenPayload;
          context.auth = {
            authenticated: true,
            subject: payload.sub,
            scopes: this.extractScopes(payload),
            clientId: payload.client_id,
            tokenPayload: payload,
          };
        }
      }
      return true;
    }

    if (!token) {
      throw new Error(
        'OAuth token required. Please authenticate or provide a valid Bearer token in Authorization header: "Bearer <token>"'
      );
    }

    const result = await OAuthModule.validateToken(token);
    if (!result.valid || !result.payload) {
      throw new Error(`OAuth token validation failed: ${result.error || 'Invalid token'}`);
    }

    const payload = result.payload as unknown as OAuthTokenPayload;
    context.auth = {
      authenticated: true,
      subject: payload.sub,
      scopes: this.extractScopes(payload),
      clientId: payload.client_id,
      tokenPayload: payload,
    };

    return true;
  }

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
 * Scope Guard Factory
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


