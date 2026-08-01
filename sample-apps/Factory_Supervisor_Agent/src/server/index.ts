import { z } from 'zod';
import { loadConfig } from '../config/env.js';
import { Logger } from './logger.js';
import { ToolRegistry } from './toolRegistry.js';
import { ToolExecutor } from './toolExecutor.js';
import { MCPServerWrapper } from './mcpServer.js';

async function bootstrap() {
  // 1. Load Configuration
  const config = loadConfig();

  // 2. Initialize Central Logger
  const logger = new Logger(config.logLevel);
  logger.info(`Initializing ${config.serverName} v${config.serverVersion}`);

  // 3. Initialize Tool Registry
  const registry = new ToolRegistry(logger);

  // 4. Initialize Tool Executor
  const executor = new ToolExecutor(registry, logger);

  // 5. Register Infrastructure Ping Tool for Server Diagnostics
  registry.registerTool({
    name: 'ping',
    description: 'Infrastructure health check diagnostic tool',
    inputSchema: z.object({
      message: z.string().optional().describe('Optional echo message'),
    }),
    execute: async (args: { message?: string }) => {
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        echo: args.message ?? 'pong',
      };
    },
  });

  // 6. Initialize MCP Server Wrapper
  const mcpServer = new MCPServerWrapper(config, registry, executor, logger);

  // 7. Handle Signal Traps for Graceful Shutdown
  const gracefulShutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Initiating graceful shutdown...`);
    try {
      await mcpServer.stop();
      process.exit(0);
    } catch (err) {
      logger.error('Error during graceful shutdown', { error: err });
      process.exit(1);
    }
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  // 8. Start MCP Server Transport
  try {
    await mcpServer.start();
    logger.info('Server initialization complete and listening for requests');
  } catch (error) {
    logger.error('Failed to start MCP Server', { error });
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  process.stderr.write(`Fatal error during server startup: ${error}\n`);
  process.exit(1);
});

export { bootstrap };
