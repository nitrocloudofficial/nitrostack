# Performance Guide

## Caching

Use @Cache decorator:

```typescript
@Tool({ name: 'get_config' })
@Cache({ ttl: 3600 })  // 1 hour
async getConfig() {
  return await this.loadConfig();
}
```

## Rate Limiting

Prevent abuse:

```typescript
@Tool({ name: 'expensive_operation' })
@RateLimit({ requests: 10, window: '1m' })
async expensiveOperation() {
  // Limited to 10 requests per minute
}
```

## Database Optimization

### Use Indexes

```sql
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_users_email ON users(email);
```

### Connection Pooling

```typescript
@Injectable()
export class DatabaseService {
  private pool = createPool({ max: 10 });
}
```

### Query Optimization

```typescript
// Good - Specific query
SELECT id, name, price FROM products WHERE category = ?

// Avoid - SELECT *
SELECT * FROM products
```

## Async Operations

Use Promise.all for parallel operations:

```typescript
// Good - Parallel
const [user, orders, preferences] = await Promise.all([
  this.userService.findById(id),
  this.orderService.findByUser(id),
  this.preferenceService.findByUser(id)
]);

// Avoid - Sequential
const user = await this.userService.findById(id);
const orders = await this.orderService.findByUser(id);
const preferences = await this.preferenceService.findByUser(id);
```

## Best Practices

1. Cache expensive computations
2. Use rate limiting on public endpoints
3. Optimize database queries
4. Use async/await efficiently
5. Monitor performance metrics

## Next Steps

- [Best Practices](./17-best-practices.md)
- [Caching Guide](./caching-guide.md)
