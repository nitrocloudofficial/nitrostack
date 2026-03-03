# Tools Guide

## Overview

Tools are the primary mechanism for exposing functionality to AI models in the Model Context Protocol (MCP). They represent callable functions that AI agents can invoke to perform actions, retrieve data, or interact with external systems.

This guide covers tool definition, input validation, output schemas, behavioral annotations, execution context usage, and integration with NitroStack's middleware pipeline.

## Table of Contents

- [Basic Tool Definition](#basic-tool-definition)
- [Tool Decorator Options](#tool-decorator-options)
- [Tool Annotations](#tool-annotations)
- [Output Schema Validation](#output-schema-validation)
- [Input Validation with Zod](#input-validation-with-zod)
- [Execution Context](#execution-context)
- [Middleware Integration](#middleware-integration)
- [Caching and Rate Limiting](#caching-and-rate-limiting)
- [Dependency Injection](#dependency-injection)
- [Error Handling](#error-handling)
- [UI Widgets](#ui-widgets)
- [Dynamic Tool Registration](#dynamic-tool-registration)
- [Best Practices](#best-practices)

## Basic Tool Definition

Tools are defined using the `@Tool` decorator on class methods:

```typescript
import { ToolDecorator as Tool, z, ExecutionContext } from '@nitrostack/core';

export class WeatherTools {
  @Tool({
    name: 'get_weather',
    description: 'Retrieve current weather conditions for a specified location',
    inputSchema: z.object({
      city: z.string().describe('City name (e.g., "San Francisco")'),
      units: z.enum(['celsius', 'fahrenheit']).optional().default('celsius')
        .describe('Temperature unit preference')
    })
  })
  async getWeather(
    input: { city: string; units?: 'celsius' | 'fahrenheit' },
    context: ExecutionContext
  ) {
    context.logger.info('Fetching weather data', { city: input.city });

    const weather = await this.weatherService.getCurrentConditions(input.city);

    return {
      city: input.city,
      temperature: input.units === 'fahrenheit'
        ? this.toFahrenheit(weather.tempCelsius)
        : weather.tempCelsius,
      units: input.units ?? 'celsius',
      conditions: weather.conditions,
      humidity: weather.humidity,
      timestamp: new Date().toISOString()
    };
  }
}
```

## Tool Decorator Options

### Options Reference

```typescript
interface ToolOptions {
  /** Unique tool identifier (required) */
  name: string;

  /** Human-readable display name (optional) */
  title?: string;

  /** Clear description of what the tool does (required) */
  description: string;

  /** Zod schema for input validation */
  inputSchema?: ZodObject;

  /** Zod schema for output validation (optional) */
  outputSchema?: ZodObject;

  /** Behavioral hints for AI models and clients */
  annotations?: ToolAnnotations;

  /** UI status messages during tool execution (OpenAI Apps SDK) */
  invocation?: {
    invoking?: string;  // Shown while tool is running
    invoked?: string;   // Shown when tool completes
  };

  /** Example request/response for AI model guidance and widget preview */
  examples?: {
    request?: Record<string, unknown>;
    response?: Record<string, unknown>;
  };
}
```

### Complete Example

```typescript
@Tool({
  name: 'create_user',
  title: 'Create User Account',
  description: 'Create a new user account with the provided details. Returns the created user object with generated ID.',
  inputSchema: z.object({
    email: z.string().email().describe('Valid email address for the account'),
    name: z.string().min(2).max(100).describe('Full name of the user'),
    role: z.enum(['user', 'admin', 'moderator']).default('user')
      .describe('User role determining access permissions'),
    metadata: z.record(z.string()).optional()
      .describe('Additional key-value pairs for custom attributes')
  }),
  outputSchema: z.object({
    id: z.string().describe('Generated user ID'),
    email: z.string(),
    name: z.string(),
    role: z.string(),
    createdAt: z.string()
  }),
  annotations: {
    destructiveHint: false,  // Creates new data, doesn't destroy
    idempotentHint: false,   // Creates new user each time
    readOnlyHint: false,     // Modifies system state
    openWorldHint: false     // Closed system operation
  },
  examples: {
    request: {
      email: 'jane.doe@example.com',
      name: 'Jane Doe',
      role: 'user'
    },
    response: {
      id: 'usr_abc123',
      email: 'jane.doe@example.com',
      name: 'Jane Doe',
      role: 'user',
      createdAt: '2024-01-15T10:30:00Z'
    }
  }
})
async createUser(input: CreateUserInput, ctx: ExecutionContext) {
  return this.userService.create(input);
}
```

## Tool Annotations

Tool annotations provide behavioral hints to AI models and MCP clients about how a tool operates. These hints help clients make intelligent decisions about tool usage, such as whether to auto-approve certain operations or warn users about destructive actions.

### Annotation Properties

```typescript
interface ToolAnnotations {
  /** 
   * If true, the tool may perform destructive updates (delete, overwrite).
   * If false, the tool only performs additive operations.
   * Default: true (assume destructive for safety)
   */
  destructiveHint?: boolean;

  /**
   * If true, calling the tool repeatedly with identical arguments
   * produces the same result with no additional side effects.
   * Default: false (assume not idempotent)
   */
  idempotentHint?: boolean;

  /**
   * If true, the tool does not modify any state - it only reads data.
   * Default: false (assume modifies state)
   */
  readOnlyHint?: boolean;

  /**
   * If true, the tool may interact with external systems or "open world"
   * entities beyond the local environment.
   * Default: true (assume external interactions possible)
   */
  openWorldHint?: boolean;
}
```

### Annotation Examples by Use Case

**Read-Only Data Retrieval:**

```typescript
@Tool({
  name: 'get_user',
  title: 'Get User Profile',
  description: 'Retrieve user profile by ID',
  inputSchema: z.object({
    userId: z.string().describe('User ID')
  }),
  annotations: {
    readOnlyHint: true,      // No state modification
    idempotentHint: true,    // Same input = same output
    destructiveHint: false,  // No data destruction
    openWorldHint: false     // Internal database only
  }
})
async getUser(input: { userId: string }, ctx: ExecutionContext) {
  return this.userService.findById(input.userId);
}
```

**Destructive Operation:**

```typescript
@Tool({
  name: 'delete_user',
  title: 'Delete User Account',
  description: 'Permanently delete a user account and all associated data',
  inputSchema: z.object({
    userId: z.string().describe('User ID to delete')
  }),
  annotations: {
    destructiveHint: true,   // Permanently removes data
    idempotentHint: true,    // Deleting twice has same effect
    readOnlyHint: false,     // Modifies state
    openWorldHint: false     // Internal operation
  }
})
async deleteUser(input: { userId: string }, ctx: ExecutionContext) {
  return this.userService.delete(input.userId);
}
```

**External API Call:**

```typescript
@Tool({
  name: 'send_email',
  title: 'Send Email',
  description: 'Send an email via external email service',
  inputSchema: z.object({
    to: z.string().email(),
    subject: z.string(),
    body: z.string()
  }),
  annotations: {
    destructiveHint: false,  // Doesn't destroy data
    idempotentHint: false,   // Each call sends a new email
    readOnlyHint: false,     // Creates an email
    openWorldHint: true      // Interacts with external service
  }
})
async sendEmail(input: EmailInput, ctx: ExecutionContext) {
  return this.emailService.send(input);
}
```

## Output Schema Validation

Output schemas define the expected structure of tool responses. They serve two purposes:

1. **Documentation**: Clients understand what data to expect
2. **Validation**: Runtime validation ensures responses match the schema

### Basic Output Schema

```typescript
@Tool({
  name: 'get_product',
  title: 'Get Product Details',
  description: 'Retrieve product information by ID',
  inputSchema: z.object({
    productId: z.string()
  }),
  outputSchema: z.object({
    id: z.string(),
    name: z.string(),
    price: z.number(),
    currency: z.string(),
    inStock: z.boolean(),
    category: z.string().optional()
  })
})
async getProduct(input: { productId: string }, ctx: ExecutionContext) {
  return this.productService.findById(input.productId);
}
```

### Complex Output Schema

```typescript
@Tool({
  name: 'search_products',
  title: 'Search Product Catalog',
  description: 'Search products with pagination',
  inputSchema: z.object({
    query: z.string(),
    page: z.number().default(1),
    limit: z.number().default(20)
  }),
  outputSchema: z.object({
    results: z.array(z.object({
      id: z.string(),
      name: z.string(),
      price: z.number(),
      relevanceScore: z.number()
    })),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      hasMore: z.boolean()
    })
  })
})
async searchProducts(input: SearchInput, ctx: ExecutionContext) {
  return this.searchService.query(input);
}
```

## Input Validation with Zod

NitroStack uses Zod for runtime input validation. The schema is automatically converted to JSON Schema for MCP protocol compliance.

### Primitive Types

```typescript
import { z } from '@nitrostack/core';

// String validation
z.string()
z.string().min(1).max(255)
z.string().email()
z.string().url()
z.string().uuid()
z.string().regex(/^[A-Z]{2}-\d{4}$/)

// Number validation
z.number()
z.number().int()
z.number().positive()
z.number().min(0).max(100)
z.number().multipleOf(0.01)  // Currency precision

// Boolean
z.boolean()

// Literal values
z.literal('active')
z.literal(42)
```

### Complex Types

```typescript
// Enumerations
z.enum(['pending', 'processing', 'completed', 'failed'])

// Arrays
z.array(z.string())
z.array(z.number()).min(1).max(100)
z.array(z.object({ id: z.string() }))

// Objects
z.object({
  name: z.string(),
  address: z.object({
    street: z.string(),
    city: z.string(),
    postalCode: z.string()
  })
})

// Records (dynamic keys)
z.record(z.string())  // { [key: string]: string }
z.record(z.string(), z.number())  // { [key: string]: number }

// Unions
z.union([z.string(), z.number()])
z.discriminatedUnion('type', [
  z.object({ type: z.literal('email'), address: z.string().email() }),
  z.object({ type: z.literal('phone'), number: z.string() })
])
```

### Modifiers

```typescript
// Optional fields
z.string().optional()  // string | undefined

// Nullable fields
z.string().nullable()  // string | null

// Default values
z.string().default('pending')
z.number().default(0)

// Transformations
z.string().transform(val => val.toLowerCase())
z.string().trim()
```

### Complex Schema Example

```typescript
@Tool({
  name: 'create_order',
  description: 'Create a new order with line items and shipping details',
  inputSchema: z.object({
    customer: z.object({
      id: z.string().uuid().describe('Existing customer ID'),
      email: z.string().email().describe('Contact email for order updates')
    }),
    items: z.array(z.object({
      productId: z.string().describe('Product SKU or ID'),
      quantity: z.number().int().positive().describe('Quantity to order'),
      priceOverride: z.number().positive().optional()
        .describe('Optional price override for special pricing')
    })).min(1).describe('Order line items (at least one required)'),
    shipping: z.object({
      address: z.string().min(10).describe('Full street address'),
      city: z.string().describe('City name'),
      state: z.string().length(2).describe('Two-letter state code'),
      postalCode: z.string().regex(/^\d{5}(-\d{4})?$/).describe('ZIP code'),
      expedited: z.boolean().default(false).describe('Request expedited shipping')
    }),
    paymentMethod: z.enum(['card', 'ach', 'wire']).describe('Payment method'),
    notes: z.string().max(500).optional().describe('Special instructions')
  })
})
async createOrder(input: CreateOrderInput, ctx: ExecutionContext) {
  // Input is validated before handler execution
  return this.orderService.create(input);
}
```

## Execution Context

Every tool handler receives an `ExecutionContext` object providing access to authentication, logging, and event emission.

### Context Properties

```typescript
interface ExecutionContext {
  /** Authentication data populated by guards */
  auth?: {
    subject?: string;      // User/client identifier
    token?: string;        // Raw authentication token
    scopes?: string[];     // Permission scopes
    [key: string]: unknown;
  };

  /** Structured logger instance */
  logger: Logger;

  /** Current tool name */
  toolName?: string;

  /** Unique request identifier for tracing */
  requestId: string;

  /** Event emission function */
  emit(event: string, data: unknown): void;

  /** Request metadata (writable) */
  metadata?: Record<string, unknown>;
}
```

### Usage Patterns

```typescript
@Tool({ name: 'process_payment' })
@UseGuards(JWTGuard)
async processPayment(input: PaymentInput, ctx: ExecutionContext) {
  // Access authenticated user
  const userId = ctx.auth?.subject;
  if (!userId) {
    throw new Error('Authentication required');
  }

  // Structured logging with context
  ctx.logger.info('Processing payment', {
    userId,
    amount: input.amount,
    requestId: ctx.requestId
  });

  try {
    const result = await this.paymentService.process(input, userId);

    // Emit event for async processing
    ctx.emit('payment.completed', {
      paymentId: result.id,
      userId,
      amount: input.amount
    });

    ctx.logger.info('Payment processed successfully', { paymentId: result.id });
    return result;
  } catch (error) {
    ctx.logger.error('Payment processing failed', {
      error: error.message,
      userId,
      amount: input.amount
    });
    throw error;
  }
}
```

## Middleware Integration

### Guards

Guards control access to tools based on authentication or authorization:

```typescript
import { UseGuards } from '@nitrostack/core';
import { JWTGuard } from './guards/jwt.guard.js';
import { RoleGuard } from './guards/role.guard.js';

// Single guard
@Tool({ name: 'get_profile' })
@UseGuards(JWTGuard)
async getProfile(input: {}, ctx: ExecutionContext) {
  return this.userService.findById(ctx.auth!.subject);
}

// Multiple guards (all must pass)
@Tool({ name: 'delete_user' })
@UseGuards(JWTGuard, RoleGuard('admin'))
async deleteUser(input: { userId: string }, ctx: ExecutionContext) {
  return this.userService.delete(input.userId);
}
```

### Middleware

Middleware executes before and after the tool handler:

```typescript
import { UseMiddleware } from '@nitrostack/core';
import { LoggingMiddleware } from './middleware/logging.middleware.js';
import { TimingMiddleware } from './middleware/timing.middleware.js';

@Tool({ name: 'expensive_operation' })
@UseMiddleware(LoggingMiddleware, TimingMiddleware)
async expensiveOperation(input: OperationInput, ctx: ExecutionContext) {
  // Middleware executes in order: Logging -> Timing -> Handler -> Timing -> Logging
  return this.computeService.process(input);
}
```

### Interceptors

Interceptors transform responses or add cross-cutting behavior:

```typescript
import { UseInterceptors } from '@nitrostack/core';
import { TransformInterceptor } from './interceptors/transform.interceptor.js';

@Tool({ name: 'get_data' })
@UseInterceptors(TransformInterceptor)
async getData(input: { id: string }, ctx: ExecutionContext) {
  return { value: 42 };
  // Interceptor transforms to: { success: true, data: { value: 42 }, timestamp: '...' }
}
```

### Pipes

Pipes validate and transform input before handler execution:

```typescript
import { UsePipes } from '@nitrostack/core';
import { TrimPipe } from './pipes/trim.pipe.js';
import { ValidationPipe } from './pipes/validation.pipe.js';

@Tool({ name: 'search' })
@UsePipes(TrimPipe, ValidationPipe)
async search(input: { query: string }, ctx: ExecutionContext) {
  // Input strings are trimmed and validated
  return this.searchService.query(input.query);
}
```

### Exception Filters

Exception filters handle errors and transform error responses:

```typescript
import { UseFilters } from '@nitrostack/core';
import { HttpExceptionFilter } from './filters/http-exception.filter.js';

@Tool({ name: 'risky_operation' })
@UseFilters(HttpExceptionFilter)
async riskyOperation(input: RiskyInput, ctx: ExecutionContext) {
  // Errors are caught and transformed by the filter
  return this.riskyService.execute(input);
}
```

## Caching and Rate Limiting

### Response Caching

Cache tool responses to improve performance:

```typescript
import { Cache } from '@nitrostack/core';

@Tool({ name: 'get_product' })
@Cache({
  ttl: 300,  // Cache for 5 minutes
  key: (input) => `product:${input.productId}`  // Custom cache key
})
async getProduct(input: { productId: string }, ctx: ExecutionContext) {
  return this.productService.findById(input.productId);
}

// Cache with event-based invalidation
@Tool({ name: 'get_user_profile' })
@Cache({
  ttl: 600,
  key: (input) => `user:${input.userId}:profile`,
  invalidateOn: ['user.updated', 'user.deleted']
})
async getUserProfile(input: { userId: string }, ctx: ExecutionContext) {
  return this.userService.getProfile(input.userId);
}
```

### Rate Limiting

Protect tools from abuse with rate limiting:

```typescript
import { RateLimit } from '@nitrostack/core';

@Tool({ name: 'send_email' })
@RateLimit({
  requests: 10,
  window: '1m',  // 10 requests per minute
  key: (ctx) => ctx.auth?.subject || 'anonymous',  // Per-user limiting
  message: 'Email rate limit exceeded. Please wait before sending more emails.'
})
async sendEmail(input: EmailInput, ctx: ExecutionContext) {
  return this.emailService.send(input);
}

// Multiple rate limits
@Tool({ name: 'api_call' })
@RateLimit({ requests: 100, window: '1m' })   // Burst limit
@RateLimit({ requests: 1000, window: '1h' })  // Hourly limit
@RateLimit({ requests: 10000, window: '1d' }) // Daily limit
async apiCall(input: ApiInput, ctx: ExecutionContext) {
  return this.apiService.call(input);
}
```

## Dependency Injection

Inject services into tool classes:

```typescript
import { Injectable } from '@nitrostack/core';

@Injectable()
export class ProductService {
  constructor(
    private db: DatabaseService,
    private cache: CacheService
  ) {}

  async findById(id: string): Promise<Product | null> {
    const cached = await this.cache.get(`product:${id}`);
    if (cached) return cached;

    const product = await this.db.query(
      'SELECT * FROM products WHERE id = $1',
      [id]
    );

    if (product) {
      await this.cache.set(`product:${id}`, product, 300);
    }

    return product;
  }
}

export class ProductTools {
  constructor(private productService: ProductService) {}

  @Tool({ name: 'get_product' })
  async getProduct(input: { productId: string }, ctx: ExecutionContext) {
    const product = await this.productService.findById(input.productId);
    if (!product) {
      throw new Error(`Product not found: ${input.productId}`);
    }
    return product;
  }
}
```

## Error Handling

### Standard Errors

```typescript
@Tool({ name: 'get_user' })
async getUser(input: { userId: string }, ctx: ExecutionContext) {
  const user = await this.userService.findById(input.userId);

  if (!user) {
    throw new Error(`User not found: ${input.userId}`);
  }

  return user;
}
```

### Custom Error Classes

```typescript
export class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

@Tool({ name: 'update_user' })
async updateUser(input: UpdateUserInput, ctx: ExecutionContext) {
  const user = await this.userService.findById(input.userId);
  if (!user) {
    throw new NotFoundError('User', input.userId);
  }

  if (input.email && !this.isValidEmail(input.email)) {
    throw new ValidationError('Invalid email format', 'email', input.email);
  }

  return this.userService.update(input.userId, input);
}
```

## UI Widgets

Attach visual components to tool responses using the `@Widget` decorator.

### Basic Widget Connection

```typescript
import { Widget } from '@nitrostack/core';

@Tool({
  name: 'get_order_summary',
  description: 'Get order summary with visual breakdown',
  inputSchema: z.object({
    orderId: z.string().describe('Order ID')
  })
})
@Widget('order-summary')  // Maps to src/widgets/app/order-summary/page.tsx
async getOrderSummary(input: { orderId: string }, ctx: ExecutionContext) {
  return {
    id: input.orderId,
    items: await this.orderService.getItems(input.orderId),
    total: await this.orderService.getTotal(input.orderId),
    status: await this.orderService.getStatus(input.orderId)
  };
}
```

### Widget with Invocation Messages and Examples

For the best user experience, provide invocation messages and example data:

```typescript
@Tool({
  name: 'get_dashboard',
  title: 'User Dashboard',
  description: 'Get personalized dashboard with stats and recent activity',
  inputSchema: z.object({
    userId: z.string().describe('User ID')
  }),
  // Status messages shown in the UI during execution
  invocation: {
    invoking: 'Loading dashboard...',   // Shown while tool runs
    invoked: 'Dashboard ready'          // Shown when complete
  },
  // IMPORTANT: Example data is used for widget preview!
  examples: {
    request: { userId: 'user-123' },
    response: {
      user: { name: 'John Doe', avatar: '/avatars/john.jpg' },
      stats: { orders: 42, totalSpent: 1234.56 },
      recentOrders: [
        { id: 'order-1', total: 99.99, date: '2026-01-30' }
      ]
    }
  }
})
@Widget('user-dashboard')
async getDashboard(input: { userId: string }, ctx: ExecutionContext) {
  // Return data matching the example structure
  return { user: {...}, stats: {...}, recentOrders: [...] };
}
```

> **Important:** The `examples.response` data is used by clients to render widget previews before the tool executes. Without it, the widget preview may not appear.

### How Widget Metadata is Exposed

NitroStack exposes widget metadata in the tool's `_meta` field in multiple formats for compatibility:

```json
{
  "name": "get_dashboard",
  "_meta": {
    "ui/template": "ui://widget/next-user-dashboard.html",
    "ui": { "resourceUri": "ui://widget/next-user-dashboard.html" },
    "openai/outputTemplate": "ui://widget/next-user-dashboard.html",
    "openai/toolInvocation/invoking": "Loading dashboard...",
    "openai/toolInvocation/invoked": "Dashboard ready",
    "tool/examples": { "request": {...}, "response": {...} }
  }
}
```

See the [UI Widgets Guide](./16-ui-widgets-guide.md) for complete widget development documentation.

## Dynamic Tool Registration

NitroStack supports dynamic tool registration and notifies connected clients when the tool list changes.

### List Changed Notifications

When tools are added or removed at runtime, the server automatically sends a `notifications/tools/list_changed` notification to all connected clients. This enables dynamic tool discovery.

```typescript
import { McpApplicationFactory } from '@nitrostack/core';

// Access the server instance
const app = await McpApplicationFactory.create(AppModule);
const server = app.getServer();

// Notify clients after dynamic changes
server.notifyToolsListChanged();
```

### Use Cases for Dynamic Tools

1. **Feature flags**: Enable/disable tools based on configuration
2. **Permission-based**: Show different tools based on user roles
3. **Plugin systems**: Load tools from external modules
4. **A/B testing**: Expose different tool sets to different clients

## Best Practices

### 1. Write Clear Descriptions

Tool descriptions should be concise yet comprehensive:

```typescript
// Recommended: Clear, actionable description
@Tool({
  name: 'search_products',
  description: 'Search the product catalog by name, category, or price range. Returns paginated results with relevance scoring.'
})

// Avoid: Vague or minimal description
@Tool({
  name: 'search_products',
  description: 'Search products'
})
```

### 2. Document Schema Fields

Use `.describe()` on all schema fields:

```typescript
// Recommended: Documented fields
inputSchema: z.object({
  query: z.string().min(1).describe('Search query (product name, SKU, or keywords)'),
  category: z.string().optional().describe('Filter by category slug'),
  minPrice: z.number().optional().describe('Minimum price in USD'),
  maxPrice: z.number().optional().describe('Maximum price in USD'),
  page: z.number().int().positive().default(1).describe('Page number for pagination'),
  limit: z.number().int().min(1).max(100).default(20).describe('Results per page')
})

// Avoid: Undocumented fields
inputSchema: z.object({
  query: z.string(),
  category: z.string().optional(),
  minPrice: z.number().optional()
})
```

### 3. Provide Examples

Include realistic examples to help AI models understand expected inputs and outputs:

```typescript
@Tool({
  name: 'create_invoice',
  examples: {
    request: {
      customerId: 'cust_abc123',
      lineItems: [
        { description: 'Consulting services', amount: 5000, quantity: 1 }
      ],
      dueDate: '2024-02-15'
    },
    response: {
      id: 'inv_xyz789',
      number: 'INV-2024-0042',
      status: 'draft',
      total: 5000,
      createdAt: '2024-01-15T10:30:00Z'
    }
  }
})
```

### 4. Use Consistent Naming

Follow snake_case convention for tool names:

```typescript
// Recommended: snake_case with verb_noun pattern
'get_user'
'create_order'
'update_product'
'delete_invoice'
'search_customers'
'list_transactions'

// Avoid: Inconsistent casing or unclear names
'getUser'        // camelCase
'user'           // No verb
'doOperation'    // Unclear purpose
```

### 5. Delegate to Services

Keep tool handlers thin; business logic belongs in services:

```typescript
// Recommended: Thin handler
export class OrderTools {
  constructor(private orderService: OrderService) {}

  @Tool({ name: 'create_order' })
  async createOrder(input: CreateOrderInput, ctx: ExecutionContext) {
    return this.orderService.create(input, ctx.auth?.subject);
  }
}

// Avoid: Business logic in handler
export class OrderTools {
  @Tool({ name: 'create_order' })
  async createOrder(input: CreateOrderInput, ctx: ExecutionContext) {
    // Validation
    for (const item of input.items) {
      const product = await db.query('SELECT * FROM products WHERE id = $1', [item.productId]);
      if (!product) throw new Error('Product not found');
      if (product.stock < item.quantity) throw new Error('Insufficient stock');
    }
    // Calculate totals
    let total = 0;
    for (const item of input.items) {
      // ... complex calculation logic
    }
    // Insert order
    const result = await db.query('INSERT INTO orders ...');
    // ... more logic
  }
}
```

### 6. Handle Errors Gracefully

Provide meaningful error messages:

```typescript
@Tool({ name: 'transfer_funds' })
async transferFunds(input: TransferInput, ctx: ExecutionContext) {
  const sourceAccount = await this.accountService.findById(input.sourceId);
  if (!sourceAccount) {
    throw new Error(`Source account not found: ${input.sourceId}`);
  }

  if (sourceAccount.balance < input.amount) {
    throw new Error(
      `Insufficient funds. Available: ${sourceAccount.balance}, Requested: ${input.amount}`
    );
  }

  // Proceed with transfer
}
```

## Returning Resource Links

Tools can return links to resources, allowing AI models to access additional context without embedding large data directly in the response.

### Resource Link Type

```typescript
import type { ResourceLink } from '@nitrostack/core';

@Tool({
  name: 'create_report',
  title: 'Generate Report',
  description: 'Create a report and return a link to the full document'
})
async createReport(input: ReportInput, ctx: ExecutionContext) {
  const report = await this.reportService.generate(input);
  
  return {
    reportId: report.id,
    summary: report.summary,
    // Include a resource link for the full report
    fullReport: {
      type: 'resource_link',
      uri: `report://${report.id}`,
      name: 'Full Report',
      title: `${input.title} - Full Report`,
      description: 'Complete report with all data and visualizations',
      mimeType: 'application/json'
    } as ResourceLink
  };
}
```

### Embedded Resources

For smaller data, embed the resource directly:

```typescript
import type { EmbeddedResource } from '@nitrostack/core';

@Tool({
  name: 'get_config',
  title: 'Get Configuration',
  description: 'Retrieve current configuration'
})
async getConfig(input: {}, ctx: ExecutionContext) {
  const config = await this.configService.get();
  
  return {
    version: config.version,
    embeddedConfig: {
      type: 'resource',
      resource: {
        uri: 'config://current',
        mimeType: 'application/json',
        text: JSON.stringify(config.settings, null, 2)
      }
    } as EmbeddedResource
  };
}
```

## Related Documentation

- [Resources Guide](./05-resources-guide.md) - Exposing data as resources
- [Prompts Guide](./06-prompts-guide.md) - Creating AI prompts
- [Middleware Guide](./07-middleware-guide.md) - Request/response pipeline
- [Guards Guide](../../api-reference/guards.md) - Access control
- [Interceptors Guide](./08-interceptors-guide.md) - Response transformation
- [Pipes Guide](./10-pipes-guide.md) - Input validation and transformation
- [Caching Guide](./caching-guide.md) - Advanced caching strategies
- [Rate Limiting Guide](./rate-limiting-guide.md) - Protecting against abuse
