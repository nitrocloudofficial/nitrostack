/**
 * Base Abstract Class for MCP Resources
 */
export abstract class BaseResource<TData = unknown> {
  public abstract readonly uri: string;
  public abstract readonly name: string;
  public abstract readonly description: string;
  public abstract readonly mimeType: string;

  /**
   * Read resource contents
   */
  public abstract read(): Promise<TData>;
}
