# Server Concepts

## Overview

NitroStack provides a NestJS-inspired architecture built around decorators, modules, and dependency injection. This guide covers the fundamental concepts required to build production-ready MCP servers.

## Table of Contents

- [Application Bootstrap](#application-bootstrap)
- [Modules](#modules)
- [Dependency Injection](#dependency-injection)
- [Configuration](#configuration)
- [Execution Context](#execution-context)
- [Lifecycle](#lifecycle)
- [Module Organization](#module-organization)
- [Best Practices](#best-practices)

## Application Bootstrap

### @McpApp Decorator

The `@McpApp` decorator marks your root module and configures the application:

```typescript
import { McpApp, Module, ConfigModule } from '@nitrostack/core';

@McpApp({
  module: AppModule,
  server: {
    name: 'my-mcp-server',
    version: '1.0.0'
  },
  logging: {
    level: 'info',
    file: 'logs/server.log'
  }
})
@Module({
  imports: [
    ConfigModule.forRoot(),
    JWTModule.forRoot({ secret: process.env.JWT_SECRET! }),
    ProductsModule,
    UsersModule
  ]
})
export class AppModule {}
```

### McpApplicationFactory

Bootstrap your application using the factory pattern:

```typescript
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const server = await McpApplicationFactory.create(AppModule);
  await server.start();
}

bootstrap();
```

The factory performs the following initialization sequence:

1. Reads `@McpApp` metadata from the root module
2. Initializes the logging subsystem
3. Configures the dependency injection container
4. Registers all imported modules recursively
5. Builds and registers tools, resources, and prompts
6. Starts the MCP server transport

## Modules

### Module Architecture

Modules organize your application into cohesive, loosely-coupled units. Each module encapsulates related functionality and declares its dependencies explicitly.

```typescript
import { Module } from '@nitrostack/core';

@Module({
  name: 'products',
  description: 'Product catalog management',
  controllers: [ProductsTools, ProductsResources, ProductsPrompts],
  providers: [ProductService, DatabaseService],
  imports: [HttpModule],
  exports: [ProductService]
})
export class ProductsModule {}
```

### Module Properties Reference

| Property | Type | Description | Required |
|----------|------|-------------|----------|
| `name` | `string` | Unique module identifier | Yes |
| `description` | `string` | Human-readable description | No |
| `controllers` | `Class[]` | Tool, resource, and prompt classes | No |
| `providers` | `Class[]` | Services registered with the DI container | No |
| `imports` | `Module[]` | Modules whose exports are available | No |
| `exports` | `Class[]` | Providers available to importing modules | No |
| `global` | `boolean` | If true, providers are available globally | No |

### Controllers

Controllers contain your MCP primitives (tools, resources, and prompts):

```typescript
// products.tools.ts
import { ToolDecorator as Tool, ExecutionContext } from '@nitrostack/core';

export class ProductsTools {
  constructor(private productService: ProductService) {}

  @Tool({
    name: 'get_product',
    description: 'Retrieve product details by ID'
  })
  async getProduct(input: { product_id: string }, ctx: ExecutionContext) {
    return this.productService.findById(input.product_id);
  }
}

// products.resources.ts
import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';

export class ProductsResources {
  constructor(private productService: ProductService) {}

  @Resource({
    uri: 'product://{id}',
    name: 'Product Details',
    mimeType: 'application/json'
  })
  async getProductResource(uri: string, ctx: ExecutionContext) {
    const id = uri.split('://')[1];
    const product = await this.productService.findById(id);
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(product, null, 2)
      }]
    };
  }
}

// products.prompts.ts
import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class ProductsPrompts {
  @Prompt({
    name: 'review_product',
    description: 'Generate a product review prompt'
  })
  async getReviewPrompt(args: { product_id: string }, ctx: ExecutionContext) {
    return [
      {
        role: 'user' as const,
        content: { type: 'text' as const, text: `Review product ${args.product_id}` }
      }
    ];
  }
}
```

### Providers (Services)

Providers encapsulate business logic and can be injected into controllers or other providers:

```typescript
import { Injectable } from '@nitrostack/core';

@Injectable()
export class ProductService {
  constructor(private db: DatabaseService) {}

  async findById(id: string): Promise<Product | null> {
    return this.db.query('SELECT * FROM products WHERE id = $1', [id]);
  }

  async search(query: string, options?: SearchOptions): Promise<Product[]> {
    return this.db.query(
      'SELECT * FROM products WHERE name ILIKE $1 LIMIT $2 OFFSET $3',
      [`%${query}%`, options?.limit ?? 20, options?.offset ?? 0]
    );
  }

  async create(data: CreateProductDto): Promise<Product> {
    const result = await this.db.query(
      'INSERT INTO products (name, price, description) VALUES ($1, $2, $3) RETURNING *',
      [data.name, data.price, data.description]
    );
    return result[0];
  }
}
```

### Module Imports and Exports

**Imports** allow a module to use providers exported by other modules:

```typescript
@Module({
  name: 'orders',
  imports: [ProductsModule, PaymentsModule],  // Use exports from these modules
  controllers: [OrdersTools],
  providers: [OrderService]
})
export class OrdersModule {}
```

**Exports** make providers available to importing modules:

```typescript
@Module({
  name: 'products',
  providers: [ProductService, InternalHelper],
  exports: [ProductService]  // Only ProductService is available to importers
})
export class ProductsModule {}
```

## Dependency Injection

### @Injectable Decorator

Mark classes for dependency injection:

```typescript
import { Injectable } from '@nitrostack/core';

@Injectable()
export class EmailService {
  constructor(private configService: ConfigService) {}

  async send(to: string, subject: string, body: string): Promise<void> {
    const smtpHost = this.configService.get('SMTP_HOST');
    // Implementation
  }
}
```

### Constructor Injection

Dependencies are resolved and injected automatically via constructor parameters:

```typescript
export class UserTools {
  constructor(
    private userService: UserService,
    private emailService: EmailService,
    private auditService: AuditService
  ) {}

  @Tool({ name: 'create_user', description: 'Create a new user account' })
  async createUser(input: CreateUserInput, ctx: ExecutionContext) {
    const user = await this.userService.create(input);
    await this.emailService.send(user.email, 'Welcome', 'Account created');
    await this.auditService.log('user.created', { userId: user.id });
    return user;
  }
}
```

### DI Container Behavior

The dependency injection container:

1. **Resolves dependencies**: Analyzes constructor parameters and resolves types
2. **Creates instances**: Instantiates classes with resolved dependencies
3. **Manages lifecycle**: Services are singleton by default (one instance per application)
4. **Handles circular dependencies**: Detects and reports circular dependency errors

### Provider Scopes

By default, all providers are **singleton** scoped:

```typescript
@Injectable()
export class DatabaseService {
  // Single instance shared across the entire application
  private pool: Pool;

  constructor() {
    this.pool = new Pool(/* config */);
  }
}
```

## Configuration

### ConfigModule

The `ConfigModule` provides centralized configuration management:

```typescript
import { Module, ConfigModule } from '@nitrostack/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
      validate: (config) => {
        const required = ['DATABASE_URL', 'JWT_SECRET'];
        for (const key of required) {
          if (!config[key]) {
            throw new Error(`Missing required environment variable: ${key}`);
          }
        }
        return config;
      }
    })
  ]
})
export class AppModule {}
```

### ConfigService

Access configuration values in your services:

```typescript
import { Injectable, ConfigService } from '@nitrostack/core';

@Injectable()
export class DatabaseService {
  private connectionString: string;

  constructor(private config: ConfigService) {
    this.connectionString = this.config.get('DATABASE_URL');
  }

  getPort(): number {
    return this.config.get('PORT', 3000);  // With default value
  }

  isProduction(): boolean {
    return this.config.get('NODE_ENV') === 'production';
  }
}
```

## Execution Context

Every tool, resource, and prompt handler receives an `ExecutionContext` object:

```typescript
interface ExecutionContext {
  /** Authentication information (populated by guards) */
  auth?: {
    subject?: string;
    token?: string;
    [key: string]: unknown;
  };

  /** Logger instance for structured logging */
  logger: Logger;

  /** Name of the current tool (if applicable) */
  toolName?: string;

  /** Request identifier for tracing */
  requestId: string;

  /** Emit events to registered handlers */
  emit(event: string, data: unknown): void;

  /** Request metadata storage */
  metadata?: Record<string, unknown>;
}
```

**Usage example:**

```typescript
@Tool({ name: 'create_order', description: 'Create a new order' })
@UseGuards(JWTGuard)
async createOrder(input: CreateOrderInput, ctx: ExecutionContext) {
  const userId = ctx.auth?.subject;
  ctx.logger.info('Creating order', { userId, input });

  const order = await this.orderService.create(input, userId);
  ctx.emit('order.created', { orderId: order.id, userId });

  return order;
}
```

## Lifecycle

### Application Lifecycle

1. **Bootstrap**: `McpApplicationFactory.create(AppModule)` is called
2. **Module Registration**: Imports are resolved recursively, providers are registered
3. **DI Container Setup**: Dependency graph is built and validated
4. **Server Initialization**: Tools, resources, and prompts are registered
5. **Server Start**: Transport begins listening for requests

### Request Lifecycle

Each incoming request follows this pipeline:

```
Request Arrives (STDIO/HTTP)
        │
        ▼
  Route to Handler
        │
        ▼
   Middleware (pre)
        │
        ▼
      Guards
        │
        ▼
       Pipes
        │
        ▼
  Handler Execution
        │
        ▼
    Interceptors
        │
        ▼
 Exception Filters
        │
        ▼
  Middleware (post)
        │
        ▼
   Send Response
```

## Module Organization

### Recommended Project Structure

```
src/
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.tools.ts
│   │   ├── auth.service.ts
│   │   └── guards/
│   │       └── jwt.guard.ts
│   ├── products/
│   │   ├── products.module.ts
│   │   ├── products.tools.ts
│   │   ├── products.resources.ts
│   │   ├── products.prompts.ts
│   │   ├── products.service.ts
│   │   └── dto/
│   │       ├── create-product.dto.ts
│   │       └── update-product.dto.ts
│   └── orders/
│       ├── orders.module.ts
│       ├── orders.tools.ts
│       └── orders.service.ts
├── common/
│   ├── middleware/
│   ├── interceptors/
│   ├── pipes/
│   └── filters/
├── app.module.ts
└── index.ts
```

### Feature Modules

Organize code by business domain:

```typescript
// Feature module encapsulates all product-related functionality
@Module({
  name: 'products',
  controllers: [ProductsTools, ProductsResources],
  providers: [ProductService, ProductRepository],
  exports: [ProductService]
})
export class ProductsModule {}
```

### Shared Modules

Create reusable modules for cross-cutting concerns:

```typescript
@Module({
  name: 'database',
  providers: [DatabaseService, TransactionManager],
  exports: [DatabaseService, TransactionManager],
  global: true  // Available to all modules without explicit import
})
export class DatabaseModule {}
```

### Core Module

Essential application-wide services:

```typescript
@Module({
  name: 'core',
  providers: [Logger, CacheService, MetricsService],
  exports: [Logger, CacheService, MetricsService],
  global: true
})
export class CoreModule {}
```

## Best Practices

### 1. Single Responsibility Modules

Each module should focus on a single business domain:

```typescript
// Recommended: Focused modules
ProductsModule   // Product catalog
OrdersModule     // Order processing
UsersModule      // User management
PaymentsModule   // Payment processing

// Avoid: Generic catch-all modules
ToolsModule      // Too broad
UtilsModule      // Unclear purpose
```

### 2. Encapsulate Business Logic in Services

Keep handlers thin; delegate logic to services:

```typescript
// Recommended
export class ProductsTools {
  constructor(private productService: ProductService) {}

  @Tool({ name: 'get_product' })
  async getProduct(input: { id: string }) {
    return this.productService.findById(input.id);
  }
}

// Avoid: Logic in handler
export class ProductsTools {
  @Tool({ name: 'get_product' })
  async getProduct(input: { id: string }) {
    const db = getDatabase();
    const result = await db.query('SELECT * FROM products WHERE id = $1', [input.id]);
    if (!result.rows[0]) throw new Error('Not found');
    return result.rows[0];
  }
}
```

### 3. Explicit Exports

Only export what other modules need:

```typescript
@Module({
  providers: [ProductService, ProductValidator, ProductMapper],
  exports: [ProductService]  // Only expose the service, not internal helpers
})
export class ProductsModule {}
```

### 4. Use ConfigService for Environment Variables

Never access `process.env` directly in services:

```typescript
// Recommended
@Injectable()
export class PaymentService {
  constructor(private config: ConfigService) {}

  private getApiKey(): string {
    return this.config.get('PAYMENT_API_KEY');
  }
}

// Avoid
@Injectable()
export class PaymentService {
  private apiKey = process.env.PAYMENT_API_KEY;  // Not testable
}
```

### 5. Consistent Module Structure

Follow a consistent file naming convention:

```
module-name/
├── module-name.module.ts      # Module definition
├── module-name.tools.ts       # Tool handlers
├── module-name.resources.ts   # Resource handlers
├── module-name.prompts.ts     # Prompt handlers
├── module-name.service.ts     # Business logic
├── module-name.repository.ts  # Data access (optional)
└── dto/                       # Data transfer objects
    ├── create-*.dto.ts
    └── update-*.dto.ts
```

## Related Documentation

- [Tools Guide](./04-tools-guide.md) - Creating and configuring tools
- [Resources Guide](./05-resources-guide.md) - Exposing data resources
- [Dependency Injection](./12-dependency-injection.md) - Advanced DI patterns
- [Testing Guide](./14-testing-guide.md) - Testing modules and services
