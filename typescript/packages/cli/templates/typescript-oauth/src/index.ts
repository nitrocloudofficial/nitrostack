#!/usr/bin/env node
/**
 * Calculator MCP Server with OAuth 2.1 Authentication
 * 
 * Main entry point for the MCP server.
 * Uses the @McpApp decorator pattern for clean, NestJS-style architecture.
 * 
 * OAuth 2.1 Compliance:
 * - MCP Specification: https://modelcontextprotocol.io/specification/draft/basic/authorization
 * - OpenAI Apps SDK: https://developers.openai.com/apps-sdk/build/auth
 * - RFC 9728 - Protected Resource Metadata
 * - RFC 8707 - Resource Indicators (Token Audience Binding)
 * 
 * Transport Configuration:
 * - Development (NODE_ENV=development): STDIO only
 * - Production (NODE_ENV=production): Dual transport (STDIO + HTTP SSE)
 * - With OAuth: Dual mode (STDIO + HTTP for metadata endpoints)
 */

import 'dotenv/config';
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';

/**
 * Bootstrap the application
 */
async function bootstrap() {
  try {
    console.error('🔐 Starting Calculator MCP Server with OAuth 2.1...\\n');

    // Validate required environment variables for OAuth
    const requiredEnvVars = ['RESOURCE_URI', 'AUTH_SERVER_URL'];
    const missing = requiredEnvVars.filter(v => !process.env[v]);

    if (missing.length > 0) {
      console.error('❌ Missing required OAuth environment variables:');
      missing.forEach(v => console.error(`   - ${v}`));
      console.error('\\n💡 Copy .env.example to .env and configure your OAuth provider');
      console.error('   Or check the test-oauth/.env for reference\\n');
      process.exit(1);
    }

    // Create the MCP application
    const server = await McpApplicationFactory.create(AppModule);

    console.error('✅ OAuth 2.1 Module configured');
    console.error(`   Resource URI: ${process.env.RESOURCE_URI}`);
    console.error(`   Auth Server: ${process.env.AUTH_SERVER_URL}`);
    console.error(`   Scopes: read, write, admin`);
    console.error(`   Audience: ${process.env.TOKEN_AUDIENCE || process.env.RESOURCE_URI}\\n`);

    // Start the server
    await server.start();

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('\\n💡 Check your OAuth configuration in .env\\n');
    process.exit(1);
  }
}

// Start the application
bootstrap();
