import { z } from 'zod';
import type { McpTransform } from './transforms/index.js';

// ============================================================================
// JSON Types - For safe handling of arbitrary JSON data
// ============================================================================

/**
 * Primitive JSON values
 */
export type JsonPrimitive = string | number | boolean | null;

/**
 * JSON array type
 */
export type JsonArray = JsonValue[];

/**
 * JSON object type
 */
export type JsonObject = { [key: string]: JsonValue };

/**
 * Any valid JSON value
 * Use this instead of `any` for arbitrary JSON data
 * Note: Includes undefined for practical TypeScript usage with optional fields
 */
export type JsonValue = JsonPrimitive | JsonArray | JsonObject | undefined;

/**
 * Strict JSON value (without undefined) - for serialization
 */
export type StrictJsonValue = JsonPrimitive | JsonArray | JsonObject;

/**
 * JSON value that can also be undefined (alias for JsonValue)
 * @deprecated Use JsonValue directly
 */
export type JsonValueOrUndefined = JsonValue;

/**
 * Log metadata type - structured data that can be logged
 */
export type LogMeta = JsonObject | Error | undefined;

// ============================================================================
// Server Configuration
// ============================================================================

/**
 * Base configuration for MCP server
 */
export interface McpServerConfig {
  name: string;
  version: string;
  description?: string;
  transforms?: McpTransform[];
  /**
   * Payload spillover store created with the server. Interceptors read this
   * store; they do not replace it.
   */
  spillover?: {
    driver?: 'memory' | 'filesystem';
    storageDir?: string;
    maxSizeBytes?: number;
  };
  capabilities?: {
    tools?: boolean;
    resources?: boolean;
    prompts?: boolean;
  };
  logging?: {
    level: 'debug' | 'info' | 'warn' | 'error';
    file?: string;
  };
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  /**
   * MCP protocol era to serve. Additive and optional — env var
   * `NITRO_MCP_PROTOCOL_VERSION` always wins over this value.
   *
   * - unset / `auto` — serve both eras from one process with modern engine & stateless legacy fallback (default)
   * - `2026-07-28` / `modern` — stateless 2026-07-28 wire
   * - `2025-06-18` / `2025-11-25` / `legacy` — sessionful legacy path
   */
  protocolVersion?: string;
  /**
   * Extra MCP extensions to advertise on the 2026-07-28 `server/discover`
   * capabilities map (SEP-2133), keyed by reverse-DNS extension id. NitroStack
   * already derives `io.modelcontextprotocol/app` and
   * `io.modelcontextprotocol/tasks` automatically from what the app registers.
   */
  extensions?: Record<string, Record<string, unknown>>;
}

/**
 * Options passed to `server.start(options)` to explicitly specify or override
 * transport and network settings.
 */
export interface ServerStartOptions {
  /**
   * Transport mode:
   * - 'stdio': Pure standard I/O (dev tools, Claude Desktop, local subagent)
   * - 'http': Streamable HTTP (stateless 2026-07-28 or sessionful legacy)
   * - 'dual': Simultaneous STDIO + HTTP listening
   */
  transport?: 'stdio' | 'http' | 'dual';
  /** HTTP server port (when using http or dual transport) */
  port?: number;
  /** HTTP server host (when using http or dual transport) */
  host?: string;
  /** MCP endpoint base path (default: '/mcp') */
  endpoint?: string;
  /** Enable CORS headers on HTTP endpoints (default: true) */
  enableCors?: boolean;
}

// ============================================================================
// Tool Types
// ============================================================================

/**
 * Tool annotations as per MCP spec
 * Provides hints to clients about tool behavior
 */
export interface ToolAnnotations {
  /** 
   * If true, the tool may perform destructive updates to its environment.
   * If false, the tool performs only additive updates.
   * Default: true (assume destructive)
   */
  destructiveHint?: boolean;
  /**
   * If true, calling the tool repeatedly with the same arguments has no additional effect.
   * Default: false (assume not idempotent)
   */
  idempotentHint?: boolean;
  /**
   * If true, the tool does not modify its environment.
   * Default: false (assume modifies environment)
   */
  readOnlyHint?: boolean;
  /**
   * If true, the tool may interact with an "open world" of external entities.
   * Default: true (assume open world)
   */
  openWorldHint?: boolean;
  /**
   * Human-readable title for display
   * @deprecated Use title field on tool definition instead
   */
  title?: string;
  /**
   * If true, this tool remains directly exposed in tools/list when progressive discovery transforms are active.
   */
  alwaysVisible?: boolean;
}

/**
 * Tool definition with schema validation
 */
export interface ToolDefinition<TInput = unknown, TOutput = unknown> {
  name: string;
  /** Optional human-readable title for display */
  title?: string;
  description: string;
  inputSchema: z.ZodSchema<TInput>;
  /** Optional JSON Schema for validating tool output */
  outputSchema?: z.ZodSchema<TOutput>;
  /** Optional annotations describing tool behavior */
  annotations?: ToolAnnotations;
  handler: (input: TInput, context: ExecutionContext) => Promise<TOutput>;
  metadata?: {
    category?: string;
    tags?: string[];
    rateLimit?: {
      maxCalls: number;
      windowMs: number;
    };
  };
}

