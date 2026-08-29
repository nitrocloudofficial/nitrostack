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

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load from current working directory
dotenv.config();

// Load from relative directory fallbacks
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';

/**
 * Bootstrap the application
 */
async function bootstrap() {
    // Keep stdin active in cloud container deployments to prevent premature exit in DUAL transport mode
    if (!process.stdin.isTTY) {
        process.stdin.resume();
    }

    // Create and start the MCP server
    const server = await McpApplicationFactory.create(AppModule);
    await server.start();
}

// Start the application
bootstrap().catch((error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
});
