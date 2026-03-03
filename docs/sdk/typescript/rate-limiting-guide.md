# Rate Limiting Guide

## Overview

Rate limiting protects your MCP server from abuse by restricting the number of requests users can make within a time window. NitroStack provides built-in rate limiting via the `@RateLimit` decorator.

## Basic Rate Limiting

### Using @RateLimit Decorator

```typescript
import { Tool, RateLimit } from '@nitrostack/core';

@Tool({ name: 'send_email' })
@RateLimit({ requests: 10, window: '1m' })  // 10 requests per minute
async sendEmail(input: any, ctx: ExecutionContext) {
  await this.emailService.send(input);
  return { success: true };
}
```

## Rate Limit Options

```typescript
interface RateLimitOptions {
  requests: number;                        // Max requests allowed
  window: string;                          // Time window ('1m', '1h', '1d')
  key?: (ctx: ExecutionContext) => string; // Custom rate limit key
  message?: string;                        // Custom error message
  skipSuccessfulRequests?: boolean;        // Only count failed requests
  skipFailedRequests?: boolean;            // Only count successful requests
}
```

## Time Windows

### Common Windows

```typescript
// Per minute
@RateLimit({ requests: 60, window: '1m' })

// Per hour
@RateLimit({ requests: 1000, window: '1h' })

// Per day
@RateLimit({ requests: 10000, window: '1d' })

// Per week
@RateLimit({ requests: 50000, window: '7d' })
```

### Window Formats

```typescript
'1s'   // 1 second
'30s'  // 30 seconds
'1m'   // 1 minute
'5m'   // 5 minutes
'1h'   // 1 hour
'12h'  // 12 hours
'1d'   // 1 day
'7d'   // 7 days
```

## Rate Limit Keys

### Default (IP-Based)

```typescript
// Limits by IP address
@RateLimit({ requests: 100, window: '1h' })
```

### User-Based

```typescript
@Tool({ name: 'create_post' })
@UseGuards(JWTGuard)
@RateLimit({
  requests: 50,
  window: '1h',
  key: (ctx) => ctx.auth?.subject || 'anonymous'
})
async createPost(input: any, ctx: ExecutionContext) {
  // Each user has their own limit
}
```

### API Key-Based

```typescript
@Tool({ name: 'api_call' })
@UseGuards(ApiKeyGuard)
@RateLimit({
  requests: 1000,
  window: '1h',
  key: (ctx) => ctx.auth?.keyId || 'unknown'
})
async apiCall(input: any, ctx: ExecutionContext) {
  // Each API key has its own limit
}
```

### Custom Key

```typescript
@Tool({ name: 'search' })
@RateLimit({
  requests: 10,
  window: '1m',
  key: (ctx) => {
    const userId = ctx.auth?.subject;
    const endpoint = ctx.toolName;
    return `${userId}:${endpoint}`;
  }
})
async search(input: any, ctx: ExecutionContext) {
  // Limit per user per endpoint
}
```

## Tiered Rate Limits

### By User Role

```typescript
@Tool({ name: 'api_request' })
@UseGuards(JWTGuard)
@RateLimit({
  requests: (ctx) => {
    const role = ctx.auth?.role;
    if (role === 'premium') return 10000;
    if (role === 'pro') return 1000;
    return 100; // free tier
  },
  window: '1h'
})
async apiRequest(input: any, ctx: ExecutionContext) {
  // Different limits based on subscription
}
```

### By Plan

```typescript
const RATE_LIMITS = {
  free: { requests: 100, window: '1h' },
  basic: { requests: 1000, window: '1h' },
  premium: { requests: 10000, window: '1h' },
  enterprise: { requests: 100000, window: '1h' }
};

@Tool({ name: 'advanced_feature' })
@UseGuards(JWTGuard)
@RateLimit((ctx) => {
  const plan = ctx.auth?.plan || 'free';
  return RATE_LIMITS[plan];
})
async advancedFeature(input: any, ctx: ExecutionContext) {
  // Dynamic limits based on plan
}
```

## Multiple Rate Limits

### Stacked Limits

```typescript
@Tool({ name: 'expensive_operation' })
@RateLimit({ requests: 10, window: '1m' })    // Per minute
@RateLimit({ requests: 100, window: '1h' })   // Per hour
@RateLimit({ requests: 1000, window: '1d' })  // Per day
async expensiveOperation(input: any) {
  // Must pass all rate limit checks
}
```

