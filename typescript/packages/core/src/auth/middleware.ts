import { Request, Response, NextFunction, RequestHandler } from 'express';
import { McpAuthConfig, AuthContext } from './types.js';
import { validateToken, extractBearerToken, validateScopes } from './token-validation.js';
import { generateWWWAuthenticateHeader } from './server-metadata.js';

/**
 * Auth Middleware for Express
 * 
 * Protects MCP server routes with OAuth 2.1 Bearer token authentication
 */

// Extend Express Request to include auth context
declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

/**
 * Create authentication middleware
 * 
 * @param config - Auth configuration
 * @returns Express middleware
 * 
 * @example
 * ```typescript
 * const authMiddleware = createAuthMiddleware({
 *   resourceUri: 'https://mcp.example.com',
 *   authorizationServers: ['https://auth.example.com'],
 *   tokenIntrospectionEndpoint: 'https://auth.example.com/oauth/introspect',
 *   tokenIntrospectionClientId: 'mcp-server',
 *   tokenIntrospectionClientSecret: process.env.INTROSPECTION_SECRET,
 *   audience: 'https://mcp.example.com',
 *   scopesSupported: ['mcp:read', 'mcp:write', 'mcp:admin']
 * });
 * 
 * app.use('/mcp', authMiddleware);
 * ```
 */
export function createAuthMiddleware(config: McpAuthConfig): RequestHandler {
  // Enforce HTTPS in production
  if (config.requireHttps !== false && process.env.NODE_ENV === 'production') {
    validateHttpsConfig();
  }

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 1. Extract Bearer token from Authorization header
      const authHeader = req.headers.authorization;
      const token = extractBearerToken(authHeader);

      if (!token) {
        // No token provided - return 401 with WWW-Authenticate challenge
        return sendUnauthorized(res, config, 'No Bearer token provided');
      }

      // 2. Validate token
      const validationResult = await validateToken(token, config);

      if (!validationResult.valid || !validationResult.introspection) {
        // Invalid token - return 401
        return sendUnauthorized(
          res,
          config,
          validationResult.error || 'Invalid token',
          'invalid_token'
        );
      }

      const introspection = validationResult.introspection;

      // 3. Attach auth context to request
      req.auth = {
        authenticated: true,
        tokenInfo: introspection,
        scopes: introspection.scope ? introspection.scope.split(' ') : [],
        clientId: introspection.client_id,
        subject: introspection.sub,
      };

      // 4. Continue to next middleware
      next();
    } catch (error: unknown) {
      // Server error during validation
      res.status(500).json({
        error: 'server_error',
        error_description: 'Token validation failed',
      });
    }
  };
}

/**
 * Require specific scopes
 * 
 * @param requiredScopes - Scopes required to access this route
 * @returns Express middleware
 * 
 * @example
 * ```typescript
 * app.post('/mcp/tools/execute',
 *   authMiddleware,
 *   requireScopes('mcp:write'),
 *   (req, res) => {
 *     // Handle tool execution
 *   }
 * );
 * ```
 */
export function requireScopes(...requiredScopes: string[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth || !req.auth.authenticated) {
      return res.status(401).json({
        error: 'unauthorized',
        error_description: 'Authentication required',
      });
    }

    // Check if token has all required scopes
    const hasScopes = validateScopes(req.auth.tokenInfo!, requiredScopes);

    if (!hasScopes) {
      // Insufficient scope - return 403 with step-up challenge
      return sendInsufficientScope(res, requiredScopes, req.auth.scopes);
    }

    next();
  };
}

/**
 * Optional authentication
 * 
 * Attempts to authenticate but allows request to proceed even without auth.
 * Useful for endpoints that have different behavior for authenticated users.
 * 
 * @param config - Auth configuration
 * @returns Express middleware
 */
