# Caching Guide

## Overview

NitroStack provides built-in caching capabilities to improve performance and reduce redundant operations. Use the `@Cache` decorator to automatically cache tool responses.

## Basic Caching

### Using @Cache Decorator

```typescript
import { Tool, Cache } from '@nitrostack/core';

@Tool({ name: 'get_config' })
@Cache({ ttl: 3600 })  // Cache for 1 hour
async getConfig(input: any, ctx: ExecutionContext) {
  const config = await this.configService.load();
  return config;
}
```

## Cache Options

```typescript
interface CacheOptions {
  ttl: number;                              // Time to live in seconds
  key?: (input: any) => string;            // Custom cache key function
  invalidateOn?: string[];                 // Events that invalidate cache
}
```

## TTL (Time To Live)

### Common TTL Values

```typescript
// 5 minutes - frequently changing data
@Cache({ ttl: 300 })

// 1 hour - semi-static data
@Cache({ ttl: 3600 })

// 1 day - static configuration
@Cache({ ttl: 86400 })

// 1 week - rarely changing data
@Cache({ ttl: 604800 })
```

### Dynamic TTL

```typescript
@Tool({ name: 'get_weather' })
@Cache({
  ttl: (input) => {
    // Cache current weather for 10 minutes
    // Cache forecast for 1 hour
    return input.type === 'current' ? 600 : 3600;
  }
})
async getWeather(input: any) {
  // ...
}
```

## Custom Cache Keys

### Simple Key

```typescript
@Tool({ name: 'get_product' })
@Cache({
  ttl: 600,
  key: (input) => `product:${input.product_id}`
})
async getProduct(input: any) {
  return await this.productService.findById(input.product_id);
}
```

### Composite Key

```typescript
@Tool({ name: 'search_products' })
@Cache({
  ttl: 300,
  key: (input) => `products:${input.category}:${input.page}:${input.sort}`
})
async searchProducts(input: any) {
  return await this.productService.search(input);
}
```

### User-Specific Cache

```typescript
@Tool({ name: 'get_recommendations' })
@UseGuards(JWTGuard)
@Cache({
  ttl: 1800,
  key: (input, ctx) => `recommendations:${ctx.auth?.subject}`
})
async getRecommendations(input: any, ctx: ExecutionContext) {
  const userId = ctx.auth?.subject;
  return await this.recommendationService.getFor(userId);
}
```

## Cache Invalidation

### Event-Based Invalidation

```typescript
@Tool({ name: 'get_product' })
@Cache({
  ttl: 3600,
  key: (input) => `product:${input.id}`,
  invalidateOn: ['product.updated', 'product.deleted']
})
async getProduct(input: any) {
  // Cache invalidated when these events are emitted
}

@Tool({ name: 'update_product' })
async updateProduct(input: any, ctx: ExecutionContext) {
  const product = await this.productService.update(input);
  
  // Invalidate cache
  ctx.emit('product.updated', { id: product.id });
  
  return product;
}
```

### Manual Invalidation

```typescript
@Injectable()
export class CacheService {
  async invalidate(key: string): Promise<void> {
    // Remove from cache
  }
  
  async invalidatePattern(pattern: string): Promise<void> {
    // Remove all keys matching pattern
    // e.g., 'product:*'
  }
  
  async clear(): Promise<void> {
    // Clear entire cache
  }
}

// Usage
@Tool({ name: 'clear_cache' })
@UseGuards(AdminGuard)
async clearCache(input: any) {
  await this.cacheService.clear();
  return { success: true };
}
```

## Cache Strategies

### Cache-Aside (Lazy Loading)

```typescript
@Injectable()
export class ProductService {
  constructor(
    private db: DatabaseService,
    private cache: CacheService
  ) {}
  
  async findById(id: string) {
    // Check cache first
    const cached = await this.cache.get(`product:${id}`);
    if (cached) return cached;
    
    // Load from database
    const product = await this.db.queryOne(
      'SELECT * FROM products WHERE id = ?',
      [id]
    );
    
    // Store in cache
    await this.cache.set(`product:${id}`, product, 3600);
    
    return product;
  }
}
```

### Write-Through

```typescript
async updateProduct(id: string, data: any) {
  // Update database
  await this.db.execute(
    'UPDATE products SET name = ? WHERE id = ?',
    [data.name, id]
  );
  
  // Update cache immediately
  const product = await this.db.queryOne(
    'SELECT * FROM products WHERE id = ?',
    [id]
  );
  await this.cache.set(`product:${id}`, product, 3600);
  
  return product;
}
```

### Write-Behind

```typescript
async updateProduct(id: string, data: any) {
  // Update cache immediately
  await this.cache.set(`product:${id}`, data, 3600);
  
  // Queue database update
  await this.queue.add('update-product', { id, data });
  
  return data;
}
```

