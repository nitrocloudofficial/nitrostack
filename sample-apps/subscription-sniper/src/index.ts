/**
 * Subscription Sniper MCP Server
 *
 * Subscription tracking and cancellation assistant.
 */

import 'dotenv/config';
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
    const server = await McpApplicationFactory.create(AppModule);
    await server.start();
}

bootstrap().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
