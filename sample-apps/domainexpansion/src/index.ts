/**
 * DomainExpansion.ai MCP Server
 *
 * Reconstructs an enterprise's real API attack surface from access logs,
 * diffs it against a published OpenAPI contract to find shadow endpoints,
 * and reports broken-object-level-authorization risk with the triggering
 * log records attached as citable evidence.
 */

import 'dotenv/config';
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';

/**
 * Bootstrap the application
 */
async function bootstrap() {
    // Create and start the MCP server
    const server = await McpApplicationFactory.create(AppModule);
    await server.start();
}

// Start the application
bootstrap().catch((error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
});
