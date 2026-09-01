/**
 * Modern (2026-07-28) protocol adapter.
 *
 * Binds the NitroStack registry to the official `@modelcontextprotocol/server`
 * v2 engine:
 *
 * - HTTP: `createMcpHandler(() => buildServer())` wrapped with
 *   `toNodeHandler(...)` from `@modelcontextprotocol/node`, mounted on the
 *   Express app. Stateless per-request serving, `server/discover`, per-request
 *   `_meta` envelope, `Mcp-Method`/`Mcp-Name` headers, and cache hints are all
 *   provided by the SDK.
 * - stdio: `serveStdio(() => buildServer())` from `@modelcontextprotocol/server/stdio`.
 *
 * The SDK stamps `_meta['io.modelcontextprotocol/serverInfo']` on every 2026
 * response from the `Implementation` handed to `new McpServer(...)`.
 *
 * The v2 packages are loaded lazily (dynamic `import`) so a default (legacy)
 * install never touches them and existing Jest suites never load v2. The SDK's
 * types use minified re-exports, so this file types the SDK surface loosely at
 * the boundary while keeping NitroStack's own objects strongly typed.
 *
 * @module
 */

import type { Express, Request as ExpressRequest, Response as ExpressResponse } from 'express';
import type { ProtocolAdapter, ProtocolRegistry, ProtocolTransportOptions } from './adapter.js';
import { MODERN_PROTOCOL_VERSION } from './version.js';
import { resolveToolCacheHint, resolveResourceCacheHint } from './features/cache-hints.js';
import { convertToModernJsonSchema } from './features/schema.js';
import { extractTraceContext } from './features/trace-context.js';
import { buildExtensionsMap } from './features/extensions.js';
import { mapToJsonRpcError } from './features/errors.js';
import { isInputRequired } from './features/mrtr.js';
import { isMcpAppMode, isOpenAiMode } from '../app-mode.js';
import type { Tool } from '../tool.js';
import type { ExecutionContext, JsonValue } from '../types.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyRecord = Record<string, any>;

/** Meta-key constants (SEP-2575 / SEP-414) used to read the request envelope. */
const META = {
  PROTOCOL_VERSION: 'io.modelcontextprotocol/protocolVersion',
  CLIENT_INFO: 'io.modelcontextprotocol/clientInfo',
  CLIENT_CAPABILITIES: 'io.modelcontextprotocol/clientCapabilities',
} as const;

/**
 * The v2 SDK module surface this adapter relies on. Kept intentionally loose.
 */
interface ServerSdk {
  McpServer: new (info: { name: string; version: string }, options?: AnyRecord) => AnyRecord;
  createMcpHandler: (factory: (ctx: AnyRecord) => any, options?: AnyRecord) => AnyRecord;
  inputRequired: (spec: AnyRecord) => any;
  fromJsonSchema?: (schema: AnyRecord) => any;
  /** SDK error classes used to surface the correct JSON-RPC code (SEP-2164). */
  ResourceNotFoundError?: new (message: string, data?: unknown) => Error;
  InvalidParamsError?: new (message: string, data?: unknown) => Error;
  MethodNotFoundError?: new (message: string, data?: unknown) => Error;
  InternalError?: new (message: string, data?: unknown) => Error;
}

export class ModernProtocolAdapter implements ProtocolAdapter {
  readonly era = 'modern' as const;

  private handler?: AnyRecord;
  private stdioHandle?: AnyRecord;
  private serverSdkPromise?: Promise<ServerSdk>;

  constructor(
    private readonly registry: ProtocolRegistry,
    private readonly options: { legacyMode: 'stateless' | 'reject' } = { legacyMode: 'reject' },
  ) {}

  private loadServerSdk(): Promise<ServerSdk> {
    if (!this.serverSdkPromise) {
      this.serverSdkPromise = import('@modelcontextprotocol/server') as unknown as Promise<ServerSdk>;
    }
    return this.serverSdkPromise;
  }

  // ==========================================================================
  // Server construction (called per request by the SDK factory)
  // ==========================================================================

