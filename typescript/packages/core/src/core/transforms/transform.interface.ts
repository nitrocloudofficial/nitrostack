import { Tool } from '../tool.js';
import { ExecutionContext } from '../types.js';

export type NextToolHandler = (
  name: string,
  context?: ExecutionContext
) => Promise<Tool | undefined>;

export interface McpTransform {
  readonly name: string;

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
