import { createHash } from 'crypto';
import { TokenIntrospection, McpAuthConfig } from './types.js';

/**
 * Token Validation Utilities
 * 
 * Validates Bearer tokens using either:
 * 1. Token Introspection (RFC 7662)
 * 2. JWT validation with JWKS (RFC 7517, RFC 7519)
 * 
 * Note: Uses dynamic import for 'jose' to avoid ES module issues
 */

// Lazy-load jose to avoid ES module import issues
let jose: typeof import('jose') | null = null;
async function getJose() {
  if (!jose) {
    jose = await import('jose');
  }
  return jose;
}

// Cache of JWKS fetchers to prevent repeated network creation
const jwksFetchers = new Map<string, ReturnType<typeof import('jose').createRemoteJWKSet>>();

interface TokenValidationResult {
  valid: boolean;
  introspection?: TokenIntrospection;
  error?: string;
}

/**
 * In-memory cache for token introspection results
 * Reduces load on authorization server
 * Keyed by SHA-256 hash of token to avoid storing raw bearer tokens in memory
 */
const MAX_CACHE_SIZE = 1000;
const tokenCache = new Map<string, { result: TokenIntrospection; expiresAt: number }>();

function hashTokenKey(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Validate a Bearer token
 * 
 * @param token - The access token to validate
 * @param config - Auth configuration
 * @returns Validation result with token introspection data
 */
export async function validateToken(
  token: string,
  config: McpAuthConfig
): Promise<TokenValidationResult> {
  // Check cache first
  const cached = getFromCache(token);
  if (cached) {
    return { valid: true, introspection: cached };
  }

  try {
    let introspection: TokenIntrospection;

    if (config.tokenIntrospectionEndpoint) {
      // Method 1: Token Introspection (RFC 7662)
      introspection = await introspectToken(token, config);
    } else if (config.jwksUri) {
      // Method 2: JWT validation with JWKS
      introspection = await validateJWT(token, config);
    } else {
      return {
        valid: false,
        error: 'No token validation method configured. Set tokenIntrospectionEndpoint or jwksUri.',
      };
    }

    if (!introspection.active) {
      return { valid: false, error: 'Token is not active' };
    }

    // Validate audience (CRITICAL for security)
    if (!validateAudience(introspection, config.audience)) {
      return {
        valid: false,
        error: 'Token audience mismatch. Token not intended for this resource.',
      };
    }

    // Cache the result (bounded TTL: default 60s max, and no longer than token exp)
    const configuredTtl = config.tokenCacheSeconds !== undefined ? Math.min(config.tokenCacheSeconds, 60) : 60;
    let effectiveTtl = configuredTtl;
    if (introspection.exp) {
      const remainingSeconds = introspection.exp - Math.floor(Date.now() / 1000);
      if (remainingSeconds > 0) {
        effectiveTtl = Math.min(effectiveTtl, remainingSeconds);
      }
    }
    if (effectiveTtl > 0) {
      cacheToken(token, introspection, effectiveTtl);
    }

    return { valid: true, introspection };
  } catch (error: unknown) {
    return { valid: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Introspect token using OAuth 2.0 Token Introspection (RFC 7662)
 * 
 * @internal - Exported for testing
 */
export async function introspectToken(
  token: string,
  config: McpAuthConfig
): Promise<TokenIntrospection> {
  if (!config.tokenIntrospectionEndpoint) {
    throw new Error('Token introspection endpoint not configured');
  }

  // Prepare request with client authentication
  const params = new URLSearchParams();
  params.append('token', token);
  params.append('token_type_hint', 'access_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Accept': 'application/json',
  };

  // Client authentication (if configured)
  if (config.tokenIntrospectionClientId && config.tokenIntrospectionClientSecret) {
    const credentials = Buffer.from(
      `${config.tokenIntrospectionClientId}:${config.tokenIntrospectionClientSecret}`
    ).toString('base64');
    headers['Authorization'] = `Basic ${credentials}`;
  }

  const response = await fetch(config.tokenIntrospectionEndpoint, {
    method: 'POST',
    headers,
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`Token introspection failed: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  if (!result || typeof result !== 'object') {
    throw new Error('Invalid introspection response format');
  }
  return result as TokenIntrospection;
}

/**
 * Validate JWT using JWKS
 * 
 * @internal - Exported for testing
 */
export async function validateJWT(
  token: string,
  config: McpAuthConfig
): Promise<TokenIntrospection> {
  if (!config.jwksUri) {
    throw new Error('JWKS URI not configured');
  }

  // Fetch JWKS (or retrieve from cache)
  const joseLib = await getJose();
  let JWKS = jwksFetchers.get(config.jwksUri);
  if (!JWKS) {
    JWKS = joseLib.createRemoteJWKSet(new URL(config.jwksUri));
    jwksFetchers.set(config.jwksUri, JWKS);
  }

  // Support issuers with or without trailing slashes
  let issuers: string[] | undefined;
  if (config.issuer) {
    const rawIss = config.issuer.replace(/\/+$/, '');
    issuers = [rawIss, `${rawIss}/`];
  }

  // Verify JWT
  const { payload } = await joseLib.jwtVerify(token, JWKS, {
    issuer: issuers || config.issuer,
    audience: config.audience,
    clockTolerance: 60,
  });

  // Convert JWT payload to TokenIntrospection format
  const introspection: TokenIntrospection = {
    active: true,
    scope: typeof payload.scope === 'string' ? payload.scope : undefined,
    client_id: typeof payload.client_id === 'string' ? payload.client_id : payload.azp as string,
    username: typeof payload.username === 'string' ? payload.username : undefined,
    token_type: 'Bearer',
    exp: payload.exp,
    iat: payload.iat,
    nbf: payload.nbf,
    sub: payload.sub,
    aud: Array.isArray(payload.aud) ? payload.aud : payload.aud ? [payload.aud as string] : undefined,
    iss: payload.iss,
    jti: typeof payload.jti === 'string' ? payload.jti : undefined,
  };

  return introspection;
}

/**
 * Validate token audience (RFC 8707)
 * 
 * CRITICAL: This prevents confused deputy attacks
 * Token MUST be issued specifically for this resource
 * 
 * @param introspection - Token introspection result
 * @param expectedAudience - Expected audience value(s)
 * @returns true if audience is valid
 */
export function validateAudience(
  introspection: TokenIntrospection,
  expectedAudience?: string | string[]
): boolean {
  if (!expectedAudience) {
    // If no audience expected, skip validation
    // (Not recommended for production)
    return true;
  }

  const expected = Array.isArray(expectedAudience) ? expectedAudience : [expectedAudience];
  const tokenAud = Array.isArray(introspection.aud)
    ? introspection.aud
    : introspection.aud
      ? [introspection.aud]
      : [];

  // Token audience must include at least one expected audience
  return expected.some((aud) => tokenAud.includes(aud));
}

/**
 * Validate scopes
 * 
 * @param introspection - Token introspection result
 * @param requiredScopes - Scopes required for the operation
 * @returns true if token has all required scopes
 */
export function validateScopes(
  introspection: TokenIntrospection,
  requiredScopes: string[]
): boolean {
  if (!requiredScopes || requiredScopes.length === 0) {
    return true;
  }

  if (!introspection.scope) {
    return false;
  }

  const tokenScopes = introspection.scope.split(' ');
  return requiredScopes.every((scope) => tokenScopes.includes(scope));
}

/**
 * Extract Bearer token from Authorization header or raw token string
 */
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader || typeof authHeader !== 'string') {
    return null;
  }

  const trimmed = authHeader.trim();
  const match = trimmed.match(/^Bearer\s+(.+)$/i);
  if (match) {
    return match[1].trim();
  }
  // If it's a raw JWT token directly provided
  if (trimmed.startsWith('ey') && trimmed.split('.').length === 3) {
    return trimmed;
  }
  return null;
}

/**
 * Check if token is expired
 */
export function isTokenExpired(introspection: TokenIntrospection): boolean {
  if (!introspection.exp) {
    return false; // No expiration set
  }

  const now = Math.floor(Date.now() / 1000);
  return introspection.exp < now;
}

/**
 * Cache token introspection result
 */
function cacheToken(token: string, result: TokenIntrospection, seconds: number): void {
  const key = hashTokenKey(token);
  const expiresAt = Date.now() + seconds * 1000;
  tokenCache.set(key, { result, expiresAt });

  // Clean up cache periodically and enforce bounded size
  if (tokenCache.size > MAX_CACHE_SIZE) {
    cleanupCache();
    if (tokenCache.size > MAX_CACHE_SIZE) {
      const keysToDelete = Array.from(tokenCache.keys()).slice(0, tokenCache.size - MAX_CACHE_SIZE);
      for (const k of keysToDelete) {
        tokenCache.delete(k);
      }
    }
  }
}

/**
 * Get token from cache if valid
 */
function getFromCache(token: string): TokenIntrospection | null {
  const key = hashTokenKey(token);
  const cached = tokenCache.get(key);
  if (!cached) {
    return null;
  }

  if (Date.now() > cached.expiresAt) {
    tokenCache.delete(key);
    return null;
  }

  return cached.result;
}

/**
 * Remove expired entries from cache
 */
function cleanupCache(): void {
  const now = Date.now();
  for (const [key, cached] of tokenCache.entries()) {
    if (now > cached.expiresAt) {
      tokenCache.delete(key);
    }
  }
}

/**
 * Clear token cache (useful for testing)
 */
export function clearTokenCache(): void {
  tokenCache.clear();
}

