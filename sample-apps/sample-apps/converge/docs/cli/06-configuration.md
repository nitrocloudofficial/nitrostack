# Configuration Guide

## nitrostack.config.ts

Create a \`nitrostack.config.ts\` file in your project root:

```typescript
export default {
  server: {
    name: 'my-mcp-server',
    version: '1.0.0',
    port: 3000
  },
  widgets: {
    port: 3001,
    devServer: true
  },
  logging: {
    level: 'info',
    file: 'logs/server.log'
  }
};
```

## Environment Variables

Create a \`.env\` file:

```env
NODE_ENV=development
JWT_SECRET=your-secret-key
DATABASE_PATH=./data/database.db
PORT=3000
```

## Next Steps

- [Dev Command](./04-dev-command.md)
- [Build Command](./05-build-command.md)
