import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ServerConfig } from '../config/env.js';
import { ToolRegistry } from './toolRegistry.js';
import { ToolExecutor } from './toolExecutor.js';
import { ILogger } from '../types/logger.js';
import { zodToJsonSchema } from '../utils/schema.js';

export class MCPServerWrapper {
  private server: Server;
  private transport: StdioServerTransport | null = null;

  constructor(
    private config: ServerConfig,
    private registry: ToolRegistry,
    private executor: ToolExecutor,
    private logger: ILogger
  ) {
    this.server = new Server(
      {
        name: this.config.serverName,
        version: this.config.serverVersion,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  /**
   * Configures MCP request handlers for listTools and callTool.
   */
  private setupHandlers(): void {
    // 1. Tool Listing Request Handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      this.logger.debug('Handling ListTools request');
      const registeredTools = this.registry.listTools();

      const tools = registeredTools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: zodToJsonSchema(tool.inputSchema),
      }));

      return { tools };
    });

    // 2. Tool Execution Request Handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      this.logger.debug(`Handling CallTool request for '${name}'`);

      const executionResult = await this.executor.execute({
        name,
        args: args as Record<string, unknown> | undefined,
      });

      return {
        content: executionResult.response.content,
        isError: executionResult.response.isError,
      };
    });

    this.logger.info('MCP request handlers initialized');
  }

  /**
   * Starts the MCP server on Stdio transport.
   */
  public async start(): Promise<void> {
    this.logger.info(`Starting MCP Server '${this.config.serverName}' v${this.config.serverVersion}`);
    this.transport = new StdioServerTransport();
    await this.server.connect(this.transport);
    this.logger.info('MCP Server connected to Stdio transport successfully');
  }

  /**
   * Stops the MCP server cleanly.
   */
  public async stop(): Promise<void> {
    this.logger.info('Shutting down MCP Server');
    if (this.server) {
      await this.server.close();
    }
    this.logger.info('MCP Server stopped');
  }

  /**
   * Returns the underlying SDK Server instance.
   */
  public getSDKServer(): Server {
    return this.server;
  }
}
