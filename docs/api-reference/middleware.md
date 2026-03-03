# Middleware API Reference

## Middleware Interface

```typescript
interface MiddlewareInterface {
  use(
    context: ExecutionContext,
    next: () => Promise<any>
  ): Promise<any>;
}
```

## Example

```typescript
@Middleware()
export class MyMiddleware implements MiddlewareInterface {
  async use(context: ExecutionContext, next: () => Promise<any>): Promise<any> {
    // Before
    const result = await next();
    // After
    return result;
  }
}
```

## Next Steps

- [Middleware Guide](../sdk/typescript/07-middleware-guide.md)
