import 'dotenv/config';
import 'reflect-metadata';

import { McpApplicationFactory } from '@nitrostack/core';

import { AppModule } from './app.module.js';

async function bootstrap() {
  const server = await McpApplicationFactory.create(AppModule);
  await server.start();
}

bootstrap().catch((error: unknown) => {
  console.error('Failed to start ImmunoGraph MCP server:', error);
  process.exit(1);
});
