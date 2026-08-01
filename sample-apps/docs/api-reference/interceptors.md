# Interceptors API Reference

## Interceptor Interface

```typescript
interface InterceptorInterface {
  intercept(
    context: ExecutionContext,
    next: () => Promise<any>
  ): Promise<any>;
}
```

## Example

```typescript
@Interceptor()
export class MyInterceptor implements InterceptorInterface {
  async intercept(context: ExecutionContext, next: () => Promise<any>): Promise<any> {
    const result = await next();
    return { success: true, data: result };
  }
}
```

## Next Steps

- [Interceptors Guide](../sdk/typescript/08-interceptors-guide.md)
