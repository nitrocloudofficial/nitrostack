import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await McpApplicationFactory.create(AppModule);
  await app.start();
}

bootstrap().catch((err) => {
  console.error('Failed to start bottle-cap-cad MCP server:', err);
  process.exit(1);
});
