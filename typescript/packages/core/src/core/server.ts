import { Server as McpServer } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import type { Express } from 'express';
import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListResourceTemplatesRequestSchema,
  SubscribeRequestSchema,
  UnsubscribeRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Tool } from './tool.js';
import { Resource, ResourceTemplate, createResource } from './resource.js';
import { Prompt } from './prompt.js';
import { Component } from './component.js';
import {
  McpServerConfig,
  ExecutionContext,
  Logger,
  ServerStats,
  JsonValue,
  ClassConstructor,
  ResourceTemplateDefinition,
} from './types.js';
import { buildResourceReadContentsMeta } from './widget-mcp-meta.js';
import { createLogger } from './logger.js';
import { ToolExecutionError, ValidationError, ResourceNotFoundError, PromptNotFoundError } from './errors.js';
import { v4 as uuidv4 } from 'uuid';
import { isModule, getModuleMetadata } from './module.js';
import { buildController } from './builders.js';
import { DIContainer } from './di/container.js';
import {
  TaskManager,
  TaskContext,
  TaskData,
  TaskParams,
  TaskNotFoundError,
  TaskAlreadyTerminalError,
  TaskAugmentationRequiredError,
} from './task.js';

/**
 * Controller instance type
 */
interface ControllerInstance {
  [key: string]: unknown;
}

/**
 * Module instance with lifecycle hooks
 */
interface ModuleInstance {
  onModuleInit?(): Promise<void> | void;
  start?(): Promise<void> | void;
  stop?(): Promise<void> | void;
}

/**
 * HTTP Transport interface
 */
interface HttpTransport {
  start(): Promise<void>;
  close(): Promise<void>;
  send(message: JsonRpcResponse): Promise<void>;
  onmessage?: (message: JsonRpcRequest) => Promise<void>;
  setToolsCallback?(callback: () => Promise<unknown[]>): void;
  setServerConfig?(config: { name: string; version: string; description?: string }): void;
  /** StreamableHttpTransport exposes the Express app for extra routes (legacy SDK SSE). */
  getApp?(): Express;
}

/**
 * JSON-RPC request structure
 */
interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

/**
 * JSON-RPC response structure
 */
interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * NitroStackServer - Main server class
 */
export class NitroStackServer {
  private mcpServer: McpServer;
  private tools: Map<string, Tool> = new Map();
  private resources: Map<string, Resource> = new Map();
  private resourceTemplates: Map<string, ResourceTemplate> = new Map();
  private templateResources: Map<string, Resource> = new Map();
  private prompts: Map<string, Prompt> = new Map();
  private modules: ClassConstructor[] = [];
  private config: McpServerConfig;
  private logger: Logger;
  private stats: ServerStats = {
    toolCalls: 0,
    resourceReads: 0,
    promptExecutions: 0,
    errors: 0,
  };
  private pendingComponentRegistrations: Promise<void>[] = [];

  /** Transport type used by the server */
  private _transportType?: 'stdio' | 'http' | 'dual';

  /** HTTP transport instance (when using http or dual mode) */
  private _httpTransport?: HttpTransport;

  /** SDK legacy HTTP+SSE routes (GET /sse + POST /mcp/messages) attached once per Express app */
  private _legacySseRoutesAttached = false;

  /** Active sessions for @modelcontextprotocol/sdk SSEServerTransport clients */
  private readonly legacySdkSseSessions = new Map<
    string,
    { server: McpServer; transport: SSEServerTransport }
  >();

  /** Task manager for MCP Tasks support */
  private taskManager: TaskManager;

  constructor(config?: McpServerConfig) {
    // Default config if not provided (e.g., when instantiated by DI container)
    this.config = config || {
      name: 'nitrostack-server',
      version: '1.0.0',
    };

    this.logger = createLogger({
      level: this.config.logging?.level || 'info',
      file: this.config.logging?.file,
      serviceName: this.config.name,
      enableConsole: false, // CRITICAL: Console disabled for MCP compatibility
    });

    // Initialize task manager for MCP Tasks support
    this.taskManager = new TaskManager({
      logger: this.logger,
      onStatusChange: (taskData: TaskData) => {
        // Send notifications/tasks/status when task status changes
        this.sendTaskStatusNotification(taskData);
      },
    });

    this.mcpServer = new McpServer(
      {
        name: this.config.name,
        version: this.config.version,
      },
      NitroStackServer.mcpServerOptions
    );

    this.setupHandlersOn(this.mcpServer);
  }

  /** Shared MCP server constructor options (main + per legacy SSE session) */
  private static readonly mcpServerOptions = {
    capabilities: {
      tools: {
        listChanged: true,
      },
      resources: {
        subscribe: true,
        listChanged: true,
      },
      prompts: {
        listChanged: true,
      },
      tasks: {
        list: {},
        cancel: {},
        requests: {
          tools: { call: {} },
        },
      },
    },
  };

