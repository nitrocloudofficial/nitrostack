#!/usr/bin/env node
/**
 * [HLD] MigrateEase — System Architecture
 * [STATUS: IMPLEMENTED vertical slice; broader platform design is CONCEPTUAL]
 * ------------------------------------------------------------------
 * MigrateEase is an agentic operations layer for cross-border relocation and
 * visa processing. This NitroStack MCP server is consumable by the client
 * portal, a future ops portal, and other MCP clients.
 *
 * Core principle — 90/10 human-in-the-loop:
 *   - Autonomous: onboarding intake, requirement resolution, document
 *     extraction/validation, broker recommendation, and status tracking.
 *   - Human-gated (target design): document acceptance, broker assignment,
 *     and final submission. Gated actions require an attributable ops identity
 *     and an immutable audit record.
 *
 * Data-plane target: MongoDB is the system of record; Qdrant stores scraped
 * policy chunks for RAG; Redis caches slow-changing requirement/RAG results;
 * RabbitMQ handles long-running scrape/OCR/embed jobs at scale. Events feed
 * n8n for notification and scheduling side effects. This delivered slice uses
 * in-memory case/requirement/document state plus MongoDB for housing/brokers.
 *
 * Conceptual layers: Intelligence (onboarding + recommendations), Knowledge
 * (policy scraping + RAG), and Action (human gate + notifications).
 * [/HLD]
 */
/**
 * Visa Agent MCP Server with OAuth 2.1 Authentication
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
 * new
 */
async function bootstrap() {
  try {
    console.error('🔐 Starting Visa Agent MCP Server with OAuth 2.1...\\n');

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
