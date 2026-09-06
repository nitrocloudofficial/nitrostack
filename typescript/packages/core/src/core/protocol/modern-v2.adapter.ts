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
import { TaskManager, TaskContext, TaskAugmentationRequiredError, type TaskData, type TaskAccessContext } from '../task.js';

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

export interface ModernProtocolAdapterOptions {
  legacyMode?: 'stateless' | 'reject';
  taskManager?: TaskManager;
}

export class ModernProtocolAdapter implements ProtocolAdapter {
  readonly era = 'modern' as const;

  private handler?: AnyRecord;
  private stdioHandle?: AnyRecord;
  private serverSdkPromise?: Promise<ServerSdk>;
  private readonly taskManager?: TaskManager;

  constructor(
    private readonly registry: ProtocolRegistry,
    private readonly options: ModernProtocolAdapterOptions = { legacyMode: 'reject' },
  ) {
    this.taskManager = options.taskManager;
  }

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
    await this.registerPrompts(server, sdk);

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

      const meta: AnyRecord = {};
      const cacheHint = resolveToolCacheHint(tool);
      if (cacheHint) meta['io.modelcontextprotocol/cacheHint'] = cacheHint;

      if (tool.hasComponent && tool.hasComponent()) {
        const component = tool.getComponent()!;
        const resourceUri = component.getResourceUri();
        const componentMeta = component.getResourceMetadata() as Record<string, unknown> | undefined;

        meta['ui/template'] = resourceUri;
        meta['openai/outputTemplate'] = resourceUri;
        meta['ui'] = { resourceUri };
        if (componentMeta) {
          if (componentMeta['openai/widgetCSP'] !== undefined) {
            meta['openai/widgetCSP'] = componentMeta['openai/widgetCSP'];
          }
          if (componentMeta['openai/widgetDescription'] !== undefined) {
            meta['openai/widgetDescription'] = componentMeta['openai/widgetDescription'];
          }
          if (componentMeta['openai/widgetPrefersBorder'] !== undefined) {
            meta['openai/widgetPrefersBorder'] = componentMeta['openai/widgetPrefersBorder'];
          }
          if (componentMeta['openai/widgetDomain'] !== undefined) {
            meta['openai/widgetDomain'] = componentMeta['openai/widgetDomain'];
          }
        }
      } else if (tool.widget?.route || tool.outputTemplate) {
        const route = tool.widget?.route || tool.outputTemplate;
        const normalized = route?.startsWith('/') ? route : `/${route}`;
        const resourceUri = `/widgets${normalized}`;
        meta['ui/template'] = resourceUri;
        meta['openai/outputTemplate'] = resourceUri;
        meta['ui'] = { resourceUri };
      }

      if (tool.examples) {
        meta['tool/examples'] = tool.examples;
      }
      if (tool.isInitial) {
        meta['tool/initial'] = true;
      }

      if (Object.keys(meta).length > 0) {
        config._meta = meta;
      }

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