// ============================================================================
// Resource Types
// ============================================================================

/**
 * Resource annotations as per MCP spec
 * Provides hints to clients about how to use or display resources
 */
export interface ResourceAnnotations {
  /** Intended audience(s) for this resource */
  audience?: ('user' | 'assistant')[];
  /** Importance from 0.0 (least) to 1.0 (most important/required) */
  priority?: number;
  /** ISO 8601 timestamp of last modification */
  lastModified?: string;
}

/**
 * Resource definition
 */
export interface ResourceDefinition {
  uri: string;
  name: string;
  /** Optional human-readable title for display */
  title?: string;
  description: string;
  mimeType?: string;
  /** Optional size in bytes */
  size?: number;
  /** Optional annotations for client hints */
  annotations?: ResourceAnnotations;
  handler: (uri: string, context: ExecutionContext) => Promise<ResourceContent>;
  metadata?: {
    cacheable?: boolean;
    cacheMaxAge?: number;
  };
  /**
   * SEP-2549 cache hint emitted on the 2026-07-28 `resources/read` /
   * `resources/list` results. Ignored on the legacy path.
   */
  cacheHint?: { ttlMs?: number; cacheScope?: 'public' | 'private' };
}

/**
 * Resource template definition (RFC 6570 URI Templates)
 */
export interface ResourceTemplateDefinition {
  /** URI template (e.g., "file:///{path}") */
  uriTemplate: string;
  name: string;
  /** Optional human-readable title for display */
  title?: string;
  description?: string;
  mimeType?: string;
  /** Optional annotations for client hints */
  annotations?: ResourceAnnotations;
}

/**
 * Resource content types - discriminated union for type-safe content handling
 */
export type ResourceContent =
  | { type: 'text'; data: string }
  | { type: 'binary'; data: Buffer }
  | { type: 'json'; data: JsonValue };

/**
 * Resource link that can be returned in tool results
 * Allows tools to return URIs to resources for additional context
 */
export interface ResourceLink {
  type: 'resource_link';
  uri: string;
  name: string;
  title?: string;
  description?: string;
  mimeType?: string;
  annotations?: ResourceAnnotations;
}

/**
 * Embedded resource that can be returned in tool results
 */
export interface EmbeddedResource {
  type: 'resource';
  resource: {
    uri: string;
    mimeType?: string;
    text?: string;
    blob?: string;
    annotations?: ResourceAnnotations;
  };
}

/**
 * Tool result content types
 */
export type ToolResultContent =
  | { type: 'text'; text: string; annotations?: ResourceAnnotations }
  | { type: 'image'; data: string; mimeType: string; annotations?: ResourceAnnotations }
  | { type: 'audio'; data: string; mimeType: string; annotations?: ResourceAnnotations }
  | ResourceLink
  | EmbeddedResource;

// ============================================================================
// Prompt Types
// ============================================================================

/**
 * Prompt argument value - can be string or other primitive types
 */
export type PromptArgumentValue = string | number | boolean | null;

/**
 * Prompt definition
 */
export interface PromptDefinition {
  name: string;
  /** Optional human-readable title for display */
  title?: string;
  description: string;
  arguments?: PromptArgument[];
  handler: (args: Record<string, PromptArgumentValue>, context: ExecutionContext) => Promise<PromptMessage[]>;
}

/**
 * Prompt argument
 */
export interface PromptArgument {
  name: string;
  description: string;
  required?: boolean;
}

/**
 * Prompt message
 */
export interface PromptMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// ============================================================================
// Auth Context Types
// ============================================================================

/**
 * Authentication context attached to execution context
 */
export interface AuthContext {
  /** Whether the request is authenticated */
  authenticated?: boolean;
  /** User or client identifier */
  subject?: string;
  /** Granted scopes/permissions */
  scopes?: string[];
  /** Client ID for machine-to-machine auth */
  clientId?: string;
  /** Token expiration timestamp */
  exp?: number;
  /** Token issued at timestamp */
  iat?: number;
  /** Issuer URL */
  iss?: string;
  /** Custom claims */
  claims?: Record<string, JsonValue>;
  /** Token introspection info */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tokenInfo?: any;
  /** Full decoded token payload (for backward compatibility) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tokenPayload?: any;
}

// ============================================================================
// Execution Context
// ============================================================================

/**
 * Execution context passed to handlers
 */
export interface ExecutionContext {
  /** Unique request identifier for tracing */
  requestId: string;
  /** Name of the tool being executed (if applicable) */
  toolName?: string;
  /** Logger instance for this request */
  logger: Logger;
  /** Additional metadata from the request */
  metadata?: Record<string, JsonValue>;
  /** Authentication context (if authenticated) */
  auth?: AuthContext;
  /**
   * Isolation key for this request.
   *
   * On a context NitroStackServer builds, this is `anon:<session>` or
   * `user:<subject>:<session>`, not the raw `Mcp-Session-Id` header.
   * Visibility and spillover compare this string. A hand-built context must
   * pass that same key, or be created with `createExecutionContext`.
   */
  sessionId?: string;

