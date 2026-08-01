import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { SecretValue, unwrapSecret } from './secure-secret.js';

/**
 * Simple JWT Authentication
 * 
 * For 70% of use cases where you don't need full OAuth 2.1 complexity.
 * Perfect for internal tools, APIs, and services that manage their own tokens.
 */

/**
 * Standard JWT claims that are commonly used
 */
export interface StandardJWTClaims {
  /** Subject - typically user ID */
  sub?: string;
  /** Audience - who the token is intended for */
  aud?: string | string[];
  /** Issuer - who created the token */
  iss?: string;
  /** Expiration time (unix timestamp) */
  exp?: number;
  /** Issued at (unix timestamp) */
  iat?: number;
  /** Not before (unix timestamp) */
  nbf?: number;
  /** JWT ID - unique identifier */
  jti?: string;
}

/**
 * Custom claims that can be added to JWT payload
 */
export interface CustomJWTClaims {
  /** User scopes/permissions */
  scopes?: string[];
  /** Space-separated scopes (OAuth style) */
  scope?: string;
  /** Client ID for machine-to-machine auth */
  client_id?: string;
  /** User's email */
  email?: string;
  /** User's name */
  name?: string;
  /** User roles */
  roles?: string[];
}

/**
 * Full JWT payload combining standard and custom claims
 */
export interface JWTPayload extends StandardJWTClaims, CustomJWTClaims {
  /** Allow additional custom claims */
  [key: string]: unknown;
}

export interface SimpleJWTConfig {
  /**
   * JWT secret for signing/verification (HS256)
   * 
   * **Recommended:** Use SecretValue.fromEnv() to load from environment
   * 
   * @example
   * ```typescript
   * // Recommended: Load from environment
   * import { SecretValue } from '@nitrostack/sdk/auth';
   * 
   * const config = {
   *   secret: SecretValue.fromEnv('JWT_SECRET'),
   *   audience: 'my-api',
   * };
   * ```
   */
  secret: SecretValue | string;
  
  /**
   * Expected audience (who the token is for)
   */
  audience?: string;
  
  /**
   * Expected issuer (who created the token)
   */
  issuer?: string;
  
  /**
   * Custom claims to validate
   */
  customValidation?: (payload: JWTPayload) => boolean;
  
  /**
   * Algorithm (default: HS256)
   */
  algorithm?: 'HS256' | 'HS384' | 'HS512';
}

/**
 * Create Simple JWT authentication middleware
 * 
 * @example
 * ```typescript
 * const server = createServer({...});
 * 
 * // Simple JWT auth (no OAuth complexity!)
 * server.app.use('/mcp', createSimpleJWTAuth({
 *   secret: process.env.JWT_SECRET!,
 *   audience: 'my-mcp-server',
 *   issuer: 'my-app',
 * }));
 * 
 * server.start();
 * ```
 */
export function createSimpleJWTAuth(config: SimpleJWTConfig): RequestHandler {
  const algorithm = config.algorithm || 'HS256';
  
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 1. Extract token from Authorization header
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'unauthorized',
          message: 'Missing or invalid Authorization header. Use: Authorization: Bearer <token>',
        });
      }
      
      const token = authHeader.substring(7); // Remove 'Bearer '
      
      // 2. Verify JWT
      const verifyOptions: jwt.VerifyOptions = {
        algorithms: [algorithm],
      };
      
      if (config.audience) {
        verifyOptions.audience = config.audience;
      }
      
      if (config.issuer) {
        verifyOptions.issuer = config.issuer;
      }
      
      const secretValue = unwrapSecret(config.secret);
      const payload = jwt.verify(token, secretValue, verifyOptions) as JWTPayload;
      
      // 3. Custom validation
      if (config.customValidation && !config.customValidation(payload)) {
        return res.status(403).json({
          error: 'forbidden',
          message: 'Token validation failed',
        });
      }
      
      // 4. Attach to request
      req.auth = {
        authenticated: true,
        tokenInfo: {
          active: true,
          sub: payload.sub,
          aud: typeof payload.aud === 'string' ? [payload.aud] : payload.aud,
          iss: payload.iss,
          exp: payload.exp,
          iat: payload.iat,
        },
        scopes: payload.scopes || payload.scope?.split(' ') || [],
        clientId: payload.client_id || payload.sub,
        subject: payload.sub,
      };
      
      next();
    } catch (error: unknown) {
      const err = error as Error & { name?: string };
      
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'token_expired',
          message: 'JWT has expired',
        });
      }
      
      if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
          error: 'invalid_token',
          message: 'Invalid JWT: ' + err.message,
        });
      }
      
      return res.status(500).json({
        error: 'server_error',
        message: 'Token validation failed',
      });
    }
  };
}

