import { createHash } from 'node:crypto';
import { CatalogTransform } from '../catalog.transform.js';
import { NextToolHandler } from '../transform.interface.js';
import { Tool } from '../../tool.js';
import { ExecutionContext } from '../../types.js';
import { SearchDetailLevel, SearchTransformOptions } from './types.js';

export abstract class BaseSearchTransform extends CatalogTransform {
  protected readonly options: Required<SearchTransformOptions>;
  protected rawTools: Map<string, Tool> = new Map();
  private cachedTransformedList: Tool[] | null = null;
  private lastCatalogHash: string = '';

  constructor(options: SearchTransformOptions = {}) {
    super();
    this.options = {
      searchToolName: options.searchToolName ?? 'search_tools',
      callToolName: options.callToolName ?? 'call_tool',
      defaultLimit: options.defaultLimit ?? 5,
      defaultDetail: options.defaultDetail ?? 'detailed',
      alwaysVisible: options.alwaysVisible ?? [],
    };
  }

  /**
   * Reshapes the catalog: replaces raw tools with search_tools, call_tool,
   * and any tools explicitly designated as always visible.
   */
  protected async applyTransform(tools: Tool[], _context?: ExecutionContext): Promise<Tool[]> {
    // 1. Compute catalog content hash to avoid rebuilding indexes under high concurrency
    const currentHash = this.computeCatalogHash(tools);
    if (this.cachedTransformedList && this.lastCatalogHash === currentHash) {
      return this.cachedTransformedList;
    }

    // 2. Index raw tools in memory
    this.rawTools.clear();
    for (const t of tools) {
      this.rawTools.set(t.name, t);
    }

    // 3. Resolve alwaysVisible tools:
    //    Matches by explicit name in options, by tool.visibility === 'visible',
    //    or by annotations.alwaysVisible === true
    const alwaysVisibleSet = new Set(this.options.alwaysVisible);
    const visibleTools = tools.filter(
      (t) =>
        alwaysVisibleSet.has(t.name) ||
        t.visibility === 'visible' ||
        (t.annotations as any)?.alwaysVisible === true
    );

    // 4. Update the search index in subclass
    await this.updateIndex(tools, currentHash);

    // 5. Build synthetic tools
    const searchTool = this.createSearchTool();
    const callTool = this.createCallTool();

    this.lastCatalogHash = currentHash;
    this.cachedTransformedList = [searchTool, callTool, ...visibleTools];
    return this.cachedTransformedList;
  }

  /**
   * Resolves synthetic meta-tools and allows direct fallback to raw tools
   * for legacy clients or direct callers.
   */
  async resolveTool(
    name: string,
    next: NextToolHandler,
    context?: ExecutionContext
  ): Promise<Tool | undefined> {
    // 1. Check if tool is one of the cached transformed tools (e.g. synthetic or alwaysVisible)
    if (this.cachedTransformedList) {
      const match = this.cachedTransformedList.find((t) => t.name === name);
      if (match) return match;
    } else {
      if (name === this.options.searchToolName) {
        return this.createSearchTool();
      }
      if (name === this.options.callToolName) {
        return this.createCallTool();
      }
    }

    // 2. Try resolving through next middleware in pipeline
    const resolved = await next(name, context);
    if (resolved) return resolved;

    // 3. Fallback: if caller invokes an indexed tool directly by name,
    //    resolve from raw tools registry
    return this.rawTools.get(name);
  }

  private computeCatalogHash(tools: Tool[]): string {
    const hash = createHash('sha256');
    for (const t of tools) {
      hash.update(t.name).update(':').update(t.description || '');
    }
    return hash.digest('hex');
  }

  /**
   * Creates the synthetic search tool.
   * Can be overridden by subclasses or downstream milestones.
   */
  protected createSearchTool(): Tool {
    return new Tool<any, any>({
      name: this.options.searchToolName,
      description:
        'Searches available tools by natural language query or keywords. Returns matching tool names, descriptions, and parameter schemas.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Natural language search query or keywords' },
          limit: { type: 'number', description: 'Maximum number of tools to return (default: 5)' },
          detail: {
            type: 'string',
            enum: ['brief', 'detailed', 'full'],
            description:
              'Level of detail: brief (name & 1-line summary), detailed (name, summary, and parameters list), full (complete JSON Schema)',
          },
        },
        required: ['query'],
      },
      handler: async (args: { query: string; limit?: number; detail?: SearchDetailLevel }) => {
        const limit = args.limit ?? this.options.defaultLimit;
        const results = await this.search(args.query, limit);
        if (results.length === 0) {
          return { content: [{ type: 'text', text: 'No matching tools found.' }] };
        }
        const text = results
          .map((t) => `- **${t.name}**: ${t.description || 'No description'}`)
          .join('\n');
        return { content: [{ type: 'text', text }] };
      },
    });
  }

  /**
   * Creates the synthetic call tool.
   * Can be overridden by subclasses or downstream milestones.
   */
  protected createCallTool(): Tool {
    return new Tool<any, any>({
      name: this.options.callToolName,
      description: 'Executes a discovered tool by name with the specified arguments object.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Name of the tool to execute' },
          arguments: {
            type: 'object',
            description: 'Arguments object matching the target tool parameters',
          },
        },
        required: ['name'],
      },
      handler: async (
        args: { name: string; arguments?: Record<string, unknown> },
        ctx: ExecutionContext
      ) => {
        const targetTool = this.rawTools.get(args.name);
        if (!targetTool) {
          throw new Error(
            `Tool '${args.name}' not found. Use ${this.options.searchToolName} to discover available tools.`
          );
        }
        return await targetTool.execute(args.arguments ?? {}, ctx);
      },
    });
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
