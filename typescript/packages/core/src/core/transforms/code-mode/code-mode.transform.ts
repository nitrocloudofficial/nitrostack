import { CatalogTransform } from '../catalog.transform.js';
import { NextToolHandler } from '../transform.interface.js';
import { Tool } from '../../tool.js';
import { ExecutionContext } from '../../types.js';
import { BM25Engine } from '../search/bm25.engine.js';
import { WorkerPool } from './worker-pool.js';
import { buildCodeModeTools } from './synthetic-tools.js';
import { CodeModeTransformOptions, ExecutionLimits } from './types.js';

/**
 * CodeModeTransform transforms the MCP server tool catalog by substituting raw tools
 * with 3 synthetic meta-tools (search, get_schema, execute).
 *
 * This reduces context token usage by up to 98% and enables client LLMs to write and execute
 * multi-step orchestration scripts locally inside an isolated WebAssembly sandbox.
 */
export class CodeModeTransform extends CatalogTransform {
  readonly name = 'code-mode';
  private readonly options: Required<CodeModeTransformOptions>;
  private readonly rawTools: Map<string, Tool> = new Map();
  private readonly bm25Engine: BM25Engine<Tool> = new BM25Engine();
  private workerPool: WorkerPool | null = null;
  private cachedTransformedList: Tool[] | null = null;
  private lastCatalogHash: string = '';

  constructor(options: CodeModeTransformOptions = {}) {
    super();
    this.options = {
      workerPoolSize: options.workerPoolSize ?? 4,
      memoryLimitMb: options.memoryLimitMb ?? 100,
      timeoutMs: options.timeoutMs ?? 30000,
      maxToolCalls: options.maxToolCalls ?? 50,
      allowDestructive: options.allowDestructive ?? false,
      alwaysVisible: options.alwaysVisible ?? [],
      searchToolName: options.searchToolName ?? 'search',
      getSchemaToolName: options.getSchemaToolName ?? 'get_schema',
      executeToolName: options.executeToolName ?? 'execute',
    };
  }

  /**
   * Transforms raw catalog tools into Code Mode meta-tools plus any alwaysVisible tools.
   */
  protected async applyTransform(tools: Tool[], _context?: ExecutionContext): Promise<Tool[]> {
    const currentHash = tools
      .map((t) => `${t.name}:${t.description || ''}`)
      .sort()
      .join('|');

    if (this.cachedTransformedList && this.lastCatalogHash === currentHash) {
      return this.cachedTransformedList;
    }

    this.rawTools.clear();
    for (const t of tools) {
      this.rawTools.set(t.name, t);
    }

    // Index tools into BM25 search engine
    this.bm25Engine.indexTools(tools, currentHash);

    // Initialize worker pool if not yet instantiated
    if (!this.workerPool) {
      this.workerPool = new WorkerPool(
        this.options.workerPoolSize,
        (name) => this.rawTools.get(name)
      );
    }

    const limits: ExecutionLimits = {
      timeoutMs: this.options.timeoutMs,
      memoryLimitMb: this.options.memoryLimitMb,
      maxToolCalls: this.options.maxToolCalls,
      allowDestructive: this.options.allowDestructive,
    };

    const { searchTool, getSchemaTool, executeTool } = buildCodeModeTools(
      this.bm25Engine,
      this.rawTools,
      this.workerPool,
      limits,
      {
        searchToolName: this.options.searchToolName,
        getSchemaToolName: this.options.getSchemaToolName,
        executeToolName: this.options.executeToolName,
      }
    );

    // Preserve tools designated as alwaysVisible or visible
    const alwaysVisibleSet = new Set(this.options.alwaysVisible);
    const visibleTools = tools.filter(
      (t) =>
        alwaysVisibleSet.has(t.name) ||
        t.visibility === 'visible' ||
        (t.annotations as any)?.alwaysVisible === true
    );

    this.lastCatalogHash = currentHash;
    this.cachedTransformedList = [searchTool, getSchemaTool, executeTool, ...visibleTools];
    return this.cachedTransformedList;
  }

  /**
   * Resolves synthetic meta-tools and allows direct fallback to raw tools
   * for internal dispatchers or direct callers.
   */
  async resolveTool(
    name: string,
    next: NextToolHandler,
    context?: ExecutionContext
  ): Promise<Tool | undefined> {
    const resolved = await next(name, context);
    if (resolved) return resolved;
    return this.rawTools.get(name);
  }

  /**
   * Disposes the underlying worker pool.
   */
  async dispose(): Promise<void> {
    if (this.workerPool) {
      await this.workerPool.dispose();
      this.workerPool = null;
    }
  }

  /**
   * Diagnostic access to the worker pool.
   */
  getWorkerPool(): WorkerPool | null {
    return this.workerPool;
  }

  /**
   * Diagnostic access to indexed raw tools.
   */
  getRawTools(): Map<string, Tool> {
    return new Map(this.rawTools);
  }
}
