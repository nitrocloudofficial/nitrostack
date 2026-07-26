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

// ── FIX FOR NITROSTACK CLOUD DEPLOYMENTS ─────────────────────────────
// Force HTTP transport in production. Cloud container orchestrators often
// run without an interactive TTY, meaning process.stdin is closed/EOF.
// In DUAL mode, this causes the StdioTransport to crash the server.
if (process.env.NODE_ENV === 'production' && !process.env.MCP_TRANSPORT_TYPE) {
    process.env.MCP_TRANSPORT_TYPE = 'http';
}
// ───────────────────────────────────────────────────────────────────

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
