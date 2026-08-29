/**
 * Calculator MCP Server
 * 
 * Main entry point for the MCP server.
 * Uses the @McpApp decorator pattern for clean, NestJS-style architecture.
 */

import 'dotenv/config';
import 'reflect-metadata';
import { McpApplicationFactory } from '@nitrostack/core';
import { FemmonApp } from './app.js';

/**
 * Bootstrap the application
 */
async function bootstrap() {
    const server = await McpApplicationFactory.create(FemmonApp);
    await server.start();
}

bootstrap().catch((error) => {
    console.error('❌ Failed to start MCP server:', error);
    (globalThis as any).process?.exit(1);
});

