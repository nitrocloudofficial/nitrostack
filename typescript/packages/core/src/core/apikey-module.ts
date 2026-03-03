import 'reflect-metadata';
import crypto from 'crypto';

/**
 * API Key Module Configuration
 */
export interface ApiKeyModuleConfig {
  /** Array of valid API keys (or env var names to read from) */
  keys?: string[];
  
  /** Environment variable prefix to read keys from (e.g., 'API_KEY' reads API_KEY_1, API_KEY_2, etc.) */
  keysEnvPrefix?: string;
  
  /** If true, keys are stored as SHA-256 hashes */
  hashed?: boolean;
  
  /** Header name to extract API key from (default: 'x-api-key') */
  headerName?: string;
  
  /** Metadata field name in MCP requests (default: 'apiKey') */
  metadataField?: string;
  
  /** Custom validation function */
  customValidation?: (key: string) => Promise<boolean> | boolean;
}

/**
 * API Key Module - Enable API key authentication in your MCP server
 * 
 * Import this module to indicate your server uses API key authentication.
 * Then use @UseGuards(ApiKeyGuard) on your tools to protect them.
 * 
 * @example
 * ```typescript
 * import { McpApplicationFactory, ApiKeyModule } from 'nitrostack';
 * import { AppModule } from './app.module.js';
 * 
 * async function bootstrap() {
 *   const app = await McpApplicationFactory.create(AppModule, {
 *     // Enable API key authentication
 *     apiKey: ApiKeyModule.forRoot({
 *       keysEnvPrefix: 'API_KEY', // Reads API_KEY_1, API_KEY_2, etc.
 *       headerName: 'x-api-key',
 *     }),
 *   });
 *   await app.start();
 * }
 * ```
 */
export class ApiKeyModule {
  private static config: ApiKeyModuleConfig = {
    keysEnvPrefix: 'API_KEY',
    headerName: 'x-api-key',
    metadataField: 'apiKey',
    hashed: false,
  };

  /**
   * Configure API Key module for the application
   */
  static forRoot(config: ApiKeyModuleConfig): ApiKeyModuleConfig {
    this.config = { ...this.config, ...config };
    return this.config;
  }

  /**
   * Get current API Key configuration
   */
  static getConfig(): ApiKeyModuleConfig {
    return this.config;
  }

  /**
   * Get valid API keys from config or environment
   */
  static getKeys(): string[] {
    const keys: string[] = [];

    // Add keys from config
    if (this.config.keys && this.config.keys.length > 0) {
      keys.push(...this.config.keys);
    }

    // Read from environment variables
    if (this.config.keysEnvPrefix) {
      let i = 1;
      while (true) {
        const envKey = `${this.config.keysEnvPrefix}_${i}`;
        const value = process.env[envKey];
        if (!value) break;
        keys.push(value);
        i++;
      }

      // Also check for non-numbered version
      const singleKey = process.env[this.config.keysEnvPrefix];
      if (singleKey && !keys.includes(singleKey)) {
        keys.push(singleKey);
      }
    }

    return keys;
  }

  /**
   * Validate an API key
   */
  static async validate(key: string): Promise<boolean> {
    const keys = this.getKeys();
    
    if (keys.length === 0) {
      return false; // No keys configured
    }

    let isValid = false;

    if (this.config.hashed) {
      // Compare hashed values
      const hashedKey = this.hashKey(key);
      isValid = keys.includes(hashedKey);
    } else {
      // Direct comparison
      isValid = keys.includes(key);
    }

    // Custom validation
    if (this.config.customValidation) {
      const customValid = await this.config.customValidation(key);
      isValid = isValid && customValid;
    }

    return isValid;
  }

  /**
   * Hash an API key (SHA-256)
   */
  static hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  /**
   * Generate a secure API key
   */
  static generateKey(prefix: string = 'sk'): string {
    const randomBytes = crypto.randomBytes(32);
    const key = randomBytes.toString('base64url');
    return `${prefix}_${key}`;
  }
}


