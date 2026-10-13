import 'reflect-metadata';

const CACHE_KEY = 'nitrostack:cache';

/**
 * Cache options
 */
export interface CacheOptions {
  /** Time to live in seconds */
  ttl: number;
  
  /** Custom cache key generator */
  key?: (input: unknown, context: unknown) => string;
  
  /** Cache storage (default: in-memory) */
  storage?: CacheStorage;
}

/**
 * Cache storage interface
 */
export interface CacheStorage {
  get(key: string): Promise<unknown> | unknown;
  set(key: string, value: unknown, ttl: number): Promise<void> | void;
  delete(key: string): Promise<void> | void;
  clear(): Promise<void> | void;
}

/**
 * Default in-memory cache storage
 */
export class InMemoryCacheStorage implements CacheStorage {
  private cache = new Map<string, { value: unknown; expires: number }>();

  get(key: string): unknown {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (item.expires < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  set(key: string, value: unknown, ttl: number): void {
    this.cache.set(key, {
      value,
      expires: Date.now() + (ttl * 1000),
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Cleanup expired entries periodically
  private cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (item.expires < now) {
        this.cache.delete(key);
      }
    }
  }
}

// Default cache storage instance
const defaultStorage = new InMemoryCacheStorage();

/**
 * Cache decorator - caches tool results for a specified duration
 * 
 * @example
 * ```typescript
 * @Tool({ name: 'get_products', ... })
 * @Cache({ ttl: 300 }) // Cache for 5 minutes
 * async getProducts(input: unknown) {
 *   return await this.database.query('SELECT * FROM products');
 * }
 * 
 * // With custom cache key
 * @Cache({ 
 *   ttl: 300, 
 *   key: (input) => `products:${(input as {category: string}).category}` 
 * })
 * async getProducts(input: unknown) { }
 * ```
 */
export function Cache(options: CacheOptions): MethodDecorator {
  return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: unknown[]) {
      const storage = options.storage || defaultStorage;
      const input = args[0];
      const context = args[1] as { logger?: { info: (msg: string) => void } } | undefined;
      
      // Generate cache key - exclude _meta as it contains per-request data (requestId, tokens, etc.)
      let cacheKey: string;
      if (options.key) {
        cacheKey = options.key(input, context);
      } else {
        // Strip _meta from input for cache key generation
        let inputForKey = input;
        if (input && typeof input === 'object' && '_meta' in (input as object)) {
          const { _meta, ...rest } = input as Record<string, unknown>;
          inputForKey = rest;
        }
        cacheKey = `${(target as { constructor: { name: string } }).constructor.name}:${String(propertyKey)}:${JSON.stringify(inputForKey)}`;
      }
      
      // Debug: Log cache check (to stderr to not interfere with MCP)
      console.error(`[Cache DEBUG] Checking cache for key: ${cacheKey}`);
      
      // Check cache
      const cached = await storage.get(cacheKey);
      if (cached !== null && cached !== undefined) {
        console.error(`[Cache DEBUG] HIT - returning cached result`);
        if (context?.logger) {
          context.logger.info(`[Cache] Hit for key: ${cacheKey}`);
        }
        return cached;
      }
      
      console.error(`[Cache DEBUG] MISS - executing method`);
      
      // Execute original method
      const result = await originalMethod.apply(this, args);
      
      // Store in cache
      await storage.set(cacheKey, result, options.ttl);
      
      console.error(`[Cache DEBUG] Stored result for ${options.ttl}s`);
      
      if (context?.logger) {
        context.logger.info(`[Cache] Miss for key: ${cacheKey}, stored for ${options.ttl}s`);
      }
      
      return result;
    };
    
    // Store metadata
    Reflect.defineMetadata(CACHE_KEY, options, target, propertyKey);
    
    return descriptor;
  };
}

/**
 * Get cache options from metadata
 */
export function getCacheMetadata(target: object, propertyKey: string | symbol): CacheOptions | undefined {
  return Reflect.getMetadata(CACHE_KEY, target, propertyKey);
}

/**
 * Clear cache for a specific key or all keys
 */
export async function clearCache(key?: string): Promise<void> {
  if (key) {
    await defaultStorage.delete(key);
  } else {
    await defaultStorage.clear();
  }
}

