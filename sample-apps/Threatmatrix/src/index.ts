#!/usr/bin/env node
/**
 * ThreatMatrix MCP STDIO Entrypoint
 * Used by MCP clients (Claude Desktop, NitroStack CLI, Cursor, etc.)
 *
 * Usage:
 *   npx threatmatrix-mcp         (via bin)
 *   npm run start:mcp            (local dev)
 *   node dist/index.js           (production)
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer } from './mcp.server.js';
import { logger } from './logger.js';
import { config } from './config.js';

async function main(): Promise<void> {
  logger.info('MCP Server Starting', {
    transport: 'stdio',
    name: config.mcpServerName,
    version: config.mcpServerVersion,
  });

  const server = createMcpServer();
  const transport = new StdioServerTransport();

  // Graceful shutdown handlers
  const shutdown = async (signal: string) => {
    logger.info('Server Shutdown', { signal });
    await server.close();
    process.exit(0);
  };

  process.on('SIGINT',  () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { error: err.message });
    // Do NOT exit — keep server alive for production
  });
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason: String(reason) });
    // Do NOT exit — keep server alive for production
  });

  await server.connect(transport);

  logger.info('MCP Server Started — Handshake Ready', { transport: 'stdio' });
}

main().catch((err) => {
  process.stderr.write(`[FATAL] ThreatMatrix MCP failed to start: ${err.message}\n`);
  process.exit(1);
});