/**
 * Generate a JWT token (helper for testing/development)
 * 
 * @example
 * ```typescript
 * const token = generateJWT({
 *   secret: process.env.JWT_SECRET!,
 *   payload: {
 *     sub: 'user123',
 *     scopes: ['mcp:read', 'mcp:write'],
 *   },
 *   expiresIn: '1h',
 * });
 * ```
 */
/**
 * Options for generating a JWT token
 */
export interface GenerateJWTOptions {
  /**
   * JWT secret for signing
   * 
   * @example
   * ```typescript
   * secret: SecretValue.fromEnv('JWT_SECRET')
   * // or for testing:
   * secret: SecretValue.fromValue('test-secret', { allowHardcoded: true })
   * ```
   */
  secret: SecretValue | string;
  
  /** Payload to encode in the JWT */
  payload: JWTPayload;
  
  /** Token expiration (e.g., '1h', '7d', 3600) */
  expiresIn?: string | number;
  
  /** Expected audience */
  audience?: string;
  
  /** Token issuer */
  issuer?: string;
  
  /** Signing algorithm */
  algorithm?: 'HS256' | 'HS384' | 'HS512';
}

/**
 * Generate a JWT token
 * 
 * @example
 * ```typescript
 * const token = generateJWT({
 *   secret: SecretValue.fromEnv('JWT_SECRET'),
 *   payload: {
 *     sub: 'user123',
 *     scopes: ['mcp:read', 'mcp:write'],
 *   },
 *   expiresIn: '1h',
 * });
 * ```
 */
export function generateJWT(options: GenerateJWTOptions): string {
  const signOptions: jwt.SignOptions = {
    algorithm: options.algorithm || 'HS256',
  };
  
  if (options.expiresIn !== undefined) {
    // Cast to jwt.SignOptions['expiresIn'] which accepts string | number
    signOptions.expiresIn = options.expiresIn as jwt.SignOptions['expiresIn'];
  }
  
  if (options.audience) {
    signOptions.audience = options.audience;
  }
  
  if (options.issuer) {
    signOptions.issuer = options.issuer;
  }
  
  const secretValue = unwrapSecret(options.secret);
  return jwt.sign(options.payload as object, secretValue, signOptions);
}

/**
 * Verify a JWT token without middleware (helper)
 * 
 * @param token - The JWT token to verify
 * @param config - JWT configuration including secret
 * @returns The decoded payload if valid, null otherwise
 */
export function verifyJWT(
  token: string,
  config: SimpleJWTConfig
): JWTPayload | null {
  try {
    const verifyOptions: jwt.VerifyOptions = {
      algorithms: [config.algorithm || 'HS256'],
    };
    
    if (config.audience) {
      verifyOptions.audience = config.audience;
    }
    
    if (config.issuer) {
      verifyOptions.issuer = config.issuer;
    }
    
    const secretValue = unwrapSecret(config.secret);
    const payload = jwt.verify(token, secretValue, verifyOptions) as JWTPayload;
    
    if (config.customValidation && !config.customValidation(payload)) {
      return null;
    }
    
    return payload;
  } catch {
    return null;
  }
}

/**
 * Decode JWT without verification (for debugging)
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
}

