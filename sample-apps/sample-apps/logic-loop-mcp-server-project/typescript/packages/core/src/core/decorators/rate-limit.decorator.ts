import 'reflect-metadata';

const RATE_LIMIT_KEY = 'nitrostack:rate_limit';

/**
 * Rate limit options
 */
import { ExecutionContext } from '../types.js';

export interface RateLimitOptions {
  /** Maximum number of requests */
  requests: number;
  
  /** Time window (e.g., '1m', '1h', '1d') */
  window: string;
  
  /** Custom key generator (default: uses auth subject or IP) */
  key?: (context: ExecutionContext) => string;
  
  /** Storage for rate limit data */
  storage?: RateLimitStorage;
  
  /** Custom error message */
  message?: string;
}

/**
 * Rate limit storage interface
 */
export interface RateLimitStorage {
  increment(key: string, windowMs: number): Promise<number> | number;
  reset(key: string): Promise<void> | void;
}

/**
 * Default in-memory rate limit storage
 */
export class InMemoryRateLimitStorage implements RateLimitStorage {
  private limits = new Map<string, { count: number; resetAt: number }>();

  increment(key: string, windowMs: number): number {
    const now = Date.now();
    const limit = this.limits.get(key);
    
    // Reset if window expired
    if (!limit || limit.resetAt < now) {
      this.limits.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      return 1;
    }
    
    // Increment
    limit.count++;
    this.limits.set(key, limit);
    return limit.count;
  }

  reset(key: string): void {
    this.limits.delete(key);
  }

  // Cleanup expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, limit] of this.limits.entries()) {
      if (limit.resetAt < now) {
        this.limits.delete(key);
      }
    }
  }
}

// Default storage instance
const defaultStorage = new InMemoryRateLimitStorage();

// Cleanup every minute
setInterval(() => defaultStorage.cleanup(), 60000);

/**
 * Parse time window string to milliseconds
 */
function parseWindow(window: string): number {
  const match = window.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid time window format: ${window}. Use format like '1m', '1h', '1d'`);
  }
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  
  return value * multipliers[unit];
}

/**
 * Rate limit decorator - limits the number of requests per time window
 * 
 * @example
 * ```typescript
 * @Tool({ name: 'send_email', ... })
 * @RateLimit({ requests: 10, window: '1m' }) // 10 requests per minute
 * async sendEmail(input: Record<string, unknown>, context: ExecutionContext) {
 *   // Send email
 * }
 * 
 * // With custom key (per user)
 * @RateLimit({ 
 *   requests: 100, 
 *   window: '1h',
 *   key: (ctx) => ctx.auth?.subject || 'anonymous'
 * })
 * async createOrder(input: Record<string, unknown>, context: ExecutionContext) { }
 * ```
 */
export function RateLimit(options: RateLimitOptions): MethodDecorator {
  return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    const windowMs = parseWindow(options.window);
    
    descriptor.value = async function (...args: unknown[]) {
      const context = args[1] as ExecutionContext | undefined;
      const storage = options.storage || defaultStorage;
      
      // Generate rate limit key
      let rateLimitKey: string;
      if (options.key && context) {
        rateLimitKey = options.key(context);
      } else {
        // Default: use auth subject or 'anonymous'
        rateLimitKey = context?.auth?.subject || 'anonymous';
      }
      
      const fullKey = `${target.constructor.name}:${String(propertyKey)}:${rateLimitKey}`;
      
      // Check rate limit
      const count = await storage.increment(fullKey, windowMs);
      
      if (count > options.requests) {
        const message = options.message || 
          `Rate limit exceeded. Maximum ${options.requests} requests per ${options.window}`;
        
        if (context?.logger) {
          context.logger.warn(`[RateLimit] Limit exceeded for key: ${fullKey}`);
        }
        
        throw new Error(message);
      }
      
      if (context?.logger) {
        context.logger.info(`[RateLimit] Request ${count}/${options.requests} for key: ${fullKey}`);
      }
      
      // Execute original method
      return await originalMethod.apply(this, args);
    };
    
    // Store metadata
    Reflect.defineMetadata(RATE_LIMIT_KEY, options, target, propertyKey);
    
    return descriptor;
  };
}

/**
 * Get rate limit options from metadata
 */
export function getRateLimitMetadata(target: object, propertyKey: string | symbol): RateLimitOptions | undefined {
  return Reflect.getMetadata(RATE_LIMIT_KEY, target, propertyKey);
}

/**
 * Reset rate limit for a specific key
 */
export async function resetRateLimit(key: string): Promise<void> {
  await defaultStorage.reset(key);
}

