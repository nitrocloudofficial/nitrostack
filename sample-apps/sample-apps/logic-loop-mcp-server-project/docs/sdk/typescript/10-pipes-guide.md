# Pipes Guide

## Overview

Pipes validate and transform input data before it reaches the handler. They ensure that handlers receive correctly typed, sanitized, and validated data, reducing the need for defensive coding within business logic.

## Table of Contents

- [Creating Pipes](#creating-pipes)
- [Using Pipes](#using-pipes)
- [Common Patterns](#common-patterns)
- [Validation Strategies](#validation-strategies)
- [Best Practices](#best-practices)

## Creating Pipes

### Basic Pipe

Pipes implement the `PipeInterface`:

```typescript
import { Pipe, PipeInterface, ArgumentMetadata } from '@nitrostack/core';

@Pipe()
export class TrimPipe implements PipeInterface {
  transform(value: any, metadata?: ArgumentMetadata): any {
    return this.trimDeep(value);
  }

  private trimDeep(value: unknown): unknown {
    if (typeof value === 'string') {
      return value.trim();
    }

    if (Array.isArray(value)) {
      return value.map(item => this.trimDeep(item));
    }

    if (value && typeof value === 'object') {
      const trimmed: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        trimmed[key] = this.trimDeep(val);
      }
      return trimmed;
    }

    return value;
  }
}
```

### Pipe Interface

```typescript
interface PipeInterface {
  transform(value: any, metadata?: ArgumentMetadata): any;
}

interface ArgumentMetadata {
  type?: 'body' | 'query' | 'param';
  metatype?: unknown;
  data?: string;
}
```

**Parameters:**
- `value`: The input data to transform/validate
- `metadata`: Optional metadata about the argument

**Return:** Transformed/validated value

**Throws:** Error if validation fails

## Using Pipes

### On Individual Methods

```typescript
import { ToolDecorator as Tool, UsePipes } from '@nitrostack/core';
import { TrimPipe } from './pipes/trim.pipe.js';
import { ValidationPipe } from './pipes/validation.pipe.js';

export class UserTools {
  @Tool({ name: 'create_user' })
  @UsePipes(TrimPipe, ValidationPipe)
  async createUser(input: CreateUserInput, ctx: ExecutionContext) {
    // Input is trimmed and validated
    return this.userService.create(input);
  }
}
```

### Multiple Pipes

Pipes execute in order, each receiving the output of the previous:

```typescript
@Tool({ name: 'search' })
@UsePipes(
  TrimPipe,           // 1. Trim whitespace
  LowercasePipe,      // 2. Convert to lowercase
  SanitizePipe,       // 3. Sanitize special characters
  ValidationPipe      // 4. Validate final result
)
async search(input: SearchInput, ctx: ExecutionContext) {
  return this.searchService.query(input.query);
}
```

## Common Patterns

### Input Validation

```typescript
@Pipe()
export class ValidationPipe implements PipeInterface {
  transform(value: any, metadata?: ArgumentMetadata): any {
    if (value === null || value === undefined) {
      throw new Error('Input cannot be null or undefined');
    }

    if (typeof value !== 'object') {
      throw new Error('Input must be an object');
    }

    return value;
  }
}
```

### Type Coercion

```typescript
@Pipe()
export class ParseIntPipe implements PipeInterface {
  transform(value: any, metadata?: ArgumentMetadata): number {
    const parsed = parseInt(String(value), 10);

    if (isNaN(parsed)) {
      throw new Error(`Cannot parse "${value}" as integer`);
    }

    return parsed;
  }
}

@Pipe()
export class ParseBoolPipe implements PipeInterface {
  transform(value: any, metadata?: ArgumentMetadata): boolean {
    if (typeof value === 'boolean') return value;
    if (value === 'true' || value === '1') return true;
    if (value === 'false' || value === '0') return false;
    throw new Error(`Cannot parse "${value}" as boolean`);
  }
}

@Pipe()
export class ParseDatePipe implements PipeInterface {
  transform(value: any, metadata?: ArgumentMetadata): Date {
    const date = new Date(value);

    if (isNaN(date.getTime())) {
      throw new Error(`Cannot parse "${value}" as date`);
    }

    return date;
  }
}
```

### ID Format Validation

```typescript
@Pipe()
export class UuidValidationPipe implements PipeInterface {
  private static readonly UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  transform(value: any, metadata?: ArgumentMetadata): any {
    if (!value || typeof value !== 'object') {
      return value;
    }

    const result = { ...value };

    for (const [key, val] of Object.entries(result)) {
      if (key.endsWith('Id') && typeof val === 'string') {
        if (!UuidValidationPipe.UUID_REGEX.test(val)) {
          throw new Error(`Invalid UUID format for ${key}: "${val}"`);
        }
      }
    }

    return result;
  }
}

@Pipe()
export class CustomIdValidationPipe implements PipeInterface {
  constructor(private readonly pattern: RegExp, private readonly fieldName: string) {}

  transform(value: any, metadata?: ArgumentMetadata): any {
    if (!value || typeof value !== 'object') {
      return value;
    }

    const fieldValue = value[this.fieldName];
    if (fieldValue && !this.pattern.test(fieldValue)) {
      throw new Error(
        `Invalid format for ${this.fieldName}: "${fieldValue}"`
      );
    }

    return value;
  }
}
```

### String Transformation

```typescript
@Pipe()
export class LowercasePipe implements PipeInterface {
  private readonly fields: string[];

  constructor(fields?: string[]) {
    this.fields = fields || [];
  }

  transform(value: any, metadata?: ArgumentMetadata): any {
    if (!value || typeof value !== 'object') {
      return value;
    }

    const result = { ...value };

    for (const [key, val] of Object.entries(result)) {
      if (typeof val === 'string') {
        if (this.fields.length === 0 || this.fields.includes(key)) {
          result[key] = val.toLowerCase();
        }
      }
    }

    return result;
  }
}

@Pipe()
export class SlugifyPipe implements PipeInterface {
  private readonly field: string;

  constructor(field: string = 'slug') {
    this.field = field;
  }

  transform(value: any, metadata?: ArgumentMetadata): any {
    if (!value || typeof value !== 'object' || !value[this.field]) {
      return value;
    }

    return {
      ...value,
      [this.field]: String(value[this.field])
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
    };
  }
}
```

### Default Values

```typescript
@Pipe()
export class DefaultValuesPipe implements PipeInterface {
  constructor(private readonly defaults: Record<string, unknown>) {}

  transform(value: any, metadata?: ArgumentMetadata): any {
    if (!value || typeof value !== 'object') {
      return { ...this.defaults };
    }

    const result = { ...value };

    for (const [key, defaultValue] of Object.entries(this.defaults)) {
      if (result[key] === undefined || result[key] === null) {
        result[key] = defaultValue;
      }
    }

    return result;
  }
}

// Usage
@Tool({ name: 'list_items' })
@UsePipes(new DefaultValuesPipe({ page: 1, limit: 20, sortBy: 'createdAt' }))
async listItems(input: ListItemsInput, ctx: ExecutionContext) {
  // input.page, input.limit, input.sortBy have defaults
}
```

### Sanitization

```typescript
@Pipe()
export class SanitizePipe implements PipeInterface {
  transform(value: any, metadata?: ArgumentMetadata): any {
    return this.sanitizeDeep(value);
  }

  private sanitizeDeep(value: unknown): unknown {
    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }

    if (Array.isArray(value)) {
      return value.map(item => this.sanitizeDeep(item));
    }

    if (value && typeof value === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        sanitized[key] = this.sanitizeDeep(val);
      }
      return sanitized;
    }

    return value;
  }

  private sanitizeString(str: string): string {
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
  }
}
```

## Validation Strategies

### Schema-Based Validation

```typescript
import { z, ZodSchema } from 'zod';

@Pipe()
export class ZodValidationPipe implements PipeInterface {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: any, metadata?: ArgumentMetadata): any {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      const errors = result.error.issues.map(issue => ({
        path: issue.path.join('.'),
        message: issue.message
      }));

      throw new Error(
        `Validation failed: ${errors.map(e => `${e.path}: ${e.message}`).join(', ')}`
      );
    }

    return result.data;
  }
}

// Usage
const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  age: z.number().int().positive().optional()
});

@Tool({ name: 'create_user' })
@UsePipes(new ZodValidationPipe(CreateUserSchema))
async createUser(input: z.infer<typeof CreateUserSchema>, ctx: ExecutionContext) {
  return this.userService.create(input);
}
```

### Field-Level Validation

```typescript
@Pipe()
export class FieldValidationPipe implements PipeInterface {
  private readonly validations: Map<string, (value: unknown) => boolean>;
  private readonly messages: Map<string, string>;

  constructor(config: Record<string, { validate: (value: unknown) => boolean; message: string }>) {
    this.validations = new Map();
    this.messages = new Map();

    for (const [field, { validate, message }] of Object.entries(config)) {
      this.validations.set(field, validate);
      this.messages.set(field, message);
    }
  }

  transform(value: any, metadata?: ArgumentMetadata): any {
    if (!value || typeof value !== 'object') {
      return value;
    }

    const errors: string[] = [];

    for (const [field, validate] of this.validations) {
      if (value[field] !== undefined && !validate(value[field])) {
        errors.push(this.messages.get(field) || `Invalid value for ${field}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join('; ')}`);
    }

    return value;
  }
}

// Usage
@Tool({ name: 'create_product' })
@UsePipes(new FieldValidationPipe({
  price: {
    validate: (v) => typeof v === 'number' && v > 0,
    message: 'Price must be a positive number'
  },
  quantity: {
    validate: (v) => Number.isInteger(v) && v >= 0,
    message: 'Quantity must be a non-negative integer'
  }
}))
async createProduct(input: CreateProductInput, ctx: ExecutionContext) {
  return this.productService.create(input);
}
```

## Best Practices

### 1. Fail Fast

Validate early and throw descriptive errors:

```typescript
// Correct: Descriptive error
transform(value: any): any {
  if (!value.email) {
    throw new Error('Email is required');
  }
  if (!this.isValidEmail(value.email)) {
    throw new Error(`Invalid email format: "${value.email}"`);
  }
  return value;
}

// Incorrect: Generic error
transform(value: any): any {
  if (!value.email || !this.isValidEmail(value.email)) {
    throw new Error('Invalid input');  // Not helpful
  }
  return value;
}
```

### 2. Compose Pipes

Combine simple pipes for complex validation:

```typescript
// Correct: Composable pipes
@UsePipes(
  TrimPipe,
  LowercasePipe,
  EmailValidationPipe,
  UniqueEmailPipe
)

// Incorrect: Monolithic pipe
@UsePipes(new DoEverythingPipe())
```

### 3. Document Transformations

```typescript
/**
 * Trim Pipe
 *
 * Recursively trims whitespace from all string values in the input.
 * Arrays and nested objects are processed recursively.
 *
 * Input: { name: "  John  ", email: " john@example.com " }
 * Output: { name: "John", email: "john@example.com" }
 */
@Pipe()
export class TrimPipe implements PipeInterface {
  // Implementation
}
```

### 4. Handle Edge Cases

```typescript
transform(value: any): any {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return value;  // Or throw if required
  }

  // Handle non-objects
  if (typeof value !== 'object') {
    return value;
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.map(item => this.processItem(item));
  }

  // Process object
  return this.processObject(value);
}
```

### 5. Test Thoroughly

```typescript
describe('TrimPipe', () => {
  const pipe = new TrimPipe();

  it('should trim string values', () => {
    expect(pipe.transform({ name: '  John  ' })).toEqual({ name: 'John' });
  });

  it('should handle nested objects', () => {
    expect(pipe.transform({ user: { name: '  John  ' } }))
      .toEqual({ user: { name: 'John' } });
  });

  it('should handle arrays', () => {
    expect(pipe.transform({ tags: ['  a  ', '  b  '] }))
      .toEqual({ tags: ['a', 'b'] });
  });

  it('should handle null values', () => {
    expect(pipe.transform(null)).toBeNull();
  });
});
```

## Related Documentation- [Middleware Guide](./07-middleware-guide.md) - Request/response pipeline
- [Interceptors Guide](./08-interceptors-guide.md) - Response transformation
- [Validation Guide](./11-validation-guide.md) - Input validation strategies