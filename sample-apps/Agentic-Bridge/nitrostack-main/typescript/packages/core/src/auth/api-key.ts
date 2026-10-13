import crypto from 'crypto';
import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * API Key Authentication
 * 
 * Simple authentication for basic scenarios.
 * Perfect for service-to-service communication or development.
 */

export interface APIKeyConfig {
  /**
   * Array of valid API keys
   * Can be plain strings or hashed values
   */
  keys: string[];
  
  /**
   * If true, keys are stored as SHA-256 hashes (recommended)
   */
  hashed?: boolean;
  
  /**
   * Header name to extract API key from
   * Default: 'X-API-Key'
   */
  headerName?: string;
  
  /**
   * Also accept API key in query parameter?
   * Default: false (not recommended for production)
   */
  allowQueryParam?: boolean;
  
  /**
   * Query parameter name
   * Default: 'api_key'
   */
  queryParamName?: string;
  
  /**
   * Custom key validation
   */
  customValidation?: (key: string) => Promise<boolean> | boolean;
}

/**
 * Create API Key authentication middleware
 * 
 * @example
 * ```typescript
 * const server = createServer({...});
 * 
 * // Simple API key auth
 * server.app.use('/mcp', createAPIKeyAuth({
 *   keys: [
 *     process.env.API_KEY_1!,
 *     process.env.API_KEY_2!,
 *   ],
 *   headerName: 'X-API-Key',
 * }));
 * 
 * server.start();
 * 
 * // Client usage:
 * // curl -H "X-API-Key: your-api-key" https://mcp.example.com/mcp/tools
 * ```
 */
export function createAPIKeyAuth(config: APIKeyConfig): RequestHandler {
  const headerName = config.headerName || 'x-api-key';
  const queryParamName = config.queryParamName || 'api_key';
  
  // Validate config
  if (!config.keys || config.keys.length === 0) {
    throw new Error('API key auth requires at least one key');
  }
  
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 1. Extract API key from header or query
      let apiKey: string | undefined;
      
      // Try header first (recommended)
      apiKey = req.headers[headerName.toLowerCase()] as string;
      
      // Try query parameter (if allowed)
      if (!apiKey && config.allowQueryParam) {
        apiKey = req.query[queryParamName] as string;
      }
      
      if (!apiKey) {
        return res.status(401).json({
          error: 'unauthorized',
          message: `Missing API key. Provide in ${headerName} header${
            config.allowQueryParam ? ` or ${queryParamName} query parameter` : ''
          }`,
        });
      }
      
      // 2. Validate API key
      let isValid = false;
      
      if (config.hashed) {
        // Compare hashed values
        const hashedKey = hashAPIKey(apiKey);
        isValid = config.keys.includes(hashedKey);
      } else {
        // Direct comparison
        isValid = config.keys.includes(apiKey);
      }
      
      // 3. Custom validation
      if (config.customValidation) {
        const customValid = await config.customValidation(apiKey);
        isValid = isValid && customValid;
      }
      
      if (!isValid) {
        return res.status(401).json({
          error: 'unauthorized',
          message: 'Invalid API key',
        });
      }
      
      // 4. Attach to request
      req.auth = {
        authenticated: true,
        tokenInfo: {
          active: true,
        },
        scopes: ['*'], // API keys typically have full access
        clientId: `apikey_${hashAPIKey(apiKey).substring(0, 8)}`,
        subject: undefined,
      };
      
      next();
    } catch (error: unknown) {
      return res.status(500).json({
        error: 'server_error',
        message: 'API key validation failed',
      });
    }
  };
}

/**
 * Generate a secure API key
 * 
 * @example
 * ```typescript
 * const apiKey = generateAPIKey();
 * console.log('API Key:', apiKey);
 * // Save to .env: API_KEY_1=sk_...
 * ```
 */
export function generateAPIKey(prefix: string = 'sk'): string {
  const randomBytes = crypto.randomBytes(32);
  const key = randomBytes.toString('base64url');
  return `${prefix}_${key}`;
}

/**
 * Hash an API key (SHA-256)
 * Use this to store hashed keys instead of plain text
 * 
 * @example
 * ```typescript
 * const apiKey = 'sk_abc123...';
 * const hashed = hashAPIKey(apiKey);
 * // Store hashed in database
 * 
 * // In config:
 * createAPIKeyAuth({
 *   keys: [hashed],
 *   hashed: true,
 * });
 * ```
 */
export function hashAPIKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Validate API key format
 */
export function isValidAPIKeyFormat(key: string, prefix?: string): boolean {
  if (prefix) {
    return key.startsWith(`${prefix}_`) && key.length > prefix.length + 10;
  }
  return key.length >= 32;
}

/**
 * Create API key with metadata (advanced)
 */
export interface APIKeyWithMetadata {
  key: string;
  hashed: string;
  name: string;
  createdAt: Date;
  expiresAt?: Date;
  scopes?: string[];
}

export function generateAPIKeyWithMetadata(options: {
  name: string;
  prefix?: string;
  expiresIn?: number; // days
  scopes?: string[];
}): APIKeyWithMetadata {
  const key = generateAPIKey(options.prefix);
  const hashed = hashAPIKey(key);
  const createdAt = new Date();
  
  let expiresAt: Date | undefined;
  if (options.expiresIn) {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + options.expiresIn);
  }
  
  return {
    key,
    hashed,
    name: options.name,
    createdAt,
    expiresAt,
    scopes: options.scopes,
  };
}

/**
 * Validate API key with metadata (expiration, scopes)
 */
export function validateAPIKeyWithMetadata(
  key: string,
  metadata: Omit<APIKeyWithMetadata, 'key'>,
  requiredScopes?: string[]
): { valid: boolean; reason?: string } {
  // Check expiration
  if (metadata.expiresAt && new Date() > metadata.expiresAt) {
    return { valid: false, reason: 'API key has expired' };
  }
  
  // Check scopes
  if (requiredScopes && metadata.scopes) {
    const hasAllScopes = requiredScopes.every(scope => 
      metadata.scopes!.includes(scope) || metadata.scopes!.includes('*')
    );
    if (!hasAllScopes) {
      return { valid: false, reason: 'API key does not have required scopes' };
    }
  }
  
  return { valid: true };
}

