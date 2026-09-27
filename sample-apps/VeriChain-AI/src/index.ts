/**
 * VeriChain AI MCP Server
 * 
 * Evidence Intelligence Platform powered by NitroStack.
 * Provides MCP tools for document upload, evidence extraction,
 * verification, conflict detection, risk analysis, and reporting.
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
