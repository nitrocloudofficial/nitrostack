/**
 * Base Abstract Class for MCP Tools
 */
export abstract class BaseTool<TParams = unknown, TResult = unknown> {
  public abstract readonly name: string;
  public abstract readonly description: string;

  /**
   * Execute MCP tool with parameters
   */
  public abstract execute(params: TParams): Promise<TResult>;
}
