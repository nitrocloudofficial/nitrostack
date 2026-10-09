/**
 * Clinical Copilot MCP Server
 *
 * Main entry point for the Clinical Copilot Model Context Protocol (MCP) server.
 * Exposes healthcare tools, prompt templates, and resources for consumption
 * by external LangGraph Agents and frontend clients.
 */

import 'dotenv/config';

// Redirect console.log to console.error to protect MCP STDIO transport channel on process.stdout
console.log = console.error;

import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';

/**
 * Bootstrap the Clinical Copilot MCP Application
 */
async function bootstrap() {
  const server = await McpApplicationFactory.create(AppModule);
  await server.start();
}

// Execute bootstrap procedure
bootstrap().catch((error) => {
  console.error('❌ Failed to start Clinical Copilot MCP server:', error);
  process.exit(1);
});
