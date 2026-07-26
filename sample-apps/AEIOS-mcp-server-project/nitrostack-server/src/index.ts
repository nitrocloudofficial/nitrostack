import 'dotenv/config';
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const server = await McpApplicationFactory.create(AppModule);
  await server.start();
  console.log('AEIOS-X MCP Server started successfully');
}

bootstrap().catch((err) => {
  console.error('Failed to start AEIOS-X MCP Server:', err);
  process.exit(1);
});
