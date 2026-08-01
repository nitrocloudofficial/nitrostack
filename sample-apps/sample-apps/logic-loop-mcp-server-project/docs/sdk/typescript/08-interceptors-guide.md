# Interceptors Guide

## Overview

Interceptors bind additional logic before and after handler execution. Unlike middleware, interceptors focus on transforming requests and responses, adding metadata, or implementing cross-cutting patterns like caching and response wrapping.

## Table of Contents

- [Creating Interceptors](#creating-interceptors)
- [Using Interceptors](#using-interceptors)
- [Common Patterns](#common-patterns)
- [Dependency Injection](#dependency-injection)
- [Best Practices](#best-practices)

## Creating Interceptors

### Basic Interceptor

Interceptors implement the `InterceptorInterface`:

```typescript
import { Interceptor, InterceptorInterface, ExecutionContext } from '@nitrostack/core';

@Interceptor()
export class ResponseWrapperInterceptor implements InterceptorInterface {
  async intercept(context: ExecutionContext, next: () => Promise<any>): Promise<any> {
    const startTime = Date.now();

    // Execute handler
    const result = await next();

    // Transform response
    return {
      success: true,
      data: result,
      metadata: {
        tool: context.toolName,
        requestId: context.metadata?.requestId || context.requestId,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      }
    };
  }
}
```

### Interceptor Interface

```typescript
interface InterceptorInterface {
  intercept(context: ExecutionContext, next: () => Promise<any>): Promise<any>;
}
```

**Parameters:**
- `context`: Execution context with auth, logger, and metadata
- `next`: Function to call the handler

**Return:** Transformed response

## Using Interceptors

### On Individual Methods

```typescript
import { ToolDecorator as Tool, UseInterceptors } from '@nitrostack/core';
import { ResponseWrapperInterceptor } from './interceptors/response-wrapper.interceptor.js';

export class ProductTools {
  @Tool({ name: 'get_product' })
  @UseInterceptors(ResponseWrapperInterceptor)
  async getProduct(input: { productId: string }, ctx: ExecutionContext) {
    return this.productService.findById(input.productId);
    // Returns: { success: true, data: {...product}, metadata: {...} }
  }
}
```

### Multiple Interceptors

```typescript
@Tool({ name: 'get_user' })
@UseInterceptors(
  ResponseWrapperInterceptor,
  DataMaskingInterceptor,
  CacheInterceptor
)
async getUser(input: { userId: string }, ctx: ExecutionContext) {
  return this.userService.findById(input.userId);
}
```

## Common Patterns

### Response Transformation

```typescript
@Interceptor()
export class TransformInterceptor implements InterceptorInterface {
  async intercept(context: ExecutionContext, next: () => Promise<any>): Promise<any> {
    const result = await next();
    return this.transformKeys(result);
  }

  private transformKeys(data: unknown): unknown {
    if (data === null || data === undefined) return data;

    if (Array.isArray(data)) {
      return data.map(item => this.transformKeys(item));
    }

    if (typeof data === 'object' && !(data instanceof Date)) {
      const transformed: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        // Convert snake_case to camelCase
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        transformed[camelKey] = this.transformKeys(value);
      }
      return transformed;
    }

    return data;
  }
}
```

### Sensitive Data Masking

```typescript
@Interceptor()
export class DataMaskingInterceptor implements InterceptorInterface {
  private static readonly SENSITIVE_FIELDS = [
    'password',
    'ssn',
    'socialSecurityNumber',
    'creditCard',
    'cardNumber',
    'cvv',
    'apiKey',
    'secretKey',
    'accessToken'
  ];

  async intercept(context: ExecutionContext, next: () => Promise<any>): Promise<any> {
    const result = await next();
    return this.maskSensitiveData(result);
  }

  private maskSensitiveData(data: unknown): unknown {
    if (data === null || data === undefined) return data;

    if (Array.isArray(data)) {
      return data.map(item => this.maskSensitiveData(item));
    }

    if (typeof data === 'object' && !(data instanceof Date)) {
      const masked: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        if (this.isSensitiveField(key)) {
          masked[key] = this.maskValue(key, value);
        } else {
          masked[key] = this.maskSensitiveData(value);
        }
      }
      return masked;
    }

    return data;
  }

  private isSensitiveField(field: string): boolean {
    const lowerField = field.toLowerCase();
    return DataMaskingInterceptor.SENSITIVE_FIELDS.some(
      sensitive => lowerField.includes(sensitive.toLowerCase())
    );
  }

  private maskValue(field: string, value: unknown): string {
    if (!value) return '***';
    const str = String(value);

    if (field.toLowerCase().includes('ssn')) {
      return `***-**-${str.slice(-4)}`;
    }

    if (field.toLowerCase().includes('card') || field.toLowerCase().includes('credit')) {
      return `****-****-****-${str.slice(-4)}`;
    }

    if (field.toLowerCase().includes('key') || field.toLowerCase().includes('token')) {
      if (str.length > 8) {
        return `${str.slice(0, 4)}...${str.slice(-4)}`;
      }
    }

    return '********';
  }
}
```

### Response Caching

```typescript
import { Injectable } from '@nitrostack/core';

@Injectable()
@Interceptor()
export class CacheInterceptor implements InterceptorInterface {
  private cache = new Map<string, { data: unknown; expiresAt: number }>();

  async intercept(context: ExecutionContext, next: () => Promise<any>): Promise<any> {
    const cacheKey = this.generateCacheKey(context);

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      context.logger.info('Cache hit', { key: cacheKey });
      return cached.data;
    }

    // Execute handler
    const result = await next();

    // Store in cache (5 minute TTL)
    this.cache.set(cacheKey, {
      data: result,
      expiresAt: Date.now() + 5 * 60 * 1000
    });

    return result;
  }

  private generateCacheKey(context: ExecutionContext): string {
    const toolName = context.toolName || 'unknown';
    const input = JSON.stringify(context.metadata?.input || {});
    return `${toolName}:${input}`;
  }
}
```

### Error Response Formatting

```typescript
@Interceptor()
export class ErrorFormatInterceptor implements InterceptorInterface {
  async intercept(context: ExecutionContext, next: () => Promise<any>): Promise<any> {
    try {
      return await next();
    } catch (error) {
      return {
        success: false,
        error: {
          code: this.getErrorCode(error),
          message: error instanceof Error ? error.message : 'An error occurred',
          timestamp: new Date().toISOString(),
          requestId: context.metadata?.requestId
        }
      };
    }
  }

  private getErrorCode(error: unknown): string {
    if (error instanceof ValidationError) return 'VALIDATION_ERROR';
    if (error instanceof NotFoundError) return 'NOT_FOUND';
    if (error instanceof UnauthorizedError) return 'UNAUTHORIZED';
    return 'INTERNAL_ERROR';
  }
}
```

### Pagination Wrapper

```typescript
@Interceptor()
export class PaginationInterceptor implements InterceptorInterface {
  async intercept(context: ExecutionContext, next: () => Promise<any>): Promise<any> {
    const result = await next();

    // Check if result is paginated data
    if (Array.isArray(result) && context.metadata?.input) {
      const input = context.metadata.input as {
        page?: number;
        limit?: number;
        total?: number;
      };

      const page = input.page || 1;
      const limit = input.limit || 20;

      return {
        data: result,
        pagination: {
          page,
          limit,
          total: input.total || result.length,
          hasMore: result.length === limit
        }
      };
    }

    return result;
  }
}
```

## Dependency Injection

Interceptors support dependency injection:

```typescript
import { Injectable, Interceptor, InterceptorInterface } from '@nitrostack/core';

@Injectable()
@Interceptor()
export class AuditInterceptor implements InterceptorInterface {
  constructor(
    private auditService: AuditService,
    private configService: ConfigService
  ) {}

  async intercept(context: ExecutionContext, next: () => Promise<any>): Promise<any> {
    const startTime = Date.now();
    const shouldAudit = this.configService.get('ENABLE_AUDIT', true);

    const result = await next();

    if (shouldAudit) {
      await this.auditService.record({
        action: context.toolName,
        userId: context.auth?.subject,
        duration: Date.now() - startTime,
        timestamp: new Date()
      });
    }

    return result;
  }
}
```

## Best Practices

### 1. Do Not Mutate Original Data

Return new objects instead of modifying the original:

```typescript
// Correct: Return new object
async intercept(context, next) {
  const result = await next();
  return {
    ...result,
    transformed: true
  };
}

// Incorrect: Mutating original
async intercept(context, next) {
  const result = await next();
  result.transformed = true;  // Mutation
  return result;
}
```

### 2. Handle Errors Gracefully

Decide whether to catch errors or let them propagate:

```typescript
// Transform errors
async intercept(context, next) {
  try {
    return await next();
  } catch (error) {
    return { error: true, message: error.message };
  }
}

// Or propagate with logging
async intercept(context, next) {
  try {
    return await next();
  } catch (error) {
    context.logger.error('Interceptor caught error', { error });
    throw error;  // Re-throw for upstream handling
  }
}
```

### 3. Keep Interceptors Focused

Each interceptor should have a single transformation purpose:

```typescript
// Correct: Focused interceptors
@Interceptor()
export class ResponseWrapperInterceptor { /* Wraps responses */ }

@Interceptor()
export class DataMaskingInterceptor { /* Masks sensitive data */ }

// Incorrect: Combined responsibilities
@Interceptor()
export class DoEverythingInterceptor {
  async intercept(context, next) {
    // Wrapping + masking + caching + logging
  }
}
```

### 4. Document Transformations

Clearly document what the interceptor modifies:

```typescript
/**
 * Response Wrapper Interceptor
 *
 * Transforms handler output into standardized response format:
 * {
 *   success: boolean,
 *   data: T,
 *   metadata: { tool, requestId, timestamp, duration }
 * }
 */
@Interceptor()
export class ResponseWrapperInterceptor implements InterceptorInterface {
  // Implementation
}
```

## Related Documentation

- [Middleware Guide](./07-middleware-guide.md) - Request/response pipeline
- [Pipes Guide](./10-pipes-guide.md) - Input validation
- [Error Handling](./13-error-handling.md) - Exception filters
