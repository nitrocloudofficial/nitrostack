/**
 * Pizzaz MCP Server
 * 
 * Pizza shop finder with interactive map widgets.
 * Showcases NitroStack Widget SDK features including:
 * - useTheme() for dark mode
 * - useWidgetState() for persistent favorites
 * - useDisplayMode() for fullscreen support
 * - useMaxHeight() for responsive layouts
 * - useWidgetSDK() for tool calling and navigation
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