## Error Handling

### Custom Error Messages

```typescript
@RateLimit({
  requests: 10,
  window: '1m',
  message: 'Too many requests. Please wait before trying again.'
})
```

### With Retry Information

```typescript
@RateLimit({
  requests: 10,
  window: '1m',
  message: (remaining, resetAt) => 
    `Rate limit exceeded. ${remaining} requests remaining. Resets at ${resetAt}`
})
```

## Advanced Patterns

### Burst Allowance

```typescript
@Injectable()
export class BurstRateLimiter {
  @RateLimit({ requests: 10, window: '1s' })   // Burst
  @RateLimit({ requests: 100, window: '1m' })  // Sustained
  async handleRequest() {
    // Allows bursts but limits sustained load
  }
}
```

### Adaptive Rate Limiting

```typescript
@Injectable()
export class AdaptiveRateLimiter {
  private systemLoad = 0;
  
  @RateLimit({
    requests: (ctx) => {
      // Reduce limits under high load
      if (this.systemLoad > 0.8) return 50;
      if (this.systemLoad > 0.5) return 100;
      return 200;
    },
    window: '1m'
  })
  async handleRequest() {
    // Limits adjust based on system load
  }
}
```

### Geographic Rate Limiting

```typescript
@RateLimit({
  requests: (ctx) => {
    const region = ctx.metadata.region;
    // Higher limits for preferred regions
    if (region === 'us-east') return 1000;
    return 100;
  },
  window: '1h'
})
```

## Storage Backends

### In-Memory (Default)

```typescript
// Fast but not distributed
// Lost on restart
// Single-server only
```

### Redis

```typescript
import { createClient } from 'redis';

@Injectable()
export class RedisRateLimiter {
  private client = createClient({
    url: process.env.REDIS_URL
  });
  
  async checkLimit(key: string, limit: number, window: number): Promise<boolean> {
    const current = await this.client.incr(key);
    
    if (current === 1) {
      // First request, set expiry
      await this.client.expire(key, window);
    }
    
    return current <= limit;
  }
  
  async getRemainingQuota(key: string, limit: number): Promise<number> {
    const current = await this.client.get(key);
    return limit - (parseInt(current || '0'));
  }
}
```

### Distributed Rate Limiting

```typescript
@Injectable()
export class DistributedRateLimiter {
  constructor(private redis: RedisService) {}
  
  async checkLimit(
    userId: string,
    limit: number,
    window: number
  ): Promise<boolean> {
    const key = `rate_limit:${userId}`;
    
    // Use Redis sliding window
    const now = Date.now();
    const windowStart = now - (window * 1000);
    
    // Remove old entries
    await this.redis.zremrangebyscore(key, 0, windowStart);
    
    // Count current requests
    const count = await this.redis.zcard(key);
    
    if (count >= limit) {
      return false;
    }
    
    // Add new request
    await this.redis.zadd(key, now, `${now}-${Math.random()}`);
    await this.redis.expire(key, window);
    
    return true;
  }
}
```

## Response Headers

### Include Rate Limit Info

```typescript
@Tool({ name: 'api_endpoint' })
@RateLimit({ requests: 100, window: '1h' })
async apiEndpoint(input: any, ctx: ExecutionContext) {
  const result = await this.processRequest(input);
  
  // Add rate limit headers
  ctx.metadata.rateLimitLimit = 100;
  ctx.metadata.rateLimitRemaining = await this.getRemainingQuota(ctx);
  ctx.metadata.rateLimitReset = await this.getResetTime(ctx);
  
  return result;
}
```

## Monitoring

### Track Rate Limit Events

```typescript
@Tool({ name: 'monitored_tool' })
@RateLimit({ requests: 100, window: '1h' })
async monitoredTool(input: any, ctx: ExecutionContext) {
  try {
    return await this.process(input);
  } catch (error) {
    if (error.code === 'RATE_LIMIT_EXCEEDED') {
      ctx.emit('rate_limit.exceeded', {
        userId: ctx.auth?.subject,
        tool: ctx.toolName,
        limit: 100
      });
    }
    throw error;
  }
}
```

