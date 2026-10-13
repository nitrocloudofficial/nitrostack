# Generate Command

## Overview

The `generate` command creates boilerplate code for common NitroStack components, saving time and ensuring consistency.

## Usage

```bash
nitrostack-cli generate <type> [name] [options]
```

## Types

| Type | Description | Requires Name |
|------|-------------|---------------|
| `types` | Generate TypeScript types from tools | No |
| `module` | Generate a new module | Yes |
| `tool` | Generate a tool definition | Yes |
| `resource` | Generate a resource definition | Yes |
| `prompt` | Generate a prompt definition | Yes |
| `guard` | Generate an authentication guard | Yes |
| `middleware` | Generate middleware | Yes |
| `interceptor` | Generate an interceptor | Yes |
| `pipe` | Generate a pipe | Yes |
| `filter` | Generate an exception filter | Yes |
| `service` | Generate a service | Yes |

## Options

| Option | Description |
|--------|-------------|
| `--module <name>` | Specify module (for tools, resources, prompts) |
| `--output <path>` | Custom output path (for types) |
| `--force` | Overwrite existing files |

## Examples

### Generate Types

Auto-generate TypeScript types from your tool definitions:

```bash
nitrostack-cli generate types
```

**Output**: `src/types/generated-tools.ts`

```typescript
export type GetProductInput = {
  product_id: string;
};

export type GetProductOutput = {
  id: string;
  name: string;
  price: number;
};

export interface ToolInputs {
  'get_product': GetProductInput;
}

export interface ToolOutputs {
  'get_product': GetProductOutput;
}
```

Custom output path:

```bash
nitrostack-cli generate types --output src/types/custom.ts
```

### Generate Module

Create a new feature module:

```bash
nitrostack-cli generate module payments
```

**Creates**:
- `src/modules/payments/payments.module.ts`
- `src/modules/payments/payments.tools.ts`
- `src/modules/payments/payments.resources.ts`
- `src/modules/payments/payments.prompts.ts`

**Generated Code**:

```typescript
// payments.module.ts
import { Module } from '@nitrostack/core';
import { PaymentsTools } from './payments.tools.js';
import { PaymentsResources } from './payments.resources.js';
import { PaymentsPrompts } from './payments.prompts.js';

@Module({
  name: 'payments',
  description: 'Payments module',
  controllers: [PaymentsTools, PaymentsResources, PaymentsPrompts]
})
export class PaymentsModule {}
```

### Generate Tool

Add a tool to an existing module:

```bash
nitrostack-cli generate tool process-payment --module payments
```

**Creates**: `src/modules/payments/process-payment.tool.ts`

```typescript
import { ToolDecorator as Tool, z, ExecutionContext } from '@nitrostack/core';

export class ProcessPaymentTool {
  @Tool({
    name: 'process_payment',
    description: 'TODO: Add description',
    inputSchema: z.object({
      // TODO: Add input fields
    })
  })
  async processPayment(input: any, context: ExecutionContext) {
    // TODO: Implement logic
    return {};
  }
}
```

### Generate Resource

```bash
nitrostack-cli generate resource payment-status --module payments
```

**Creates**: `src/modules/payments/payment-status.resource.ts`

```typescript
import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';

export class PaymentStatusResource {
  @Resource({
    uri: 'payment://status/{id}',
    name: 'Payment Status',
    description: 'TODO: Add description'
  })
  async getPaymentStatus(uri: string, context: ExecutionContext) {
    // Extract ID from URI
    const id = uri.split('/').pop();
    
    // TODO: Implement logic
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({ id, status: 'pending' })
      }]
    };
  }
}
```

### Generate Prompt

```bash
nitrostack-cli generate prompt payment-reminder --module payments
```

**Creates**: `src/modules/payments/payment-reminder.prompt.ts`

```typescript
import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class PaymentReminderPrompt {
  @Prompt({
    name: 'payment_reminder',
    description: 'TODO: Add description',
    arguments: [
      {
        name: 'customer_name',
        description: 'Customer name',
        required: true
      }
    ]
  })
  async getPaymentReminder(args: Record<string, string>, context: ExecutionContext) {
    return {
      messages: [
        {
          role: 'system',
          content: 'You are a payment reminder assistant.'
        },
        {
          role: 'user',
          content: `Create a payment reminder for ${args.customer_name}`
        }
      ]
    };
  }
}
```

### Generate Guard

Create an authentication guard:

```bash
nitrostack-cli generate guard admin
```

**Creates**: `src/guards/admin.guard.ts`

```typescript
import { Guard, ExecutionContext } from '@nitrostack/core';

export class AdminGuard implements Guard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // TODO: Implement admin check
    const user = context.auth?.user;
    return user?.role === 'admin';
  }
}
```

### Generate Middleware

```bash
nitrostack-cli generate middleware logging
```

**Creates**: `src/middleware/logging.middleware.ts`

```typescript
import { Middleware, MiddlewareInterface, ExecutionContext } from '@nitrostack/core';

@Middleware()
export class LoggingMiddleware implements MiddlewareInterface {
  async use(context: ExecutionContext, next: () => Promise<any>) {
    const start = Date.now();
    console.log(`[${context.toolName}] Started`);
    
    const result = await next();
    
    const duration = Date.now() - start;
    console.log(`[${context.toolName}] Completed in ${duration}ms`);
    
    return result;
  }
}
```

### Generate Interceptor

```bash
nitrostack-cli generate interceptor transform
```

**Creates**: `src/interceptors/transform.interceptor.ts`

