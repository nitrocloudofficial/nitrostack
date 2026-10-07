import { Tool } from '../tool.js';
import { ExecutionContext } from '../types.js';

export type NextToolHandler = (
  name: string,
  context?: ExecutionContext
) => Promise<Tool | undefined>;

/**
 * The slice of NitroStackServer a transform is allowed to reach back into.
 * `resolveTool` walks the full transform chain, so transforms that dispatch
 * tools themselves (e.g. Code Mode) route through it rather than holding a
 * private catalog, which would bypass downstream authorization transforms.
 */
export interface TransformRegistry {
  resolveTool(name: string, context?: ExecutionContext): Promise<Tool | undefined>;
  getTools(): Map<string, Tool>;
}

export interface McpTransform {
  readonly name: string;

  /**
   * Called once when the transform is attached to a server.
   */
  onRegister?(registry: TransformRegistry): void;

  /**
   * Releases resources held by the transform (worker threads, timers).
   * Invoked by NitroStackServer.stop().
   */
  dispose?(): Promise<void> | void;

  /**
   * Reshapes, filters, or augments the catalog during tools/list.
   */
  transformTools?(
    tools: Tool[],
    context?: ExecutionContext
  ): Promise<Tool[]> | Tool[];

  /**
   * Resolves synthetic or re-routed tools during tools/call.
   */
  resolveTool?(
    name: string,
    next: NextToolHandler,
    context?: ExecutionContext
  ): Promise<Tool | undefined>;
}