### Metrics Collection

```typescript
@Injectable()
export class RateLimitMetrics {
  private exceeded = 0;
  private allowed = 0;
  
  @OnEvent('rate_limit.exceeded')
  handleExceeded() {
    this.exceeded++;
  }
  
  @OnEvent('rate_limit.allowed')
  handleAllowed() {
    this.allowed++;
  }
  
  getMetrics() {
    const total = this.exceeded + this.allowed;
    return {
      exceeded: this.exceeded,
      allowed: this.allowed,
      rejectionRate: total > 0 ? this.exceeded / total : 0
    };
  }
}
```

## Best Practices

### 1. Set Appropriate Limits

```typescript
// Good - Match resource consumption
@RateLimit({ requests: 1, window: '5s' })    // Very expensive operation
@RateLimit({ requests: 100, window: '1h' })  // Moderate operation
@RateLimit({ requests: 1000, window: '1h' }) // Light operation

// Avoid - Too restrictive or too lenient
@RateLimit({ requests: 1, window: '1h' })    // Too strict
@RateLimit({ requests: 1000000, window: '1s' }) // Too lenient
```

### 2. Use Per-User Limits

```typescript
// Good - Per user
@RateLimit({
  requests: 100,
  window: '1h',
  key: (ctx) => ctx.auth?.subject || ctx.metadata.ip
})

// Avoid - Global limit (DDoS vulnerable)
@RateLimit({ requests: 1000, window: '1h' })
```

### 3. Provide Clear Errors

```typescript
// Good - Helpful message
@RateLimit({
  requests: 10,
  window: '1m',
  message: 'Rate limit: 10 requests per minute. Please slow down.'
})

// Avoid - Generic message
@RateLimit({
  requests: 10,
  window: '1m',
  message: 'Error'
})
```

### 4. Monitor and Adjust

```typescript
// Track metrics
@OnEvent('rate_limit.exceeded')
async handleExceeded(data: any) {
  await this.metrics.record('rate_limit_exceeded', {
    userId: data.userId,
    endpoint: data.tool
  });
  
  // Alert if too many users hitting limits
  if (await this.metrics.getExceededRate() > 0.1) {
    await this.alerts.send('Rate limits may be too strict');
  }
}
```

### 5. Implement Graceful Degradation

```typescript
@Tool({ name: 'search' })
@RateLimit({ requests: 100, window: '1h' })
async search(input: any, ctx: ExecutionContext) {
  try {
    return await this.fullSearch(input);
  } catch (error) {
    if (error.code === 'RATE_LIMIT_EXCEEDED') {
      // Fall back to basic search
      return await this.basicSearch(input);
    }
    throw error;
  }
}
```

## Common Patterns

### Email Sending

```typescript
@Tool({ name: 'send_email' })
@RateLimit({ requests: 10, window: '1m' })   // Per minute
@RateLimit({ requests: 100, window: '1h' })  // Per hour
@RateLimit({ requests: 500, window: '1d' })  // Per day
async sendEmail(input: any) {
  // Prevent email spam
}
```

### API Calls

```typescript
@Tool({ name: 'external_api' })
@RateLimit({
  requests: 50,
  window: '1m',
  key: (ctx) => ctx.auth?.apiKey || 'anonymous'
})
async callExternalApi(input: any) {
  // Comply with external API limits
}
```

### File Uploads

```typescript
@Tool({ name: 'upload_file' })
@RateLimit({ requests: 5, window: '1m' })  // Prevent abuse
async uploadFile(input: any) {
  // Limit upload frequency
}
```

## Troubleshooting

### Users Hitting Limits

1. Check if limits are too strict
2. Verify window is appropriate
3. Consider tiered plans
4. Monitor legitimate usage patterns

### Limits Not Working

1. Verify decorator is applied
2. Check rate limit key is correct
3. Ensure storage backend is working
4. Test with multiple requests

### Performance Issues

1. Use Redis for distributed systems
2. Implement sliding windows
3. Clean up expired keys
4. Monitor storage size

## Next Steps

- [Caching Guide](./caching-guide.md)
- [Performance Guide](./performance.md)
- [Security Best Practices](./17-best-practices.md)

---

**Tip**: Start with generous limits and tighten based on actual usage patterns and resource availability!

