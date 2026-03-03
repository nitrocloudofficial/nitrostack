# Execution Context API Reference

## Interface

```typescript
interface ExecutionContext {
  auth?: {
    subject?: string;
    token?: string;
    [key: string]: any;
  };
  
  logger: Logger;
  toolName?: string;
  
  emit(event: string, data: any): void;
  
  metadata: Record<string, any>;
}
```

## Usage

```typescript
@Tool({ name: 'example' })
async example(input: any, ctx: ExecutionContext) {
  // Auth info
  const userId = ctx.auth?.subject;
  
  // Logging
  ctx.logger.info('Processing...');
  
  // Events
  ctx.emit('example.executed', { userId });
  
  // Metadata
  ctx.metadata.customValue = 'something';
}
```

## Next Steps

- [Tools Guide](../sdk/typescript/04-tools-guide.md)
