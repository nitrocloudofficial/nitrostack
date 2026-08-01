/**
 * Converra One - Intelligent Communication Workspace
 * Tagline: Where Conversations Converge.
 * 
 * Main entry point for the Converra One MCP server.
 * Uses NitroStack @McpApp decorator pattern for scalable, clean architecture.
 */

import 'dotenv/config';
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';

/**
 * Bootstrap the Converra One application
 */
async function bootstrap() {
  const server = await McpApplicationFactory.create(AppModule);
  await server.start();
}

// Start the application
bootstrap().catch((error) => {
  console.error('❌ Failed to start Converra One server:', error);
  process.exit(1);
});
