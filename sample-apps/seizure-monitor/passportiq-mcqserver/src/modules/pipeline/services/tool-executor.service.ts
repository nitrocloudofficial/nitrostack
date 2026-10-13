/**
 * ToolExecutorService — call a registered tool by name, from inside the server.
 *
 * The orchestrator has to invoke the other ten tools, but @nitrostack/core
 * exposes no public "look up a tool by name" API: the registry is a private
 * `tools` Map on NitroStackServer. It is a plain enumerable property at runtime,
 * so this service reaches it once, at boot, behind a narrow interface.
 *
 * Wired in src/index.ts after McpApplicationFactory.create() returns, because the
 * server object does not exist until then — a tool method has no other way to
 * reach it.
 */
import { Injectable, defaultLogger } from '@nitrostack/core';
import type { ExecutionContext } from '@nitrostack/core';

interface RegisteredTool {
  execute(input: unknown, context: ExecutionContext): Promise<unknown>;
}

interface ServerInternals {
  tools: Map<string, RegisteredTool>;
}

@Injectable()
export class ToolExecutorService {
  private server?: ServerInternals;

  /** Called once from bootstrap. */
  setServer(server: unknown): void {
    this.server = server as ServerInternals;
  }

  isReady(): boolean {
    return this.server?.tools instanceof Map;
  }

  /** Names of every tool registered on the server. */
  listToolNames(): string[] {
    if (!this.server?.tools) return [];
    return [...this.server.tools.keys()].sort();
  }

  has(toolName: string): boolean {
    return this.server?.tools?.has(toolName) ?? false;
  }

  /**
   * Execute a registered tool.
   *
   * The synthetic context carries `requestId`, `logger`, `metadata`, plus `input`
   * and `emit` — the same shape installExecutionContextBridge() produces for a
   * real MCP call, so guards and ctx.emit behave identically whether a tool is
   * called by a client or by the orchestrator.
   *
   * @param parentCtx reuse the caller's logger/auth so orchestrated calls stay
   *        traceable to the originating request.
   */
  async call(toolName: string, input: unknown, parentCtx?: ExecutionContext): Promise<unknown> {
    if (!this.server?.tools) {
      throw new Error(
        'ToolExecutorService has no server reference. setServer() must be called during ' +
          'bootstrap, after McpApplicationFactory.create() and before app.start().'
      );
    }

    const tool = this.server.tools.get(toolName);
    if (!tool) {
      throw new Error(
        `Tool '${toolName}' is not registered. Available: ${this.listToolNames().join(', ')}`
      );
    }

    const context = {
      requestId: `orchestrated-${toolName}-${Date.now()}`,
      toolName,
      logger: parentCtx?.logger ?? defaultLogger,
      metadata: { orchestratedBy: parentCtx?.toolName ?? 'run_verification_pipeline' },
      ...(parentCtx?.auth ? { auth: parentCtx.auth } : {}),
    } as ExecutionContext;

    // tool.execute is wrapped by the bridge, which attaches input + emit itself.
    return tool.execute(input, context);
  }
}
