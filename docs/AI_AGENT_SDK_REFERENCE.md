# NitroStack SDK Reference - For AI Code Editors

**Comprehensive SDK reference for AI agents editing NitroStack v3.0 code**

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Application Bootstrap](#application-bootstrap)
3. [Modules](#modules)
4. [Tools](#tools)
5. [Resources](#resources)
6. [Prompts](#prompts)
7. [Guards](#guards)
8. [Middleware](#middleware)
9. [Interceptors](#interceptors)
10. [Pipes](#pipes)
11. [Services & DI](#services--dependency-injection)
12. [Decorators Reference](#decorators-reference)
13. [Widgets](#widgets)
14. [Health Checks](#health-checks)
15. [Caching](#caching)
16. [Rate Limiting](#rate-limiting)
17. [Error Handling](#error-handling)
18. [MCP Tasks](#mcp-tasks)
19. [File Structure](#file-structure)
20. [Import Rules](#import-rules)
21. [Common Patterns](#common-patterns)

---

## Architecture Overview

NitroStack v3.0 uses **decorator-based architecture** inspired by NestJS:

- **Declarative** - Use decorators instead of factory functions
- **Modular** - Organize code into feature modules
- **DI-First** - Dependency injection for testability
- **Type-Safe** - Zod schemas for runtime validation
- **Protocol-Native** - Built for MCP protocol, not HTTP

### Key Principles

1. Use decorators (`@Tool`, `@Module`, `@Injectable`)
2. No manual registration (`server.tool()`, `server.resource()`)
3. Constructor injection for dependencies
4. Services contain business logic, tools are thin
5. ES modules with `.js` extensions in imports

---

## Application Bootstrap

### Root Module (`app.module.ts`)

```typescript
import { McpApp, Module, ConfigModule, JWTModule } from '@nitrostack/core';
import { ProductsModule } from './modules/products/products.module.js';
import { DatabaseService } from './services/database.service.js';

@McpApp({
  server: {
    name: 'my-ecommerce-server',
    version: '1.0.0',
    description: 'E-commerce MCP server'
  },
  logging: {
    level: 'info'  // debug | info | warn | error
  }
})
@Module({
  imports: [
    ConfigModule.forRoot(),      // Environment variables
    JWTModule.forRoot(),         // JWT authentication
    ProductsModule,              // Feature modules
    OrdersModule
  ],
  providers: [DatabaseService],  // Global services
  controllers: []                // Global tools/resources
})
export class AppModule {}
```

### Entry Point (`index.ts`)

```typescript
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';

// Bootstrap application
McpApplicationFactory.create(AppModule);
```

**That's it!** No manual server setup needed.

---

## Modules

Modules organize related features into cohesive units.

### Basic Module

```typescript
import { Module } from '@nitrostack/core';
import { ProductsTools } from './products.tools.js';
import { ProductsResources } from './products.resources.js';
import { ProductsPrompts } from './products.prompts.js';
import { ProductService } from './products.service.js';

@Module({
  name: 'products',
  description: 'Product catalog management',
  controllers: [ProductsTools, ProductsResources, ProductsPrompts],
  providers: [ProductService],
  imports: [],      // Other modules this depends on
  exports: []       // Services to expose to other modules
})
export class ProductsModule {}
```

### Module with Dependencies

```typescript
@Module({
  name: 'orders',
  controllers: [OrdersTools],
  providers: [OrderService],
  imports: [ProductsModule, UserModule],  // Import other modules
  exports: [OrderService]                 // Make OrderService available to others
})
export class OrdersModule {}
```

### Dynamic Modules (Advanced)

```typescript
// Config module with options
@Module({})
export class ConfigModule {
  static forRoot(options?: ConfigOptions) {
    return {
      module: ConfigModule,
      providers: [
        {
          provide: 'CONFIG_OPTIONS',
          useValue: options || {}
        },
        ConfigService
      ],
      exports: [ConfigService]
    };
  }
}
```

---

## Tools

Tools are functions that AI models can call.

### Basic Tool

```typescript
import { Tool, ExecutionContext } from '@nitrostack/core';
import { z } from 'zod';

export class ProductsTools {
  @Tool({
    name: 'get_product',
    description: 'Get product details by ID',
    inputSchema: z.object({
      product_id: z.string().describe('Unique product identifier')
    })
  })
  async getProduct(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Fetching product', { id: input.product_id });
    
    return {
      id: input.product_id,
      name: 'Example Product',
      price: 99.99
    };
  }
}
```

### Tool with Examples

```typescript
@Tool({
  name: 'browse_products',
  description: 'Browse products with filters',
  inputSchema: z.object({
    category: z.string().optional().describe('Product category'),
    page: z.number().default(1).describe('Page number'),
    limit: z.number().default(10).describe('Items per page')
  }),
  examples: {
    request: { category: 'electronics', page: 1, limit: 10 },
    response: {
      products: [
        { id: '1', name: 'Laptop', price: 999 },
        { id: '2', name: 'Mouse', price: 29 }
      ],
      total: 2,
      page: 1
    }
  }
})
async browseProducts(input: any, ctx: ExecutionContext) {
  return {
    products: [],
    total: 0,
    page: input.page
  };
}
```

### Tool with Widget

```typescript
import { Tool, Widget, ExecutionContext } from '@nitrostack/core';

@Tool({
  name: 'get_product',
  description: 'Get product details',
  inputSchema: z.object({ product_id: z.string() }),
  examples: {
    request: { product_id: 'prod-1' },
    response: { id: 'prod-1', name: 'Laptop', price: 999, image_url: '/laptop.jpg' }
  }
})
@Widget('product-card')  // Link to src/widgets/app/product-card/page.tsx
async getProduct(input: any, ctx: ExecutionContext) {
  return await this.productService.findById(input.product_id);
}
```

### Tool with Guards

```typescript
import { Tool, UseGuards, ExecutionContext } from '@nitrostack/core';
import { JWTGuard } from '../../guards/jwt.guard.js';

@Tool({
  name: 'create_order',
  description: 'Create a new order',
  inputSchema: z.object({
    items: z.array(z.object({
      product_id: z.string(),
      quantity: z.number()
    }))
  })
})
@UseGuards(JWTGuard)  // Require authentication
async createOrder(input: any, ctx: ExecutionContext) {
  const userId = ctx.auth?.subject;  // Set by guard
  ctx.logger.info('Creating order', { userId, items: input.items });
  
  return await this.orderService.create(userId, input.items);
}
```

### Tool with Caching

```typescript
import { Tool, Cache } from '@nitrostack/core';

@Tool({
  name: 'get_categories',
  description: 'Get all product categories',
  inputSchema: z.object({})
})
@Cache({ ttl: 300 })  // Cache for 5 minutes
async getCategories() {
  return await this.productService.getCategories();
}
```

### Tool with Rate Limiting

```typescript
import { Tool, RateLimit } from '@nitrostack/core';

@Tool({
  name: 'send_email',
  description: 'Send email notification',
  inputSchema: z.object({
    to: z.string().email(),
    subject: z.string(),
    body: z.string()
  })
})
@RateLimit({
  requests: 10,           // Max requests
  window: '1m',           // Time window (1m, 1h, 1d)
  key: (ctx) => ctx.auth?.subject || 'anonymous'
})
async sendEmail(input: any, ctx: ExecutionContext) {
  await this.emailService.send(input.to, input.subject, input.body);
  return { success: true };
}
```

### Tool with DI

```typescript
import { Injectable } from '@nitrostack/core';

@Injectable()
export class ProductService {
  constructor(private db: DatabaseService) {}
  
  async findById(id: string) {
    return this.db.queryOne('SELECT * FROM products WHERE id = ?', [id]);
  }
}

export class ProductsTools {
  constructor(private productService: ProductService) {}  // Auto-injected
  
  @Tool({ name: 'get_product' })
  async getProduct(input: any) {
    return await this.productService.findById(input.product_id);
  }
}
```

---

## Resources

Resources are data schemas AI can read.

### Basic Resource

```typescript
import { Resource, ExecutionContext } from '@nitrostack/core';

@Resource({
  uri: 'product://{id}',
  name: 'Product Data',
  description: 'Detailed product information',
  mimeType: 'application/json'
})
async getProductResource(uri: string, ctx: ExecutionContext) {
  const id = uri.split('://')[1];  // Extract ID from URI
  const product = await this.productService.findById(id);
  
  return {
    contents: [{
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(product, null, 2)
    }]
  };
}
```

### Resource with Widget

```typescript
@Resource({
  uri: 'catalog://categories',
  name: 'Product Categories',
  description: 'All available product categories',
  mimeType: 'application/json',
  examples: {
    response: {
      categories: ['Electronics', 'Fashion', 'Home']
    }
  }
})
@Widget('categories-list')
async getCategoriesResource(uri: string, ctx: ExecutionContext) {
  const categories = await this.productService.getCategories();
  
  return {
    contents: [{
      uri,
      mimeType: 'application/json',
      text: JSON.stringify({ categories })
    }]
  };
}
```

---

## Prompts

Prompts are conversation templates for AI.

### Basic Prompt

```typescript
import { Prompt, ExecutionContext } from '@nitrostack/core';

@Prompt({
  name: 'product_review',
  description: 'Generate product review template',
  arguments: [
    {
      name: 'product_id',
      description: 'ID of product to review',
      required: true
    },
    {
      name: 'rating',
      description: 'Rating (1-5)',
      required: false
    }
  ]
})
async getReviewPrompt(args: any, ctx: ExecutionContext) {
  const product = await this.productService.findById(args.product_id);
  
  return {
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Write a ${args.rating || 5}-star review for: ${product.name}`
        }
      }
    ]
  };
}
```

### Prompt with Context

```typescript
@Prompt({
  name: 'order_summary',
  description: 'Generate order summary for customer',
  arguments: [
    { name: 'order_id', description: 'Order ID', required: true }
  ]
})
async getOrderSummaryPrompt(args: any, ctx: ExecutionContext) {
  const order = await this.orderService.findById(args.order_id);
  
  return {
    messages: [
      {
        role: 'system',
        content: {
          type: 'text',
          text: 'You are a helpful customer service assistant.'
        }
      },
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Summarize order #${order.id} with ${order.items.length} items, total $${order.total}`
        }
      }
    ]
  };
}
```

---

## Guards

Guards implement authentication/authorization.

### JWT Guard

```typescript
import { Guard, ExecutionContext, Injectable } from '@nitrostack/core';
import jwt from 'jsonwebtoken';

@Injectable()
export class JWTGuard implements Guard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const authHeader = context.metadata?.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false;
    }
    
    const token = authHeader.substring(7);
    
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!);
      
      // Attach auth info to context
      context.auth = {
        subject: payload.sub,
        email: payload.email,
        ...payload
      };
      
      return true;
    } catch (error) {
      context.logger.warn('JWT verification failed', { error });
      return false;
    }
  }
}
```

### Admin Guard

```typescript
@Injectable()
export class AdminGuard implements Guard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Assumes JWTGuard ran first
    const user = context.auth;
    
    if (!user) {
      return false;
    }
    
    // Check if user is admin
    return user.role === 'admin';
  }
}

// Usage: Multiple guards (all must pass)
@Tool({ name: 'delete_user' })
@UseGuards(JWTGuard, AdminGuard)
async deleteUser(input: any, ctx: ExecutionContext) {
  // Only admins with valid JWT can call this
}
```

---

## Middleware

Middleware runs before/after tool execution.

### Logging Middleware

```typescript
import { Middleware, MiddlewareInterface, ExecutionContext } from '@nitrostack/core';

@Middleware()
export class LoggingMiddleware implements MiddlewareInterface {
  async use(context: ExecutionContext, next: () => Promise<any>): Promise<any> {
    const start = Date.now();
    
    context.logger.info('Tool starting', {
      tool: context.toolName,
      input: context.input
    });
    
    try {
      const result = await next();
      
      const duration = Date.now() - start;
      context.logger.info('Tool completed', {
        tool: context.toolName,
        duration: `${duration}ms`
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      context.logger.error('Tool failed', {
        tool: context.toolName,
        duration: `${duration}ms`,
        error
      });
      throw error;
    }
  }
}

// Usage
@Tool({ name: 'my_tool' })
@UseMiddleware(LoggingMiddleware)
async myTool(input: any, ctx: ExecutionContext) {}
```

### Auth Middleware

```typescript
@Middleware()
export class AuthMiddleware implements MiddlewareInterface {
  async use(context: ExecutionContext, next: () => Promise<any>) {
    if (!context.auth) {
      throw new Error('Unauthorized');
    }
    
    return next();
  }
}
```

---

## Interceptors

Interceptors transform requests/responses.

### Transform Interceptor

```typescript
import { Interceptor, InterceptorInterface, ExecutionContext } from '@nitrostack/core';

@Interceptor()
export class TransformInterceptor implements InterceptorInterface {
  async intercept(context: ExecutionContext, next: () => Promise<any>): Promise<any> {
    const result = await next();
    
    // Wrap all responses in standard format
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
      tool: context.toolName
    };
  }
}

// Usage
@Tool({ name: 'get_product' })
@UseInterceptors(TransformInterceptor)
async getProduct(input: any) {
  return { id: '1', name: 'Product' };
}

// Returns:
// {
//   success: true,
//   data: { id: '1', name: 'Product' },
//   timestamp: '2025-10-24T12:00:00Z',
//   tool: 'get_product'
// }
```

---

## Pipes

Pipes transform/validate input before handler execution.

### Validation Pipe

```typescript
import { Pipe, PipeInterface } from '@nitrostack/core';
import { z } from 'zod';

@Pipe()
export class ValidationPipe implements PipeInterface {
  async transform(value: any, metadata: any): Promise<any> {
    if (metadata.schema) {
      // Validate with Zod
      return metadata.schema.parse(value);
    }
    return value;
  }
}
```

---

## Services & Dependency Injection

### Injectable Service

```typescript
import { Injectable } from '@nitrostack/core';

@Injectable()
export class ProductService {
  constructor(private db: DatabaseService) {}  // DI
  
  async findById(id: string) {
    return this.db.queryOne('SELECT * FROM products WHERE id = ?', [id]);
  }
  
  async search(query: string) {
    return this.db.query(
      'SELECT * FROM products WHERE name LIKE ?',
      [`%${query}%`]
    );
  }
  
  async getCategories() {
    return this.db.query('SELECT DISTINCT category FROM products');
  }
}
```

### Using Services in Tools

```typescript
export class ProductsTools {
  constructor(
    private productService: ProductService,
    private cacheService: CacheService
  ) {}  // Both auto-injected
  
  @Tool({ name: 'search_products' })
  async searchProducts(input: any, ctx: ExecutionContext) {
    const results = await this.productService.search(input.query);
    await this.cacheService.set(`search:${input.query}`, results);
    return results;
  }
}
```

---

## Decorators Reference

### Core Decorators

| Decorator | Purpose | Example |
|-----------|---------|---------|
| `@McpApp(options)` | Root application module | `@McpApp({ server: { name: 'my-server' } })` |
| `@Module(options)` | Feature module | `@Module({ name: 'products', controllers: [...] })` |
| `@Injectable()` | Mark for DI | `@Injectable() class ProductService {}` |

### Tool Decorators

| Decorator | Purpose | Example |
|-----------|---------|---------|
| `@Tool(options)` | Define tool | `@Tool({ name: 'get_product', inputSchema: z.object({}) })` |
| `@Resource(options)` | Define resource | `@Resource({ uri: 'product://{id}' })` |
| `@Prompt(options)` | Define prompt | `@Prompt({ name: 'review_prompt' })` |

### Feature Decorators

| Decorator | Purpose | Example |
|-----------|---------|---------|
| `@Widget(name)` | Link UI widget | `@Widget('product-card')` |
| `@UseGuards(...guards)` | Apply guards | `@UseGuards(JWTGuard, AdminGuard)` |
| `@UseMiddleware(...mw)` | Apply middleware | `@UseMiddleware(LoggingMiddleware)` |
| `@UseInterceptors(...int)` | Apply interceptors | `@UseInterceptors(TransformInterceptor)` |
| `@Cache(options)` | Cache responses | `@Cache({ ttl: 300 })` |
| `@RateLimit(options)` | Rate limiting | `@RateLimit({ requests: 10, window: '1m' })` |
| `@HealthCheck(name)` | Define health check | `@HealthCheck('database')` |

---

## MCP Tasks

MCP Tasks allow for long-running, asynchronous operations with progress updates and cancellation.

### Enabling Tasks

Set `taskSupport` to `'optional'` or `'required'` (defaults to `'forbidden'`).

```typescript
@Tool({
  name: 'audit_data',
  description: 'Audits large datasets (asynchronous)',
  taskSupport: 'optional', // or 'required'
  inputSchema: z.object({ datasetId: z.string() })
})
async auditData(input: any, ctx: ExecutionContext) {
  // Use ctx.task helpers
  if (ctx.task) {
    ctx.task.updateProgress('Scanning headers...');
    ctx.task.throwIfCancelled();
  }
  return { results: [] };
}
```

### Task Helpers (`ExecutionContext.task`)

- `task.updateProgress(message: string)` - Sends a status update to the client.
- `task.requestInput(message: string)` - Transition task to `input_required` state.
- `task.throwIfCancelled()` - Throws `TaskCancelledError` if client requested cancellation.
- `task.isCancelled` - Boolean flag for cooperative cancellation checks.
- `task.taskId` - Unique ID for the current task.

---

## Widgets

UI components rendered alongside tool responses.

### Widget File Structure

```
src/widgets/
├── app/
│   ├── product-card/
│   │   └── page.tsx          # Widget component
│   ├── products-grid/
│   │   └── page.tsx
│   └── ...
├── types/
│   └── tool-data.ts           # Generated types
├── styles/
│   └── ecommerce.ts           # Shared inline styles
├── widget-manifest.json       # Widget metadata
├── package.json
└── next.config.js
```

### Basic Widget

```typescript
'use client';

import { useEffect, useState } from 'react';

export default function ProductCard() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    // Listen for data from Studio/MCP
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'toolOutput') {
        setData(event.data.data);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (!data) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: '20px', border: '1px solid #ddd' }}>
      <h2>{data.name}</h2>
      <p>Price: ${data.price}</p>
      <img src={data.image_url} alt={data.name} style={{ maxWidth: '200px' }} />
    </div>
  );
}
```

### Widget with Types

```typescript
'use client';

import { useEffect, useState } from 'react';
import { GetProductOutput } from '../../types/tool-data';

export default function ProductCard() {
  const [data, setData] = useState<GetProductOutput | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'toolOutput') {
        setData(event.data.data as GetProductOutput);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (!data) return <div>Loading...</div>;

  // TypeScript knows data.name, data.price, etc.
  return (
    <div>
      <h2>{data.name}</h2>
      <p>${data.price}</p>
    </div>
  );
}
```

### Widget Manifest

```json
{
  "widgets": [
    {
      "uri": "product-card",
      "name": "Product Card",
      "description": "Display product details",
      "toolName": "get_product",
      "examples": {
        "request": { "product_id": "1" },
        "response": { "id": "1", "name": "Laptop", "price": 999 }
      }
    }
  ]
}
```

### Linking Widget to Tool

```typescript
@Tool({
  name: 'get_product',
  inputSchema: z.object({ product_id: z.string() })
})
@Widget('product-card')  // Links to src/widgets/app/product-card/page.tsx
async getProduct(input: any) {
  return { id: input.product_id, name: 'Laptop', price: 999 };
}
```

---

## Health Checks

Monitor system health.

### Basic Health Check

```typescript
import { HealthCheck, Injectable } from '@nitrostack/core';

@Injectable()
export class SystemHealthCheck {
  @HealthCheck('system')
  async checkSystem() {
    const uptime = process.uptime();
    const memory = process.memoryUsage();
    
    return {
      status: uptime > 0 ? 'up' : 'down',
      message: 'System is operational',
      details: {
        uptime: `${Math.floor(uptime)}s`,
        memory: `${Math.round(memory.heapUsed / 1024 / 1024)}MB`
      }
    };
  }
}
```

### Database Health Check

```typescript
@Injectable()
export class DatabaseHealthCheck {
  constructor(private db: DatabaseService) {}
  
  @HealthCheck('database')
  async checkDatabase() {
    try {
      await this.db.query('SELECT 1');
      return {
        status: 'up',
        message: 'Database is responsive',
        details: { connection: 'active' }
      };
    } catch (error) {
      return {
        status: 'down',
        message: 'Database connection failed',
        details: { error: error.message }
      };
    }
  }
}
```

---

## Caching

Cache tool responses for performance.

```typescript
import { Tool, Cache } from '@nitrostack/core';

// Simple TTL caching
@Tool({ name: 'get_categories' })
@Cache({ ttl: 300 })  // 5 minutes
async getCategories() {
  return await this.productService.getCategories();
}

// Custom cache key
@Tool({ name: 'get_product' })
@Cache({
  ttl: 60,
  key: (input) => `product:${input.product_id}`
})
async getProduct(input: any) {
  return await this.productService.findById(input.product_id);
}
```

---

## Rate Limiting

Limit tool execution frequency.

```typescript
import { Tool, RateLimit } from '@nitrostack/core';

// Per-user rate limiting
@Tool({ name: 'send_email' })
@RateLimit({
  requests: 10,                              // Max 10 requests
  window: '1m',                              // Per 1 minute
  key: (ctx) => ctx.auth?.subject || 'anon' // Key by user ID
})
async sendEmail(input: any) {
  await this.emailService.send(input.to, input.subject, input.body);
  return { success: true };
}

// Global rate limiting
@Tool({ name: 'expensive_operation' })
@RateLimit({
  requests: 100,
  window: '1h',
  key: () => 'global'
})
async expensiveOperation(input: any) {
  // ...
}
```

---

## Error Handling

```typescript
@Tool({ name: 'get_user' })
async getUser(input: any, ctx: ExecutionContext) {
  const user = await this.userService.findById(input.user_id);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  return user;
}

// Custom error class
export class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} with ID ${id} not found`);
    this.name = 'NotFoundError';
  }
}

@Tool({ name: 'get_product' })
async getProduct(input: any) {
  const product = await this.productService.findById(input.product_id);
  
  if (!product) {
    throw new NotFoundError('Product', input.product_id);
  }
  
  return product;
}
```

---

## File Structure

```
src/
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.tools.ts
│   │   ├── auth.resources.ts
│   │   ├── auth.prompts.ts
│   │   ├── auth.service.ts
│   │   └── guards/
│   │       └── jwt.guard.ts
│   ├── products/
│   │   ├── products.module.ts
│   │   ├── products.tools.ts
│   │   ├── products.resources.ts
│   │   ├── products.prompts.ts
│   │   └── products.service.ts
│   └── ...
├── services/
│   ├── database.service.ts
│   └── cache.service.ts
├── guards/
│   ├── jwt.guard.ts
│   └── admin.guard.ts
├── middleware/
│   └── logging.middleware.ts
├── interceptors/
│   └── transform.interceptor.ts
├── pipes/
│   └── validation.pipe.ts
├── health/
│   ├── system.health.ts
│   └── database.health.ts
├── widgets/
│   ├── app/
│   │   ├── product-card/
│   │   ├── products-grid/
│   │   └── ...
│   ├── types/
│   │   └── tool-data.ts
│   └── styles/
│       └── shared.ts
├── app.module.ts
└── index.ts
```

---

## Import Rules

### Always Use `.js` Extensions

```typescript
// Correct
import { ProductService } from './products.service.js';
import { JWTGuard } from '../auth/jwt.guard.js';
import { DatabaseService } from '../../services/database.service.js';

// Wrong
import { ProductService } from './products.service';
```

### Core Imports

```typescript
// Core decorators
import {
  Tool,
  Resource,
  Prompt,
  Module,
  McpApp,
  Injectable,
  UseGuards,
  Cache,
  RateLimit,
  HealthCheck,
  ExecutionContext
} from '@nitrostack/core';

// Config and auth modules
import { ConfigModule, ConfigService, JWTModule } from '@nitrostack/core';

// Validation
import { z } from 'zod';

// Widgets (in widget files)
import { withToolData } from '@nitrostack/widgets';
```

---

## Common Patterns

### CRUD Operations

```typescript
export class ProductsTools {
  constructor(private productService: ProductService) {}
  
  // Create
  @Tool({
    name: 'create_product',
    inputSchema: z.object({
      name: z.string(),
      price: z.number(),
      category: z.string()
    })
  })
  @UseGuards(JWTGuard, AdminGuard)
  async create(input: any) {
    return await this.productService.create(input);
  }
  
  // Read
  @Tool({
    name: 'get_product',
    inputSchema: z.object({ product_id: z.string() })
  })
  @Cache({ ttl: 60 })
  async get(input: any) {
    return await this.productService.findById(input.product_id);
  }
  
  // Update
  @Tool({
    name: 'update_product',
    inputSchema: z.object({
      product_id: z.string(),
      name: z.string().optional(),
      price: z.number().optional()
    })
  })
  @UseGuards(JWTGuard, AdminGuard)
  async update(input: any) {
    return await this.productService.update(input.product_id, input);
  }
  
  // Delete
  @Tool({
    name: 'delete_product',
    inputSchema: z.object({ product_id: z.string() })
  })
  @UseGuards(JWTGuard, AdminGuard)
  async delete(input: any) {
    await this.productService.delete(input.product_id);
    return { success: true };
  }
}
```

### Pagination Pattern

```typescript
@Tool({
  name: 'list_products',
  inputSchema: z.object({
    page: z.number().default(1),
    limit: z.number().default(20).max(100),
    category: z.string().optional()
  })
})
async listProducts(input: any) {
  const offset = (input.page - 1) * input.limit;
  
  const products = await this.productService.list({
    limit: input.limit,
    offset,
    category: input.category
  });
  
  const total = await this.productService.count({ category: input.category });
  
  return {
    products,
    pagination: {
      page: input.page,
      limit: input.limit,
      total,
      pages: Math.ceil(total / input.limit)
    }
  };
}
```

### Search Pattern

```typescript
@Tool({
  name: 'search_products',
  inputSchema: z.object({
    query: z.string().min(1),
    filters: z.object({
      category: z.string().optional(),
      min_price: z.number().optional(),
      max_price: z.number().optional()
    }).optional()
  })
})
@Cache({ ttl: 30, key: (input) => `search:${input.query}:${JSON.stringify(input.filters)}` })
async search(input: any) {
  return await this.productService.search(input.query, input.filters);
}
```

---

## Key Rules for AI Agents

1. **Always use decorators** - No factory functions
2. **Constructor injection** - Never use `new ClassName()`
3. **Services for logic** - Tools should be thin wrappers
4. **Zod for schemas** - All tool inputs must have inputSchema
5. **Return JSON** - All tool outputs must be JSON-serializable
6. **ES modules** - Use `.js` in imports, not `.ts`
7. **ExecutionContext** - Second parameter to all handlers
8. **Examples** - Always include request/response examples

---

**That's the complete NitroStack SDK reference!**

For more details, check:
- `/docs/sdk/typescript/` - Full documentation
- `/docs/templates/01-starter-template.md` - Simple starter template
- `/docs/templates/02-oauth-template.md` - OAuth template
- `/docs/templates/03-pizzaz-template.md` - Widget-heavy template
