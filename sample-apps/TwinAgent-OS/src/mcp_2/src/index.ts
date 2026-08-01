/**
 * TwinAgent OS NitroStack MCP Server
 * 
 * Official Enterprise Digital Twin MCP Server built with NitroStack.
 */

import 'dotenv/config';
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';

/**
 * Bootstrap the application
 */
async function bootstrap() {
  const server = await McpApplicationFactory.create(AppModule);
  await server.start();
}

// Start the application
bootstrap().catch((error) => {
  console.error('❌ Failed to start TwinAgent OS MCP server:', error);
  process.exit(1);
});
