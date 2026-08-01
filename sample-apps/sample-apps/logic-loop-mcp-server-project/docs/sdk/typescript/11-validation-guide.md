# Validation Guide

## Using Zod for Validation

NitroStack uses Zod for input validation.

```typescript
import { z } from '@nitrostack/core';

@Tool({
  name: 'create_user',
  inputSchema: z.object({
    email: z.string().email(),
    age: z.number().min(18),
    role: z.enum(['user', 'admin'])
  })
})
async createUser(input: any) {
  // Input is automatically validated
}
```

## Common Patterns

### Required vs Optional

```typescript
z.object({
  name: z.string(),              // Required
  email: z.string().optional(),  // Optional
  age: z.number().nullable()     // Can be null
})
```

### Nested Objects

```typescript
z.object({
  user: z.object({
    name: z.string(),
    address: z.object({
      street: z.string(),
      city: z.string()
    })
  })
})
```

### Arrays

```typescript
z.array(z.string())
z.array(z.number()).min(1).max(10)
```

## Next Steps

- [Tools Guide](./04-tools-guide.md)
- [Pipes Guide](./10-pipes-guide.md)

