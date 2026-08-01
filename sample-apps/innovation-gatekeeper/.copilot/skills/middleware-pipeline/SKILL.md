---
name: nitrostack-middleware-pipeline
description: Best practices for implementing and applying Guards, Interceptors, Middleware, Pipes, and Exception Filters in the NitroStack SDK.
---

## When to Use
Use this skill when implementing request validation, authorization checks, response mapping, logging, error handling, or performance tracking on NitroStack tool methods.

---

## 1. Guards (`Guard` and `@UseGuards`)
Guards determine if a request should be processed by a tool handler based on authentication, authorization, or other conditions.

### Interface:
```typescript
import { Guard, ExecutionContext } from '@nitrostack/core';

export interface Guard {
  canActivate(context: ExecutionContext): boolean | Promise<boolean>;
}
```

### Example:
```typescript
import { Guard, ExecutionContext, Injectable } from '@nitrostack/core';

@Injectable()
export class RolesGuard implements Guard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const userRoles = context.clientMetadata?.roles || [];
    return userRoles.includes('admin');
  }
}
```

Apply the guard using `@UseGuards(...)`:
```typescript
import { Tool, UseGuards, z } from '@nitrostack/core';
import { RolesGuard } from './roles.guard.js';

export class AdminTools {
  @Tool({
    name: 'delete_system_logs',
    description: 'Delete all system logs from the server.',
    inputSchema: z.object({}),
  })
  @UseGuards(RolesGuard)
  async deleteLogs() {
    return { success: true };
  }
}
```

---

## 2. Interceptors (`InterceptorInterface` and `@UseInterceptors`)
Interceptors can transform/intercept input arguments or mapped output from a tool method execution.

### Interface:
```typescript
import { ExecutionContext } from '@nitrostack/core';

export interface InterceptorInterface {
  intercept(context: ExecutionContext, next: () => Promise<unknown>): Promise<unknown>;
}
```

### Example:
```typescript
import { InterceptorInterface, ExecutionContext, Injectable } from '@nitrostack/core';

@Injectable()
export class TimingInterceptor implements InterceptorInterface {
  async intercept(context: ExecutionContext, next: () => Promise<unknown>): Promise<unknown> {
    const start = Date.now();
    const result = await next();
    const duration = Date.now() - start;
    context.logger.info(`Execution took ${duration}ms`);
    return {
      ...result,
      _meta: { durationMs: duration }
    };
  }
}
```

---

## 3. Exception Filters (`ExceptionFilterInterface` and `@UseFilters`)
Exception filters catch any errors thrown within guards, interceptors, or the tool handlers themselves, mapping them into user-friendly JSON payloads.

### Interface:
```typescript
import { ExecutionContext } from '@nitrostack/core';

export interface ExceptionFilterInterface {
  catch(exception: unknown, context: ExecutionContext): unknown | Promise<unknown>;
}
```

### Example:
```typescript
import { ExceptionFilterInterface, ExecutionContext, Injectable } from '@nitrostack/core';

@Injectable()
export class CustomExceptionFilter implements ExceptionFilterInterface {
  catch(exception: unknown, context: ExecutionContext) {
    const message = exception instanceof Error ? exception.message : 'Unknown error';
    return {
      error: true,
      message,
      timestamp: new Date().toISOString()
    };
  }
}
```

Apply the filter using `@UseFilters(...)` on a tool method:

```typescript
import { Tool, UseFilters, z } from '@nitrostack/core';
import { CustomExceptionFilter } from './custom-exception.filter.js';

export class LoggingTools {
  @Tool({
    name: 'generate_report',
    description: 'Generates system usage reports.',
    inputSchema: z.object({}),
  })
  @UseFilters(CustomExceptionFilter)
  async generateReport() {
    throw new Error('Report generation is not implemented yet.');
  }
}
```

---

## 4. Middleware (`MiddlewareInterface`, `@Middleware` and `@UseMiddleware`)
Middleware executes before the request reaches the tool handler, and can wrap the handler execution by invoking `next()`.

### Interface:
```typescript
import { ExecutionContext } from '@nitrostack/core';

export interface MiddlewareInterface {
  use(context: ExecutionContext, next: () => Promise<unknown>): Promise<unknown>;
}
```

### Example:
```typescript
import { Middleware, MiddlewareInterface, ExecutionContext } from '@nitrostack/core';

@Middleware()
export class LoggingMiddleware implements MiddlewareInterface {
  async use(context: ExecutionContext, next: () => Promise<unknown>): Promise<unknown> {
    context.logger.info(`Entering tool: ${context.toolName}`);
    try {
      const result = await next();
      context.logger.info(`Exiting tool: ${context.toolName}`);
      return result;
    } catch (error) {
      context.logger.error(`Error in tool: ${error}`);
      throw error;
    }
  }
}
```

Apply the middleware using `@UseMiddleware(...)` on a tool method:
```typescript
import { Tool, UseMiddleware, z } from '@nitrostack/core';
import { LoggingMiddleware } from './logging.middleware.js';

export class StationTools {
  @Tool({
    name: 'fetch_logs',
    description: 'Fetch station operations logs.',
    inputSchema: z.object({}),
  })
  @UseMiddleware(LoggingMiddleware)
  async fetchLogs() {
    return { status: 'operational' };
  }
}
```

---

## 5. Pipes (`PipeInterface`, `@Pipe` and `@UsePipes`)
Pipes are used to transform or validate input arguments before they reach the tool handler method.

### Interface:
```typescript
import { ArgumentMetadata } from '@nitrostack/core';

export interface PipeInterface<T = unknown, R = unknown> {
  transform(value: T, metadata: ArgumentMetadata): R | Promise<R>;
}
```

### Example:
```typescript
import { Pipe, PipeInterface, ArgumentMetadata } from '@nitrostack/core';

@Pipe()
export class TrimPipe implements PipeInterface<Record<string, unknown>, Record<string, unknown>> {
  transform(value: Record<string, unknown>, metadata: ArgumentMetadata) {
    const trimmed: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      trimmed[key] = typeof val === 'string' ? val.trim() : val;
    }
    return trimmed;
  }
}
```

Apply the pipe using `@UsePipes(...)` on a tool method:
```typescript
import { Tool, UsePipes, z } from '@nitrostack/core';
import { TrimPipe } from './trim.pipe.js';

export class MessagingTools {
  @Tool({
    name: 'send_message',
    description: 'Send a message to other stations.',
    inputSchema: z.object({ text: z.string() }),
  })
  @UsePipes(TrimPipe)
  async sendMessage(input: { text: string }) {
    return { sentText: input.text };
  }
}
```
