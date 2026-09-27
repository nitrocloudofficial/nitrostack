import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const server = await McpApplicationFactory.create(AppModule);
  await server.start();
}

bootstrap().catch((err) => {
  console.error('Failed to start MedBridge MCP server:', err);
  process.exit(1);
});