  private async buildServer(): Promise<AnyRecord> {
    const sdk = await this.loadServerSdk();
    const config = this.registry.config;

    const extensions = this.advertisedExtensions();
    const serverOptions: AnyRecord = {
      cacheHints: this.buildServerCacheHints(),
    };
    if (Object.keys(extensions).length > 0) {
      // Advertise the SEP-2133 extensions map on server/discover capabilities.
      serverOptions.capabilities = { extensions };
    }

    const server = new sdk.McpServer({ name: config.name, version: config.version }, serverOptions);

    await this.registerTools(server, sdk);
    await this.registerResources(server, sdk);
    await this.registerPrompts(server);

    return server;
  }

  /** Server-level per-operation cache hints for list/discover results. */
  private buildServerCacheHints(): AnyRecord | undefined {
    // Conservative shared default for list surfaces; per-resource hints still win.
    return undefined;
  }

  private async registerTools(server: AnyRecord, sdk: ServerSdk): Promise<void> {
    for (const tool of this.registry.getTools().values()) {
      const inputSchema = await this.toModernSchema(tool.inputSchema, 'input', sdk);
      const outputSchema = tool.outputSchema
        ? await this.toModernSchema(tool.outputSchema, 'output', sdk)
        : undefined;

      const config: AnyRecord = {
        description: tool.description,
        inputSchema,
      };
      if (tool.title) config.title = tool.title;
      if (outputSchema) config.outputSchema = outputSchema;
      if (tool.annotations) config.annotations = tool.annotations;

      const cacheHint = resolveToolCacheHint(tool);
      if (cacheHint) config._meta = { 'io.modelcontextprotocol/cacheHint': cacheHint };

      server.registerTool(
        tool.name,
        config,
        async (args: AnyRecord, ctx: AnyRecord) => this.runTool(tool, args, ctx, sdk),
      );
    }
  }

