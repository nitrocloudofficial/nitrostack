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

function sessionRequiredError(): Error & { code: number } {
  const error = new Error('Session required') as Error & { code: number };
  error.name = 'SessionRequiredError';
  error.code = -32600;
  return error;
}

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
  /** Process-local session for the single stdio peer. Not taken from a client header. */
  private stdioSessionId?: string;
  private serverSdkPromise?: Promise<ServerSdk>;
  private readonly taskManager?: TaskManager;
  /**
   * HTTP session ids minted by this process. Client-supplied ids are not members.
   * The first verified subject to use an id owns it.
   */
  private readonly issuedSessions = new Map<
    string,
    { createdAt: number; lastActive: number; subject?: string }
  >();
  /** Method the HTTP gate already classified for this request. The SDK consumes the body before the factory runs. */
  private readonly gatedMethods = new WeakMap<object, string | undefined>();
  private static readonly ISSUED_SESSION_TTL_MS = 30 * 60 * 1000;
  private static readonly MAX_ISSUED_SESSIONS = 1000;

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

  private async buildServer(factoryCtx?: AnyRecord, source: 'http' | 'stdio' = 'http'): Promise<AnyRecord> {
    const sdk = await this.loadServerSdk();
    const config = this.registry.config;

    const extensions = this.advertisedExtensions();
    const serverOptions: AnyRecord = {
      cacheHints: this.buildServerCacheHints(),
    };
    // The SDK installs tools/list only after a tool is registered or when the
    // tools capability is set. A session that has hidden every tool must still
    // answer tools/list with an empty catalog.
    const capabilities: AnyRecord = {};
    if (Object.keys(extensions).length > 0) {
      capabilities.extensions = extensions;
    }
    if (this.registry.getTools().size > 0) {
      capabilities.tools = {};
    }
    if (Object.keys(capabilities).length > 0) {
      serverOptions.capabilities = capabilities;
    }

    const server = new sdk.McpServer({ name: config.name, version: config.version }, serverOptions);

    // The SDK calls this factory once per HTTP request, with the request on
    // `requestInfo`. Catalog shaping (session visibility) and spillover reads
    // both need that session; a context-free list is the stateless catalog.
    // `source` selects the stdio peer id. Hardcoding `http` made stdio list
    // with no session and threw Session required when visibility was on.
    const requestContext = await this.contextFromFactory(factoryCtx, source);
    await this.registerTools(server, sdk, requestContext);
    await this.registerResources(server, sdk, requestContext);
    await this.registerPrompts(server, sdk);

    return server;
  }

  /**
   * Session and auth from the per-request factory context.
   * `createMcpHandler` supplies `requestInfo` (the HTTP request) and optional `authInfo`.
   */
  private async contextFromFactory(
    factoryCtx?: AnyRecord,
    source: 'http' | 'stdio' = 'http'
  ): Promise<ExecutionContext | undefined> {
    const request = factoryCtx?.requestInfo as { headers?: { get?: (name: string) => string | null }; clone?: () => Request } | undefined;
    const headerSession =
      request?.headers?.get?.('mcp-session-id') ||
      request?.headers?.get?.('Mcp-Session-Id') ||
      undefined;
    const headerMethod =
      request?.headers?.get?.('mcp-method') || request?.headers?.get?.('Mcp-Method') || undefined;
    // The legacy fallback builds the server from a cloned request, so the
    // gate's WeakMap entry (on the original) is missing. The clone's body is
    // still readable here; the transport reads it afterwards.
    let method = (request ? this.gatedMethods.get(request) : undefined) ?? headerMethod;
    if (!method && source === 'http' && request?.clone) {
      try {
        const body = (await request.clone().json()) as AnyRecord;
        method = typeof body?.method === 'string' ? body.method : undefined;
      } catch {
        method = undefined;
      }
    }
    // initialize, ping, and server/discover run before a session exists.
    // A client-supplied id on those methods is not an isolation key.
    // Stdio ignores a caller-supplied Mcp-Session-Id. That header is the HTTP
    // isolation key, and accepting it here would let the local peer read it.
    const sessionId =
      source === 'stdio'
        ? this.stdioSessionId
        : this.isSessionFreeMethod(method)
          ? undefined
          : this.httpSessionOrThrow(headerSession);
    if (source !== 'stdio') {
      this.bindIssuedSubject(sessionId, factoryCtx?.authInfo);
    }
    if (!factoryCtx && !sessionId) return undefined;
    return this.executionContextFromRequest({
      sessionId,
      authInfo: factoryCtx?.authInfo,
      protocolVersion: MODERN_PROTOCOL_VERSION,
    });
  }

  private visibilityRequiresSession(): boolean {
    return this.registry.hasSessionVisibility();
  }

  /** Methods that proceed without a server-issued session. */
  private isSessionFreeMethod(method: string | null | undefined): boolean {
    return method === 'initialize' || method === 'ping' || method === 'server/discover';
  }

  /**
   * Remember a session id this process minted.
   * Tests use this to present the same id a successful `initialize` would return.
   * An id the client invented is not accepted by {@link httpSessionOrThrow}.
   */
  issueSession(id: string = crypto.randomUUID()): string {
    this.sweepIssuedSessions();
    if (!this.issuedSessions.has(id) && this.issuedSessions.size >= ModernProtocolAdapter.MAX_ISSUED_SESSIONS) {
      throw new Error(
        `Session cap (${ModernProtocolAdapter.MAX_ISSUED_SESSIONS}) is full`
      );
    }
    const now = Date.now();
    const existing = this.issuedSessions.get(id);
    this.issuedSessions.set(id, {
      createdAt: existing?.createdAt ?? now,
      lastActive: now,
    });
    return id;
  }

  /** True when `id` is unexpired and was minted here. Refreshes its idle timer. */
  private touchIssuedSession(id: string): boolean {
    const entry = this.issuedSessions.get(id);
    if (!entry) return false;
    if (Date.now() - entry.lastActive > ModernProtocolAdapter.ISSUED_SESSION_TTL_MS) {
      this.issuedSessions.delete(id);
      return false;
    }
    entry.lastActive = Date.now();
    return true;
  }

  private sweepIssuedSessions(): void {
    const now = Date.now();
    for (const [id, entry] of this.issuedSessions) {
      if (now - entry.lastActive > ModernProtocolAdapter.ISSUED_SESSION_TTL_MS) {
        this.issuedSessions.delete(id);
      }
    }
  }

  /**
   * When visibility is installed, an HTTP session id must be one `issueSession` recorded.
   * A missing or unknown id throws. Stdio does not call this.
   */
  private httpSessionOrThrow(sessionId: string | undefined): string | undefined {
    if (!this.visibilityRequiresSession()) return sessionId;
    if (!sessionId || !this.touchIssuedSession(sessionId)) {
      throw sessionRequiredError();
    }
    return sessionId;
  }

  /**
   * The first verified subject to present a minted id owns it.
   * A later call with a different subject, or with no subject, is rejected.
   * An id that has only been used anonymously stays anonymous until a subject claims it.
   */
  private bindIssuedSubject(sessionId: string | undefined, authInfo: AnyRecord | undefined): void {
    if (!this.visibilityRequiresSession() || !sessionId) return;
    const entry = this.issuedSessions.get(sessionId);
    if (!entry) return;
    const subject = this.verifiedSubject(authInfo);
    if (entry.subject && entry.subject !== subject) {
      throw sessionRequiredError();
    }
    if (!entry.subject && subject) {
      entry.subject = subject;
    }
  }

  private verifiedSubject(authInfo: AnyRecord | undefined): string | undefined {
    if (!authInfo) return undefined;
    const subject = this.mapAuthInfo(authInfo)?.subject;
    return typeof subject === 'string' && subject.length > 0 ? subject : undefined;
  }

  /**
   * One context for tools/list, tools/call, and resources/read.
   * `authInfo` is the verified SDK principal. Metadata may still carry a raw
   * bearer token; `createExecutionContext` does not use that token as the
   * isolation subject.
   */
  private executionContextFromRequest(input: {
    sessionId?: string;
    authInfo?: AnyRecord;
    metadata?: AnyRecord;
    toolName?: string;
    protocolVersion?: string;
    clientInfo?: ExecutionContext['clientInfo'];
    clientCapabilities?: Record<string, JsonValue>;
    requestState?: JsonValue;
    inputResponses?: Record<string, JsonValue>;
    trace?: ExecutionContext['trace'];
  }): ExecutionContext {
    return this.registry.createExecutionContext({
      toolName: input.toolName,
      metadata: input.metadata,
      extra: {
        sessionId: input.sessionId,
        protocolVersion: input.protocolVersion ?? MODERN_PROTOCOL_VERSION,
        clientInfo: input.clientInfo,
        clientCapabilities: input.clientCapabilities,
        requestState: input.requestState,
        inputResponses: input.inputResponses,
        trace: input.trace,
        auth: input.authInfo ? this.mapAuthInfo(input.authInfo) : undefined,
      },
    });
  }

  /** Server-level per-operation cache hints for list/discover results. */
  private buildServerCacheHints(): AnyRecord | undefined {
    // Conservative shared default for list surfaces; per-resource hints still win.
    return undefined;
  }

  private async registerTools(server: AnyRecord, sdk: ServerSdk, requestContext?: ExecutionContext): Promise<void> {
    const tools = await this.registry.getTransformedTools(requestContext);
    for (const tool of tools.values()) {
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
        async (args: AnyRecord, ctx: AnyRecord) => {
          // Build the context first so resolution is session-aware: authorization
          // transforms (session visibility) need the sessionId to decide.
          const context = this.buildContext(ctx, { toolName: tool.name });
          const resolved = await this.registry.resolveTool(tool.name, context);
          if (!resolved) {
            const Missing = sdk.MethodNotFoundError;
            if (Missing) {
              throw new Missing(`Tool '${tool.name}' not found`);
            }
            const missing = new Error(`Tool '${tool.name}' not found`) as Error & { code?: number };
            missing.code = -32601;
            throw missing;
          }
          return this.runTool(resolved, args, ctx, sdk, context);
        },
      );
    }
  }

  private async registerResources(server: AnyRecord, sdk: ServerSdk, requestContext?: ExecutionContext): Promise<void> {
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
        async (uri: AnyRecord) => this.readResource(String(uri?.href ?? uri), resource, sdk, requestContext),
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
          async (uri: AnyRecord) => this.readResource(String(uri?.href ?? uri), resource, sdk, requestContext),
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
        const fromCall = ctx ? this.buildContext(ctx, {}) : undefined;
        const readContext = fromCall?.sessionId ? fromCall : requestContext;
        // 1. Check exact match in registered resources (including path-based URIs like /widgets/...)
        const matchingResource = rawResources.get(reqUri);
        if (matchingResource) {
          const resResult = await this.readResource(reqUri, matchingResource, sdk, readContext);
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
          const exact = rawResources.get(reqUri);
          if (exact) {
            return this.readResource(reqUri, exact, sdk, readContext);
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
            return this.readResource(reqUri, registered, sdk, readContext);
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

  private async runTool(
    tool: Tool,
    args: AnyRecord,
    ctx: AnyRecord,
    sdk: ServerSdk,
    prebuiltContext?: ExecutionContext
  ): Promise<AnyRecord> {
    const context = prebuiltContext ?? this.buildContext(ctx, { toolName: tool.name });
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

  private async readResource(
    uri: string,
    resource: AnyRecord,
    sdk: ServerSdk,
    requestContext?: ExecutionContext,
  ): Promise<AnyRecord> {
    // requestContext already passed through createExecutionContext once.
    // Feeding its sessionId back in as extra.sessionId runs sessionIsolationKey
    // a second time and the spillover read no longer matches the write.
    const context =
      requestContext ??
      this.registry.createExecutionContext({
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

    // Envelope and `_meta` are the client request. A subject there must not
    // become the isolation principal. Only auth the host or SDK attached.
    const authInfo = this.trustedAuthInfo(ctx);

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

    // Header only. requestState is client-echoed MRTR state and must not select a session.
    let sessionId: string | undefined =
      rawHeaders['mcp-session-id'] ||
      rawHeaders['Mcp-Session-Id'] ||
      (ctx?.request?.headers as any)?.get?.('mcp-session-id') ||
      (ctx?.req?.headers as any)?.get?.('mcp-session-id') ||
      undefined;


    const hasHttpRequest = Boolean(reqHeaders || ctx?.http || ctx?.request || ctx?.req);
    const usingStdioPeer = !hasHttpRequest && Boolean(this.stdioSessionId);
    if (usingStdioPeer) {
      // The stdio peer has one minted id. A header here is not a second session.
      sessionId = this.stdioSessionId;
    } else {
      sessionId = this.httpSessionOrThrow(sessionId);
      this.bindIssuedSubject(sessionId, authInfo);
    }

    return this.executionContextFromRequest({
      toolName: opts.toolName,
      metadata,
      sessionId,
      authInfo,
      protocolVersion,
      clientInfo,
      clientCapabilities,
      requestState,
      inputResponses,
      trace,
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
      const rawHandler = sdk.createMcpHandler((ctx: AnyRecord) => this.buildServer(ctx, 'http'), {
        legacy: this.options.legacyMode,
        onerror: (error: Error) => {
          this.registry.logger.error('Modern MCP handler error', { error: error.message });
        },
      });

      const rawFetch = rawHandler.fetch;
      this.handler = {
        ...rawHandler,
        fetch: async (request: Request, requestOptions?: AnyRecord) => {
          if (this.visibilityRequiresSession()) {
            const blocked = await this.visibilityHttpGate(request);
            if (blocked) return blocked;
          }

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

          const response = await rawFetch(request, requestOptions);
          if (this.visibilityRequiresSession()) {
            return this.attachIssuedSession(request, response);
          }
          return response;
        },
      };
    }
    return this.handler;
  }

  private sessionRequiredResponse(id: unknown): Response {
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id,
        error: { code: -32600, message: 'Session required' },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  /**
   * Session gate for the modern HTTP fetch path.
   * `initialize`, `ping`, and `server/discover` proceed without a session.
   * `tools/list`, `tools/call`, and `resources/read` need an id this process minted.
   * A POST whose method cannot be read fails closed.
   */
  private async visibilityHttpGate(request: Request): Promise<Response | null> {
    const headerMethod = request.headers.get('mcp-method') || request.headers.get('Mcp-Method');
    let bodyMethod: string | undefined;
    let bodyId: unknown = null;
    let bodyReadable = true;
    if (request.method === 'POST') {
      try {
        const body = (await request.clone().json()) as AnyRecord;
        bodyMethod = typeof body?.method === 'string' ? body.method : undefined;
        bodyId = body?.id ?? null;
      } catch {
        bodyReadable = false;
      }
    }

    if (request.method === 'POST' && !bodyReadable && !headerMethod) {
      return this.sessionRequiredResponse(null);
    }

    // The body is the method that will run. A session-free header must not
    // hide tasks/get or tools/call.
    if (headerMethod && bodyMethod && headerMethod !== bodyMethod) {
      return this.sessionRequiredResponse(bodyId);
    }

    const method = bodyMethod ?? headerMethod;
    this.gatedMethods.set(request, typeof method === 'string' ? method : undefined);
    if (this.isSessionFreeMethod(method)) {
      return null;
    }

    const session =
      request.headers.get('mcp-session-id') || request.headers.get('Mcp-Session-Id') || undefined;
    const needsSession =
      method === 'tools/list' ||
      method === 'tools/call' ||
      method === 'resources/read' ||
      method === 'tasks/get' ||
      method === 'tasks/cancel' ||
      method === 'tasks/update' ||
      (!method && request.method === 'POST');

    if ((needsSession && !session) || (session && !this.touchIssuedSession(session))) {
      return this.sessionRequiredResponse(bodyId);
    }
    return null;
  }

  /** Stamp a freshly minted session id onto a successful initialize response. */
  private async attachIssuedSession(request: Request, response: Response): Promise<Response> {
    const headerMethod = request.headers.get('mcp-method') || request.headers.get('Mcp-Method');
    const method = this.gatedMethods.get(request) ?? headerMethod;
    if (method !== 'initialize' || !response.ok) return response;

    const contentType = response.headers.get('content-type');
    const text = await this.readResponseText(response, contentType);
    const parsed = this.extractRpcMessage(text, contentType);
    const headers = new Headers(response.headers);
    if (parsed && parsed.error == null && parsed.result) {
      headers.set('mcp-session-id', this.issueSession());
    }
    return new Response(text, { status: response.status, statusText: response.statusText, headers });
  }

  /**
   * Read a finite JSON body, or the first SSE frame.
   * A legacy initialize answer is a stream that stays open after the handshake.
   */
  private async readResponseText(response: Response, contentType: string | null): Promise<string> {
    if (!contentType?.includes('text/event-stream') || !response.body) {
      return response.text();
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const deadline = Date.now() + 5000;
    try {
      while (Date.now() < deadline) {
        const { value, done } = await reader.read();
        if (value) buffer += decoder.decode(value, { stream: true });
        if (this.extractRpcMessage(buffer, contentType)) break;
        if (done) break;
      }
    } finally {
      await reader.cancel().catch(() => undefined);
    }
    return buffer;
  }

  /** First JSON-RPC message from a JSON body or an SSE `data:` frame. */
  private extractRpcMessage(text: string, contentType: string | null): AnyRecord | undefined {
    if (contentType?.includes('text/event-stream')) {
      for (const line of text.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        try {
          const parsed = JSON.parse(trimmed.slice(5).trim()) as AnyRecord;
          if (parsed && (parsed.result !== undefined || parsed.error !== undefined)) return parsed;
        } catch {
          /* keep scanning */
        }
      }
      return undefined;
    }
    try {
      return JSON.parse(text) as AnyRecord;
    } catch {
      return undefined;
    }
  }

  /** Raw mcp-session-id from a Web Request or an Express request. Not an isolation key. */
  private requestSessionId(req: unknown): string | undefined {
    const reqAny = req as AnyRecord;
    const headers = reqAny?.headers as AnyRecord | undefined;
    const fromObject = headers?.['mcp-session-id'] || headers?.['Mcp-Session-Id'];
    const fromGetter =
      typeof headers?.get === 'function'
        ? headers.get('mcp-session-id') || headers.get('Mcp-Session-Id')
        : undefined;
    const fromExpress =
      typeof reqAny?.get === 'function'
        ? reqAny.get('mcp-session-id') || reqAny.get('Mcp-Session-Id')
        : undefined;
    const value = fromObject || fromGetter || fromExpress;
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }

  /**
   * Principal attached by the host or the SDK.
   * `auth` on the request body and `_meta` are not verified and are ignored.
   */
  private trustedAuthInfo(source: AnyRecord | undefined): AnyRecord | undefined {
    if (!source || typeof source !== 'object') return undefined;
    const mcpReq = (source.mcpReq ?? {}) as AnyRecord;
    const candidates = [source.http?.authInfo, mcpReq.http?.authInfo, source.authInfo];
    for (const candidate of candidates) {
      if (candidate && typeof candidate === 'object') return candidate as AnyRecord;
    }
    return undefined;
  }

  /** SDK authInfo when the host attached it. A bearer header is not verified here. */
  private requestAuthInfo(req: unknown): AnyRecord | undefined {
    return this.trustedAuthInfo(req as AnyRecord);
  }

  private extractAccessContext(req: unknown, _parsedBody?: AnyRecord): TaskAccessContext | undefined {
    const reqAny = req as AnyRecord;
    const auth = (reqAny?.authInfo || reqAny?.auth || reqAny?.user) as AnyRecord | undefined;
    const userId = auth?.sub || auth?.userId || auth?.id;
    const tenantId = auth?.tenantId || auth?.orgId;
    const sessionId = this.requestSessionId(req);

    if (!userId && !tenantId && !sessionId) {
      return undefined;
    }
    return { userId, tenantId, sessionId };
  }

  /**
   * tasks/get, tasks/cancel, and tasks/update carry tool results. When visibility
   * is on they need the same minted session as tools/call. params.sessionId is
   * not a credential.
   */
  private taskAccessForRequest(
    req: unknown,
    id: unknown,
    accessContext: TaskAccessContext | undefined,
  ): { access?: TaskAccessContext; error?: AnyRecord } {
    if (!this.visibilityRequiresSession()) {
      return { access: accessContext };
    }
    try {
      const issued = this.httpSessionOrThrow(this.requestSessionId(req));
      this.bindIssuedSubject(issued, this.requestAuthInfo(req));
      return { access: { ...(accessContext ?? {}), sessionId: issued } };
    } catch (err: unknown) {
      return {
        error: {
          jsonrpc: '2.0',
          id: id ?? null,
          error: {
            code: -32600,
            message: err instanceof Error ? err.message : 'Session required',
          },
        },
      };
    }
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
      const gated = this.taskAccessForRequest(req, id, accessContext);
      if (gated.error) return gated.error;
      try {
        const entry = this.taskManager.getEntry(taskId, gated.access);
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
      const gated = this.taskAccessForRequest(req, id, accessContext);
      if (gated.error) return gated.error;
      try {
        const taskData = this.taskManager.cancelTask(taskId, gated.access);
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
      const gated = this.taskAccessForRequest(req, id, accessContext);
      if (gated.error) return gated.error;
      try {
        const taskData = this.taskManager.updateStatus(taskId, params.status || 'working', params.statusMessage, gated.access);
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

    // 6. tools/call with task augmentation OR mandatory task support check.
    // Resolution goes through the transform chain so session visibility still applies.
    // The raw catalog lookup used to execute hidden and disabled tools.
    if (method === 'tools/call' && params && typeof params.name === 'string') {
      const toolName = params.name;
      let issuedSession: string | undefined;
      const taskAuth = this.requestAuthInfo(req);
      try {
        issuedSession = this.httpSessionOrThrow(this.requestSessionId(req));
        this.bindIssuedSubject(issuedSession, taskAuth);
      } catch (err: unknown) {
        return {
          jsonrpc: '2.0',
          id: id ?? null,
          error: {
            code: -32600,
            message: err instanceof Error ? err.message : 'Session required',
          },
        };
      }
      const executionContext = this.executionContextFromRequest({
        toolName,
        sessionId: issuedSession,
        authInfo: taskAuth,
      });

      let tool: Tool | undefined;
      try {
        tool = await this.registry.resolveTool(toolName, executionContext);
      } catch (err: unknown) {
        const coded = err as { code?: number };
        return {
          jsonrpc: '2.0',
          id: id ?? null,
          error: {
            code: typeof coded.code === 'number' ? coded.code : -32603,
            message: err instanceof Error ? err.message : String(err),
          },
        };
      }
      if (!tool) {
        return {
          jsonrpc: '2.0',
          id: id ?? null,
          error: { code: -32601, message: `Tool '${toolName}' not found` },
        };
      }

      const isTaskAugmented = params.task !== undefined;

      if (!isTaskAugmented && tool.taskSupport === 'required') {
        return {
          jsonrpc: '2.0',
          id: id ?? null,
          error: { code: -32600, message: `Task augmentation required for tools/call requests on tool '${toolName}'` },
        };
      }

      // Synchronous tools/call stays on the registered handler, which resolves again.
      if (!isTaskAugmented) return null;

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
      (executionContext as ExecutionContext & { task?: TaskContext }).task = taskContext;

      const tm = this.taskManager;
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
        } catch (err: unknown) {
          if (tm.hasTask(taskId)) {
            const current = tm.getTask(taskId);
            if (current.status !== 'cancelled') {
              const coded = err as { code?: number; message?: string };
              tm.failTask(
                taskId,
                {
                  code: typeof coded.code === 'number' ? coded.code : -32603,
                  message: err instanceof Error ? err.message : String(err),
                },
                undefined,
                accessContext,
              );
            }
          }
        }
      });

      return {
        jsonrpc: '2.0',
        id: id ?? null,
        result: {
          task: taskData,
          resultType: 'task',
        },
      };
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
   * (`MCP-Protocol-Version`, `Mcp-Method`, `Mcp-Name`, `Mcp-Param-*`, and
   * `Mcp-Session-Id`). Session visibility and spillover both read that header.
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
        'Mcp-Session-Id',
        'Last-Event-ID',
      ].join(', '),
    );
    res.setHeader('Access-Control-Expose-Headers', ['MCP-Protocol-Version', 'Mcp-Method', 'Mcp-Name'].join(', '));
  }

  async serveStdio(): Promise<void> {
    this.stdioSessionId ??= crypto.randomUUID();
    const stdio = (await import('@modelcontextprotocol/server/stdio')) as AnyRecord;
    this.stdioHandle = stdio.serveStdio((ctx: AnyRecord) => this.buildServer(ctx, 'stdio'));
    this.registry.logger.info(`Modern MCP (${MODERN_PROTOCOL_VERSION}) serving over stdio`);
  }

  // ==========================================================================
  // Notifications (subscriptions/listen bus)
  // ==========================================================================

  notifyToolsListChanged(sessionId?: string): void {
    this.handler?.notify?.toolsChanged?.(sessionId);
    this.handler?.bus?.emit?.('tools_changed', sessionId ? { sessionId } : {});
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
