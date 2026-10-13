/**
 * ClinicaMind MCP Server
 * 
 * Multi-Agent AI Clinical Decision Support Workspace built with NitroStack MCP.
 * Features 6-agent clinical orchestration, EHR history retrieval, medication safety,
 * real-time consultation speech processing, and interactive Next.js widgets.
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