```typescript
import { Interceptor, InterceptorInterface, ExecutionContext } from '@nitrostack/core';

@Interceptor()
export class TransformInterceptor implements InterceptorInterface {
  async intercept(context: ExecutionContext, next: () => Promise<any>) {
    const result = await next();
    
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    };
  }
}
```

### Generate Pipe

```bash
nitrostack-cli generate pipe validation
```

**Creates**: `src/pipes/validation.pipe.ts`

```typescript
import { Pipe, PipeInterface, ArgumentMetadata } from '@nitrostack/core';

@Pipe()
export class ValidationPipe implements PipeInterface {
  transform(value: any, metadata: ArgumentMetadata) {
    // TODO: Implement validation
    return value;
  }
}
```

### Generate Filter

```bash
nitrostack-cli generate filter http-exception
```

**Creates**: `src/filters/http-exception.filter.ts`

```typescript
import { ExceptionFilter, ExceptionFilterInterface, ExecutionContext } from '@nitrostack/core';

@ExceptionFilter()
export class HttpExceptionFilter implements ExceptionFilterInterface {
  catch(exception: any, context: ExecutionContext) {
    return {
      statusCode: exception.status || 500,
      message: exception.message || 'Internal server error',
      timestamp: new Date().toISOString(),
      tool: context.toolName
    };
  }
}
```

### Generate Service

```bash
nitrostack-cli generate service email
```

**Creates**: `src/services/email.service.ts`

```typescript
import { Injectable } from '@nitrostack/core';

@Injectable()
export class EmailService {
  async send(to: string, subject: string, body: string) {
    // TODO: Implement email sending
    console.log(`Sending email to ${to}: ${subject}`);
  }
}
```

## Workflow Examples

### Adding a New Feature

```bash
# 1. Generate module
nitrostack-cli generate module notifications

# 2. Generate tools
nitrostack-cli generate tool send-notification --module notifications
nitrostack-cli generate tool get-notifications --module notifications

# 3. Generate service
nitrostack-cli generate service notification

# 4. Generate types
nitrostack-cli generate types

# 5. Register module in app.module.ts
# Import and add to imports array

# 6. Start dev mode
nitrostack-cli dev
```

### Adding Authentication

```bash
# 1. Generate guard
nitrostack-cli generate guard jwt

# 2. Implement guard logic
# Edit src/guards/jwt.guard.ts

# 3. Use on tools
# @UseGuards(JWTGuard)

# 4. Test in Studio
nitrostack-cli dev
```

### Refactoring to Services

```bash
# 1. Generate service
nitrostack-cli generate service user

# 2. Move business logic from tools to service
# 3. Inject service in tools via constructor
# 4. Register service in module providers
```

## Best Practices

### 1. Generate Before Manual Creation

Always use generators for consistency:

```bash
# Good
nitrostack-cli generate module users

# Avoid
# Manually creating files
```

### 2. Regenerate Types Frequently

After changing tools:

```bash
nitrostack-cli generate types
```

This ensures type safety between backend and widgets.

### 3. Use Module Flag

Keep code organized:

```bash
# Good - organized
nitrostack-cli generate tool get-user --module users

# Avoid - scattered
nitrostack-cli generate tool get-user
```

### 4. Review Generated Code

Generators create boilerplate - customize it:

```typescript
// Generated
@Tool({
  name: 'my_tool',
  description: 'TODO: Add description',  // ← Update this
  inputSchema: z.object({
    // TODO: Add fields  // ← Add fields
  })
})
```

### 5. Commit Generated Files

Generated files are part of your codebase:

```bash
git add src/types/generated-tools.ts
git commit -m "chore: update generated types"
```

## Troubleshooting

### File Already Exists

**Error**: `File already exists`

**Solution**:
```bash
# Use --force to overwrite
nitrostack-cli generate tool my-tool --force

# Or rename/delete existing file
rm src/modules/my-module/my-tool.tool.ts
```

### Module Not Found

**Error**: `Module 'payments' not found`

**Solution**:
```bash
# Create module first
nitrostack-cli generate module payments

# Then add tools
nitrostack-cli generate tool process-payment --module payments
```

### Types Generation Failed

**Error**: `No tool files found`

**Solution**:
```bash
# Ensure tools exist
ls src/modules/*/tools.ts

# Check file naming
# Should be: *.tools.ts (not *.tool.ts)
```

### Permission Denied

**Error**: `EACCES: permission denied`

**Solution**:
```bash
# Fix permissions
chmod +w src/

# Or run with sudo (not recommended)
sudo nitrostack-cli generate types
```

## Advanced Usage

### Custom Templates

Coming soon: Custom generator templates

### Batch Generation

```bash
# Generate multiple at once
nitrostack-cli generate module payments && \
nitrostack-cli generate tool create-payment --module payments && \
nitrostack-cli generate tool get-payment --module payments && \
nitrostack-cli generate types
```

### Integration with IDE

Many IDEs support running npm scripts:

```json
{
  "scripts": {
    "gen:types": "nitrostack-cli generate types",
    "gen:module": "nitrostack-cli generate module"
  }
}
```

## Next Steps

- [Testing Guide](../sdk/typescript/14-testing-guide.md)
- [Server Concepts](../sdk/typescript/03-server-concepts.md)
- [Tools Guide](../sdk/typescript/04-tools-guide.md)

---

**Tip**: Create aliases for frequent commands:

```bash
# In .bashrc or .zshrc
alias smg='nitrostack-cli generate'
alias smgt='nitrostack-cli generate types'
alias smgm='nitrostack-cli generate module'
```

