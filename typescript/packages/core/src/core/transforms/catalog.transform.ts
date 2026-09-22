import { AsyncLocalStorage } from 'node:async_hooks';
import { Tool } from '../tool.js';
import { ExecutionContext } from '../types.js';
import { McpTransform, NextToolHandler } from './transform.interface.js';

export abstract class CatalogTransform implements McpTransform {
  abstract readonly name: string;
  private static readonly bypassStorage = new AsyncLocalStorage<boolean>();

  /**
   * Intercepts transformTools; if bypass is active in the async scope,
   * returns original tools directly without recursion.
   */
  async transformTools(tools: Tool[], context?: ExecutionContext): Promise<Tool[]> {
    if (CatalogTransform.isBypassed()) {
      return tools;
    }
    return this.applyTransform(tools, context);
  }

  /**
   * Returns true if the current execution context is inside a bypass scope.
   */
  static isBypassed(): boolean {
    return CatalogTransform.bypassStorage.getStore() === true;
  }

  /**
   * Executes an asynchronous or synchronous action with transform bypass enabled.
   * Handles nested bypass calls idempotently.
   */
  static async withBypass<T>(fn: () => Promise<T> | T): Promise<T> {
    return CatalogTransform.bypassStorage.run(true, async () => fn());
  }

  /**
   * Concrete subclass implementation of the transformation logic.
   */
  protected abstract applyTransform(
    tools: Tool[],
    context?: ExecutionContext
  ): Promise<Tool[]>;

  async resolveTool(
    name: string,
    next: NextToolHandler,
    context?: ExecutionContext
  ): Promise<Tool | undefined> {
    return next(name, context);
  }
}
