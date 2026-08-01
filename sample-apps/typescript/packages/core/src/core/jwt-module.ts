import 'reflect-metadata';

/**
 * JWT Module Configuration
 */
export interface JWTModuleConfig {
  /** JWT secret (or env var name to read from) */
  secret?: string;
  
  /** Environment variable to read secret from */
  secretEnvVar?: string;
  
  /** Token expiration time (e.g., '24h', '7d') */
  expiresIn?: string;
  
  /** JWT audience */
  audience?: string;
  
  /** JWT issuer */
  issuer?: string;
}

/**
 * JWT Module - Enable JWT authentication in your MCP server
 * 
 * Import this module to indicate your server uses JWT authentication.
 * Then use @UseGuards(JWTGuard) on your tools to protect them.
 * 
 * @example
 * ```typescript
 * import { createServer, JWTModule } from 'nitrostack';
 * 
 * const server = createServer({ ... });
 * 
 * // Enable JWT authentication
 * server.use(JWTModule.forRoot({
 *   secretEnvVar: 'JWT_SECRET',
 *   expiresIn: '24h',
 * }));
 * ```
 */
export class JWTModule {
  private static config: JWTModuleConfig = {
    secretEnvVar: 'JWT_SECRET',
    expiresIn: '24h',
  };

  /**
   * Configure JWT module for the application
   */
  static forRoot(config: JWTModuleConfig): JWTModuleConfig {
    this.config = { ...this.config, ...config };
    return this.config;
  }

  /**
   * Get current JWT configuration
   */
  static getConfig(): JWTModuleConfig {
    return this.config;
  }

  /**
   * Get JWT secret from config or environment
   */
  static getSecret(): string | null {
    if (this.config.secret) {
      return this.config.secret;
    }
    
    if (this.config.secretEnvVar) {
      return process.env[this.config.secretEnvVar] || null;
    }
    
    return null;
  }
}

