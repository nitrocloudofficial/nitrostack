# Resources Guide

## Overview

Resources in MCP expose data that AI models can read and reference during conversations. Unlike tools, which perform actions, resources provide static or semi-static data endpoints that describe available information.

This guide covers resource definition, annotations, URI templates, subscriptions, response formats, and integration with NitroStack's middleware pipeline.

## Table of Contents

- [Basic Resource Definition](#basic-resource-definition)
- [Resource Decorator Options](#resource-decorator-options)
- [Resource Annotations](#resource-annotations)
- [URI Templates](#uri-templates)
- [Resource Templates](#resource-templates)
- [Resource Subscriptions](#resource-subscriptions)
- [Response Format](#response-format)
- [MIME Types](#mime-types)
- [Middleware Integration](#middleware-integration)
- [Dependency Injection](#dependency-injection)
- [Dynamic Resource Registration](#dynamic-resource-registration)
- [Best Practices](#best-practices)

## Basic Resource Definition

Resources are defined using the `@Resource` decorator on class methods:

```typescript
import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';

export class ProductResources {
  constructor(private productService: ProductService) {}

  @Resource({
    uri: 'product://{id}',
    name: 'Product Details',
    description: 'Retrieve detailed product information including pricing and inventory',
    mimeType: 'application/json'
  })
  async getProduct(uri: string, context: ExecutionContext) {
    const id = this.extractId(uri, 'product://');
    const product = await this.productService.findById(id);

    if (!product) {
      throw new Error(`Product not found: ${id}`);
    }

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(product, null, 2)
      }]
    };
  }

  private extractId(uri: string, prefix: string): string {
    return uri.replace(prefix, '');
  }
}
```

## Resource Decorator Options

### Options Reference

```typescript
interface ResourceOptions {
  /** URI template with optional parameters (required) */
  uri: string;

  /** Human-readable resource name (required) */
  name: string;

  /** Human-readable display title (optional) */
  title?: string;

  /** Description of what data the resource provides (required) */
  description: string;

  /** Content MIME type (default: 'text/plain') */
  mimeType?: string;

  /** Size of the resource in bytes (optional, for binary resources) */
  size?: number;

  /** Metadata hints for clients about how to use the resource */
  annotations?: ResourceAnnotations;

  /** Example response for documentation */
  examples?: {
    response?: unknown;
  };
}
```

### Complete Example

```typescript
@Resource({
  uri: 'user://{userId}/profile',
  name: 'User Profile',
  title: 'User Profile Details',
  description: 'Complete user profile including account settings, preferences, and activity summary',
  mimeType: 'application/json',
  annotations: {
    audience: ['user', 'assistant'],
    priority: 0.8,
    lastModified: new Date().toISOString()
  },
  examples: {
    response: {
      id: 'usr_abc123',
      email: 'jane.doe@example.com',
      name: 'Jane Doe',
      preferences: {
        theme: 'dark',
        language: 'en',
        timezone: 'America/New_York'
      },
      stats: {
        ordersPlaced: 42,
        memberSince: '2023-01-15'
      }
    }
  }
})
async getUserProfile(uri: string, ctx: ExecutionContext) {
  const userId = this.extractParam(uri, /user:\/\/([^\/]+)\/profile/);
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

## Resource Annotations

Resource annotations provide metadata hints to AI models and MCP clients about how to use or display resources.

### Annotation Properties

```typescript
interface ResourceAnnotations {
  /** 
   * Who should see this resource.
   * - 'user': For human consumption (UI display)
   * - 'assistant': For AI model context
   * Can include both for shared resources.
   */
  audience?: ('user' | 'assistant')[];

  /**
   * Importance of this resource (0.0 to 1.0).
   * Higher values indicate more important resources.
   * Clients may use this to prioritize display or context inclusion.
   */
  priority?: number;

  /**
   * ISO 8601 timestamp of when the resource was last modified.
   * Helps clients cache and invalidate resources appropriately.
   */
  lastModified?: string;
}
```

### Annotation Examples

**High-Priority Configuration:**

```typescript
@Resource({
  uri: 'config://application',
  name: 'Application Configuration',
  title: 'App Config',
  description: 'Current application settings and feature flags',
  mimeType: 'application/json',
  annotations: {
    audience: ['assistant'],  // Primarily for AI context
    priority: 1.0,            // Highest priority
    lastModified: '2024-01-15T10:30:00Z'
  }
})
async getConfig(uri: string) {
  // ...
}
```

**User-Facing Documentation:**

```typescript
@Resource({
  uri: 'docs://api-reference',
  name: 'API Reference',
  title: 'API Documentation',
  description: 'Complete API documentation for developers',
  mimeType: 'text/markdown',
  annotations: {
    audience: ['user'],       // For human reading
    priority: 0.5,            // Medium priority
    lastModified: '2024-01-10T08:00:00Z'
  }
})
async getApiDocs(uri: string) {
  // ...
}
```

**Shared Context Resource:**

```typescript
@Resource({
  uri: 'dashboard://metrics',
  name: 'Dashboard Metrics',
  title: 'Live Metrics Dashboard',
  description: 'Real-time system metrics and KPIs',
  mimeType: 'application/json',
  annotations: {
    audience: ['user', 'assistant'],  // Both can use it
    priority: 0.9,
    lastModified: new Date().toISOString()
  }
})
async getDashboardMetrics(uri: string) {
  // ...
}
```

## URI Templates

### Static URIs

For singleton resources without parameters:

```typescript
@Resource({
  uri: 'config://application',
  name: 'Application Configuration',
  description: 'Current application configuration and feature flags'
})
async getAppConfig(uri: string, ctx: ExecutionContext) {
  const config = await this.configService.getAll();
  return {
    contents: [{
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(config, null, 2)
    }]
  };
}
```

### Parameterized URIs

URIs can include dynamic parameters enclosed in curly braces:

```typescript
// Single parameter
@Resource({ uri: 'product://{id}', name: 'Product' })

// Multiple parameters
@Resource({ uri: 'order://{orderId}/item/{itemId}', name: 'Order Item' })

// Path-style parameter
@Resource({ uri: 'file:///{path}', name: 'File Contents' })
```

### Parameter Extraction

Extract parameters from URIs using regular expressions:

```typescript
@Resource({
  uri: 'order://{orderId}/item/{itemId}',
  name: 'Order Line Item',
  description: 'Details for a specific item within an order'
})
async getOrderItem(uri: string, ctx: ExecutionContext) {
  const match = uri.match(/order:\/\/([^\/]+)\/item\/([^\/]+)/);
  if (!match) {
    throw new Error(`Invalid URI format: ${uri}`);
  }

  const [, orderId, itemId] = match;
  const item = await this.orderService.getItem(orderId, itemId);

  if (!item) {
    throw new Error(`Order item not found: ${orderId}/${itemId}`);
  }

  return {
    contents: [{
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(item, null, 2)
    }]
  };
}
```

### URI Utility Helper

Consider creating a utility for parameter extraction:

```typescript
// utils/uri.ts
export function parseUri(uri: string, template: string): Record<string, string> {
  const paramNames: string[] = [];
  const regexPattern = template.replace(/\{(\w+)\}/g, (_, name) => {
    paramNames.push(name);
    return '([^/]+)';
  });

  const match = uri.match(new RegExp(`^${regexPattern}$`));
  if (!match) {
    throw new Error(`URI does not match template: ${uri}`);
  }

  const params: Record<string, string> = {};
  paramNames.forEach((name, index) => {
    params[name] = match[index + 1];
  });

  return params;
}

// Usage
@Resource({ uri: 'order://{orderId}/item/{itemId}' })
async getOrderItem(uri: string, ctx: ExecutionContext) {
  const params = parseUri(uri, 'order://{orderId}/item/{itemId}');
  const item = await this.orderService.getItem(params.orderId, params.itemId);
  // ...
}
```

## Resource Templates

Resource templates define parameterized URI patterns that clients can use to discover and construct resource URIs. Unlike regular resources, templates describe a pattern rather than a concrete resource.

### Defining Resource Templates

```typescript
import { createResourceTemplate } from '@nitrostack/core';

// In your module setup
const productTemplate = createResourceTemplate({
  uriTemplate: 'product://{productId}',
  name: 'Product Resource',
  title: 'Product Details Template',
  description: 'Template for accessing individual product resources',
  mimeType: 'application/json',
  annotations: {
    audience: ['assistant'],
    priority: 0.7
  }
});

// Register with server
server.resourceTemplate(productTemplate);
```

### Template Parameters

Templates use curly brace syntax for parameters:

```typescript
// Single parameter
'product://{id}'

// Multiple parameters  
'user://{userId}/order/{orderId}'

// Path parameters
'file:///{path}'
```

### Use Cases

Resource templates are useful when:

1. **Dynamic resources**: Resources that don't exist until requested (e.g., user-specific data)
2. **Large datasets**: Instead of listing all products, provide a template for accessing any product
3. **API discovery**: Help AI models understand available resource patterns

## Resource Subscriptions

Clients can subscribe to resources to receive notifications when they change. This enables real-time updates without polling.

### Server Capabilities

NitroStack declares subscription support in server capabilities:

```typescript
{
  capabilities: {
    resources: {
      subscribe: true,
      listChanged: true
    }
  }
}
```

### Handling Subscriptions

When a client subscribes to a resource, your application can track subscriptions and notify clients of changes:

```typescript
import { McpApplicationFactory } from '@nitrostack/core';

const app = await McpApplicationFactory.create(AppModule);
const server = app.getServer();

// When a resource changes, notify subscribers
function onResourceUpdated(uri: string) {
  server.notifyResourceUpdated(uri);
}

// Example: Update product and notify
async function updateProduct(productId: string, data: ProductData) {
  await this.productRepo.update(productId, data);
  onResourceUpdated(`product://${productId}`);
}
```

### Subscription Flow

1. **Client subscribes**: `resources/subscribe` with resource URI
2. **Server tracks**: Maintains list of subscribed URIs
3. **Resource changes**: Your code detects the change
4. **Server notifies**: Sends `notifications/resources/updated` with URI
5. **Client refreshes**: Fetches updated resource content

### List Changed Notifications

When resources are added or removed, notify clients:

```typescript
// After adding a new resource
server.notifyResourcesListChanged();

// After removing a resource
server.notifyResourcesListChanged();
```

## Response Format

### Standard Response Structure

Resources must return an object with a `contents` array:

```typescript
return {
  contents: [
    {
      uri: string;           // The requested URI
      mimeType?: string;     // Content type
      text?: string;         // Text content
      blob?: Uint8Array;     // Binary content
    }
  ]
};
```

### Single Content Response

Most resources return a single content item:

```typescript
return {
  contents: [{
    uri: 'product://prod-123',
    mimeType: 'application/json',
    text: JSON.stringify({
      id: 'prod-123',
      name: 'Widget',
      price: 29.99
    }, null, 2)
  }]
};
```

### Multiple Content Response

Resources can return multiple content items:

```typescript
@Resource({
  uri: 'report://{id}',
  name: 'Report Bundle',
  description: 'Complete report with summary, data, and visualizations'
})
async getReport(uri: string, ctx: ExecutionContext) {
  const id = uri.replace('report://', '');
  const report = await this.reportService.generate(id);

  return {
    contents: [
      {
        uri: `${uri}/summary`,
        mimeType: 'text/plain',
        text: report.executiveSummary
      },
      {
        uri: `${uri}/data`,
        mimeType: 'application/json',
        text: JSON.stringify(report.data, null, 2)
      },
      {
        uri: `${uri}/metadata`,
        mimeType: 'application/json',
        text: JSON.stringify({
          generatedAt: report.timestamp,
          author: report.author,
          version: report.version
        }, null, 2)
      }
    ]
  };
}
```

## MIME Types

### Common MIME Types

| MIME Type | Use Case |
|-----------|----------|
| `application/json` | Structured data, API responses |
| `text/plain` | Plain text, logs |
| `text/markdown` | Documentation, formatted content |
| `text/html` | Rich formatted content |
| `text/csv` | Tabular data |
| `application/xml` | XML documents |
| `image/png`, `image/jpeg` | Images (use `blob` field) |

### Type-Specific Examples

```typescript
// JSON data
@Resource({
  uri: 'api://users',
  mimeType: 'application/json'
})
async getUsers(uri: string) {
  const users = await this.userService.findAll();
  return {
    contents: [{
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(users, null, 2)
    }]
  };
}

// Markdown documentation
@Resource({
  uri: 'docs://api-reference',
  mimeType: 'text/markdown'
})
async getApiDocs(uri: string) {
  const docs = await this.docsService.getApiReference();
  return {
    contents: [{
      uri,
      mimeType: 'text/markdown',
      text: docs
    }]
  };
}

// CSV export
@Resource({
  uri: 'export://transactions',
  mimeType: 'text/csv'
})
async getTransactionsCsv(uri: string) {
  const csv = await this.exportService.transactionsToCsv();
  return {
    contents: [{
      uri,
      mimeType: 'text/csv',
      text: csv
    }]
  };
}
```

## Middleware Integration

### Guards for Protected Resources

```typescript
import { UseGuards } from '@nitrostack/core';
import { JWTGuard } from './guards/jwt.guard.js';

@Resource({
  uri: 'user://{id}/private-data',
  name: 'Private User Data',
  description: 'Sensitive user data requiring authentication'
})
@UseGuards(JWTGuard)
async getPrivateData(uri: string, ctx: ExecutionContext) {
  const requesterId = ctx.auth?.subject;
  const targetId = uri.match(/user:\/\/([^\/]+)/)?.[1];

  // Authorization check
  if (requesterId !== targetId) {
    throw new Error('Access denied: You can only access your own data');
  }

  const data = await this.userService.getPrivateData(targetId);
  return {
    contents: [{
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(data, null, 2)
    }]
  };
}
```

### Caching

```typescript
import { Cache } from '@nitrostack/core';

@Resource({
  uri: 'config://application',
  name: 'Application Config'
})
@Cache({ ttl: 3600 })  // Cache for 1 hour
async getConfig(uri: string) {
  const config = await this.configService.load();
  return {
    contents: [{
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(config, null, 2)
    }]
  };
}

// Cache with custom key
@Resource({ uri: 'weather://{city}' })
@Cache({
  ttl: 600,  // 10 minutes
  key: (uri) => `weather:${uri.replace('weather://', '')}`
})
async getWeather(uri: string) {
  // ...
}
```

### UI Widgets

```typescript
import { Widget } from '@nitrostack/core';

@Resource({
  uri: 'dashboard://metrics',
  name: 'Dashboard Metrics'
})
@Widget('metrics-dashboard')  // Renders visual dashboard
async getDashboardMetrics(uri: string) {
  const metrics = await this.metricsService.getDashboard();
  return {
    contents: [{
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(metrics, null, 2)
    }]
  };
}
```

## Dependency Injection

Inject services into resource classes:

```typescript
import { Injectable } from '@nitrostack/core';

@Injectable()
export class ProductRepository {
  constructor(private db: DatabaseService) {}

  async findById(id: string): Promise<Product | null> {
    return this.db.query('SELECT * FROM products WHERE id = $1', [id]);
  }

  async findAll(options?: ListOptions): Promise<Product[]> {
    return this.db.query(
      'SELECT * FROM products ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [options?.limit ?? 50, options?.offset ?? 0]
    );
  }
}

export class ProductResources {
  constructor(private productRepo: ProductRepository) {}

  @Resource({ uri: 'product://{id}', name: 'Product' })
  async getProduct(uri: string) {
    const id = uri.replace('product://', '');
    const product = await this.productRepo.findById(id);

    if (!product) {
      throw new Error(`Product not found: ${id}`);
    }

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(product, null, 2)
      }]
    };
  }

  @Resource({ uri: 'products://catalog', name: 'Product Catalog' })
  @Cache({ ttl: 300 })
  async getCatalog(uri: string) {
    const products = await this.productRepo.findAll();
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(products, null, 2)
      }]
    };
  }
}
```

## Dynamic Resource Registration

NitroStack supports dynamic resource registration at runtime, with automatic client notifications.

### Adding Resources Dynamically

```typescript
import { McpApplicationFactory, createResource } from '@nitrostack/core';

const app = await McpApplicationFactory.create(AppModule);
const server = app.getServer();

// Create a new resource
const newResource = createResource({
  uri: 'dynamic://new-data',
  name: 'Dynamic Data',
  title: 'Dynamically Added Data',
  description: 'A resource added at runtime',
  mimeType: 'application/json',
  annotations: {
    audience: ['assistant'],
    priority: 0.5
  }
}, async (uri, context) => {
  return {
    contents: [{
      uri,
      mimeType: 'application/json',
      text: JSON.stringify({ data: 'dynamic content' })
    }]
  };
});

// Register and notify clients
server.resource(newResource);
server.notifyResourcesListChanged();
```

### Use Cases

1. **Plugin systems**: Load resources from external modules
2. **User-generated content**: Create resources based on user data
3. **Feature flags**: Enable/disable resources dynamically
4. **Multi-tenancy**: Provide tenant-specific resources

## Best Practices

### 1. Use Descriptive URI Schemes

Choose URI schemes that clearly indicate the resource type:

```typescript
// Recommended: Clear, domain-specific schemes
'product://{id}'
'user://{userId}/profile'
'order://{orderId}/invoice'
'config://application'
'docs://api-reference'

// Avoid: Generic or ambiguous schemes
'resource://{id}'
'data://{type}/{id}'
'get://{something}'
```

### 2. Set Appropriate MIME Types

Match the MIME type to the actual content:

```typescript
// Recommended: Accurate MIME types
@Resource({ uri: 'api://users', mimeType: 'application/json' })
@Resource({ uri: 'docs://readme', mimeType: 'text/markdown' })
@Resource({ uri: 'export://data', mimeType: 'text/csv' })

// Avoid: Using text/plain for everything
@Resource({ uri: 'api://users', mimeType: 'text/plain' })  // Incorrect for JSON
```

### 3. Validate URI Parameters

Always validate extracted parameters:

```typescript
@Resource({ uri: 'user://{id}' })
async getUser(uri: string) {
  const id = uri.replace('user://', '');

  // Validate parameter
  if (!id || id.length < 3) {
    throw new Error('Invalid user ID format');
  }

  const user = await this.userService.findById(id);
  if (!user) {
    throw new Error(`User not found: ${id}`);
  }

  return {
    contents: [{
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(user, null, 2)
    }]
  };
}
```

### 4. Cache Appropriately

Cache static or slowly-changing resources:

```typescript
// Recommended: Cache static configuration
@Resource({ uri: 'config://app' })
@Cache({ ttl: 3600 })  // 1 hour - configuration rarely changes

// Recommended: Short cache for external APIs
@Resource({ uri: 'weather://{city}' })
@Cache({ ttl: 600 })  // 10 minutes - weather updates periodically

// Avoid: Long cache for volatile data
@Resource({ uri: 'stock://{symbol}' })
@Cache({ ttl: 3600 })  // Too long for real-time stock prices
```

### 5. Delegate to Services

Keep resource handlers thin:

```typescript
// Recommended: Delegate to service
export class ReportResources {
  constructor(private reportService: ReportService) {}

  @Resource({ uri: 'report://{id}' })
  async getReport(uri: string) {
    const id = uri.replace('report://', '');
    const report = await this.reportService.findById(id);
    return {
      contents: [{ uri, text: JSON.stringify(report, null, 2) }]
    };
  }
}

// Avoid: Business logic in handler
export class ReportResources {
  @Resource({ uri: 'report://{id}' })
  async getReport(uri: string) {
    const id = uri.replace('report://', '');
    const db = getDatabase();
    const rows = await db.query('SELECT * FROM reports WHERE id = $1', [id]);
    const report = rows[0];
    // ... complex transformation logic
    // ... aggregation logic
    return { contents: [{ uri, text: JSON.stringify(result) }] };
  }
}
```

### 6. Document with Examples

Provide example responses in decorator options:

```typescript
@Resource({
  uri: 'product://{id}',
  name: 'Product Details',
  description: 'Complete product information including pricing, inventory, and metadata',
  mimeType: 'application/json',
  examples: {
    response: {
      id: 'prod_abc123',
      name: 'Premium Widget',
      price: 49.99,
      currency: 'USD',
      inventory: { available: 150, reserved: 12 },
      metadata: { category: 'electronics', weight: '0.5kg' }
    }
  }
})
```

## Related Documentation

- [Tools Guide](./04-tools-guide.md) - Creating callable tools
- [Prompts Guide](./06-prompts-guide.md) - Creating AI prompts
- [Middleware Guide](./07-middleware-guide.md) - Request/response pipeline
- [Guards Guide](../../api-reference/guards.md) - Access control
- [Caching Guide](./caching-guide.md) - Advanced caching strategies
- [Events Guide](./15-events-guide.md) - Event-driven updates
- [UI Widgets Guide](./16-ui-widgets-guide.md) - Visual components