  /**
   * SDK-compatible legacy HTTP+SSE: GET /sse (SSEServerTransport) and POST /mcp/messages?sessionId=.
   * Streamable HTTP stays on GET/POST /mcp.
   */
  private attachLegacySdkSseRoutes(app: Express): void {
    if (this._legacySseRoutesAttached) {
      return;
    }
    this._legacySseRoutesAttached = true;

    const LEGACY_SSE_PATH = '/sse';
    const LEGACY_MESSAGES_PATH = '/mcp/messages';

    app.get(LEGACY_SSE_PATH, async (req, res) => {
      try {
        const sessionMcp = new McpServer(
          {
            name: this.config.name,
            version: this.config.version,
          },
          NitroStackServer.mcpServerOptions,
        );
        this.setupHandlersOn(sessionMcp);

        const transport = new SSEServerTransport(LEGACY_MESSAGES_PATH, res);
        const sessionId = transport.sessionId;
        this.legacySdkSseSessions.set(sessionId, { server: sessionMcp, transport });

        let closing = false;
        transport.onclose = async () => {
          if (closing) {
            return;
          }
          closing = true;
          this.legacySdkSseSessions.delete(sessionId);
          try {
            await sessionMcp.close();
          } catch {
            // ignore
          }
        };

        transport.onerror = (err) => {
          this.logger.error('Legacy SDK SSE transport error', {
            error: err instanceof Error ? err.message : String(err),
          });
        };

        await sessionMcp.connect(transport as Parameters<McpServer['connect']>[0]);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error('Failed to start legacy SDK SSE session', { error: message });
        if (!res.headersSent) {
          res.status(500).end('Failed to establish SSE connection');
        }
      }
    });

    app.post(LEGACY_MESSAGES_PATH, async (req, res) => {
      const sessionId = typeof req.query.sessionId === 'string' ? req.query.sessionId : undefined;
      if (!sessionId) {
        res.status(400).send('Missing sessionId query parameter');
        return;
      }
      const session = this.legacySdkSseSessions.get(sessionId);
      if (!session) {
        res.status(404).send('Unknown session');
        return;
      }
      try {
        await session.transport.handlePostMessage(
          req as unknown as IncomingMessage,
          res as unknown as ServerResponse,
          req.body,
        );
      } catch (error) {
        this.logger.error('Legacy SDK SSE POST failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        if (!res.headersSent) {
          res.status(500).end('Failed to process message');
        }
      }
    });
  }

  private attachLegacySdkSseIfNeeded(transport: HttpTransport): void {
    if (typeof transport.getApp === 'function') {
      this.attachLegacySdkSseRoutes(transport.getApp());
    }
  }

  /**
   * Add a tool to the server
   */
  tool(tool: Tool): this {
    this.tools.set(tool.name, tool);
    this.logger.info(`Tool registered: ${tool.name}`);

    // Auto-register component if attached
    if (tool.hasComponent()) {
      const component = tool.getComponent()!;
      // Track async component registration
      const registration = this.registerComponentResource(component).catch(err => {
        this.logger.error(`Failed to register component for tool ${tool.name}: ${err.message}`);
      });
      this.pendingComponentRegistrations.push(registration);
      this.logger.info(`Component auto-registered for tool: ${tool.name} -> ${component.getResourceUri()}`);
    }

    return this;
  }

  /**
   * Register a component as an MCP resource
   */
  private async registerComponentResource(component: Component): Promise<void> {
    // Compile component
    await component.compile();

    // Create resource for component
    const resource = createResource({
      uri: component.getResourceUri(),
      name: component.name,
      description: component.description || `UI component for ${component.name}`,
      mimeType: 'text/html',
      handler: async (uri: string, context) => {
        context.logger.info(`Serving component: ${uri}`);

        // In production, serve the bundled HTML file if available
        if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'prod') {
          try {
            // Check if we have a bundled file for this component
            // The component ID usually matches the widget output name
            const widgetId = component.id;
            // We need to find where the widgets are located relative to the running server
            // In production, we expect them in src/widgets/out or dist/widgets/out

            // Try to find the bundled file
            const fs = await import('fs');
            const path = await import('path');

            // Possible locations for bundled widgets
            const possiblePaths = [
              path.join(process.cwd(), 'src/widgets/out', `${widgetId}.html`),
              path.join(process.cwd(), 'dist/widgets/out', `${widgetId}.html`),
              path.join(process.cwd(), 'widgets/out', `${widgetId}.html`)
            ];

            for (const p of possiblePaths) {
              if (fs.existsSync(p)) {
                const html = fs.readFileSync(p, 'utf-8');
                return {
                  type: 'text' as const,
                  data: html
                };
              }
            }

            context.logger.warn(`Bundled widget not found for ${widgetId}, falling back to default bundle`);
          } catch (error) {
            context.logger.error(`Error serving bundled widget: ${error}`);
          }
        }

        return {
          type: 'text' as const,
          data: component.getBundle(),
        };
      },
    });

    const metadata = component.getResourceMetadata();
    if (metadata && Object.keys(metadata).length > 0) {
      resource.attachWidgetReadMeta(metadata as Record<string, JsonValue>);
    }

