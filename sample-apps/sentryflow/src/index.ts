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

function configureLocalModelProvider() {
    if (!process.env.OPENAI_BASE_URL && !process.env.OPENAI_API_BASE_URL) {
        process.env.OPENAI_BASE_URL = 'http://127.0.0.1:11434/v1';
        process.env.OPENAI_API_BASE_URL = process.env.OPENAI_BASE_URL;
    }

    if (!process.env.OPENAI_API_KEY) {
        process.env.OPENAI_API_KEY = 'ollama-local';
    }

    if (!process.env.OPENAI_MODEL) {
        process.env.OPENAI_MODEL = 'qwen2.5:3b';
    }

    process.env.MCP_TRANSPORT_TYPE = process.env.MCP_TRANSPORT_TYPE || 'dual';
    process.env.PORT = process.env.PORT || '3000';
    process.env.HOST = process.env.HOST || '127.0.0.1';
    process.env.ENABLE_CORS = process.env.ENABLE_CORS || 'true';
}

/**
 * Bootstrap the application
 */
async function bootstrap() {
    configureLocalModelProvider();

    // Create and start the MCP server
    const server = await McpApplicationFactory.create(AppModule);
    await server.start();
}

// Start the application
bootstrap().catch((error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
});
