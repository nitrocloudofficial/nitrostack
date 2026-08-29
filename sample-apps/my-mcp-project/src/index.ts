/**
 * Ward Copilot Production Healthcare MCP Server
 * 
 * NitroStack MCP Server wrapper around FastAPI Ward Copilot Backend.
 * Exposes healthcare tools over Model Context Protocol:
 * - get_patient_summary
 * - get_vitals_trend
 * - get_risk_factors
 * - find_similar_cases
 * - explain_factor
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

// Start the application
bootstrap().catch((error) => {
    console.error('❌ Failed to start Ward Copilot MCP server:', error);
    process.exit(1);
});