    // Register resource
    this.resource(resource);
  }

  /**
   * Add a resource to the server
   */
  resource(resource: Resource): this {
    // Check if URI is a template (contains {variable})
    if (resource.uri.includes('{') && resource.uri.includes('}')) {
      const template = new ResourceTemplate({
        uriTemplate: resource.uri,
        name: resource.name,
        description: resource.description,
        mimeType: resource.mimeType,
        annotations: resource.annotations,
      });
      this.resourceTemplates.set(template.uriTemplate, template);
      this.templateResources.set(template.uriTemplate, resource);
      this.logger.info(`Resource template registered: ${template.uriTemplate}`);
    }

    // Always keep in main resources map so it shows up in resources/list
    this.resources.set(resource.uri, resource);
    this.logger.info(`Resource registered: ${resource.uri}`);
    return this;
  }

  /**
   * Add a prompt to the server
   */
  prompt(prompt: Prompt): this {
    this.prompts.set(prompt.name, prompt);
    this.logger.info(`Prompt registered: ${prompt.name}`);
    return this;
  }

  /**
   * Add a resource template to the server
   */
  resourceTemplate(template: ResourceTemplate): this {
    this.resourceTemplates.set(template.uriTemplate, template);
    this.logger.info(`Resource template registered: ${template.uriTemplate}`);
    return this;
  }

  /**
   * Notify clients that the list of resources has changed
   */
  notifyResourcesListChanged(): void {
    try {
      // Send notification through the MCP server
      const mcpServerWithNotification = this.mcpServer as unknown as {
        notification?: (params: { method: string }) => Promise<void>
      };
      if (mcpServerWithNotification.notification) {
        mcpServerWithNotification.notification({ method: 'notifications/resources/list_changed' })
          .catch(err => this.logger.error('Failed to send resources list changed notification', { error: err instanceof Error ? err.message : String(err) }));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Error sending resources list changed notification', { error: errorMessage });
    }
  }

  /**
   * Notify clients that the list of prompts has changed
   */
  notifyPromptsListChanged(): void {
    try {
      const mcpServerWithNotification = this.mcpServer as unknown as {
        notification?: (params: { method: string }) => Promise<void>
      };
      if (mcpServerWithNotification.notification) {
        mcpServerWithNotification.notification({ method: 'notifications/prompts/list_changed' })
          .catch(err => this.logger.error('Failed to send prompts list changed notification', { error: err instanceof Error ? err.message : String(err) }));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Error sending prompts list changed notification', { error: errorMessage });
    }
  }

  /**
   * Notify clients that the list of tools has changed
   */
  notifyToolsListChanged(): void {
    try {
      const mcpServerWithNotification = this.mcpServer as unknown as {
        notification?: (params: { method: string }) => Promise<void>
      };
      if (mcpServerWithNotification.notification) {
        mcpServerWithNotification.notification({ method: 'notifications/tools/list_changed' })
          .catch(err => this.logger.error('Failed to send tools list changed notification', { error: err instanceof Error ? err.message : String(err) }));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Error sending tools list changed notification', { error: errorMessage });
    }
  }

  /**
   * Notify subscribers that a resource has been updated
   */
  notifyResourceUpdated(uri: string): void {
    try {
      const resource = this.resources.get(uri);
      if (!resource || !resource.hasSubscribers()) return;

      const mcpServerWithNotification = this.mcpServer as unknown as {
        notification?: (params: { method: string; params: { uri: string } }) => Promise<void>
      };
      if (mcpServerWithNotification.notification) {
        mcpServerWithNotification.notification({
          method: 'notifications/resources/updated',
          params: { uri }
        }).catch(err => this.logger.error('Failed to send resource updated notification', { error: err instanceof Error ? err.message : String(err) }));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Error sending resource updated notification', { error: errorMessage });
    }
  }

  /**
   * Register a module with all its controllers
   * Automatically extracts and registers all tools, resources, and prompts
   * 
   * @example
   * ```typescript
   * server.module(AuthModule);
   * server.module(ProductsModule);
   * ```
   */
  module(moduleClass: ClassConstructor): this {
    this.modules.push(moduleClass);
    // Check if it's a module
    if (!isModule(moduleClass)) {
      throw new Error(`Class ${moduleClass.name} is not decorated with @Module. Use @Module decorator.`);
    }

    // Get module metadata
    const metadata = getModuleMetadata(moduleClass);
    if (!metadata) {
      throw new Error(`Failed to get metadata for module ${moduleClass.name}`);
    }

    this.logger.info(`Registering module: ${metadata.name}`);

    // Process all controllers in the module
    const controllers = metadata.controllers || [];

    for (const controller of controllers) {
      this.logger.info(`  Processing controller: ${(controller as ClassConstructor).name}`);

      // Build all tools, resources, and prompts from controller
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { tools, resources, prompts } = buildController(controller as any);

      // Register tools
      tools.forEach(tool => {
        this.tool(tool);
        this.logger.info(`    ✓ Tool: ${tool.name}`);
      });

      // Register resources
      resources.forEach(resource => {
        this.resource(resource);
        this.logger.info(`    ✓ Resource: ${resource.uri}`);
      });

      // Register prompts
      prompts.forEach(prompt => {
        this.prompt(prompt);
        this.logger.info(`    ✓ Prompt: ${prompt.name}`);
      });
    }

    this.logger.info(`Module registered: ${metadata.name} (${controllers.length} controller(s))`);
    return this;
  }


  /**
   * Get server statistics
   */
  getStats(): ServerStats {
    return { ...this.stats };
  }

  /**
   * Create execution context
   */
  private createContext(options?: { metadata?: Record<string, any>; toolName?: string }): ExecutionContext {
    return {
      logger: this.logger,
      requestId: uuidv4(),
      toolName: options?.toolName,
      metadata: options?.metadata || {},
    };
  }


  /**
   * Register MCP protocol handlers on the given server instance (main or per legacy SSE session).
   */
  private setupHandlersOn(mcp: McpServer): void {
    // List tools
    mcp.setRequestHandler(ListToolsRequestSchema, async () => {
      this.logger.debug('Listing tools');
      const tools = await Promise.all(
        Array.from(this.tools.values()).map((tool) => tool.toMcpTool())
      );
      return {
        tools,
      };
    });

    // Call tool
    mcp.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const tool = this.tools.get(name);

      if (!tool) {
        throw new ToolExecutionError(name, new Error('Tool not found'));
      }

      // ----------------------------------------------------------------
      // MCP Tasks: detect task-augmented requests
      // The client sends `task: { ttl?: number }` in params to request
      // async task execution.
      // ----------------------------------------------------------------
      const requestParams = request.params as Record<string, unknown>;
      const taskParam = requestParams['task'] as TaskParams | undefined;
      const isTaskAugmented = taskParam !== undefined;

      // Enforce tool-level task support negotiation
      if (isTaskAugmented && tool.taskSupport === 'forbidden') {
        throw {
          code: -32601,
          message: `Tool '${name}' does not support task augmentation`,
        };
      }
      if (!isTaskAugmented && tool.taskSupport === 'required') {
        throw new TaskAugmentationRequiredError();
      }

      // Extract _meta from args if present and add to context metadata
      const argsRecord = (args || {}) as Record<string, JsonValue>;
      const { _meta, ...toolArgs } = argsRecord;
      const context = this.createContext({
        metadata: _meta as Record<string, JsonValue> | undefined,
        toolName: name
      });

      // ----------------------------------------------------------------
      // Task-augmented path: create task, run async, return immediately
      // ----------------------------------------------------------------
      if (isTaskAugmented) {
        const taskData = this.taskManager.createTask(taskParam, name);
        const taskId = taskData.taskId;

        // Attach a TaskContext to the execution context so handlers can
        // report progress and check for cancellation
        const taskContext = new TaskContext(this.taskManager, taskId);
        (context as ExecutionContext & { task?: TaskContext }).task = taskContext;

        // Execute the tool asynchronously (fire-and-forget)
        this.runTaskAsync(tool, args, context, taskId, name);

        // Return CreateTaskResult immediately
        return {
          task: taskData,
        };
      }

      // ----------------------------------------------------------------
      // Normal synchronous path
      // ----------------------------------------------------------------
      try {
        // Pass original args (including _meta) to tool
        const result = await tool.execute(args, context);

        this.stats.toolCalls++;

        // Tool response type
        interface ToolResponse {
          content: Array<{ type: 'text'; text: string }>;
          isError?: boolean;
          structuredContent?: JsonValue;
          _meta?: Record<string, JsonValue>;
        }

        // Check if tool has a UI component
        const response: ToolResponse = {
          content: [
            {
              type: 'text',
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
            },
          ],
        };

        // Add structuredContent and _meta if component is attached
        if (tool.hasComponent()) {
          const component = tool.getComponent()!;

          // 1. Get structuredContent (for model and widget)
          const transformedData = await component.transformData(result, context);
          response.structuredContent = transformedData as JsonValue;

          // 2. Get _meta (for widget state, hidden from model)
          const widgetMeta = await component.getWidgetMeta(result, context);
          if (widgetMeta) {
            response._meta = widgetMeta as Record<string, JsonValue>;
          }

          context.logger.info(`Tool response includes structured content for component: ${component.id}`);
        }

        return response;
      } catch (error) {
        this.stats.errors++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        context.logger.error(`Tool execution failed: ${name}`, { error: errorMessage });

        const formattedError = error instanceof ValidationError || error instanceof ToolExecutionError
          ? error
          : new ToolExecutionError(name, error as Error);

        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: ${formattedError.message}`,
            },
          ],
          isError: true,
        };
      }
    });

    // ----------------------------------------------------------------
    // MCP Tasks: tasks/get
    // Returns current task status. Blocks until terminal if needed.
    // ----------------------------------------------------------------
    this.registerCustomHandler(mcp, 'tasks/get', async (params) => {
      const { taskId } = params as { taskId: string };
      if (!taskId) {
        throw { code: -32602, message: 'Invalid params: taskId is required' };
      }
      try {
        return this.taskManager.getTask(taskId);
      } catch (err) {
        if (err instanceof TaskNotFoundError) {
          throw { code: -32602, message: err.message };
        }
        throw { code: -32603, message: 'Internal error' };
      }
    });

    // ----------------------------------------------------------------
    // MCP Tasks: tasks/result
    // Blocks until the task is in a terminal state, then returns the
    // underlying tool call result or error.
    // ----------------------------------------------------------------
    this.registerCustomHandler(mcp, 'tasks/result', async (params) => {
      const { taskId } = params as { taskId: string };
      if (!taskId) {
        throw { code: -32602, message: 'Invalid params: taskId is required' };
      }
      try {
        const { result, error } = await this.taskManager.getResult(taskId);
        if (error) {
          // Re-throw the original error so the client gets the JSON-RPC error
          throw error;
        }
        // Attach related-task metadata to the result
        const resultWithMeta = result as Record<string, unknown>;
        return {
          ...resultWithMeta,
          _meta: {
            ...(resultWithMeta?._meta as Record<string, unknown> || {}),
            'io.modelcontextprotocol/related-task': { taskId },
          },
        };
      } catch (err) {
        if (err instanceof TaskNotFoundError) {
          throw { code: -32602, message: err.message };
        }
        // If err already looks like a JSON-RPC error, re-throw as-is
        if (err && typeof err === 'object' && 'code' in err) {
          throw err;
        }
        throw { code: -32603, message: 'Internal error' };
      }
    });

    // ----------------------------------------------------------------
    // MCP Tasks: tasks/list
    // Lists tasks with cursor-based pagination.
    // ----------------------------------------------------------------
    this.registerCustomHandler(mcp, 'tasks/list', async (params) => {
      const { cursor } = (params || {}) as { cursor?: string };
      try {
        return this.taskManager.listTasks(cursor);
      } catch (err) {
        if (err instanceof TaskNotFoundError) {
          // Invalid cursor
          throw { code: -32602, message: 'Invalid params: invalid cursor' };
        }
        throw { code: -32603, message: 'Internal error' };
      }
    });

    // ----------------------------------------------------------------
    // MCP Tasks: tasks/cancel
    // Cancels an active task.
    // ----------------------------------------------------------------
    this.registerCustomHandler(mcp, 'tasks/cancel', async (params) => {
      const { taskId } = params as { taskId: string };
      if (!taskId) {
        throw { code: -32602, message: 'Invalid params: taskId is required' };
      }
      try {
        return this.taskManager.cancelTask(taskId);
      } catch (err) {
        if (err instanceof TaskNotFoundError) {
          throw { code: -32602, message: err.message };
        }
        if (err instanceof TaskAlreadyTerminalError) {
          throw { code: -32602, message: err.message };
        }
        throw { code: -32603, message: 'Internal error' };
      }
    });

    // List resources
    mcp.setRequestHandler(ListResourcesRequestSchema, async () => {
      this.logger.debug('Listing resources');
      return {
        resources: Array.from(this.resources.values()).map((resource) =>
          resource.toMcpResource()
        ),
      };
    });

    // Read resource
    mcp.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      let resource = this.resources.get(uri);

      // If not found as a static resource, check templates
      if (!resource) {
        for (const [uriTemplate, templateResource] of this.templateResources.entries()) {
          // Robust template matching: 
          // 1. Escape regex special characters except for the template variables
          // 2. Replace {var} placeholders with a capturing group ([^/]+)
          const escapedTemplate = uriTemplate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regexStr = escapedTemplate.replace(/\\\{(.+?)\\\}/g, '([^/]+)');
          const regex = new RegExp(`^${regexStr}$`);

          if (regex.test(uri)) {
            resource = templateResource;
            break;
          }
        }
      }

      if (!resource) {
        throw new ResourceNotFoundError(uri);
      }

      const context = this.createContext();

      try {
        const content = await resource.fetch(context, uri);

        // Resource content response type (optional _meta for MCP Apps widget CSP, etc.)
        interface ResourceResponseContent {
          uri: string;
          mimeType: string;
          text?: string;
          blob?: string;
          _meta?: Record<string, JsonValue>;
        }

        let responseContent: ResourceResponseContent;

        switch (content.type) {
          case 'text':
            responseContent = {
              uri: uri,
              mimeType: resource.mimeType || 'text/plain',
              text: content.data,
            };
            break;
          case 'binary':
            responseContent = {
              uri: uri,
              mimeType: resource.mimeType || 'application/octet-stream',
              blob: content.data.toString('base64'),
            };
            break;
          case 'json':
            responseContent = {
              uri: uri,
              mimeType: resource.mimeType || 'application/json',
              text: JSON.stringify(content.data, null, 2),
            };
            break;
          default:
            // Fallback: if content doesn't match ResourceContent shape, treat as JSON
            responseContent = {
              uri: uri,
              mimeType: resource.mimeType || 'application/json',
              text: JSON.stringify(content, null, 2),
            };
        }

        const contentsMeta = buildResourceReadContentsMeta(resource.getWidgetReadMeta());
        if (contentsMeta) {
          responseContent._meta = contentsMeta;
        }

        this.stats.resourceReads++;

        return {
          contents: [responseContent],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        context.logger.error(`Resource fetch failed: ${uri}`, { error: errorMessage });
        throw error;
      }
    });

    // List resource templates (RFC 6570 URI templates)
    mcp.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
      this.logger.debug('Listing resource templates');
      return {
        resourceTemplates: Array.from(this.resourceTemplates.values()).map((template) =>
          template.toMcpResourceTemplate()
        ),
      };
    });

    // Subscribe to resource updates
    mcp.setRequestHandler(SubscribeRequestSchema, async (request) => {
      const { uri } = request.params;
      const resource = this.resources.get(uri);

      if (!resource) {
        throw new ResourceNotFoundError(uri);
      }

      // Use request ID as subscriber ID (in real implementation, use session ID)
      const subscriberId = uuidv4();
      resource.subscribe(subscriberId);

      this.logger.info(`Subscribed to resource: ${uri}`, { subscriberId });

      return {};
    });

    // Unsubscribe from resource updates
    mcp.setRequestHandler(UnsubscribeRequestSchema, async (request) => {
      const { uri } = request.params;
      const resource = this.resources.get(uri);

      if (!resource) {
        throw new ResourceNotFoundError(uri);
      }

      // Note: In a full implementation, track subscriber IDs per session
      this.logger.info(`Unsubscribe request for resource: ${uri}`);

      return {};
    });

    // List prompts
    mcp.setRequestHandler(ListPromptsRequestSchema, async () => {
      this.logger.debug('Listing prompts');
      return {
        prompts: Array.from(this.prompts.values()).map((prompt) =>
          prompt.toMcpPrompt()
        ),
      };
    });

    // Get prompt
    mcp.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const prompt = this.prompts.get(name);

      if (!prompt) {
        throw new PromptNotFoundError(name);
      }

      const context = this.createContext();

      try {
        const result = await prompt.execute(args || {}, context);

        this.stats.promptExecutions++;

        // Transform messages to MCP protocol format
        // MCP expects content to be an object with type and text, not a plain string
        const messages = result.map((msg) => ({
          role: msg.role,
          content: {
            type: 'text',
            text: msg.content,
          },
        }));

        return {
          description: prompt.description,
          messages,
        };
      } catch (error) {
        this.stats.errors++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        context.logger.error(`Prompt execution failed: ${name}`, { error: errorMessage });
        throw error;
      }
    });

    // Error handler
    mcp.onerror = (error) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('MCP Server error', { error: errorMessage });
      this.stats.errors++;
    };
  }

  /**
   * Start the server
   * Automatically determines the transport based on NODE_ENV
   * 
   * Transport determination:
   * - MCP_TRANSPORT_TYPE env var takes precedence (for explicit control)
   * - NODE_ENV=development or unset → stdio mode
   * - NODE_ENV=production → dual mode (STDIO + HTTP)
   */
  async start(): Promise<void> {
    // Check for explicit transport type override
    const explicitTransport = process.env.MCP_TRANSPORT_TYPE as 'stdio' | 'http' | 'dual' | undefined;

    // Determine if we're in development mode
    // On Windows, NODE_ENV might not be passed correctly, so we're more lenient
    const nodeEnv = process.env.NODE_ENV?.toLowerCase();
    const isDevelopment = nodeEnv === 'development' || nodeEnv === 'dev' || !nodeEnv;

    // Use explicit transport if set, otherwise infer from NODE_ENV
    const transportType = explicitTransport || (isDevelopment ? 'stdio' : 'dual');
    this._transportType = transportType;
    this.logger.debug(`NitroStackServer.start(): NODE_ENV=${process.env.NODE_ENV}, MCP_TRANSPORT_TYPE=${explicitTransport}, transportType=${transportType}`);

    // Call onModuleInit for all modules
    for (const moduleClass of this.modules) {
      const moduleInstance = DIContainer.getInstance().resolve<ModuleInstance>(moduleClass);
      if (moduleInstance.onModuleInit) {
        await moduleInstance.onModuleInit();
      }
    }

    // If HTTP transport is needed (dual mode), set it up BEFORE calling module.start()
    // This allows modules like OAuthModule to register endpoints on the HTTP server
    if (transportType === 'dual') {
      const port = parseInt(process.env.PORT || '3000');
      const host = process.env.HOST || 'localhost';

      // Create and start HTTP transport first
      const { StreamableHttpTransport } = await import('./transports/streamable-http.js');
      const httpTransport = new StreamableHttpTransport({
        port: port,
        host: host,
        endpoint: '/mcp',
        enableSessions: false, // Disable sessions for dual mode
        enableCors: process.env.ENABLE_CORS !== 'false',
      });

      // Set up tools callback and server config for documentation page
      httpTransport.setToolsCallback(async () => {
        const tools = await Promise.all(
          Array.from(this.tools.values()).map((tool) => tool.toMcpTool())
        );
        return tools;
      });
      httpTransport.setServerConfig({
        name: this.config.name,
        version: this.config.version,
        description: this.config.description,
      });

      this.attachLegacySdkSseIfNeeded(httpTransport as HttpTransport);

      await httpTransport.start();

      // Store HTTP transport reference BEFORE modules start
      // This allows OAuthModule to register discovery endpoints
      this._httpTransport = httpTransport as HttpTransport;
    }

    // Call start for all modules (e.g., OAuthModule to register discovery endpoints)
    // Now _httpTransport is available for OAuthModule to use
    for (const moduleClass of this.modules) {
      const moduleInstance = DIContainer.getInstance().resolve<ModuleInstance>(moduleClass);
      if (moduleInstance.start) {
        await moduleInstance.start();
      }
    }

    // Now complete the transport setup using the determined transportType
    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.HOST || 'localhost';

    await this.startWithTransport(transportType, {
      port,
      host,
      endpoint: '/mcp',
      enableCors: process.env.ENABLE_CORS !== 'false',
    });
  }

  /**
   * Start the server with specified transport
   * @param transportType - 'stdio', 'http', or 'dual' (default: 'stdio')
   * @param transportOptions - Transport-specific options
   */
  private async startWithTransport(
    transportType: 'stdio' | 'http' | 'dual' = 'stdio',
    transportOptions?: { port?: number; host?: string; endpoint?: string; enableCors?: boolean }
  ): Promise<void> {
    this._transportType = transportType;
    try {
      // Wait for all component registrations to complete
      if (this.pendingComponentRegistrations.length > 0) {
        this.logger.info(`Waiting for ${this.pendingComponentRegistrations.length} component(s) to compile...`);
        await Promise.all(this.pendingComponentRegistrations);
        this.pendingComponentRegistrations = []; // Clear after completion
        this.logger.info('All components compiled and registered');
      }

      if (transportType === 'dual') {
        // DUAL transport: STDIO + HTTP SSE
        // STDIO: For direct MCP connections (dev tools, Claude Desktop)
        // HTTP SSE: For web-based clients and multiple concurrent connections

        // 1. Start HTTP SSE transport (reuse if already created by start())
        let httpTransport = this._httpTransport;
        if (!httpTransport) {
          const { StreamableHttpTransport } = await import('./transports/streamable-http.js');
          httpTransport = new StreamableHttpTransport({
            port: transportOptions?.port || 3000,
            host: transportOptions?.host || 'localhost',
            endpoint: transportOptions?.endpoint || '/mcp',
            enableSessions: false, // Disable sessions for simpler backward compat
            enableCors: transportOptions?.enableCors !== false, // Enable CORS by default for web clients
          }) as HttpTransport;
          this.attachLegacySdkSseIfNeeded(httpTransport);
          await httpTransport.start();
          this._httpTransport = httpTransport;
        }

        // Wire up HTTP transport to handle MCP messages
        // Since we can't connect to two transports, manually forward HTTP messages
        const transport = httpTransport;
        transport.onmessage = async (message: JsonRpcRequest) => {
          // Handle the message through the MCP server's internal handler
          try {
            // Access internal handlers - this is necessary for dual mode
            const mcpServerInternal = this.mcpServer as unknown as { _requestHandlers?: Map<string, (req: JsonRpcRequest) => Promise<unknown>> };
            const handlers = mcpServerInternal._requestHandlers;
            if (handlers && message && message.method && message.id !== undefined) {
              const handler = handlers.get(message.method);
              if (handler) {
                const result = await handler(message);
                // Send response back through HTTP transport
                await transport.send({
                  jsonrpc: '2.0',
                  id: message.id,
                  result,
                });
              }
            }
          } catch (error: unknown) {
            const err = error as Error;
            // Send error response
            await transport.send({
              jsonrpc: '2.0',
              id: message.id ?? null,
              error: {
                code: -32603,
                message: err.message || 'Internal error',
              },
            });
          }
        };

        // 2. Connect MCP server via STDIO for direct connections
        const stdioTransport = new StdioServerTransport();
        await this.mcpServer.connect(stdioTransport);

        this.logger.info(`${this.config.name} started successfully (DUAL MODE)`);
        this.logger.info(`📡 STDIO: Ready for direct MCP connections`);
        this.logger.info(`🌐 Streamable HTTP: http://${transportOptions?.host || 'localhost'}:${transportOptions?.port || 3000}${transportOptions?.endpoint || '/mcp'}`);
        this.logger.info(`🌐 Legacy SDK SSE: http://${transportOptions?.host || 'localhost'}:${transportOptions?.port || 3000}/sse`);

      } else if (transportType === 'http') {
        // HTTP-only transport (Streamable HTTP with SSE)
        // Reuse if already created by start()
        let httpTransport = this._httpTransport;
        if (!httpTransport) {
          const { StreamableHttpTransport } = await import('./transports/streamable-http.js');
          const transport = new StreamableHttpTransport({
            port: transportOptions?.port || 3000,
            host: transportOptions?.host || 'localhost',
            endpoint: transportOptions?.endpoint || '/mcp',
            enableSessions: true,
            enableCors: transportOptions?.enableCors || false,
          });

          // Set up tools callback and server config for documentation page
          transport.setToolsCallback(async () => {
            const tools = await Promise.all(
              Array.from(this.tools.values()).map((tool) => tool.toMcpTool())
            );
            return tools;
          });
          transport.setServerConfig({
            name: this.config.name,
            version: this.config.version,
            description: this.config.description,
          });

          this.attachLegacySdkSseIfNeeded(transport as HttpTransport);

          // Start HTTP server first
          await transport.start();
          httpTransport = transport as HttpTransport;
          this._httpTransport = httpTransport;
        }

        // Then connect MCP server
        await this.mcpServer.connect(httpTransport as unknown as StdioServerTransport);

        this.logger.info(`${this.config.name} started successfully (HTTP SSE transport)`);
        this.logger.info(`🌐 Streamable HTTP: http://${transportOptions?.host || 'localhost'}:${transportOptions?.port || 3000}${transportOptions?.endpoint || '/mcp'}`);
        this.logger.info(`🌐 Legacy SDK SSE: http://${transportOptions?.host || 'localhost'}:${transportOptions?.port || 3000}/sse`);
      } else {
        // STDIO-only transport (default)
        const transport = new StdioServerTransport();
        await this.mcpServer.connect(transport);

        this.logger.info(`${this.config.name} started successfully (STDIO transport)`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to start server', { error: errorMessage });
      throw error;
    }
  }

  /**
   * Execute a tool asynchronously as a task.
   * Called from the tools/call handler when task-augmented.
   * Updates task status and stores the result for tasks/result.
   */
  private async runTaskAsync(
    tool: Tool,
    args: unknown,
    context: ExecutionContext,
    taskId: string,
    toolName: string,
  ): Promise<void> {
    try {
      const result = await tool.execute(args, context);
      this.stats.toolCalls++;

      // Build the tool response (same shape as the sync path)
      interface ToolResponse {
        content: Array<{ type: 'text'; text: string }>;
        isError?: boolean;
        structuredContent?: JsonValue;
        _meta?: Record<string, JsonValue>;
      }

      const response: ToolResponse = {
        content: [
          {
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
          },
        ],
      };

      if (tool.hasComponent()) {
        const component = tool.getComponent()!;
        const transformedData = await component.transformData(result, context);
        response.structuredContent = transformedData as JsonValue;
        const widgetMeta = await component.getWidgetMeta(result, context);
        if (widgetMeta) {
          response._meta = widgetMeta as Record<string, JsonValue>;
        }
      }

      this.taskManager.completeTask(taskId, response);
    } catch (error) {
      this.stats.errors++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      context.logger.error(`Task tool execution failed: ${toolName}`, { error: errorMessage, taskId });

      // Check if due to cancellation
      const taskData = this.taskManager.hasTask(taskId)
        ? this.taskManager.getTask(taskId)
        : null;
      if (taskData?.status === 'cancelled') {
        return; // Already cancelled — don't overwrite status
      }

      const formattedError = error instanceof ValidationError || error instanceof ToolExecutionError
        ? error
        : new ToolExecutionError(toolName, error as Error);

      this.taskManager.failTask(
        taskId,
        { code: -32603, message: formattedError.message },
        formattedError.message,
      );
    }
  }

  /**
   * Register a custom JSON-RPC handler for task-related methods.
   * The MCP SDK's setRequestHandler only works with pre-defined schemas,
   * so we hook into the transport-level message handling.
   */
  private registerCustomHandler(
    mcp: McpServer,
    method: string,
    handler: (params: Record<string, unknown>) => Promise<unknown>,
  ): void {
    // Store handler for use in message routing (dual/HTTP mode)
    this._customHandlers.set(method, handler);

    const mcpServerInternal = mcp as unknown as {
      _requestHandlers?: Map<string, (req: { params: Record<string, unknown> }) => Promise<unknown>>;
    };
    if (mcpServerInternal._requestHandlers) {
      mcpServerInternal._requestHandlers.set(method, async (req) => {
        return handler(req.params || {});
      });
    }
  }

  /** Custom JSON-RPC handlers (for task methods not covered by MCP SDK schemas) */
  private _customHandlers: Map<string, (params: Record<string, unknown>) => Promise<unknown>> = new Map();

  /**
   * Send a notifications/tasks/status notification to the client.
   */
  private sendTaskStatusNotification(taskData: TaskData): void {
    try {
      const mcpServerWithNotification = this.mcpServer as unknown as {
        notification?: (params: { method: string; params: unknown }) => Promise<void>;
      };
      if (mcpServerWithNotification.notification) {
        mcpServerWithNotification.notification({
          method: 'notifications/tasks/status',
          params: taskData,
        }).catch(err =>
          this.logger.error('Failed to send task status notification', {
            error: err instanceof Error ? err.message : String(err),
          })
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Error sending task status notification', { error: errorMessage });
    }
  }

  /**
   * Get the TaskManager instance (useful for advanced use cases)
   */
  getTaskManager(): TaskManager {
    return this.taskManager;
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    try {
      // Call stop for all modules
      for (const moduleClass of this.modules) {
        const moduleInstance = DIContainer.getInstance().resolve<ModuleInstance>(moduleClass);
        if (moduleInstance.stop) {
          await moduleInstance.stop();
        }
      }

      // Destroy task manager (stops cleanup interval)
      this.taskManager.destroy();

      for (const { server: sessionMcp, transport: legacyTransport } of this.legacySdkSseSessions.values()) {
        try {
          await legacyTransport.close();
        } catch {
          // ignore
        }
        try {
          await sessionMcp.close();
        } catch {
          // ignore
        }
      }
      this.legacySdkSseSessions.clear();
      this._legacySseRoutesAttached = false;

      // Close HTTP transport if running in dual mode
      if (this._httpTransport) {
        await this._httpTransport.close();
        this._httpTransport = undefined;
      }

      // Close MCP server
      await this.mcpServer.close();
      this.logger.info('Server stopped');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Error stopping server', { error: errorMessage });
      throw error;
    }
  }

  /**
   * Get the HTTP transport (for modules that need to register endpoints)
   */
  getHttpTransport(): HttpTransport | undefined {
    return this._httpTransport;
  }
}

/**
 * Helper function to create a server
 */
export function createServer(config: McpServerConfig): NitroStackServer {
  return new NitroStackServer(config);
}
