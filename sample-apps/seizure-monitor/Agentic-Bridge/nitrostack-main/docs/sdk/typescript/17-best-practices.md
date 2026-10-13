# Best Practices Guide

## Module Organization

### Feature-Based Structure

```
src/
├── modules/
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.tools.ts
│   │   ├── users.service.ts
│   │   └── users.guard.ts
│   └── products/
│       ├── products.module.ts
│       ├── products.tools.ts
│       ├── products.service.ts
│       └── products.resources.ts
```

### Keep Modules Focused

**Good**: One feature per module
```typescript
@Module({ name: 'users' })  // User management only
@Module({ name: 'products' })  // Product catalog only
```

**Avoid**: Kitchen sink modules
```typescript
@Module({ name: 'everything' })  // Too broad!
```

## Tool Design

### Clear Names

**Good**: Verb + noun
```typescript
@Tool({ name: 'get_user' })
@Tool({ name: 'create_order' })
@Tool({ name: 'update_product' })
```

**Avoid**: Unclear names
```typescript
@Tool({ name: 'user' })
@Tool({ name: 'doStuff' })
```

### Descriptive Schemas

**Good**: Use .describe()
```typescript
inputSchema: z.object({
  email: z.string().email().describe('User email address'),
  age: z.number().min(18).describe('Must be 18 or older')
})
```

**Avoid**: No descriptions
```typescript
inputSchema: z.object({
  email: z.string(),
  age: z.number()
})
```

### Provide Examples

**Good**: Include examples
```typescript
@Tool({
  name: 'get_product',
  examples: {
    request: { product_id: 'prod-1' },
    response: { id: 'prod-1', name: 'Product', price: 99.99 }
  }
})
```

## Service Layer

### Business Logic in Services

**Good**: Logic in service
```typescript
@Injectable()
export class OrderService {
  async calculateTotal(items: any[]) {
    return items.reduce((sum, item) => sum + item.price * item.qty, 0);
  }
}

export class OrderTools {
  constructor(private orderService: OrderService) {}
  
  @Tool({ name: 'create_order' })
  async createOrder(input: any) {
    const total = await this.orderService.calculateTotal(input.items);
    return this.orderService.create({ ...input, total });
  }
}
```

**Avoid**: Logic in tools
```typescript
export class OrderTools {
  @Tool({ name: 'create_order' })
  async createOrder(input: any) {
    const total = input.items.reduce((sum, item) => sum + item.price * item.qty, 0);
    // ... lots of business logic here
  }
}
```

## Error Handling

### Specific Error Messages

**Good**: Helpful messages
```typescript
if (!product) {
  throw new Error(\`Product with ID \${id} not found\`);
}

if (stock < quantity) {
  throw new Error(\`Insufficient stock. Available: \${stock}, Requested: \${quantity}\`);
}
```

**Avoid**: Generic messages
```typescript
throw new Error('Error occurred');
throw new Error('Invalid input');
```

### Log Errors

**Good**: Log context
```typescript
try {
  return await this.processPayment(input);
} catch (error) {
  ctx.logger.error('Payment processing failed:', {
    userId: ctx.auth?.subject,
    amount: input.amount,
    error: error.message
  });
  throw error;
}
```

## Security

### Validate Input

**Good**: Use Zod schemas
```typescript
@Tool({
  inputSchema: z.object({
    email: z.string().email(),
    password: z.string().min(8)
  })
})
```

### Use Guards

**Good**: Protect sensitive tools
```typescript
@Tool({ name: 'delete_user' })
@UseGuards(JWTGuard, AdminGuard)
async deleteUser(input: any) {
  // Protected!
}
```

### Hash Sensitive Data

**Good**: Hash passwords
```typescript
const hash = await bcrypt.hash(password, 10);
```

**Avoid**: Plain text
```typescript
await db.execute('INSERT INTO users VALUES (?, ?)', [email, password]);
```

## Performance

### Cache Expensive Operations

**Good**: Cache when appropriate
```typescript
@Tool({ name: 'get_config' })
@Cache({ ttl: 3600 })
async getConfig() {
  return await this.loadConfig();
}
```

### Rate Limit

**Good**: Protect from abuse
```typescript
@Tool({ name: 'send_email' })
@RateLimit({ requests: 10, window: '1m' })
async sendEmail(input: any) {
  // Limited to 10/minute
}
```

## Testing

### Write Tests

**Good**: Test coverage
```typescript
describe('UserService', () => {
  it('should create user', async () => {
    const result = await service.create({ email: 'test@example.com' });
    expect(result.email).toBe('test@example.com');
  });
});
```

### Mock Dependencies

**Good**: Use mocks
```typescript
const mockDb = {
  query: jest.fn().mockResolvedValue([])
};
const service = new UserService(mockDb);
```

## Documentation

### Document Tools

**Good**: Clear descriptions
```typescript
@Tool({
  name: 'search_products',
  description: 'Search products by name, category, or price range with pagination',
  inputSchema: z.object({
    query: z.string().describe('Search query'),
    category: z.string().optional().describe('Filter by category'),
    min_price: z.number().optional().describe('Minimum price in USD'),
    max_price: z.number().optional().describe('Maximum price in USD'),
    page: z.number().default(1).describe('Page number for pagination'),
    limit: z.number().default(20).describe('Items per page')
  })
})
```

### Use JSDoc

**Good**: Document complex logic
```typescript
/**
 * Calculates shipping cost based on weight, distance, and shipping method.
 * @param weight - Package weight in kg
 * @param distance - Shipping distance in km
 * @param method - 'standard' | 'express' | 'overnight'
 * @returns Shipping cost in USD
 */
calculateShipping(weight: number, distance: number, method: string): number {
  // ...
}
```

## Configuration

### Use Environment Variables

**Good**: ConfigService
```typescript
constructor(private config: ConfigService) {}

const secret = this.config.get('JWT_SECRET');
```

**Avoid**: Hardcoded values
```typescript
const secret = 'my-secret-key';
```

## Next Steps

- [Testing Guide](./14-testing-guide.md)
- [Authentication Overview](./09-authentication-overview.md)
- [Performance Guide](./performance.md)
