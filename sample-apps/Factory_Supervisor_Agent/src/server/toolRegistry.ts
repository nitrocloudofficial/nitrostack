import { MCPTool } from '../types/tool.js';
import { ILogger } from '../types/logger.js';
import { ValidationError } from '../utils/errors.js';

export class ToolRegistry {
  private tools: Map<string, MCPTool> = new Map();

  constructor(private logger: ILogger) {}

  /**
   * Registers a tool dynamically into the registry.
   */
  public registerTool(tool: MCPTool): void {
    if (!tool || !tool.name || typeof tool.name !== 'string') {
      throw new ValidationError('Invalid tool definition: Name must be a non-empty string');
    }
    if (!tool.description || typeof tool.description !== 'string') {
      throw new ValidationError(`Invalid tool definition for '${tool.name}': Description is required`);
    }
    if (typeof tool.execute !== 'function') {
      throw new ValidationError(`Invalid tool definition for '${tool.name}': Execution handler must be a function`);
    }

    if (this.tools.has(tool.name)) {
      this.logger.warn(`Overwriting existing tool registration for '${tool.name}'`, { toolName: tool.name });
    }

    this.tools.set(tool.name, tool);
    this.logger.info(`Tool registered successfully: '${tool.name}'`, { toolName: tool.name });
  }

  /**
   * Retrieves a tool by name.
   */
  public getTool(name: string): MCPTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Checks if a tool is registered.
   */
  public hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Lists all currently registered tools.
   */
  public listTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Unregisters a tool by name.
   */
  public unregisterTool(name: string): boolean {
    const removed = this.tools.delete(name);
    if (removed) {
      this.logger.info(`Tool unregistered: '${name}'`, { toolName: name });
    }
    return removed;
  }

  /**
   * Clears all registered tools.
   */
  public clear(): void {
    this.tools.clear();
    this.logger.info('Tool registry cleared');
  }
}
