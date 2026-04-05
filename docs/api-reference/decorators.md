# Decorators API Reference

This document provides a comprehensive reference for all decorators available in NitroStack.

## Table of Contents

- [MCP Primitives](#mcp-primitives)
- [Module System](#module-system)
- [Middleware Pipeline](#middleware-pipeline)
- [Caching and Rate Limiting](#caching-and-rate-limiting)
- [Dependency Injection](#dependency-injection)
- [UI Components](#ui-components)

## MCP Primitives

### @Tool

Defines an MCP tool that AI models can invoke.

```typescript
import { ToolDecorator as Tool, z, ExecutionContext } from '@nitrostack/core';

@Tool(options: ToolOptions)
```

**Options:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | `string` | Yes | Unique tool identifier (snake_case recommended) |
| `title` | `string` | No | Human-readable display name |
| `description` | `string` | Yes | Clear description of the tool's purpose |
| `inputSchema` | `ZodObject` | No | Zod schema for input validation |
| `outputSchema` | `ZodObject` | No | Zod schema for output validation |
| `annotations` | `ToolAnnotations` | No | Behavioral hints for AI models |
| `invocation` | `ToolInvocationMessages` | No | UI status messages during execution |
| `examples` | `object` | No | Example request/response for AI guidance and widget preview |

**ToolInvocationMessages:**

| Property | Type | Description |
|----------|------|-------------|
| `invoking` | `string` | Message shown while tool is executing (e.g., "Loading...") |
| `invoked` | `string` | Message shown when tool completes (e.g., "Done") |

**ToolAnnotations:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `destructiveHint` | `boolean` | `true` | May perform destructive updates |
| `idempotentHint` | `boolean` | `false` | Safe to retry with same arguments |
| `readOnlyHint` | `boolean` | `false` | Does not modify state |
| `openWorldHint` | `boolean` | `true` | May interact with external systems |

**Example:**

```typescript
@Tool({
  name: 'create_user',
  title: 'Create User Account',
  description: 'Create a new user account with email and profile information',
  inputSchema: z.object({
    email: z.string().email().describe('User email address'),
    name: z.string().min(2).describe('Full name'),
    role: z.enum(['user', 'admin']).optional().describe('User role')
  }),
  outputSchema: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string()
  }),
  annotations: {
    destructiveHint: false,
    idempotentHint: false,
    readOnlyHint: false,
    openWorldHint: false
  },
  examples: {
    request: { email: 'user@example.com', name: 'Jane Doe' },
    response: { id: 'usr_123', email: 'user@example.com', name: 'Jane Doe' }
  }
})
async createUser(input: CreateUserInput, ctx: ExecutionContext) {
  return this.userService.create(input);
}
```

### @Resource

Defines an MCP resource that provides data to AI models.

```typescript
import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';

@Resource(options: ResourceOptions)
```

**Options:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `uri` | `string` | Yes | URI template with optional parameters |
| `name` | `string` | Yes | Human-readable resource name |
| `title` | `string` | No | Human-readable display title |
| `description` | `string` | Yes | Description of what data the resource provides |
| `mimeType` | `string` | No | Content MIME type (default: 'text/plain') |
| `size` | `number` | No | Size in bytes (for binary resources) |
| `annotations` | `ResourceAnnotations` | No | Metadata hints for clients |
| `examples` | `object` | No | Example response |

**ResourceAnnotations:**

| Property | Type | Description |
|----------|------|-------------|
| `audience` | `('user' \| 'assistant')[]` | Who should see this resource |
| `priority` | `number` | Importance (0.0-1.0, higher = more important) |
| `lastModified` | `string` | ISO 8601 timestamp of last modification |

**Example:**

```typescript
@Resource({
  uri: 'user://{userId}/profile',
  name: 'User Profile',
  title: 'User Profile Details',
  description: 'Complete user profile with preferences and settings',
  mimeType: 'application/json',
  annotations: {
    audience: ['user', 'assistant'],
    priority: 0.8,
    lastModified: '2024-01-15T10:30:00Z'
  }
})
async getUserProfile(uri: string, ctx: ExecutionContext) {
  const userId = uri.match(/user:\/\/([^\/]+)/)?.[1];
  const profile = await this.userService.getProfile(userId);
  return {
    contents: [{
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(profile, null, 2)
    }]
  };
}
```

### @Prompt

Defines an MCP prompt template for AI conversations.

```typescript
import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

@Prompt(options: PromptOptions)
```

**Options:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | `string` | Yes | Unique prompt identifier |
| `title` | `string` | No | Human-readable display title |
| `description` | `string` | Yes | Description of the prompt's purpose |
| `arguments` | `Array` | No | Input parameters for the prompt |

**Example:**

```typescript
@Prompt({
  name: 'code_review',
  title: 'Code Review Assistant',
  description: 'Generate a code review request with best practices checklist',
  arguments: [
    { name: 'language', description: 'Programming language', required: true },
    { name: 'focus', description: 'Review focus areas', required: false }
  ]
})
async getCodeReviewPrompt(args: { language: string; focus?: string }, ctx: ExecutionContext) {
  return [{
    role: 'user' as const,
    content: `Review this ${args.language} code focusing on: ${args.focus || 'general best practices'}`
  }];
}
```

## Module System

### @Module

Defines a module that groups related functionality.

```typescript
import { Module } from '@nitrostack/core';

@Module(options: ModuleOptions)
```

**Options:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | `string` | Yes | Unique module identifier |
| `description` | `string` | No | Module description |
| `controllers` | `Class[]` | No | Tool, resource, and prompt classes |
| `providers` | `Class[]` | No | Services for dependency injection |
| `imports` | `Module[]` | No | Modules to import |
| `exports` | `Class[]` | No | Providers to export |
| `global` | `boolean` | No | If true, providers are available globally |

**Example:**

```typescript
@Module({
  name: 'users',
  description: 'User management module',
  controllers: [UserTools, UserResources],
  providers: [UserService, UserRepository],
  imports: [DatabaseModule],
  exports: [UserService]
})
export class UsersModule {}
```

### @McpApp

Marks the root application module with server configuration.

```typescript
import { McpApp, Module } from '@nitrostack/core';

@McpApp(options: McpAppOptions)
```

**Options:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `module` | `Class` | Yes | Reference to the root module class |
| `server` | `object` | Yes | Server name and version |
| `logging` | `object` | No | Logging configuration |

**Example:**

```typescript
@McpApp({
  module: AppModule,
  server: {
    name: 'my-mcp-server',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  imports: [ConfigModule.forRoot(), UsersModule]
})
export class AppModule {}
```

## Middleware Pipeline

### @UseGuards

Applies guards for authentication and authorization.

```typescript
import { UseGuards } from '@nitrostack/core';

@UseGuards(...guards: GuardConstructor[])
```

**Example:**

```typescript
@Tool({ name: 'admin_action' })
@UseGuards(JWTGuard, AdminGuard)
async adminAction(input: AdminInput, ctx: ExecutionContext) {
  // Only authenticated admins can access
}
```

### @UseMiddleware

Applies middleware for cross-cutting concerns.

```typescript
import { UseMiddleware } from '@nitrostack/core';

@UseMiddleware(...middleware: MiddlewareConstructor[])
```

**Example:**

```typescript
@Tool({ name: 'tracked_operation' })
@UseMiddleware(LoggingMiddleware, TimingMiddleware)
async trackedOperation(input: OperationInput, ctx: ExecutionContext) {
  // Middleware runs before and after
}
```

### @UseInterceptors

Applies interceptors for response transformation.

```typescript
import { UseInterceptors } from '@nitrostack/core';

@UseInterceptors(...interceptors: InterceptorConstructor[])
```

**Example:**

```typescript
@Tool({ name: 'get_data' })
@UseInterceptors(ResponseWrapperInterceptor, DataMaskingInterceptor)
async getData(input: DataInput, ctx: ExecutionContext) {
  return { sensitiveField: 'value' };
  // Response transformed and masked by interceptors
}
```

### @UsePipes

Applies pipes for input validation and transformation.

```typescript
import { UsePipes } from '@nitrostack/core';

@UsePipes(...pipes: PipeConstructor[])
```

**Example:**

```typescript
@Tool({ name: 'search' })
@UsePipes(TrimPipe, ValidationPipe)
async search(input: { query: string }, ctx: ExecutionContext) {
  // Input is trimmed and validated
}
```

### @UseFilters

Applies exception filters for error handling.

```typescript
import { UseFilters } from '@nitrostack/core';

@UseFilters(...filters: ExceptionFilterConstructor[])
```

**Example:**

```typescript
@Tool({ name: 'risky_operation' })
@UseFilters(GlobalExceptionFilter)
async riskyOperation(input: RiskyInput, ctx: ExecutionContext) {
  // Errors caught and formatted by filter
}
```

## Caching and Rate Limiting

### @Cache

Caches tool responses for improved performance.

```typescript
import { Cache } from '@nitrostack/core';

@Cache(options: CacheOptions)
```

**Options:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `ttl` | `number` | Yes | Time to live in seconds |
| `key` | `function` | No | Custom cache key generator |
| `invalidateOn` | `string[]` | No | Events that invalidate the cache |

**Example:**

```typescript
@Tool({ name: 'get_product' })
@Cache({
  ttl: 300,
  key: (input) => `product:${input.productId}`,
  invalidateOn: ['product.updated']
})
async getProduct(input: { productId: string }, ctx: ExecutionContext) {
  return this.productService.findById(input.productId);
}
```

### @RateLimit

Limits request rate to prevent abuse.

```typescript
import { RateLimit } from '@nitrostack/core';

@RateLimit(options: RateLimitOptions)
```

**Options:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `requests` | `number` | Yes | Maximum requests allowed |
| `window` | `string` | Yes | Time window ('1m', '1h', '1d') |
| `key` | `function` | No | Custom rate limit key (e.g., per-user) |
| `message` | `string` | No | Custom error message |

**Example:**

```typescript
@Tool({ name: 'send_email' })
@RateLimit({
  requests: 10,
  window: '1m',
  key: (ctx) => ctx.auth?.subject || 'anonymous',
  message: 'Email rate limit exceeded. Please wait.'
})
async sendEmail(input: EmailInput, ctx: ExecutionContext) {
  return this.emailService.send(input);
}
```

## Dependency Injection

### @Injectable

Marks a class for dependency injection.

```typescript
import { Injectable } from '@nitrostack/core';

@Injectable()
```

**Example:**

```typescript
@Injectable()
export class UserService {
  constructor(
    private db: DatabaseService,
    private cache: CacheService
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.db.query('SELECT * FROM users WHERE id = $1', [id]);
  }
}
```

### @Middleware

Marks a class as middleware.

```typescript
import { Middleware, MiddlewareInterface } from '@nitrostack/core';

@Middleware()
export class LoggingMiddleware implements MiddlewareInterface {
  async use(context: ExecutionContext, next: () => Promise<any>): Promise<any> {
    // Implementation
  }
}
```

### @Interceptor

Marks a class as an interceptor.

```typescript
import { Interceptor, InterceptorInterface } from '@nitrostack/core';

@Interceptor()
export class TransformInterceptor implements InterceptorInterface {
  async intercept(context: ExecutionContext, next: () => Promise<any>): Promise<any> {
    // Implementation
  }
}
```

### @Pipe

Marks a class as a pipe.

```typescript
import { Pipe, PipeInterface } from '@nitrostack/core';

@Pipe()
export class ValidationPipe implements PipeInterface {
  transform(value: any, metadata?: ArgumentMetadata): any {
    // Implementation
  }
}
```

### @ExceptionFilter

Marks a class as an exception filter.

```typescript
import { ExceptionFilter, ExceptionFilterInterface } from '@nitrostack/core';

@ExceptionFilter()
export class HttpExceptionFilter implements ExceptionFilterInterface {
  catch(exception: unknown, context: ExecutionContext): any {
    // Implementation
  }
}
```

## UI Components

### @Widget

Attaches a UI widget to a tool. The widget is a Next.js page component that renders the tool's output.

```typescript
import { Widget } from '@nitrostack/core';

@Widget(routePath: string | WidgetRouteMetadata)
```

**Overload — string (backward compatible):**

| Parameter | Type | Description |
|-----------|------|-------------|
| `routePath` | `string` | Non-empty widget route matching `src/widgets/app/{routePath}/page.tsx` |

**Overload — object (`WidgetRouteMetadata`):**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `route` | `string` | Yes | Widget route path (non-empty). |
| `csp` | `WidgetCspOptions` | No | CSP allowlists for hosted iframes. |
| `csp.resourceDomains` | `string[]` | No | Image/font/script URLs (`openai/widgetCSP.resource_domains`). |
| `csp.connectDomains` | `string[]` | No | `fetch` / XHR targets (`connect_domains`). |
| `csp.frameDomains` | `string[]` | No | Nested iframe origins (`frame_domains`). |
| `domain` | `string` | No | HTTPS origin for widget sandbox (`openai/widgetDomain`). |
| `prefersBorder` | `boolean` | No | Host may draw a border (`openai/widgetPrefersBorder`). |

Object form without a valid `route` throws at decorator evaluation time.

**Basic Example:**

```typescript
@Tool({ name: 'get_chart_data' })
@Widget('chart-visualization')
async getChartData(input: ChartInput, ctx: ExecutionContext) {
  return this.chartService.getData(input);
  // Widget at src/widgets/app/chart-visualization/page.tsx renders result
}
```

**Example with CSP and domain:**

```typescript
@Tool({ name: 'get_chart_data' })
@Widget({
  route: 'chart-visualization',
  prefersBorder: true,
  domain: 'https://myapp.example.com',
  csp: {
    resourceDomains: ['https://images.unsplash.com'],
    connectDomains: ['https://api.example.com'],
  },
})
async getChartData(input: ChartInput, ctx: ExecutionContext) {
  return this.chartService.getData(input);
}
```

See **[Widget Content Security Policy](../guides/widget-content-security-policy.md)** for how CSP is emitted on tool and resource metadata.

**Complete Example with Invocation Messages:**

```typescript
@Tool({
  name: 'get_dashboard',
  title: 'User Dashboard',
  description: 'Get user dashboard with stats',
  inputSchema: z.object({ userId: z.string() }),
  // Status messages shown during execution
  invocation: {
    invoking: 'Loading dashboard...',
    invoked: 'Dashboard ready'
  },
  // Example data for widget preview (IMPORTANT!)
  examples: {
    request: { userId: 'user-123' },
    response: {
      user: { name: 'John', email: 'john@example.com' },
      stats: { orders: 42, totalSpent: 1234.56 }
    }
  }
})
@Widget('user-dashboard')
async getDashboard(input: { userId: string }, ctx: ExecutionContext) {
  return { user: {...}, stats: {...} };
}
```

> **Note:** The `examples.response` data is used by clients to render widget previews. Always provide realistic example data matching your response structure.

### @HealthCheck

Defines a health check for system monitoring.

```typescript
import { HealthCheck, HealthCheckInterface } from '@nitrostack/core';

@HealthCheck(options: HealthCheckOptions)
```

**Options:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | `string` | Yes | Health check identifier |
| `description` | `string` | No | Description of what is checked |
| `interval` | `number` | No | Check interval in seconds |

**Example:**

```typescript
@HealthCheck({
  name: 'database',
  description: 'Database connectivity check',
  interval: 30
})
export class DatabaseHealthCheck implements HealthCheckInterface {
  async check(): Promise<HealthCheckResult> {
    const isHealthy = await this.db.ping();
    return {
      status: isHealthy ? 'up' : 'down',
      message: isHealthy ? 'Database connected' : 'Database unreachable'
    };
  }
}
```

### @OnEvent

Subscribes to events.

```typescript
import { OnEvent } from '@nitrostack/core';

@OnEvent(eventName: string)
```

**Example:**

```typescript
@Injectable()
export class NotificationService {
  @OnEvent('order.created')
  async handleOrderCreated(data: OrderCreatedEvent): Promise<void> {
    await this.emailService.sendOrderConfirmation(data.userId, data.orderId);
  }
}
```

## Related Documentation

- [Tools Guide](../sdk/typescript/04-tools-guide.md) - Detailed tool development patterns
- [Resources Guide](../sdk/typescript/05-resources-guide.md) - Resource development and subscriptions
- [Prompts Guide](../sdk/typescript/06-prompts-guide.md) - Prompt template creation
- [Middleware Guide](../sdk/typescript/07-middleware-guide.md) - Middleware pipeline
- [Guards Guide](./guards.md) - Access control patterns
- [Interceptors Guide](./interceptors.md) - Response transformation
- [Pipes Guide](./pipes.md) - Input validation and transformation
- [Caching Guide](../sdk/typescript/caching-guide.md) - Caching strategies
- [Rate Limiting Guide](../sdk/typescript/rate-limiting-guide.md) - Rate limiting patterns
- [Events Guide](../sdk/typescript/15-events-guide.md) - Event-driven architecture
- [Dependency Injection](../sdk/typescript/12-dependency-injection.md) - Service injection
