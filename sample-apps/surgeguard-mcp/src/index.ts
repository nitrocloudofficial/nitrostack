/**
 * SurgeGuard MCP Server
 *
 * Local development uses STDIO. NitroCloud provides the production
 * Streamable HTTP transport required by the supplied MCP contract.
 */

import 'dotenv/config';
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const server = await McpApplicationFactory.create(AppModule);
  await server.start();
}

bootstrap().catch((error) => {
  console.error('SurgeGuard failed to start:', error);
  process.exit(1);
});