## Cache Storage Backends

### In-Memory (Default)

```typescript
// Fast but not persistent
// Lost on server restart
// Single-server only
```

### Redis

```typescript
import { createClient } from 'redis';

@Injectable()
export class RedisCacheService {
  private client = createClient({
    url: process.env.REDIS_URL
  });
  
  async get(key: string): Promise<any> {
    const value = await this.client.get(key);
    return value ? JSON.parse(value) : null;
  }
  
  async set(key: string, value: any, ttl: number): Promise<void> {
    await this.client.setEx(
      key,
      ttl,
      JSON.stringify(value)
    );
  }
}
```

### Memcached

```typescript
import Memcached from 'memcached';

@Injectable()
export class MemcachedService {
  private client = new Memcached(process.env.MEMCACHED_SERVERS);
  
  async get(key: string): Promise<any> {
    return new Promise((resolve) => {
      this.client.get(key, (err, data) => {
        resolve(err ? null : data);
      });
    });
  }
}
```

## Best Practices

### 1. Set Appropriate TTL

```typescript
// Good - Match data volatility
@Cache({ ttl: 300 })  // 5 min for frequently changing data
@Cache({ ttl: 3600 }) // 1 hour for semi-static data
@Cache({ ttl: 86400 }) // 1 day for static data

// Avoid - Too long for dynamic data
@Cache({ ttl: 86400 })  // 1 day for stock prices
```

### 2. Use Specific Cache Keys

```typescript
// Good - Specific keys
key: (input) => `product:${input.id}:${input.locale}`

// Avoid - Generic keys
key: (input) => `data:${input.id}`
```

### 3. Cache Expensive Operations

```typescript
// Good - Cache database queries
@Cache({ ttl: 600 })
async searchProducts(input: any) {
  return await this.db.query(/* complex query */);
}

// Avoid - Caching simple operations
@Cache({ ttl: 600 })
async addNumbers(input: any) {
  return input.a + input.b;
}
```

### 4. Invalidate on Updates

```typescript
// Good - Invalidate when data changes
@Tool({ name: 'get_user' })
@Cache({
  ttl: 3600,
  invalidateOn: ['user.updated']
})

// Avoid - No invalidation strategy
@Tool({ name: 'get_user' })
@Cache({ ttl: 3600 })  // Stale data possible
```

### 5. Monitor Cache Metrics

```typescript
@Injectable()
export class CacheService {
  private hits = 0;
  private misses = 0;
  
  async get(key: string): Promise<any> {
    const value = await this.storage.get(key);
    
    if (value) {
      this.hits++;
    } else {
      this.misses++;
    }
    
    return value;
  }
  
  getMetrics() {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0
    };
  }
}
```

## Performance Tips

### 1. Cache Hierarchies

```typescript
// L1: In-memory cache (fastest)
// L2: Redis cache (fast)
// L3: Database (slowest)

async findProduct(id: string) {
  // Check L1
  let product = this.memoryCache.get(id);
  if (product) return product;
  
  // Check L2
  product = await this.redisCache.get(id);
  if (product) {
    this.memoryCache.set(id, product);
    return product;
  }
  
  // Check L3
  product = await this.db.findById(id);
  await this.redisCache.set(id, product);
  this.memoryCache.set(id, product);
  
  return product;
}
```

### 2. Cache Warm-Up

```typescript
async onApplicationStart() {
  // Pre-load frequently accessed data
  const popular = await this.db.query(
    'SELECT * FROM products ORDER BY views DESC LIMIT 100'
  );
  
  for (const product of popular) {
    await this.cache.set(`product:${product.id}`, product, 3600);
  }
}
```

### 3. Compression

```typescript
import { compress, decompress } from 'lz-string';

async set(key: string, value: any, ttl: number) {
  const compressed = compress(JSON.stringify(value));
  await this.storage.set(key, compressed, ttl);
}

async get(key: string) {
  const compressed = await this.storage.get(key);
  return compressed ? JSON.parse(decompress(compressed)) : null;
}
```

## Troubleshooting

### Cache Not Working

1. Check TTL is set
2. Verify cache service is injected
3. Check cache key is consistent
4. Monitor cache hit/miss ratio

### Stale Data

1. Reduce TTL
2. Implement invalidation
3. Use event-based clearing
4. Add version to cache keys

### Memory Issues

1. Set max cache size
2. Implement LRU eviction
3. Use external cache (Redis)
4. Reduce TTL

## Next Steps

- [Rate Limiting Guide](./rate-limiting-guide.md)
- [Performance Guide](./performance.md)
- [Best Practices](./17-best-practices.md)

---

**Tip**: Start with conservative TTLs and increase based on monitoring. It's easier to extend cache duration than to deal with stale data!

