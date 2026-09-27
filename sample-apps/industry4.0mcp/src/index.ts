/**
 * Industry 4.0 Machine Health MCP Server
 * 
 * Bridging Industrial IoT Data and Conversational AI.
 * Showcases NitroStack MCP features including:
 * - Tool decorators for machine health queries
 * - Zod schema validation
 * - Mock data fixtures for InfluxDB simulation
 * - Modular architecture for Industry 4.0 workflows
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
