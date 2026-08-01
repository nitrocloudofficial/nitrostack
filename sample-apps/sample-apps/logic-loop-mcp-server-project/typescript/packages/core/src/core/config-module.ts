import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Configuration Module Options
 */
export interface ConfigModuleOptions {
  /**
   * Path to .env file (relative to project root)
   */
  envFilePath?: string;
  
  /**
   * Whether to ignore .env file if it doesn't exist
   */
  ignoreEnvFile?: boolean;
  
  /**
   * Whether to validate environment variables
   */
  validate?: (config: Record<string, any>) => boolean;
  
  /**
   * Default values for environment variables
   */
  defaults?: Record<string, string>;
}

/**
 * Parse .env file manually to avoid stdout pollution
 * (dotenv.config() can write to stdout which breaks MCP stdio protocol)
 */
function parseEnvFile(filePath: string): Record<string, string> {
  const envVars: Record<string, string> = {};
  
  if (!fs.existsSync(filePath)) {
    return envVars;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  
  content.split('\n').forEach(line => {
    line = line.trim();
    
    // Skip empty lines and comments
    if (!line || line.startsWith('#')) {
      return;
    }
    
    // Parse KEY=VALUE
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      let value = valueParts.join('=').trim();
      
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      envVars[key.trim()] = value;
    }
  });
  
  return envVars;
}

/**
 * Configuration Service
 * Provides type-safe access to environment variables
 */
export class ConfigService {
  private config: Record<string, string>;

  constructor(options: ConfigModuleOptions = {}) {
    this.config = { ...options.defaults };
    
    // Load environment variables from .env file
    if (!options.ignoreEnvFile) {
      const envPath = options.envFilePath || '.env';
      const fullPath = path.resolve(process.cwd(), envPath);
      
      const parsed = parseEnvFile(fullPath);
      this.config = { ...this.config, ...parsed };
    }
    
    // Merge with process.env (already loaded by Studio)
    this.config = { ...this.config, ...process.env } as Record<string, string>;
    
    // Validate if validator provided
    if (options.validate && !options.validate(this.config)) {
      throw new Error('Environment variable validation failed');
    }
  }

  /**
   * Get a configuration value
   */
  get<T = string>(key: string): T | undefined;
  get<T = string>(key: string, defaultValue: T): T;
  get<T = string>(key: string, defaultValue?: T): T | undefined {
    const value = this.config[key];
    if (value === undefined) {
      return defaultValue;
    }
    return value as T;
  }

  /**
   * Get a required configuration value
   * Throws if not found
   */
  getOrThrow<T = string>(key: string): T {
    const value = this.get<T>(key);
    if (value === undefined) {
      throw new Error(`Configuration key "${key}" is required but not found`);
    }
    return value;
  }

  /**
   * Get all configuration
   */
  getAll(): Record<string, string> {
    return { ...this.config };
  }
}

/**
 * Dynamic module result type
 */
export interface DynamicModuleResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  providers: Array<{ provide: any; useValue: unknown }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  exports: any[];
}

/**
 * Configuration Module
 * NestJS-style configuration management
 */
export class ConfigModule {
  static forRoot(options: ConfigModuleOptions = {}): DynamicModuleResult {
    const configService = new ConfigService(options);
    
    return {
      providers: [{ provide: ConfigService, useValue: configService }],
      exports: [ConfigService],
    };
  }
}