  private async registerResources(server: AnyRecord, sdk: ServerSdk): Promise<void> {
    // Static resources and template resources both flow through registerResource.
    const templateResources = this.registry.getTemplateResources();
    for (const resource of this.registry.getResources().values()) {
      // A template resource is registered via its template URI, not the static map.
      const isTemplate = resource.uri.includes('{') && resource.uri.includes('}');
      if (isTemplate) continue;

      const cacheHint = resolveResourceCacheHint(resource);
      const config: AnyRecord = {
        description: resource.description,
        mimeType: resource.mimeType,
      };
      if (resource.title) config.title = resource.title;
      if (cacheHint) config.cacheHint = cacheHint;

      server.registerResource(
        resource.name,
        resource.uri,
        config,
        async (uri: AnyRecord) => this.readResource(String(uri?.href ?? uri), resource, sdk),
      );
    }

    // Template resources keyed by uri template.
    for (const [uriTemplate, resource] of templateResources.entries()) {
      const cacheHint = resolveResourceCacheHint(resource);
      const config: AnyRecord = {
        description: resource.description,
        mimeType: resource.mimeType,
      };
      if (resource.title) config.title = resource.title;
      if (cacheHint) config.cacheHint = cacheHint;

      try {
        const ResourceTemplateCtor = (sdk as AnyRecord).ResourceTemplate;
        const template = ResourceTemplateCtor
          ? new ResourceTemplateCtor(uriTemplate, { list: undefined })
          : uriTemplate;
        server.registerResource(
          resource.name,
          template,
          config,
          async (uri: AnyRecord) => this.readResource(String(uri?.href ?? uri), resource, sdk),
        );
      } catch (err) {
        this.registry.logger.warn('Failed to register modern resource template', {
          uriTemplate,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  private async registerPrompts(server: AnyRecord): Promise<void> {
    for (const prompt of this.registry.getPrompts().values()) {
      const config: AnyRecord = { description: prompt.description };
      server.registerPrompt(
        prompt.name,
        config,
        async (args: AnyRecord, ctx: AnyRecord) => {
          const context = this.buildContext(ctx, { toolName: prompt.name });
          const messages = await prompt.execute(args || {}, context);
          return {
            description: prompt.description,
            messages: messages.map((m) => ({
              role: m.role,
              content: { type: 'text', text: m.content },
            })),
          };
        },
      );
    }
  }

  // ==========================================================================
  // Handlers
  // ==========================================================================

  private async runTool(tool: Tool, args: AnyRecord, ctx: AnyRecord, sdk: ServerSdk): Promise<AnyRecord> {
    const context = this.buildContext(ctx, { toolName: tool.name });
    try {
      const result = await tool.execute(args, context);

      // MRTR: a handler may pause and ask for more input.
      if (isInputRequired(result)) {
        return sdk.inputRequired({
          inputRequests: result.inputRequests,
          requestState: result.requestState,
          message: result.message,
        });
      }

      const response: AnyRecord = {
        content: [
          {
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
          },
        ],
      };

      if (tool.hasComponent()) {
        const component = tool.getComponent()!;
        response.structuredContent = (await component.transformData(result, context)) as JsonValue;
        const widgetMeta = ((await component.getWidgetMeta(result, context)) || {}) as AnyRecord;
        response._meta = widgetMeta;
        if (isMcpAppMode()) {
          if (!widgetMeta.ui) {
            widgetMeta.ui = { resourceUri: component.getResourceUri() };
          } else if (typeof widgetMeta.ui === 'object' && !('resourceUri' in widgetMeta.ui)) {
            widgetMeta.ui.resourceUri = component.getResourceUri();
          }
        }
        if (isOpenAiMode() && !widgetMeta['openai/outputTemplate']) {
          widgetMeta['openai/outputTemplate'] = component.getResourceUri();
        }
      }

      return response;
    } catch (error) {
      const mapped = mapToJsonRpcError(error);
      context.logger.error(`Tool execution failed (modern): ${tool.name}`, { error: mapped.message });
      // Tool failures are returned as isError results, not JSON-RPC errors.
      return {
        content: [{ type: 'text', text: `Error: ${mapped.message}` }],
        isError: true,
      };
    }
  }

  /**
   * Translate a NitroStack/handler error into an SDK error carrying the right
   * JSON-RPC code for the modern era. Prefers the v2 SDK error classes (so the
   * SDK serializes `error.code` correctly); falls back to a plain `Error` with
   * a numeric `code` property the SDK also recognizes.
   */
  private toSdkError(error: unknown, sdk: ServerSdk): Error {
    const mapped = mapToJsonRpcError(error);
    // -32602 is the SEP-2164 code for a missing resource and for invalid params;
    // InvalidParamsError takes a message and serializes with the right code.
    const Ctor =
      mapped.code === -32602
        ? sdk.InvalidParamsError || sdk.ResourceNotFoundError
        : mapped.code === -32601
          ? sdk.MethodNotFoundError
          : sdk.InternalError;
    if (Ctor) {
      try {
        return new Ctor(mapped.message, mapped.data);
      } catch {
        /* fall through */
      }
    }
    const err = new Error(mapped.message) as Error & { code?: number; data?: unknown };
    err.code = mapped.code;
    if (mapped.data !== undefined) err.data = mapped.data;
    return err;
  }

  private async readResource(uri: string, resource: AnyRecord, sdk: ServerSdk): Promise<AnyRecord> {
    const context = this.registry.createExecutionContext({
      extra: { protocolVersion: MODERN_PROTOCOL_VERSION },
    });
    let content: AnyRecord;
    try {
      content = await resource.fetch(context, uri);
    } catch (error) {
      // SEP-2164: surface the correct JSON-RPC code on the modern path
      // (ResourceNotFound → -32602 Invalid Params, not the 2025-era -32002).
      throw this.toSdkError(error, sdk);
    }
    const mimeType = resource.mimeType || 'text/plain';
    let entry: AnyRecord;
    switch (content.type) {
      case 'text':
        entry = { uri, mimeType, text: content.data };
        break;
      case 'binary':
        entry = { uri, mimeType: resource.mimeType || 'application/octet-stream', blob: content.data.toString('base64') };
        break;
      case 'json':
        entry = { uri, mimeType: resource.mimeType || 'application/json', text: JSON.stringify(content.data, null, 2) };
        break;
      default:
        entry = { uri, mimeType: resource.mimeType || 'application/json', text: JSON.stringify(content, null, 2) };
    }
    const widgetMeta = resource.getWidgetReadMeta?.();
    if (widgetMeta && Object.keys(widgetMeta).length > 0) {
      entry._meta = widgetMeta;
    }
    return { contents: [entry] };
  }

  // ==========================================================================
  // Context bridging (per-request envelope → ExecutionContext)
  // ==========================================================================

  private buildContext(ctx: AnyRecord, opts: { toolName?: string }): ExecutionContext {
    const mcpReq: AnyRecord = ctx?.mcpReq ?? {};
    const meta: AnyRecord = mcpReq._meta ?? {};
    const envelope: AnyRecord = mcpReq.envelope ?? {};

    const readEnvelope = (bareKey: string, prefixedKey: string): unknown =>
      envelope[prefixedKey] ?? envelope[bareKey] ?? meta[prefixedKey] ?? meta[bareKey];

    const protocolVersion =
      (readEnvelope('protocolVersion', META.PROTOCOL_VERSION) as string | undefined) ?? MODERN_PROTOCOL_VERSION;
    const clientInfo = readEnvelope('clientInfo', META.CLIENT_INFO) as ExecutionContext['clientInfo'];
    const clientCapabilities = readEnvelope('clientCapabilities', META.CLIENT_CAPABILITIES) as
      | Record<string, JsonValue>
      | undefined;

    let requestState: JsonValue | undefined;
    try {
      requestState = typeof mcpReq.requestState === 'function' ? mcpReq.requestState() : mcpReq.requestState;
    } catch {
      requestState = undefined;
    }

    const trace = extractTraceContext({ ...meta, ...envelope });
    const inputResponses = mcpReq.inputResponses as Record<string, JsonValue> | undefined;

    const authInfo = ctx?.http?.authInfo ?? mcpReq?.http?.authInfo;

    return this.registry.createExecutionContext({
      toolName: opts.toolName,
      extra: {
        protocolVersion,
        clientInfo,
        clientCapabilities,
        requestState,
        inputResponses,
        trace,
        auth: authInfo ? this.mapAuthInfo(authInfo) : undefined,
      },
    });
  }

  private mapAuthInfo(authInfo: AnyRecord): ExecutionContext['auth'] {
    return {
      subject: authInfo.clientId ?? authInfo.extra?.sub,
      clientId: authInfo.clientId,
      scopes: authInfo.scopes,
      claims: authInfo.extra ?? authInfo.claims,
      tokenPayload: authInfo,
    };
  }

  private async toModernSchema(schema: unknown, root: 'input' | 'output', sdk: ServerSdk): Promise<AnyRecord> {
    // NitroStack ships Zod v3, which the v2 SDK cannot ingest directly (it only
    // accepts Zod >= 4.2.0 or a `fromJsonSchema(...)`-wrapped JSON Schema). So
    // always lift the schema (Zod or pre-built JSON) to JSON Schema 2020-12
    // (SEP-2106, preserving composition/$defs) and wrap it with `fromJsonSchema`
    // when available so the SDK validates against it.
    const json = await convertToModernJsonSchema(schema, { root });
    if (sdk.fromJsonSchema) {
      try {
        return sdk.fromJsonSchema(json);
      } catch {
        /* fall through to raw json */
      }
    }
    return json;
  }

  // ==========================================================================
  // Transport wiring
  // ==========================================================================

  /**
   * Build the stateless per-request Node HTTP handler for the modern engine.
   * Returned so an existing Express host (NitroStack's `StreamableHttpTransport`)
   * can route its `/mcp` endpoint to it, keeping one Express app and one set of
   * OAuth/docs routes.
   */
  /**
   * Build (once) the web-standard v2 handler `{ fetch, close, notify, bus }`
   * returned by `createMcpHandler`. Idempotent: repeated calls reuse the same
   * handler so a single notify bus backs `subscriptions/listen`.
   */
  async getHttpHandler(): Promise<AnyRecord> {
    if (!this.handler) {
      const sdk = await this.loadServerSdk();
      this.handler = sdk.createMcpHandler(() => this.buildServer(), {
        legacy: this.options.legacyMode,
        onerror: (error: Error) => {
          this.registry.logger.error('Modern MCP handler error', { error: error.message });
        },
      });
    }
    return this.handler;
  }

  async createNodeHandler(): Promise<(req: ExpressRequest, res: ExpressResponse) => void> {
    const node = (await import('@modelcontextprotocol/node')) as AnyRecord;
    const handler = await this.getHttpHandler();

    const nodeHandler = node.toNodeHandler(handler);
    return (req: ExpressRequest, res: ExpressResponse) => {
      Promise.resolve(nodeHandler(req, res)).catch((err: unknown) => {
        this.registry.logger.error('Modern MCP request failed', {
          error: err instanceof Error ? err.message : String(err),
        });
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: { code: -32603, message: 'Internal error' },
            id: null,
          });
        }
      });
    };
  }

  async attachHttp(app: Express, options: ProtocolTransportOptions): Promise<void> {
    const nodeHandler = await this.createNodeHandler();
    const endpoint = options.endpoint || '/mcp';

    if (options.enableCors !== false) {
      app.use(endpoint, (req: ExpressRequest, res: ExpressResponse, next: () => void) => {
        this.applyCorsHeaders(req, res);
        if (req.method === 'OPTIONS') {
          res.status(204).end();
          return;
        }
        next();
      });
    }

    app.all(endpoint, nodeHandler);
    this.registry.logger.info(`Modern MCP (${MODERN_PROTOCOL_VERSION}) mounted at ${endpoint}`);
  }

  /**
   * SEP-2243/SEP-2575 CORS: expose and allow the new required request headers
   * (`MCP-Protocol-Version`, `Mcp-Method`, `Mcp-Name`, and `Mcp-Param-*`).
   */
  private applyCorsHeaders(req: ExpressRequest, res: ExpressResponse): void {
    const origin = req.headers.origin;
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      [
        'Content-Type',
        'Authorization',
        'MCP-Protocol-Version',
        'Mcp-Method',
        'Mcp-Name',
        'Mcp-Param-*',
        'Last-Event-ID',
      ].join(', '),
    );
    res.setHeader('Access-Control-Expose-Headers', ['MCP-Protocol-Version', 'Mcp-Method', 'Mcp-Name'].join(', '));
  }

  async serveStdio(): Promise<void> {
    const stdio = (await import('@modelcontextprotocol/server/stdio')) as AnyRecord;
    this.stdioHandle = stdio.serveStdio(() => this.buildServer());
    this.registry.logger.info(`Modern MCP (${MODERN_PROTOCOL_VERSION}) serving over stdio`);
  }

  // ==========================================================================
  // Notifications (subscriptions/listen bus)
  // ==========================================================================

  notifyToolsListChanged(): void {
    this.handler?.notify?.toolsChanged?.();
  }
  notifyResourcesListChanged(): void {
    this.handler?.notify?.resourcesChanged?.();
  }
  notifyPromptsListChanged(): void {
    this.handler?.notify?.promptsChanged?.();
  }
  notifyResourceUpdated(uri: string): void {
    this.handler?.notify?.resourceUpdated?.(uri);
  }

  async close(): Promise<void> {
    try {
      await this.handler?.close?.();
    } catch {
      /* ignore */
    }
    try {
      await this.stdioHandle?.close?.();
    } catch {
      /* ignore */
    }
    this.handler = undefined;
    this.stdioHandle = undefined;
  }

  /** The extensions map this adapter would advertise (for diagnostics/notes). */
  advertisedExtensions(): Record<string, Record<string, unknown>> {
    const tools = this.registry.getTools();
    const hasTasks = Array.from(tools.values()).some((t) => t.taskSupport && t.taskSupport !== 'forbidden');
    const hasApps = Array.from(tools.values()).some((t) => t.hasComponent());
    return buildExtensionsMap({ hasTasks, hasApps, declared: this.registry.config.extensions });
  }
}
