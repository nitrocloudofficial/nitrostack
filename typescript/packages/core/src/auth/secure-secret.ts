/**
 * Secure Secret Value
 * 
 * Provides a type-safe way to handle secrets that prevents accidental hardcoding.
 * Secrets must be explicitly created from environment variables or marked as explicit.
 * 
 * @example
 * ```typescript
 * // ✅ Recommended: Load from environment variable
 * const secret = SecretValue.fromEnv('JWT_SECRET');
 * 
 * // ✅ For testing only: Mark as explicit
 * const testSecret = SecretValue.fromValue('test-secret', { allowHardcoded: true });
 * 
 * // ❌ This will fail at runtime:
 * const badSecret = SecretValue.fromValue('hardcoded'); // throws error
 * ```
 */

// Branded type to prevent arbitrary strings from being used as secrets
declare const SecretBrand: unique symbol;

/**
 * A branded type representing a secret value.
 * Cannot be created directly - must use factory methods.
 */
export type SecretString = string & { readonly [SecretBrand]: 'SecretValue' };

/**
 * Options for creating a secret from a direct value
 */
export interface FromValueOptions {
  /**
   * Explicitly allow hardcoded values.
   * Only set to true for testing purposes.
   */
  allowHardcoded?: boolean;
  
  /**
   * Description of why hardcoded is allowed (for audit purposes)
   */
  reason?: string;
}

/**
 * Secure wrapper for secret values
 */
export class SecretValue {
  private readonly value: string;
  private readonly source: 'env' | 'explicit';
  
  private constructor(value: string, source: 'env' | 'explicit') {
    if (!value || value.length === 0) {
      throw new Error('Secret value cannot be empty');
    }
    
    // Minimum length check for security
    if (value.length < 16) {
      console.warn(
        '[SecretValue] Warning: Secret is less than 16 characters. ' +
        'Consider using a longer secret for better security.'
      );
    }
    
    this.value = value;
    this.source = source;
  }
  
  /**
   * Create a secret from an environment variable.
   * This is the recommended way to handle secrets.
   * 
   * @param envVarName - Name of the environment variable
   * @param options - Optional configuration
   * @throws Error if the environment variable is not set
   * 
   * @example
   * ```typescript
   * const jwtSecret = SecretValue.fromEnv('JWT_SECRET');
   * const dbPassword = SecretValue.fromEnv('DATABASE_PASSWORD');
   * ```
   */
  static fromEnv(envVarName: string, options?: { required?: boolean }): SecretValue {
    const value = process.env[envVarName];
    const required = options?.required !== false;
    
    if (!value) {
      if (required) {
        throw new Error(
          `Environment variable ${envVarName} is not set. ` +
          `Please set it in your environment or .env file.`
        );
      }
      // Return a placeholder that will fail if used
      throw new Error(`Environment variable ${envVarName} is not set.`);
    }
    
    return new SecretValue(value, 'env');
  }
  
  /**
   * Create a secret from a direct value.
   * 
   * **WARNING**: This should only be used for testing.
   * For production, always use `fromEnv()`.
   * 
   * @param value - The secret value
   * @param options - Must set allowHardcoded: true to use this method
   * @throws Error if allowHardcoded is not explicitly set to true
   * 
   * @example
   * ```typescript
   * // For testing only
   * const testSecret = SecretValue.fromValue('test-secret-for-unit-tests', {
   *   allowHardcoded: true,
   *   reason: 'Unit test fixture'
   * });
   * ```
   */
  static fromValue(value: string, options?: FromValueOptions): SecretValue {
    if (!options?.allowHardcoded) {
      throw new Error(
        'Hardcoded secrets are not allowed. ' +
        'Use SecretValue.fromEnv() to load secrets from environment variables. ' +
        'If you must use a hardcoded value (e.g., for testing), ' +
        'set allowHardcoded: true explicitly.'
      );
    }
    
    // Log warning in non-test environments
    if (process.env.NODE_ENV !== 'test') {
      console.warn(
        `[SecretValue] Warning: Using hardcoded secret value. ` +
        `Reason: ${options.reason || 'Not specified'}. ` +
        `This should not be used in production.`
      );
    }
    
    return new SecretValue(value, 'explicit');
  }
  
  /**
   * Create a secret from an environment variable or return undefined.
   * Useful for optional secrets.
   * 
   * @param envVarName - Name of the environment variable
   * 
   * @example
   * ```typescript
   * const optionalSecret = SecretValue.fromEnvOptional('OPTIONAL_API_KEY');
   * if (optionalSecret) {
   *   // Use the secret
   * }
   * ```
   */
  static fromEnvOptional(envVarName: string): SecretValue | undefined {
    const value = process.env[envVarName];
    if (!value) {
      return undefined;
    }
    return new SecretValue(value, 'env');
  }
  
  /**
   * Get the unwrapped secret value.
   * 
   * @returns The raw secret string
   */
  unwrap(): SecretString {
    return this.value as SecretString;
  }
  
  /**
   * Get the secret value as a plain string.
   * Alias for unwrap() for compatibility.
   */
  getValue(): string {
    return this.value;
  }
  
  /**
   * Check if this secret was loaded from environment
   */
  isFromEnvironment(): boolean {
    return this.source === 'env';
  }
  
  /**
   * Prevent accidental logging of secret values
   */
  toString(): string {
    return '[SecretValue: REDACTED]';
  }
  
  /**
   * Prevent accidental JSON serialization of secret values
   */
  toJSON(): string {
    return '[SecretValue: REDACTED]';
  }
  
  /**
   * For Node.js util.inspect
   */
  [Symbol.for('nodejs.util.inspect.custom')](): string {
    return `SecretValue { source: '${this.source}', value: [REDACTED] }`;
  }
}

/**
 * Type guard to check if a value is a SecretValue
 */
export function isSecretValue(value: unknown): value is SecretValue {
  return value instanceof SecretValue;
}

/**
 * Helper to unwrap a secret if it's a SecretValue, or use as-is if string.
 * Useful for backward compatibility.
 * 
 * @deprecated Prefer using SecretValue directly
 */
export function unwrapSecret(secret: SecretValue | string): string {
  if (secret instanceof SecretValue) {
    return secret.getValue();
  }
  // Log warning for raw strings in production
  if (process.env.NODE_ENV === 'production') {
    console.warn(
      '[SecretValue] Warning: Using raw string as secret. ' +
      'Consider migrating to SecretValue.fromEnv() for better security.'
    );
  }
  return secret;
}