    // Modern SDK v2 strictly validates URIs using `new URL(uri)`. To support custom
    // or relative URI schemes such as `/widgets/*` used by NitroStudio and MCP Apps,
    // attach a fallback resources/read handler on the underlying MCP server only when
    // the server actually has resources registered (otherwise SDK throws capability error).
    const rawResources = this.registry.getResources();
    if ((rawResources.size > 0 || templateResources.size > 0) && server.server && typeof server.server.setRequestHandler === 'function') {
      server.server.setRequestHandler('resources/read', async (request: AnyRecord, ctx: AnyRecord) => {
        const reqUri = String(request?.params?.uri ?? '');
        // 1. Check exact match in registered resources (including path-based URIs like /widgets/...)
        const matchingResource = rawResources.get(reqUri);
        if (matchingResource) {
          const resResult = await this.readResource(reqUri, matchingResource, sdk);
          const cacheHint = resolveResourceCacheHint(matchingResource);
          if (cacheHint) {
            return { ...resResult, cacheHint };
          }
          return resResult;
        }

        // 2. Try URL parsing for standard schemes (mcp://, ui://, http://)
        let parsedUrl: URL | undefined;
        try {
          parsedUrl = new URL(reqUri);
        } catch {
          // If not parseable as standard URL, check if any resource matches
          for (const [uri, res] of rawResources.entries()) {
            if (uri === reqUri || uri.endsWith(reqUri) || reqUri.endsWith(uri)) {
              return this.readResource(reqUri, res, sdk);
            }
          }
        }

        if (parsedUrl) {
          const registered =
            server._registeredResources?.[parsedUrl.toString()] ||
            rawResources.get(parsedUrl.toString());
          if (registered) {
            if (typeof registered.readCallback === 'function') {
              return registered.readCallback(parsedUrl, ctx);
            }
            return this.readResource(reqUri, registered, sdk);
          }
        }

        // 3. Check template resources
        if (server._registeredResourceTemplates) {
          for (const template of Object.values(server._registeredResourceTemplates) as AnyRecord[]) {
            const variables = template.resourceTemplate?.uriTemplate?.match?.(reqUri);
            if (variables) {
              return template.readCallback(reqUri, variables, ctx);
            }
          }
        }

        throw this.toSdkError(new Error(`Resource not found: ${reqUri}`), sdk);
      });
    }
  }

  private async registerPrompts(server: AnyRecord, sdk: ServerSdk): Promise<void> {
    for (const prompt of this.registry.getPrompts().values()) {
      const args = prompt.arguments;
      const config: AnyRecord = { description: prompt.description };
      if (prompt.title) config.title = prompt.title;

      if (args && args.length > 0) {
        const properties: Record<string, unknown> = {};
        const required: string[] = [];
        for (const arg of args) {
          properties[arg.name] = {
            type: 'string',
            description: arg.description,
          };
          if (arg.required) {
            required.push(arg.name);
          }
        }
        const rawSchema: AnyRecord = {
          type: 'object',
          properties,
        };
        if (required.length > 0) {
          rawSchema.required = required;
        }
        config.argsSchema = sdk.fromJsonSchema ? sdk.fromJsonSchema(rawSchema) : rawSchema;

        server.registerPrompt(
          prompt.name,
          config,
          async (promptArgs: AnyRecord, ctx: AnyRecord) => {
            const context = this.buildContext(ctx, { toolName: prompt.name });
            const messages = await prompt.execute(promptArgs || {}, context);
            return {
              description: prompt.description,
              messages: messages.map((m) => ({
                role: m.role,
                content: { type: 'text', text: m.content },
              })),
            };
          },
        );
      } else {
        server.registerPrompt(
          prompt.name,
          config,
          async (ctx: AnyRecord) => {
            const context = this.buildContext(ctx, { toolName: prompt.name });
            const messages = await prompt.execute({}, context);
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
  }

  // ==========================================================================
  // Handlers
  // ==========================================================================

  private async runTool(tool: Tool, args: AnyRecord, ctx: AnyRecord, sdk: ServerSdk): Promise<AnyRecord> {
    const context = this.buildContext(ctx, { toolName: tool.name });
    const isTaskAugmented = ctx?.task !== undefined || ctx?.mcpReq?.params?.task !== undefined;

    // Enforce tool-level task support negotiation
    if (tool.taskSupport === 'required' && !isTaskAugmented) {
      throw this.toSdkError(new TaskAugmentationRequiredError(), sdk);
    }
    if (tool.taskSupport === 'forbidden' && isTaskAugmented) {
      throw this.toSdkError({
        code: -32601,
        message: `Tool '${tool.name}' does not support task augmentation`,
      }, sdk);
    }

    try {
      const argsRecord = (args || {}) as Record<string, unknown>;
      const { _meta: metaFromArgs, ...toolArgs } = argsRecord;
      if (metaFromArgs && typeof metaFromArgs === 'object') {
        context.metadata = context.metadata || {};
        const argMeta = metaFromArgs as Record<string, unknown>;
        const rawAuth = argMeta.authorization || argMeta.Authorization;
        if (rawAuth) {
          context.metadata.authorization = rawAuth as any;
          context.metadata.Authorization = rawAuth as any;
        }
        const rawToken = argMeta.token || argMeta._oauth || argMeta.jwtToken;
        if (rawToken) {
          context.metadata.token = rawToken as any;
          context.metadata._oauth = rawToken as any;
        }
      }
      const result = await tool.execute(toolArgs, context);

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

    const authInfo =
      (readEnvelope('auth', 'io.modelcontextprotocol/auth') as AnyRecord | undefined) ??
      (ctx?.http?.authInfo as AnyRecord | undefined) ??
      (mcpReq?.http?.authInfo as AnyRecord | undefined) ??
      (ctx?.authInfo as AnyRecord | undefined) ??
      (ctx?.auth as AnyRecord | undefined);

    const rawHeaders: AnyRecord = {};
    const reqHeaders: any =
      ctx?.http?.req?.headers ||
      ctx?.http?.headers ||
      ctx?.headers ||
      mcpReq?.headers ||
      ctx?.req?.headers;

    if (reqHeaders) {
      if (typeof reqHeaders.forEach === 'function') {
        reqHeaders.forEach((val: string, key: string) => {
          rawHeaders[key.toLowerCase()] = val;
          rawHeaders[key] = val;
        });
      } else if (typeof reqHeaders.entries === 'function') {
        for (const [k, v] of reqHeaders.entries()) {
          rawHeaders[k.toLowerCase()] = v;
          rawHeaders[k] = v;
        }
      } else if (typeof reqHeaders === 'object') {
        for (const [k, v] of Object.entries(reqHeaders)) {
          rawHeaders[k.toLowerCase()] = String(v);
          rawHeaders[k] = String(v);
        }
      }
    }

    if (ctx?.http?.req?.headers?.get && typeof ctx.http.req.headers.get === 'function') {
      const authHeader = ctx.http.req.headers.get('authorization') || ctx.http.req.headers.get('Authorization');
      if (authHeader) {
        rawHeaders.authorization = authHeader;
        rawHeaders.Authorization = authHeader;
      }
    }

    const rawAuth =
      rawHeaders.authorization ||
      rawHeaders.Authorization ||
      (authInfo?.token ? `Bearer ${authInfo.token}` : undefined) ||
      (meta?.authorization as string) ||
      (meta?.Authorization as string);

    let rawToken =
      (authInfo?.token as string) ||
      (meta?.token as string) ||
      (meta?._oauth as string) ||
      (meta?.jwtToken as string) ||
      (meta?._meta as any)?.jwtToken ||
      (meta?._meta as any)?.token;

    if (!rawToken && rawAuth && typeof rawAuth === 'string' && rawAuth.startsWith('Bearer ')) {
      rawToken = rawAuth.substring(7).trim();
    }

    const metadata: AnyRecord = {
      ...rawHeaders,
      ...meta,
    };
    if (rawAuth) {
      metadata.authorization = rawAuth;
      metadata.Authorization = rawAuth;
    }
    if (rawToken) {
      metadata.token = rawToken;
      metadata._oauth = rawToken;
      metadata.jwtToken = rawToken;
    }

    return this.registry.createExecutionContext({
      toolName: opts.toolName,
      metadata,
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
    const user = authInfo.user || authInfo.tokenPayload || authInfo;
    return {
      subject: authInfo.subject ?? user.sub ?? authInfo.clientId ?? authInfo.client_id ?? authInfo.extra?.sub,
      clientId: authInfo.clientId ?? authInfo.client_id ?? user.client_id,
      scopes: authInfo.scopes ?? (typeof authInfo.scope === 'string' ? authInfo.scope.split(' ') : authInfo.scope) ?? [],
      claims: authInfo.claims ?? authInfo.extra ?? user,
      tokenPayload: authInfo.tokenPayload ?? user,
      exp: authInfo.exp ?? user.exp,
      iat: authInfo.iat ?? user.iat,
      iss: authInfo.iss ?? user.iss,
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
      const rawHandler = sdk.createMcpHandler(() => this.buildServer(), {
        legacy: this.options.legacyMode,
        onerror: (error: Error) => {
          this.registry.logger.error('Modern MCP handler error', { error: error.message });
        },
      });

      const rawFetch = rawHandler.fetch;
      this.handler = {
        ...rawHandler,
        fetch: async (request: Request, requestOptions?: AnyRecord) => {
          if (request.headers.get('mcp-method') === 'ping') {
            try {
              const clone = request.clone();
              const json = (await clone.json()) as AnyRecord;
              return new Response(JSON.stringify({ jsonrpc: '2.0', id: json?.id ?? null, result: {} }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              });
            } catch {
              return new Response(JSON.stringify({ jsonrpc: '2.0', id: null, result: {} }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              });
            }
          }

          // Pre-dispatch wire interceptor for tasks methods and task-augmented tools/call
          if (this.taskManager) {
            try {
              const clone = request.clone();
              const body = (await clone.json()) as AnyRecord;
              const taskResponse = await this.handleTaskPreDispatch(body, request);
              if (taskResponse) {
                return new Response(JSON.stringify(taskResponse), {
                  status: 200,
                  headers: { 'Content-Type': 'application/json' },
                });
              }
            } catch {
              // Not JSON or cannot intercept; let rawFetch handle
            }
          }

          return rawFetch(request, requestOptions);
        },
      };
    }
    return this.handler;
  }

  private extractAccessContext(req: unknown, parsedBody?: AnyRecord): TaskAccessContext | undefined {
    const reqAny = req as any;
    const auth = reqAny?.auth || reqAny?.user;
    const userId = auth?.sub || auth?.userId || auth?.id;
    const tenantId = auth?.tenantId || auth?.orgId;
    const sessionId = reqAny?.headers?.['mcp-session-id'] || reqAny?.get?.('mcp-session-id');

    if (!userId && !tenantId && !sessionId) {
      return undefined;
    }
    return { userId, tenantId, sessionId };
  }

  private async handleTaskPreDispatch(body: AnyRecord, req: unknown): Promise<AnyRecord | null> {
    if (!this.taskManager || !body || typeof body !== 'object') return null;

    const { method, params, id } = body;
    const accessContext = this.extractAccessContext(req, body);

    // 1. tasks/get
    if (method === 'tasks/get') {
      const taskId = params?.taskId;
      if (!taskId) {
        return { jsonrpc: '2.0', id: id ?? null, error: { code: -32602, message: 'Invalid params: taskId is required' } };
      }
      try {
        const entry = this.taskManager.getEntry(taskId, accessContext);
        const resultPayload: Record<string, unknown> = { ...entry.data };
        if (entry.data.status === 'completed' && entry.result !== undefined) {
          resultPayload.result = entry.result;
        }
        if (entry.data.status === 'failed' && entry.error !== undefined) {
          resultPayload.error = entry.error;
        }
        return { jsonrpc: '2.0', id: id ?? null, result: resultPayload };
      } catch (err: any) {
        return { jsonrpc: '2.0', id: id ?? null, error: { code: err.code || -32602, message: err.message || 'Task not found' } };
      }
    }

    // 2. tasks/cancel
    if (method === 'tasks/cancel') {
      const taskId = params?.taskId;
      if (!taskId) {
        return { jsonrpc: '2.0', id: id ?? null, error: { code: -32602, message: 'Invalid params: taskId is required' } };
      }
      try {
        const taskData = this.taskManager.cancelTask(taskId, accessContext);
        return { jsonrpc: '2.0', id: id ?? null, result: taskData };
      } catch (err: any) {
        return { jsonrpc: '2.0', id: id ?? null, error: { code: err.code || -32602, message: err.message || 'Task not found' } };
      }
    }

    // 3. tasks/update
    if (method === 'tasks/update') {
      const taskId = params?.taskId;
      if (!taskId) {
        return { jsonrpc: '2.0', id: id ?? null, error: { code: -32602, message: 'Invalid params: taskId is required' } };
      }
      try {
        const taskData = this.taskManager.updateStatus(taskId, params.status || 'working', params.statusMessage, accessContext);
        return { jsonrpc: '2.0', id: id ?? null, result: taskData };
      } catch (err: any) {
        return { jsonrpc: '2.0', id: id ?? null, error: { code: err.code || -32602, message: err.message || 'Failed to update task' } };
      }
    }

    // 4. tasks/result (legacy 2025-06-18 only; rejected in modern 2026-07-28)
    if (method === 'tasks/result') {
      return {
        jsonrpc: '2.0',
        id: id ?? null,
        error: {
          code: -32601,
          message: "Method 'tasks/result' is not supported in MCP 2026-07-28; use 'tasks/get' with embedded results.",
        },
      };
    }

    // 5. tasks/list (removed in modern 2026-07-28)
    if (method === 'tasks/list') {
      return {
        jsonrpc: '2.0',
        id: id ?? null,
        error: {
          code: -32601,
          message: "Method 'tasks/list' is not supported in modern stateless MCP 2026-07-28.",
        },
      };
    }

    // 6. tools/call with task augmentation OR mandatory task support check
    if (method === 'tools/call' && params) {
      const toolName = params.name;
      const tool = this.registry.getTools().get(toolName);
      if (!tool) return null; // Let standard flow handle tool not found

      const isTaskAugmented = params.task !== undefined;

      // Enforcement: if taskSupport === 'required' and not task-augmented
      if (!isTaskAugmented && tool.taskSupport === 'required') {
        return {
          jsonrpc: '2.0',
          id: id ?? null,
          error: { code: -32600, message: `Task augmentation required for tools/call requests on tool '${toolName}'` },
        };
      }

      // If task-augmented:
      if (isTaskAugmented) {
        if (tool.taskSupport === 'forbidden') {
          return {
            jsonrpc: '2.0',
            id: id ?? null,
            error: { code: -32601, message: `Tool '${toolName}' does not support task augmentation` },
          };
        }

        const taskData = this.taskManager.createTask(params.task, toolName, accessContext);
        const taskId = taskData.taskId;

        const taskContext = new TaskContext(this.taskManager, taskId);
        const executionContext = this.registry.createExecutionContext({
          toolName,
          extra: {
            task: taskContext,
          },
        });
        (executionContext as any).task = taskContext;

        const tm = this.taskManager;
        // Run tool asynchronously in the background
        Promise.resolve().then(async () => {
          try {
            const argsRecord = (params.arguments || {}) as Record<string, unknown>;
            const { _meta: _, ...toolArgs } = argsRecord;
            const toolResult = await tool.execute(toolArgs, executionContext);
            if (tm.hasTask(taskId)) {
              const current = tm.getTask(taskId);
              if (current.status !== 'cancelled') {
                tm.completeTask(taskId, toolResult, undefined, accessContext);
              }
            }
          } catch (err: any) {
            if (tm.hasTask(taskId)) {
              const current = tm.getTask(taskId);
              if (current.status !== 'cancelled') {
                tm.failTask(taskId, { code: err.code || -32603, message: err.message || String(err) }, undefined, accessContext);
              }
            }
          }
        });

        // Return CreateTaskResult immediately
        return {
          jsonrpc: '2.0',
          id: id ?? null,
          result: {
            task: taskData,
            resultType: 'task',
          },
        };
      }
    }

    return null;
  }

  async createNodeHandler(): Promise<(req: ExpressRequest, res: ExpressResponse) => void> {
    const node = (await import('@modelcontextprotocol/node')) as AnyRecord;
    const handler = await this.getHttpHandler();

    const nodeHandler = node.toNodeHandler(handler);
    return (req: ExpressRequest, res: ExpressResponse) => {
      // Express bodyParser/json middleware may have already consumed the request
      // stream and populated `req.body`. Pass `req.body` so `toWebRequest` uses
      // the parsed body rather than reading an already-drained request stream.
      const parsedBody =
        (req as AnyRecord).body !== undefined &&
        (req as AnyRecord).body !== null &&
        typeof (req as AnyRecord).body === 'object' &&
        Object.keys((req as AnyRecord).body).length > 0
          ? (req as AnyRecord).body
          : undefined;

      // Handle ping directly for studio heartbeat / health monitoring
      if (parsedBody && parsedBody.method === 'ping') {
        res.setHeader('Content-Type', 'application/json');
        res.status(200).json({
          jsonrpc: '2.0',
          id: parsedBody.id ?? null,
          result: {},
        });
        return;
      }

      // Pre-dispatch wire interceptor for tasks methods and task-augmented tools/call
      if (parsedBody && this.taskManager) {
        const taskResponsePromise = this.handleTaskPreDispatch(parsedBody, req);
        if (taskResponsePromise) {
          Promise.resolve(taskResponsePromise).then((resp) => {
            if (resp) {
              res.setHeader('Content-Type', 'application/json');
              res.status(200).json(resp);
            } else {
              nodeHandler(req, res, parsedBody);
            }
          }).catch((err) => {
            res.status(500).json({
              jsonrpc: '2.0',
              id: parsedBody.id ?? null,
              error: { code: -32603, message: err instanceof Error ? err.message : String(err) },
            });
          });
          return;
        }
      }

      Promise.resolve(nodeHandler(req, res, parsedBody)).catch((err: unknown) => {
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
  notifyTaskStatus(taskData: TaskData): void {
    try {
      this.handler?.notify?.custom?.('notifications/tasks/status', taskData);
      this.handler?.bus?.emit?.('task_status', taskData);
    } catch {
      /* ignore delivery error if no subscriber is active */
    }
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
