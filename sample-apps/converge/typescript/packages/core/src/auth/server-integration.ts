import { Express, Request, Response } from 'express';
import { McpAuthConfig } from './types.js';
import { createProtectedResourceMetadata } from './server-metadata.js';
import { createAuthMiddleware, requireScopes } from './middleware.js';

// Re-export for convenience
export type { McpAuthConfig } from './types.js';

/**
 * Server Integration Utilities
 * 
 * Easy integration of OAuth 2.1 auth into MCP servers
 */

/**
 * Configure authentication for MCP server
 * 
 * This adds:
 * 1. Protected Resource Metadata endpoint
 * 2. Authentication middleware to specified routes
 * 
 * @param app - Express application
 * @param config - Auth configuration
 * @param protectRoutes - Routes to protect with auth (default: all /mcp routes)
 * 
 * @example
 * ```typescript
 * const app = express();
 * 
 * configureServerAuth(app, {
 *   resourceUri: 'https://mcp.example.com',
 *   authorizationServers: ['https://auth.example.com'],
 *   tokenIntrospectionEndpoint: 'https://auth.example.com/oauth/introspect',
 *   tokenIntrospectionClientId: 'mcp-server',
 *   tokenIntrospectionClientSecret: process.env.INTROSPECTION_SECRET,
 *   audience: 'https://mcp.example.com',
 *   scopesSupported: ['mcp:read', 'mcp:write']
 * }, {
 *   protectRoutes: ['/mcp/*']
 * });
 * ```
 */
export function configureServerAuth(
  app: Express,
  config: McpAuthConfig,
  options?: {
    protectRoutes?: string[];
    metadataPath?: string;
  }
): void {
  const metadataPath = options?.metadataPath || '/.well-known/oauth-protected-resource';
  const protectRoutes = options?.protectRoutes || ['/mcp/*'];

  // 1. Add Protected Resource Metadata endpoint
  app.get(metadataPath, (req: Request, res: Response) => {
    const metadata = createProtectedResourceMetadata(
      config.resourceUri,
      config.authorizationServers,
      config.scopesSupported
    );

    res.json(metadata);
  });

  // 2. Apply auth middleware to protected routes
  const authMiddleware = createAuthMiddleware(config);

  for (const route of protectRoutes) {
    app.use(route, authMiddleware);
  }

  console.log(`🔐 OAuth 2.1 authentication configured for ${config.resourceUri}`);
  console.log(`   Authorization servers: ${config.authorizationServers.join(', ')}`);
  console.log(`   Protected routes: ${protectRoutes.join(', ')}`);
  console.log(`   Metadata endpoint: ${metadataPath}`);
}

/**
 * Scope-based route protection helper
 * 
 * @example
 * ```typescript
 * const scopes = createScopeGuards(['mcp:read', 'mcp:write', 'mcp:admin']);
 * 
 * app.get('/mcp/tools', scopes.read, (req, res) => {
 *   // List tools - requires mcp:read
 * });
 * 
 * app.post('/mcp/tools/execute', scopes.write, (req, res) => {
 *   // Execute tool - requires mcp:write
 * });
 * 
 * app.delete('/mcp/resources', scopes.admin, (req, res) => {
 *   // Delete resource - requires mcp:admin
 * });
 * ```
 */
export function createScopeGuards(scopeConfig: {
  read?: string[];
  write?: string[];
  admin?: string[];
  [key: string]: string[] | undefined;
}): Record<string, ReturnType<typeof requireScopes>> {
  const guards: Record<string, ReturnType<typeof requireScopes>> = {};

  for (const [name, scopes] of Object.entries(scopeConfig)) {
    if (scopes && scopes.length > 0) {
      guards[name] = requireScopes(...scopes);
    }
  }

  return guards;
}

/**
 * Create standard MCP scope configuration
 * 
 * Returns scope guards for common MCP operations:
 * - read: List tools, resources, prompts
 * - execute: Execute tools, get prompts
 * - write: Modify resources
 * - admin: Server configuration
 * 
 * @param scopePrefix - Scope prefix (default: 'mcp')
 */
export function createMCPScopeGuards(scopePrefix: string = 'mcp') {
  return createScopeGuards({
    read: [`${scopePrefix}:read`],
    execute: [`${scopePrefix}:read`, `${scopePrefix}:execute`],
    write: [`${scopePrefix}:read`, `${scopePrefix}:write`],
    admin: [`${scopePrefix}:admin`],
  });
}

/**
 * Generate suggested scopes for MCP server
 * 
 * Returns standard scope definitions for MCP operations
 */
export function getStandardMCPScopes(scopePrefix: string = 'mcp'): {
  scopes: string[];
  descriptions: Record<string, string>;
} {
  const scopes = [
    `${scopePrefix}:read`,
    `${scopePrefix}:execute`,
    `${scopePrefix}:write`,
    `${scopePrefix}:admin`,
  ];

  const descriptions = {
    [`${scopePrefix}:read`]: 'Read access to tools, resources, and prompts',
    [`${scopePrefix}:execute`]: 'Execute tools and get prompts',
    [`${scopePrefix}:write`]: 'Modify resources and server state',
    [`${scopePrefix}:admin`]: 'Administrative access to server configuration',
  };

  return { scopes, descriptions };
}

/**
 * Helper to validate auth configuration
 */
export function validateAuthConfig(config: McpAuthConfig): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!config.resourceUri) {
    errors.push('resourceUri is required');
  }

  if (!config.authorizationServers || config.authorizationServers.length === 0) {
    errors.push('At least one authorization server is required');
  }

  // Token validation method
  const hasIntrospection = !!config.tokenIntrospectionEndpoint;
  const hasJWT = !!config.jwksUri;

  if (!hasIntrospection && !hasJWT) {
    errors.push('Either tokenIntrospectionEndpoint or jwksUri must be configured');
  }

  // Introspection credentials
  if (hasIntrospection) {
    if (!config.tokenIntrospectionClientId) {
      warnings.push('tokenIntrospectionClientId not set - introspection may fail');
    }
    if (!config.tokenIntrospectionClientSecret) {
      warnings.push('tokenIntrospectionClientSecret not set - introspection may fail');
    }
  }

  // JWT validation
  if (hasJWT) {
    if (!config.audience) {
      errors.push('audience is required for JWT validation (prevents confused deputy attacks)');
    }
    if (!config.issuer) {
      warnings.push('issuer not set - JWT validation may be less strict');
    }
  }

  // Audience (critical for security)
  if (!config.audience) {
    warnings.push(
      'audience not set - tokens will not be validated for this resource. ' +
      'This is a security risk (confused deputy attacks).'
    );
  }

  // HTTPS
  if (config.requireHttps !== false && process.env.NODE_ENV === 'production') {
    try {
      const url = new URL(config.resourceUri);
      if (url.protocol !== 'https:') {
        errors.push('resourceUri must use HTTPS in production');
      }
    } catch {
      errors.push('resourceUri is not a valid URL');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