export function optionalAuth(config: McpAuthConfig): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      const token = extractBearerToken(authHeader);

      if (!token) {
        // No token - proceed without auth
        req.auth = { authenticated: false, scopes: [] };
        return next();
      }

      const validationResult = await validateToken(token, config);

      if (validationResult.valid && validationResult.introspection) {
        req.auth = {
          authenticated: true,
          tokenInfo: validationResult.introspection,
          scopes: validationResult.introspection.scope
            ? validationResult.introspection.scope.split(' ')
            : [],
          clientId: validationResult.introspection.client_id,
          subject: validationResult.introspection.sub,
        };
      } else {
        req.auth = { authenticated: false, scopes: [] };
      }

      next();
    } catch (error) {
      // On error, proceed without auth
      req.auth = { authenticated: false, scopes: [] };
      next();
    }
  };
}

/**
 * Send 401 Unauthorized response with WWW-Authenticate header
 */
function sendUnauthorized(
  res: Response,
  config: McpAuthConfig,
  description: string,
  error?: string
): void {
  // Generate WWW-Authenticate header
  const wwwAuthenticate = generateWWWAuthenticateHeader({
    resourceMetadataUrl: getWellKnownMetadataUrl(config.resourceUri),
    scope: config.scopesSupported?.join(' '),
    error,
    errorDescription: description,
  });

  res.status(401)
    .header('WWW-Authenticate', wwwAuthenticate)
    .json({
      error: error || 'unauthorized',
      error_description: description,
    });
}

/**
 * Send 403 Forbidden response with insufficient_scope error
 * This triggers step-up authorization flow in clients
 */
function sendInsufficientScope(
  res: Response,
  requiredScopes: string[],
  currentScopes: string[]
): void {
  // Include both current and required scopes for step-up
  const allScopes = [...new Set([...currentScopes, ...requiredScopes])];

  const wwwAuthenticate = generateWWWAuthenticateHeader({
    error: 'insufficient_scope',
    scope: allScopes.join(' '),
    errorDescription: `Required scopes: ${requiredScopes.join(', ')}`,
  });

  res.status(403)
    .header('WWW-Authenticate', wwwAuthenticate)
    .json({
      error: 'insufficient_scope',
      error_description: `Required scopes: ${requiredScopes.join(', ')}`,
      required_scopes: requiredScopes,
      current_scopes: currentScopes,
    });
}

/**
 * Get well-known metadata URL for this resource
 */
function getWellKnownMetadataUrl(resourceUri: string): string {
  try {
    const url = new URL(resourceUri);
    return `${url.origin}/.well-known/oauth-protected-resource`;
  } catch {
    return '';
  }
}

/**
 * Validate HTTPS configuration
 */
function validateHttpsConfig(): void {
  // In production, should be running behind HTTPS
  // This is a warning, not a hard failure
  if (process.env.NODE_ENV === 'production') {
    console.warn(
      '⚠️  WARNING: OAuth 2.1 requires HTTPS in production. ' +
      'Ensure your server is behind a reverse proxy with TLS termination.'
    );
  }
}

/**
 * Scope-based access control decorator
 * 
 * @example
 * ```typescript
 * class ToolController {
 *   @RequireScopes('mcp:write', 'tools:execute')
 *   async executeTool(req: Request, res: Response) {
 *     // ...
 *   }
 * }
 * ```
 */
export function RequireScopes(...scopes: string[]) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (req: Request, res: Response, next?: NextFunction) {
      if (!req.auth || !req.auth.authenticated) {
        return res.status(401).json({
          error: 'unauthorized',
          error_description: 'Authentication required',
        });
      }

      const hasScopes = validateScopes(req.auth.tokenInfo!, scopes);
      if (!hasScopes) {
        return sendInsufficientScope(res, scopes, req.auth.scopes);
      }

      return originalMethod.apply(this, arguments);
    };

    return descriptor;
  };
}

/**
 * Check if request is authenticated
 */
export function isAuthenticated(req: Request): boolean {
  return req.auth?.authenticated === true;
}

/**
 * Check if request has specific scope
 */
export function hasScope(req: Request, scope: string): boolean {
  return req.auth?.scopes.includes(scope) === true;
}

/**
 * Check if request has any of the specified scopes
 */
export function hasAnyScope(req: Request, scopes: string[]): boolean {
  return scopes.some((scope) => hasScope(req, scope));
}

/**
 * Check if request has all of the specified scopes
 */
export function hasAllScopes(req: Request, scopes: string[]): boolean {
  return scopes.every((scope) => hasScope(req, scope));
}

