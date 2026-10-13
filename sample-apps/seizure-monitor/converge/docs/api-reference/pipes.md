# Pipes API Reference

## Pipe Interface

```typescript
interface PipeInterface {
  transform(value: any, metadata?: any): any;
}
```

## Example

```typescript
@Pipe()
export class MyPipe implements PipeInterface {
  transform(value: any): any {
    return value.trim();
  }
}
```

## Next Steps

- [Pipes Guide](../sdk/typescript/10-pipes-guide.md)
