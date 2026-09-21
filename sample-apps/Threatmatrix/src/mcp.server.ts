/**
 * ThreatMatrix MCP Server Factory
 * Uses @modelcontextprotocol/sdk directly — no FastMCP wrapper.
 * Supports STDIO and SSE/HTTP transports.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { config } from './config.js';
import { registerTools } from './mcp.tools.js';
import { registerResources } from './mcp.resources.js';
import { registerPrompts } from './mcp.prompts.js';
import { logger } from './logger.js';

export function createMcpServer(): Server {
  const server = new Server(
    {
      name: config.mcpServerName,
      version: config.mcpServerVersion,
    },
    {
      capabilities: {
        tools:     {},   // enables tools/list + tools/call
        resources: {},   // enables resources/list + resources/read
        prompts:   {},   // enables prompts/list + prompts/get
        logging:   {},   // enables logging notifications
      },
    }
  );

  // Register all handlers
  registerTools(server);
  registerResources(server);
  registerPrompts(server);

  // Global error hook
  server.onerror = (error) => {
    logger.error('MCP server internal error', { error: error.message ?? String(error) });
  };

  logger.info('MCP Server created', {
    name: config.mcpServerName,
    version: config.mcpServerVersion,
    capabilities: ['tools(28)', 'resources(6)', 'prompts(16)', 'logging'],
  });

  return server;
}
