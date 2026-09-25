import { createHash } from 'node:crypto';
import { CatalogTransform, RebuildQueue } from '../catalog.transform.js';
import { NextToolHandler, TransformRegistry } from '../transform.interface.js';
import { Tool } from '../../tool.js';
import { ExecutionContext } from '../../types.js';
import { SearchDetailLevel, SearchTransformOptions } from './types.js';
import { buildCallTool, buildSearchTool } from './synthetic-tools.js';
import { toolCacheFields } from '../tool-cache-key.js';

export abstract class BaseSearchTransform extends CatalogTransform {
  protected readonly options: Required<SearchTransformOptions>;
  protected rawTools: Map<string, Tool> = new Map();
  private cachedTransformedList: Tool[] | null = null;
  private lastCatalogHash: string = '';
  private registry: TransformRegistry | null = null;
  private readonly rebuilds = new RebuildQueue();

  constructor(options: SearchTransformOptions = {}) {
    super();
    this.options = {
      searchToolName: options.searchToolName ?? 'search_tools',
      callToolName: options.callToolName ?? 'call_tool',
      defaultLimit: options.defaultLimit ?? 5,
      defaultDetail: options.defaultDetail ?? 'detailed',
      alwaysVisible: options.alwaysVisible ?? [],
      allowRegex: options.allowRegex ?? false,
    };
  }

  onRegister(registry: TransformRegistry): void {
    this.registry = registry;
  }

  /**
   * Resolves a tool for the `call_tool` proxy and for filtering search results.
   *
   * Goes through the server's resolution chain so downstream authorization transforms
   * still apply. When no server is attached (standalone use), there is no chain to
   * consult and the locally indexed catalog is the complete picture.
   */
  private readonly resolveThroughChain = async (
    name: string,
    context?: ExecutionContext
  ): Promise<Tool | undefined> => {
    if (this.registry) {
      return this.registry.resolveTool(name, context);
    }
    return this.rawTools.get(name);
  };

  /**
   * Reshapes the catalog: replaces raw tools with search_tools, call_tool,
   * and any tools explicitly designated as always visible.
   */
  protected async applyTransform(tools: Tool[], context?: ExecutionContext): Promise<Tool[]> {
    return this.rebuilds.enqueue(() => this.rebuildCatalog(tools, context));
  }

  private async rebuildCatalog(tools: Tool[], _context?: ExecutionContext): Promise<Tool[]> {
    // Index the server's full catalog rather than this session's filtered view, so the
    // index does not depend on whichever session most recently listed tools. Access
    // control happens at query time via resolveThroughChain, not by omitting from the index.
    const indexable = this.registry ? [...this.registry.getTools().values()] : tools;

    // 1. Resolve alwaysVisible tools from this session's view of the catalog:
    //    Matches by explicit name in options, by tool.visibility === 'visible',
    //    or by annotations.alwaysVisible === true
    const alwaysVisibleSet = new Set(this.options.alwaysVisible);
    const visibleTools = tools.filter(
      (t) =>
        alwaysVisibleSet.has(t.name) ||
        t.visibility === 'visible' ||
        t.annotations?.alwaysVisible === true
    );

    // 2. Cache key spans both the indexed catalog and this session's passthrough set,
    //    so a list computed for one session is never replayed to another.
    const currentHash = this.computeCatalogHash(indexable, visibleTools);
    if (this.cachedTransformedList && this.lastCatalogHash === currentHash) {
      return this.cachedTransformedList;
    }

    // 3. Index raw tools in memory. Swap the map in one assignment so a search
    //    that started against the previous catalog does not observe a clear().
    const nextRaw = new Map<string, Tool>();
    for (const t of indexable) {
      nextRaw.set(t.name, t);
    }
    this.rawTools = nextRaw;

    // 4. Update the search index in subclass
    await this.updateIndex(indexable, currentHash);

    // 5. Build synthetic tools
    const searchTool = this.createSearchTool();
    const callTool = this.createCallTool();

    this.lastCatalogHash = currentHash;
    this.cachedTransformedList = [searchTool, callTool, ...visibleTools];
    return this.cachedTransformedList;
  }

  /**
   * Resolves this transform's own synthetic meta-tools.
   *
   * Everything else defers to the rest of the chain. There is deliberately no
   * fallback to `rawTools`: re-resolving a tool the chain declined would let a
   * caller reach tools that a downstream authorization transform filtered out.
   */
  async resolveTool(
    name: string,
    next: NextToolHandler,
    context?: ExecutionContext
  ): Promise<Tool | undefined> {
    // Meta-tool names belong to this transform. A business tool registered
    // under the same name must not shadow search_tools or call_tool.
    if (name === this.options.searchToolName || name === this.options.callToolName) {
      const cached = this.cachedTransformedList?.find((t) => t.name === name);
      if (cached) return cached;
      return name === this.options.searchToolName
        ? this.createSearchTool()
        : this.createCallTool();
    }

    // Downstream transforms get first refusal, so their guards always run.
    // There is no fallback to rawTools: re-resolving a tool the chain declined
    // would let a caller reach tools an authorization transform filtered out.
    return next(name, context);
  }

  private computeCatalogHash(tools: Tool[], visible: Tool[]): string {
    const hash = createHash('sha256');
    // Length-prefix each field: without a delimiter, ('ab','c') and ('a','bc')
    // would hash identically and serve a stale catalog.
    const feed = (value: string) => hash.update(`${value.length}:${value}`);
    for (const t of tools) {
      feed(t.name);
      feed(t.description || '');
      const identity = toolCacheFields(t);
      feed(identity.schema);
      feed(identity.visibility);
    }
    hash.update('|visible|');
    for (const t of visible) {
      feed(t.name);
    }
    return hash.digest('hex');
  }

  /**
   * Creates the synthetic search tool.
   * Can be overridden by subclasses.
   */
  protected createSearchTool(): Tool {
    return buildSearchTool(
      this.options.searchToolName,
      async (query, limit, context) => {
        // Rank the full index, then drop what this session may not see, so a page
        // of hidden tools cannot shrink the requested limit.
        const ranked = await this.search(query, Number.MAX_SAFE_INTEGER);
        const authorized: Tool[] = [];
        for (const tool of ranked) {
          if (authorized.length >= limit) break;
          try {
            if (await this.resolveThroughChain(tool.name, context)) {
              authorized.push(tool);
            }
          } catch {
            // Denied for this session; omit from results.
          }
        }
        return authorized;
      },
      this.options.defaultLimit,
      this.options.defaultDetail
    );
  }

  /**
   * Creates the synthetic call tool.
   * Can be overridden by subclasses.
   */
  protected createCallTool(): Tool {
    return buildCallTool(
      this.options.callToolName,
      this.resolveThroughChain,
      this.options.searchToolName
    );
  }

  /**
   * Diagnostic access to the raw indexed tools.
   */
  getRawTools(): Map<string, Tool> {
    return new Map(this.rawTools);
  }

  /**
   * Diagnostic access to transform options.
   */
  getOptions(): Readonly<Required<SearchTransformOptions>> {
    return this.options;
  }

  protected abstract updateIndex(tools: Tool[], hash: string): Promise<void> | void;
  protected abstract search(query: string, limit: number): Promise<Tool[]>;
}
