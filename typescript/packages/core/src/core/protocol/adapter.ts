/**
 * Protocol adapter contract.
 *
 * NitroStack owns the registry (tools / resources / prompts / tasks / config).
 * A protocol adapter binds that registry to a concrete MCP wire implementation:
 *
 * - the **legacy** adapter is today's `@modelcontextprotocol/sdk` v1 path,
 *   embodied by `NitroStackServer` itself and its `StreamableHttpTransport`.
 * - the **modern** adapter is the official `@modelcontextprotocol/server` v2
 *   engine (`createMcpHandler` + `serveStdio`), loaded lazily only when the
 *   selector resolves to `2026-07-28` or `auto`.
 *
 * The adapter never imports NitroStack decorators or DI; it consumes the
 * read-only `ProtocolRegistry` surface below. This keeps the user-facing
 * framework layer (decorators, modules, guards, pipes) unchanged regardless of
 * which era is served.
 *
 * @module
 */

import type { Express } from 'express';
import type { Tool } from '../tool.js';
import type { Resource, ResourceTemplate } from '../resource.js';
import type { Prompt } from '../prompt.js';
import type { TaskManager } from '../task.js';
import type { ExecutionContext, Logger, McpServerConfig, JsonValue } from '../types.js';

/**
 * Read-only view of a NitroStack application's registry that a protocol adapter
 * needs in order to serve requests. Implemented by `NitroStackServer`.
 */
export interface ProtocolRegistry {
  /** Server identity/config (name, version, description). */
  readonly config: McpServerConfig;
  /** Shared logger. */
  readonly logger: Logger;
  /** Registered tools keyed by name. */
  getTools(): Map<string, Tool>;
  /** Registered static resources keyed by URI. */
  getResources(): Map<string, Resource>;
  /** Registered resource templates keyed by URI template. */
  getResourceTemplates(): Map<string, ResourceTemplate>;
  /** Resource instances backing a template, keyed by URI template. */
  getTemplateResources(): Map<string, Resource>;
  /** Registered prompts keyed by name. */
  getPrompts(): Map<string, Prompt>;
  /** In-process task manager. */
  getTaskManager(): TaskManager;
  /**
   * Build an execution context for a request. `extra` is merged into the
   * context so adapters can attach era-specific fields (protocolVersion,
   * requestState, inputResponses, trace, clientInfo, clientCapabilities).
   */
  createExecutionContext(options?: {
    metadata?: Record<string, JsonValue>;
    toolName?: string;
    extra?: Partial<ExecutionContext>;
  }): ExecutionContext;
}

/**
 * Options passed to a protocol adapter when it starts a transport.
 */
export interface ProtocolTransportOptions {
  port?: number;
  host?: string;
  endpoint?: string;
  enableCors?: boolean;
}

/**
 * A protocol adapter binds the registry to a concrete transport implementation.
 * The legacy path is served directly by `NitroStackServer`; the modern path is
 * served by `ModernProtocolAdapter`.
 */
export interface ProtocolAdapter {
  /** The era this adapter serves. */
  readonly era: 'modern';

  /**
   * Serve the modern protocol over HTTP by mounting a handler on the provided
   * Express app at `endpoint`. Returns when routes are attached (the caller
   * owns `app.listen`).
   */
  attachHttp(app: Express, options: ProtocolTransportOptions): Promise<void>;

  /**
   * Serve the modern protocol over stdio. Resolves once the connection-pinned
   * stdio server is listening.
   */
  serveStdio(): Promise<void>;

  /** Publish a tools/list changed event on the modern notify bus. */
  notifyToolsListChanged(): void;
  /** Publish a resources/list changed event on the modern notify bus. */
  notifyResourcesListChanged(): void;
  /** Publish a prompts/list changed event on the modern notify bus. */
  notifyPromptsListChanged(): void;
  /** Publish a resources/updated event for a specific URI on the modern notify bus. */
  notifyResourceUpdated(uri: string): void;

  /** Tear down any modern transport resources. */
  close(): Promise<void>;
}