  /**
   * Aborted when the calling sandbox script times out or the worker is torn down.
   * The tool runner checks this before entering the handler and between pipeline
   * stages. A handler that has already started must observe the signal itself;
   * the runner cannot roll back a side effect that has already been committed.
   */
  abortSignal?: AbortSignal;

  /**
   * Verified principal for subject-scoped visibility denies.
   * Set only from `extra.auth.subject` on a context the server builds.
   * The unsigned bearer decode that fills `auth` does not populate this.
   */
  verifiedSubject?: string;

  /**
   * Dynamically reveals specified tools for the current session.
   * Updates SessionVisibilityStore and broadcasts notifications/tools/list_changed.
   *
   * Optional so that hand-built contexts (test fixtures, custom transports) stay
   * valid; NitroStackServer populates it on every context it creates.
   *
   * @param names Array of tool names to make visible.
   */
  enableTools?(names: string[]): Promise<void>;

  /**
   * Dynamically hides specified tools for the current session.
   * Updates SessionVisibilityStore and broadcasts notifications/tools/list_changed.
   *
   * @param names Array of tool names to hide.
   */
  disableTools?(names: string[]): Promise<void>;

  /**
   * Returns current visibility state for this session:
   * - If session has specific enabled/disabled rules, returns calculated allowed set.
   * - If unrestricted session, returns undefined.
   */
  getVisibleTools?(): Set<string> | undefined;

  /**
   * Task context — populated when the tool is invoked as a task.
   * Use this to report progress and check for cancellation.
   *
   * @example
   * ```typescript
   * async myHandler(input: MyInput, context: ExecutionContext) {
   *   if (context.task) {
   *     context.task.updateProgress('Starting...');
   *     context.task.throwIfCancelled();
   *   }
   * }
   * ```
   */
  task?: {
    readonly taskId: string;
    readonly isCancelled: boolean;
    updateProgress(message: string): void;
    requestInput(message: string): void;
    throwIfCancelled(): void;
    /**
     * Push an intermediate task update (2026-07-28 `tasks/update`). Available
     * on the modern path; a no-op on the legacy path.
     */
    update?(message: string, data?: JsonValue): void;
  };

  // ==========================================================================
  // MCP 2026-07-28 additions (populated only on the modern protocol path;
  // undefined on the legacy 2025-era path). All optional and additive.
  // ==========================================================================

  /**
   * The negotiated protocol version for this request
   * (e.g. `2026-07-28`). Undefined on the legacy path.
   */
  protocolVersion?: string;
  /**
   * Opaque multi-round-trip state echoed by the client on a retried request
   * (SEP-2322). Read alongside `inputResponses`.
   */
  requestState?: JsonValue;
  /**
   * Client-supplied answers to a prior `inputRequired(...)` (SEP-2322), keyed
   * by the ids the server assigned. Untrusted input — validate before use.
   */
  inputResponses?: Record<string, JsonValue>;
  /**
   * W3C Trace Context lifted from the request `_meta` envelope (SEP-414):
   * `traceparent`, `tracestate`, `baggage`.
   */
  trace?: {
    traceparent?: string;
    tracestate?: string;
    baggage?: string;
  };
  /** Client identity from the per-request `_meta` envelope (SEP-2575). */
  clientInfo?: { name?: string; version?: string;[key: string]: JsonValue | undefined };
  /** Client capabilities from the per-request `_meta` envelope (SEP-2575). */
  clientCapabilities?: Record<string, JsonValue>;
}

// ============================================================================
// Logger Interface
// ============================================================================

/**
 * Logger interface for structured logging
 */
export interface Logger {
  debug(message: string, meta?: LogMeta): void;
  info(message: string, meta?: LogMeta): void;
  warn(message: string, meta?: LogMeta): void;
  error(message: string, meta?: LogMeta): void;
}

// ============================================================================
// Server Statistics
// ============================================================================

/**
 * Server statistics
 */
export interface ServerStats {
  toolCalls: number;
  resourceReads: number;
  promptExecutions: number;
  errors: number;
}

// ============================================================================
// Constructor Types - for dependency injection
// ============================================================================

/**
 * Generic constructor type
 */
export type Constructor<T = unknown> = new (...args: unknown[]) => T;

/**
 * Abstract constructor type (for abstract classes)
 */
export type AbstractConstructor<T = unknown> = abstract new (...args: unknown[]) => T;

/**
 * Class constructor type (backward compatible - allows any arguments)
 * Use this for module definitions, guards, providers, etc.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ClassConstructor<T = object> = new (...args: any[]) => T;

