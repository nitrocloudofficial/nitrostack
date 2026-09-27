/**
 * GeoTrust AI MCP Server
 *
 * Business authenticity investigation engine for SME loan onboarding.
 * Provides tools for document extraction, registry lookup, address
 * verification, and digital footprint analysis.
 */

import 'dotenv/config';
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';

/**
 * Bootstrap the application
 */
async function bootstrap() {
    const server = await McpApplicationFactory.create(AppModule);
    await server.start();
}

bootstrap().catch((error) => {
    console.error('❌ Failed to start GeoTrust AI MCP server:', error);
    process.exit(1);
});
