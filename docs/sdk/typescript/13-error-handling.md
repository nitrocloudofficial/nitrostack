# Error Handling Guide

## Overview

Effective error handling is essential for building robust MCP servers. NitroStack provides exception filters and standardized error patterns to help you handle errors gracefully and provide meaningful feedback to AI models.

## Table of Contents

- [Throwing Errors](#throwing-errors)
- [Custom Error Classes](#custom-error-classes)
- [Exception Filters](#exception-filters)
- [Error Response Patterns](#error-response-patterns)
- [Logging Errors](#logging-errors)
- [Best Practices](#best-practices)

## Throwing Errors

### Standard Errors

```typescript
import { ToolDecorator as Tool, ExecutionContext } from '@nitrostack/core';

export class UserTools {
  @Tool({ name: 'get_user' })
  async getUser(input: { userId: string }, ctx: ExecutionContext) {
    const user = await this.userService.findById(input.userId);

    if (!user) {
      throw new Error(`User not found: ${input.userId}`);
    }

    return user;
  }
}
```

### Error with Context

```typescript
@Tool({ name: 'transfer_funds' })
async transferFunds(
  input: { fromAccount: string; toAccount: string; amount: number },
  ctx: ExecutionContext
) {
  const sourceAccount = await this.accountService.findById(input.fromAccount);

  if (!sourceAccount) {
    throw new Error(`Source account not found: ${input.fromAccount}`);
  }

  if (sourceAccount.balance < input.amount) {
    throw new Error(
      `Insufficient funds. Available: ${sourceAccount.balance}, Requested: ${input.amount}`
    );
  }

  return this.accountService.transfer(input);
}
```

## Custom Error Classes

### Domain-Specific Errors

```typescript
// errors/not-found.error.ts
export class NotFoundError extends Error {
  public readonly resourceType: string;
  public readonly resourceId: string;

  constructor(resourceType: string, resourceId: string) {
    super(`${resourceType} not found: ${resourceId}`);
    this.name = 'NotFoundError';
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }
}

// errors/validation.error.ts
export class ValidationError extends Error {
  public readonly field: string;
  public readonly value: unknown;
  public readonly constraint: string;

  constructor(field: string, value: unknown, constraint: string) {
    super(`Validation failed for ${field}: ${constraint}`);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
    this.constraint = constraint;
  }
}

// errors/authorization.error.ts
export class AuthorizationError extends Error {
  public readonly requiredPermission: string;
  public readonly userId?: string;

  constructor(requiredPermission: string, userId?: string) {
    super(`Access denied. Required permission: ${requiredPermission}`);
    this.name = 'AuthorizationError';
    this.requiredPermission = requiredPermission;
    this.userId = userId;
  }
}

// errors/business-rule.error.ts
export class BusinessRuleError extends Error {
  public readonly rule: string;
  public readonly context: Record<string, unknown>;

  constructor(rule: string, message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = 'BusinessRuleError';
    this.rule = rule;
    this.context = context;
  }
}
```

### Using Custom Errors

```typescript
import { NotFoundError, ValidationError, BusinessRuleError } from './errors/index.js';

@Tool({ name: 'update_order' })
async updateOrder(
  input: { orderId: string; status: string },
  ctx: ExecutionContext
) {
  const order = await this.orderService.findById(input.orderId);

  if (!order) {
    throw new NotFoundError('Order', input.orderId);
  }

  const validStatuses = ['pending', 'processing', 'shipped', 'delivered'];
  if (!validStatuses.includes(input.status)) {
    throw new ValidationError(
      'status',
      input.status,
      `Must be one of: ${validStatuses.join(', ')}`
    );
  }

  if (order.status === 'delivered' && input.status !== 'delivered') {
    throw new BusinessRuleError(
      'ORDER_ALREADY_DELIVERED',
      'Cannot change status of a delivered order',
      { orderId: order.id, currentStatus: order.status }
    );
  }

  return this.orderService.updateStatus(input.orderId, input.status);
}
```

## Exception Filters

### Creating an Exception Filter

```typescript
import { ExceptionFilter, ExceptionFilterInterface, ExecutionContext } from '@nitrostack/core';

@ExceptionFilter()
export class GlobalExceptionFilter implements ExceptionFilterInterface {
  catch(exception: unknown, context: ExecutionContext): any {
    const timestamp = new Date().toISOString();
    const requestId = context.metadata?.requestId || context.requestId;

    // Log the error
    context.logger.error('Exception caught', {
      requestId,
      toolName: context.toolName,
      error: this.serializeError(exception)
    });

    // Handle specific error types
    if (exception instanceof NotFoundError) {
      return {
        error: true,
        code: 'NOT_FOUND',
        message: exception.message,
        details: {
          resourceType: exception.resourceType,
          resourceId: exception.resourceId
        },
        timestamp,
        requestId
      };
    }

    if (exception instanceof ValidationError) {
      return {
        error: true,
        code: 'VALIDATION_ERROR',
        message: exception.message,
        details: {
          field: exception.field,
          constraint: exception.constraint
        },
        timestamp,
        requestId
      };
    }

    if (exception instanceof AuthorizationError) {
      return {
        error: true,
        code: 'FORBIDDEN',
        message: 'Access denied',
        timestamp,
        requestId
      };
    }

    if (exception instanceof BusinessRuleError) {
      return {
        error: true,
        code: exception.rule,
        message: exception.message,
        details: exception.context,
        timestamp,
        requestId
      };
    }

    // Generic error handling
    return {
      error: true,
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      timestamp,
      requestId
    };
  }

  private serializeError(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
    return { value: String(error) };
  }
}
```

### Using Exception Filters

```typescript
import { UseFilters } from '@nitrostack/core';
import { GlobalExceptionFilter } from './filters/global-exception.filter.js';

@Tool({ name: 'risky_operation' })
@UseFilters(GlobalExceptionFilter)
async riskyOperation(input: RiskyInput, ctx: ExecutionContext) {
  // Errors are caught and formatted by the filter
  return this.riskyService.execute(input);
}
```

### Specialized Filters

```typescript
@ExceptionFilter()
export class DatabaseExceptionFilter implements ExceptionFilterInterface {
  catch(exception: unknown, context: ExecutionContext): any {
    if (this.isDatabaseError(exception)) {
      context.logger.error('Database error', {
        code: exception.code,
        message: exception.message
      });

      // Handle specific database errors
      if (exception.code === 'UNIQUE_VIOLATION') {
        return {
          error: true,
          code: 'DUPLICATE_ENTRY',
          message: 'A record with this value already exists'
        };
      }

      if (exception.code === 'FOREIGN_KEY_VIOLATION') {
        return {
          error: true,
          code: 'REFERENCE_ERROR',
          message: 'Referenced record does not exist'
        };
      }

      return {
        error: true,
        code: 'DATABASE_ERROR',
        message: 'A database error occurred'
      };
    }

    // Re-throw non-database errors
    throw exception;
  }

  private isDatabaseError(error: unknown): error is DatabaseError {
    return error instanceof Error && 'code' in error;
  }
}
```

## Error Response Patterns

### Standardized Error Response

```typescript
interface ErrorResponse {
  error: true;
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  requestId?: string;
}

// Example responses:

// Not found
{
  error: true,
  code: 'NOT_FOUND',
  message: 'User not found: usr_abc123',
  details: { resourceType: 'User', resourceId: 'usr_abc123' },
  timestamp: '2024-01-15T10:30:00Z',
  requestId: 'req_xyz789'
}

// Validation error
{
  error: true,
  code: 'VALIDATION_ERROR',
  message: 'Validation failed for email: Must be a valid email address',
  details: { field: 'email', constraint: 'Must be a valid email address' },
  timestamp: '2024-01-15T10:30:00Z',
  requestId: 'req_xyz789'
}

// Business rule violation
{
  error: true,
  code: 'INSUFFICIENT_FUNDS',
  message: 'Insufficient funds for transfer',
  details: { available: 100.00, requested: 150.00 },
  timestamp: '2024-01-15T10:30:00Z',
  requestId: 'req_xyz789'
}
```

### Error Codes Enumeration

```typescript
export const ErrorCodes = {
  // Client errors (4xx equivalent)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',

  // Business errors
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  ORDER_ALREADY_SHIPPED: 'ORDER_ALREADY_SHIPPED',
  INVENTORY_EXHAUSTED: 'INVENTORY_EXHAUSTED',

  // Server errors (5xx equivalent)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR'
} as const;
```

## Logging Errors

### Structured Error Logging

```typescript
@Tool({ name: 'process_payment' })
async processPayment(input: PaymentInput, ctx: ExecutionContext) {
  try {
    return await this.paymentService.process(input);
  } catch (error) {
    // Log with full context
    ctx.logger.error('Payment processing failed', {
      requestId: ctx.requestId,
      userId: ctx.auth?.subject,
      amount: input.amount,
      error: {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });

    // Re-throw for filter handling
    throw error;
  }
}
```

### Error Monitoring Integration

```typescript
import { Injectable } from '@nitrostack/core';

@Injectable()
export class ErrorReporter {
  constructor(private config: ConfigService) {}

  report(error: Error, context: Record<string, unknown>): void {
    // Log locally
    console.error('Error reported:', error.message, context);

    // Send to monitoring service in production
    if (this.config.get('NODE_ENV') === 'production') {
      // Integration with error tracking services
      // e.g., Sentry, DataDog, etc.
    }
  }
}
```

## Best Practices

### 1. Use Specific Error Types

```typescript
// Recommended: Specific error types
throw new NotFoundError('User', userId);
throw new ValidationError('email', email, 'Invalid format');
throw new AuthorizationError('admin:write');

// Avoid: Generic errors
throw new Error('Something went wrong');
throw new Error('Invalid');
```

### 2. Include Context in Errors

```typescript
// Recommended: Contextual information
throw new Error(
  `Failed to process order ${orderId}. Item ${itemId} is out of stock.`
);

// Avoid: Vague messages
throw new Error('Order failed');
```

### 3. Log Before Re-throwing

```typescript
// Recommended: Log with context
try {
  await this.externalService.call(input);
} catch (error) {
  ctx.logger.error('External service call failed', {
    service: 'PaymentGateway',
    input,
    error
  });
  throw error;
}

// Avoid: Silent re-throw
try {
  await this.externalService.call(input);
} catch (error) {
  throw error;  // No logging
}
```

### 4. Do Not Expose Internal Details

```typescript
// Recommended: Safe error response
return {
  error: true,
  code: 'DATABASE_ERROR',
  message: 'A database error occurred'
};

// Avoid: Exposing internals
return {
  error: true,
  message: 'FATAL: password authentication failed for user "admin"',
  stack: error.stack  // Never expose in production
};
```

### 5. Use Exception Filters Consistently

```typescript
// Recommended: Centralized handling
@ExceptionFilter()
export class GlobalExceptionFilter {
  catch(exception: unknown, context: ExecutionContext) {
    // Consistent error handling for all errors
  }
}

// Apply globally or per-handler
@UseFilters(GlobalExceptionFilter)
export class UserTools { }
```

### 6. Test Error Scenarios

```typescript
describe('UserTools', () => {
  describe('getUser', () => {
    it('should throw NotFoundError when user does not exist', async () => {
      mockUserService.findById.mockResolvedValue(null);

      await expect(tools.getUser({ userId: 'invalid' }, ctx))
        .rejects.toThrow(NotFoundError);
    });

    it('should include user ID in error message', async () => {
      mockUserService.findById.mockResolvedValue(null);

      await expect(tools.getUser({ userId: 'usr_123' }, ctx))
        .rejects.toThrow('User not found: usr_123');
    });
  });
});
```

## Related Documentation

- [Middleware Guide](./07-middleware-guide.md) - Error handling middleware
- [Interceptors Guide](./08-interceptors-guide.md) - Error transformation
- [Testing Guide](./14-testing-guide.md) - Testing error scenarios
