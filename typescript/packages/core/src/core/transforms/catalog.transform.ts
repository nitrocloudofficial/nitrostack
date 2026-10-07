import { AsyncLocalStorage } from 'node:async_hooks';
import { Tool } from '../tool.js';
import { ExecutionContext } from '../types.js';
import { McpTransform, NextToolHandler } from './transform.interface.js';

export abstract class CatalogTransform implements McpTransform {
  abstract readonly name: string;
  private static readonly bypassStorage = new AsyncLocalStorage<boolean>();

  /**
   * Catalog reshape (search, code mode) skips itself inside `withBypass` so a
   * tool can list tools without rebuilding the catalog. Authorization
   * transforms override this and still filter.
   */
  protected honorsBypass(): boolean {
    return true;
  }

  /**
   * Intercepts transformTools. Bypass skips transforms that opt in via
   * `honorsBypass`. Visibility keeps filtering so a re-entrant list cannot
   * see hidden tools.
   */
  async transformTools(tools: Tool[], context?: ExecutionContext): Promise<Tool[]> {
    if (CatalogTransform.isBypassed() && this.honorsBypass()) {
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

/** Runs async work one-at-a-time for a single transform instance. */
export class RebuildQueue {
  private tail: Promise<unknown> = Promise.resolve();

  enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.tail.then(fn);
    this.tail = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  drain(): Promise<void> {
    return this.tail.then(
      () => undefined,
      () => undefined
    );
  }
}
