# Middleware Guide

## Overview

Middleware functions execute before and after tool, resource, and prompt handlers. They enable cross-cutting concerns such as logging, timing, authentication verification, request transformation, and error handling.

Middleware follows the "onion model" where each layer wraps around the next, with the handler at the center.

## Table of Contents

- [Creating Middleware](#creating-middleware)
- [Using Middleware](#using-middleware)
- [Execution Order](#execution-order)
- [Common Patterns](#common-patterns)
- [Dependency Injection](#dependency-injection)
- [Best Practices](#best-practices)

## Creating Middleware

### Basic Middleware

Middleware implements the `MiddlewareInterface`:

```typescript
import { Middleware, MiddlewareInterface, ExecutionContext } from '@nitrostack/core';

@Middleware()
export class LoggingMiddleware implements MiddlewareInterface {
  async use(context: ExecutionContext, next: () => Promise<any>): Promise<any> {
    const startTime = Date.now();
    const toolName = context.toolName || 'unknown';

    context.logger.info(`Request started: ${toolName}`, {
      requestId: context.requestId,
      timestamp: new Date().toISOString()
    });

    try {
      // Execute next middleware or handler
      const result = await next();

      const duration = Date.now() - startTime;
      context.logger.info(`Request completed: ${toolName}`, {
        requestId: context.requestId,
        duration,
        success: true
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      context.logger.error(`Request failed: ${toolName}`, {
        requestId: context.requestId,
        duration,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}
```

### Middleware Interface

```typescript
interface MiddlewareInterface {
  use(context: ExecutionContext, next: () => Promise<any>): Promise<any>;
}
```

**Parameters:**
- `context`: The execution context with auth, logger, and metadata
- `next`: Function to call the next middleware or handler

**Return:** The result from the handler (possibly transformed)

## Using Middleware

### On Individual Methods

```typescript
import { ToolDecorator as Tool, UseMiddleware } from '@nitrostack/core';
import { LoggingMiddleware } from './middleware/logging.middleware.js';

export class ProductTools {
  @Tool({ name: 'get_product' })
  @UseMiddleware(LoggingMiddleware)
  async getProduct(input: { productId: string }, ctx: ExecutionContext) {
    return this.productService.findById(input.productId);
  }
}
```

### Multiple Middleware

```typescript
import { TimingMiddleware } from './middleware/timing.middleware.js';
import { ValidationMiddleware } from './middleware/validation.middleware.js';

@Tool({ name: 'create_order' })
@UseMiddleware(LoggingMiddleware, TimingMiddleware, ValidationMiddleware)
async createOrder(input: CreateOrderInput, ctx: ExecutionContext) {
  return this.orderService.create(input);
}
```

## Execution Order

Middleware executes in declaration order, forming a pipeline:

```
Request
    │
    ▼
LoggingMiddleware (before)
    │
    ▼
TimingMiddleware (before)
    │
    ▼
ValidationMiddleware (before)
    │
    ▼
    Handler Execution
    │
    ▼
ValidationMiddleware (after)
    │
    ▼
TimingMiddleware (after)
    │
    ▼
LoggingMiddleware (after)
    │
    ▼
Response
```

### Order Matters

```typescript
// Recommended order:
@UseMiddleware(
  RequestIdMiddleware,      // 1. Generate request ID first
  LoggingMiddleware,        // 2. Log with request ID
  AuthenticationMiddleware, // 3. Verify authentication
  ValidationMiddleware      // 4. Validate input
)
```

## Common Patterns

### Request ID Generation

```typescript
@Middleware()
export class RequestIdMiddleware implements MiddlewareInterface {
  private counter = 0;

  async use(context: ExecutionContext, next: () => Promise<any>): Promise<any> {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    const sequence = (++this.counter).toString(36).padStart(4, '0');

    const requestId = `req_${timestamp}_${random}_${sequence}`;

    // Store in metadata for downstream use
    if (context.metadata) {
      context.metadata.requestId = requestId;
      context.metadata.requestTimestamp = new Date().toISOString();
    }

    return next();
  }
}
```

### Performance Timing

```typescript
@Middleware()
export class TimingMiddleware implements MiddlewareInterface {
  private static readonly SLOW_THRESHOLD_MS = 1000;

  async use(context: ExecutionContext, next: () => Promise<any>): Promise<any> {
    const startTime = process.hrtime.bigint();

    try {
      const result = await next();

      this.recordTiming(context, startTime);
      return result;
    } catch (error) {
      this.recordTiming(context, startTime);
      throw error;
    }
  }

  private recordTiming(context: ExecutionContext, startTime: bigint): void {
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1_000_000;

    if (context.metadata) {
      context.metadata.executionTimeMs = durationMs;
    }

    if (durationMs > TimingMiddleware.SLOW_THRESHOLD_MS) {
      context.logger.warn('Slow request detected', {
        toolName: context.toolName,
        duration: durationMs,
        threshold: TimingMiddleware.SLOW_THRESHOLD_MS
      });
    }
  }
}
```

### Error Handling

```typescript
@Middleware()
export class ErrorHandlingMiddleware implements MiddlewareInterface {
  async use(context: ExecutionContext, next: () => Promise<any>): Promise<any> {
    try {
      return await next();
    } catch (error) {
      // Log error with context
      context.logger.error('Request error', {
        toolName: context.toolName,
        requestId: context.metadata?.requestId,
        error: this.serializeError(error)
      });

      // Transform error for client
      if (error instanceof ValidationError) {
        return {
          error: true,
          code: 'VALIDATION_ERROR',
          message: error.message,
          details: error.details
        };
      }

      if (error instanceof NotFoundError) {
        return {
          error: true,
          code: 'NOT_FOUND',
          message: error.message
        };
      }

      // Unknown errors
      return {
        error: true,
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      };
    }
  }

  private serializeError(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }
    return { value: String(error) };
  }
}
```

### Request Context Enrichment

```typescript
@Middleware()
export class ContextEnrichmentMiddleware implements MiddlewareInterface {
  async use(context: ExecutionContext, next: () => Promise<any>): Promise<any> {
    if (context.metadata) {
      // Add environment information
      context.metadata.environment = process.env.NODE_ENV || 'development';
      context.metadata.serverVersion = process.env.APP_VERSION || '1.0.0';

      // Add user context if authenticated
      if (context.auth?.subject) {
        context.metadata.userId = context.auth.subject;
        context.metadata.userRoles = context.auth.roles || [];
      }
    }

    return next();
  }
}
```

### Conditional Processing

```typescript
@Middleware()
export class ConditionalMiddleware implements MiddlewareInterface {
  private readonly skipTools = ['health_check', 'ping', 'version'];

  async use(context: ExecutionContext, next: () => Promise<any>): Promise<any> {
    // Skip middleware for certain tools
    if (this.skipTools.includes(context.toolName || '')) {
      return next();
    }

    // Apply middleware logic only for non-skipped tools
    context.logger.info('Processing request', {
      toolName: context.toolName
    });

    return next();
  }
}
```

### Metrics Collection

```typescript
import { Injectable } from '@nitrostack/core';

@Injectable()
@Middleware()
export class MetricsMiddleware implements MiddlewareInterface {
  private requestCounts = new Map<string, number>();
  private errorCounts = new Map<string, number>();
  private totalDuration = new Map<string, number>();

  async use(context: ExecutionContext, next: () => Promise<any>): Promise<any> {
    const toolName = context.toolName || 'unknown';
    const startTime = Date.now();

    // Increment request count
    this.requestCounts.set(toolName, (this.requestCounts.get(toolName) || 0) + 1);

    try {
      const result = await next();

      // Record duration
      const duration = Date.now() - startTime;
      this.totalDuration.set(toolName, (this.totalDuration.get(toolName) || 0) + duration);

      return result;
    } catch (error) {
      // Increment error count
      this.errorCounts.set(toolName, (this.errorCounts.get(toolName) || 0) + 1);
      throw error;
    }
  }

  getMetrics(): Record<string, unknown> {
    const tools: Record<string, unknown> = {};

    for (const [tool, count] of this.requestCounts) {
      tools[tool] = {
        requests: count,
        errors: this.errorCounts.get(tool) || 0,
        avgDuration: (this.totalDuration.get(tool) || 0) / count
      };
    }

    return { tools };
  }
}
```

## Dependency Injection

Middleware can use dependency injection:

```typescript
import { Injectable, Middleware, MiddlewareInterface } from '@nitrostack/core';

@Injectable()
@Middleware()
export class AuditMiddleware implements MiddlewareInterface {
  constructor(
    private auditService: AuditService,
    private configService: ConfigService
  ) {}

  async use(context: ExecutionContext, next: () => Promise<any>): Promise<any> {
    const shouldAudit = this.configService.get('ENABLE_AUDIT_LOG', true);

    if (!shouldAudit) {
      return next();
    }

    const startTime = Date.now();
    const auditEntry = {
      toolName: context.toolName,
      userId: context.auth?.subject,
      requestId: context.metadata?.requestId,
      timestamp: new Date().toISOString()
    };

    try {
      const result = await next();

      await this.auditService.log({
        ...auditEntry,
        status: 'success',
        duration: Date.now() - startTime
      });

      return result;
    } catch (error) {
      await this.auditService.log({
        ...auditEntry,
        status: 'error',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      });

      throw error;
    }
  }
}
```

## Best Practices

### 1. Always Call next()

Middleware must call `next()` to continue the pipeline:

```typescript
// Correct: Always call next()
async use(context: ExecutionContext, next: () => Promise<any>): Promise<any> {
  // Pre-processing
  const result = await next();  // Required
  // Post-processing
  return result;
}

// Incorrect: Missing next() call
async use(context: ExecutionContext, next: () => Promise<any>): Promise<any> {
  return { error: 'Blocked' };  // Handler never executes
}
```

### 2. Handle Errors Properly

Always re-throw errors unless intentionally handling them:

```typescript
// Correct: Re-throw errors
async use(context: ExecutionContext, next: () => Promise<any>): Promise<any> {
  try {
    return await next();
  } catch (error) {
    context.logger.error('Error occurred', { error });
    throw error;  // Re-throw for upstream handling
  }
}

// Incorrect: Swallowing errors
async use(context: ExecutionContext, next: () => Promise<any>): Promise<any> {
  try {
    return await next();
  } catch (error) {
    return null;  // Error silently ignored
  }
}
```

### 3. Keep Middleware Focused

Each middleware should have a single responsibility:

```typescript
// Correct: Single responsibility
@Middleware()
export class LoggingMiddleware { /* Only logging */ }

@Middleware()
export class TimingMiddleware { /* Only timing */ }

@Middleware()
export class AuthMiddleware { /* Only auth */ }

// Incorrect: Multiple responsibilities
@Middleware()
export class EverythingMiddleware {
  async use(context, next) {
    // Logging
    // Timing
    // Auth
    // Validation
    // Caching
    // Too much!
  }
}
```

### 4. Use Dependency Injection

Inject services rather than creating instances:

```typescript
// Correct: Use DI
@Injectable()
@Middleware()
export class CacheMiddleware implements MiddlewareInterface {
  constructor(private cacheService: CacheService) {}
}

// Incorrect: Direct instantiation
@Middleware()
export class CacheMiddleware implements MiddlewareInterface {
  private cacheService = new CacheService();  // Untestable
}
```

### 5. Document Side Effects

Clearly document what the middleware modifies:

```typescript
/**
 * Timing Middleware
 *
 * Records execution timing in context.metadata.executionTimeMs
 * Logs warning if execution exceeds 1000ms threshold
 *
 * @modifies context.metadata.executionTimeMs
 */
@Middleware()
export class TimingMiddleware implements MiddlewareInterface {
  // Implementation
}
```

### 6. Order Middleware Thoughtfully

Place middleware in logical order:

```typescript
// Recommended order
@UseMiddleware(
  RequestIdMiddleware,      // First: Creates ID for tracing
  LoggingMiddleware,        // Second: Logs with request ID
  AuthenticationMiddleware, // Third: Verify credentials
  AuthorizationMiddleware,  // Fourth: Check permissions
  ValidationMiddleware,     // Fifth: Validate input
  CachingMiddleware         // Sixth: Check cache
)
```

## Related Documentation

- [Interceptors Guide](./08-interceptors-guide.md) - Response transformation
- [Pipes Guide](./10-pipes-guide.md) - Input validation
- [Error Handling](./13-error-handling.md) - Exception filters
- [Best Practices](./17-best-practices.md) - Architecture guidelines
