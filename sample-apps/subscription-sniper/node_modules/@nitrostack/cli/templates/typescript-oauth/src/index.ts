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

    // Validate required environment variables for OAuth, set defaults if missing
    if (!process.env.RESOURCE_URI || !process.env.AUTH_SERVER_URL) {
      console.error('⚠️  Warning: Missing RESOURCE_URI or AUTH_SERVER_URL environment variables.');
      console.error('   Defaulting to local test endpoints. Copy .env.example to .env to configure.\n');
      process.env.RESOURCE_URI = process.env.RESOURCE_URI || 'http://localhost:3000';
      process.env.AUTH_SERVER_URL = process.env.AUTH_SERVER_URL || 'http://localhost:8080/auth';
    }

    // Create the MCP application
    const server = await McpApplicationFactory.create(AppModule);

    const authEnforced = process.env.OAUTH_REQUIRED === 'true';
    console.error('✅ OAuth 2.1 Module configured');
    console.error(`   Resource URI: ${process.env.RESOURCE_URI}`);
    console.error(`   Auth Server: ${process.env.AUTH_SERVER_URL}`);
    console.error(`   Scopes: read, write, admin`);
    console.error(`   Audience: ${process.env.TOKEN_AUDIENCE || process.env.RESOURCE_URI}`);
    console.error(`   Enforcement: ${authEnforced ? 'ON (OAUTH_REQUIRED=true)' : 'OFF (dev mode — set OAUTH_REQUIRED=true to enforce)'}\\n`);

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
