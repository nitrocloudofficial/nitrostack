import { CatalogTransform } from '../catalog.transform.js';
import { NextToolHandler, TransformRegistry } from '../transform.interface.js';
import { Tool } from '../../tool.js';
import { ExecutionContext } from '../../types.js';
import { BM25Engine } from '../search/bm25.engine.js';
import { SandboxToolResolver, WorkerPool } from './worker-pool.js';
import { buildCodeModeTools } from './synthetic-tools.js';
import { CodeModeTransformOptions, ExecutionLimits, SandboxExecutionResult } from './types.js';


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
  private registry: TransformRegistry | null = null;
  private syntheticTools: Map<string, Tool> = new Map();

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

  onRegister(registry: TransformRegistry): void {
    this.registry = registry;
  }

  /**
   * Resolves a tool for sandbox dispatch and for the search/get_schema meta-tools.
   *
   * Goes through the server's resolution chain so downstream authorization transforms
   * still apply. When no server is attached (standalone use), there is no chain to
   * consult and the locally indexed catalog is the complete picture.
   */
  private readonly resolveForSandbox: SandboxToolResolver = async (name, context) => {
    if (this.registry) {
      return this.registry.resolveTool(name, context);
    }
    return this.rawTools.get(name);
  };

  /**
   * Returns the subset of `names` the caller is allowed to see, preserving order.
   * Tools denied by an authorization transform are dropped rather than surfaced.
   */
  private async filterAuthorized(names: string[], context?: ExecutionContext): Promise<Tool[]> {
    const authorized: Tool[] = [];
    for (const name of names) {
      try {
        const tool = await this.resolveForSandbox(name, context);
        if (tool) authorized.push(tool);
      } catch {
        // Denied for this session; omit from results.
      }
    }
    return authorized;
  }

  /**
   * Transforms raw catalog tools into Code Mode meta-tools plus any alwaysVisible tools.
   */
  protected async applyTransform(tools: Tool[], _context?: ExecutionContext): Promise<Tool[]> {
    // Index the server's full catalog rather than this session's filtered view, so the
    // index does not depend on whichever session most recently listed tools. Access
    // control happens at query time via filterAuthorized, not by omitting from the index.
    const indexable = this.registry ? [...this.registry.getTools().values()] : tools;

    // Preserve tools designated as alwaysVisible or visible
    const alwaysVisibleSet = new Set(this.options.alwaysVisible);
    const visibleTools = tools.filter(
      (t) =>
        alwaysVisibleSet.has(t.name) ||
        t.visibility === 'visible' ||
        t.annotations?.alwaysVisible === true
    );

    // Cache key spans both the indexed catalog and this session's passthrough set,
    // so a list computed for one session is never replayed to another.
    const currentHash = [
      ...indexable.map((t) => `${t.name}:${t.description || ''}`).sort(),
      '|visible|',
      ...visibleTools.map((t) => t.name).sort(),
    ].join('\u0000');

    if (this.cachedTransformedList && this.lastCatalogHash === currentHash) {
      return this.cachedTransformedList;
    }

    this.rawTools.clear();
    for (const t of indexable) {
      this.rawTools.set(t.name, t);
    }

    // Index tools into BM25 search engine
    this.bm25Engine.indexTools(indexable, currentHash);

    // Initialize worker pool if not yet instantiated
    if (!this.workerPool) {
      this.workerPool = new WorkerPool(this.options.workerPoolSize, this.resolveForSandbox);
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
      },
      (names, ctx) => this.filterAuthorized(names, ctx)
    );

    this.syntheticTools = new Map(
      [searchTool, getSchemaTool, executeTool].map((t) => [t.name, t])
    );

    this.lastCatalogHash = currentHash;
    this.cachedTransformedList = [searchTool, getSchemaTool, executeTool, ...visibleTools];
    return this.cachedTransformedList;
  }

  /**
   * Resolves this transform's own meta-tools (search, get_schema, execute).
   *
   * There is deliberately no fallback to `rawTools`: re-resolving a tool the chain
   * declined would let a caller reach tools a downstream authorization transform
   * filtered out. Sandbox dispatch uses {@link resolveForSandbox}, which walks this
   * same chain.
   */
  async resolveTool(
    name: string,
    next: NextToolHandler,
    context?: ExecutionContext
  ): Promise<Tool | undefined> {
    // Downstream transforms get first refusal, so their guards always run.
    const resolved = await next(name, context);
    if (resolved) return resolved;

    return this.syntheticTools.get(name);
  }

  /**
   * Directly executes a JavaScript code snippet inside the worker pool sandbox.
   * Throws an error if execution fails.
   */
  async execute(code: string, context?: ExecutionContext): Promise<SandboxExecutionResult> {
    if (!this.workerPool) {
      this.workerPool = new WorkerPool(this.options.workerPoolSize, this.resolveForSandbox);
    }

    const limits: ExecutionLimits = {
      timeoutMs: this.options.timeoutMs,
      memoryLimitMb: this.options.memoryLimitMb,
      maxToolCalls: this.options.maxToolCalls,
      allowDestructive: this.options.allowDestructive,
    };

    const result = await this.workerPool.executeScript(code, limits, context);
    if (!result.success) {
      throw new Error(result.error || 'Script execution failed');
    }
    return result;
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

