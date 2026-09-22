import { Tool } from '../../tool.js';
import { ExecutionContext } from '../../types.js';
import { CatalogTransform } from '../catalog.transform.js';
import { DetailLevel, serializeTools } from './tool-serializer.js';
import { validateToolArguments } from '../validate-tool-arguments.js';

/** One search call cannot dump the whole catalog. */
export const MAX_SEARCH_RESULTS = 20;

export function clampSearchLimit(requested: unknown, fallback: number): number {
  if (typeof requested !== 'number' || !Number.isFinite(requested) || requested <= 0) {
    return fallback;
  }
  return Math.min(Math.floor(requested), MAX_SEARCH_RESULTS);
}

export { validateToolArguments };

export function buildSearchTool(
  name: string,
  searchFn: (query: string, limit: number, context?: ExecutionContext) => Promise<Tool[]>,
  defaultLimit: number = 5,
  defaultDetail: DetailLevel = 'detailed'
): Tool {
  return new Tool<any, any>({
    name,
    description:
      'Searches available tools by natural language query or keywords. Returns matching tool names, descriptions, and parameter schemas.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Natural language search query or keywords' },
        limit: {
          type: 'number',
          description: `Maximum number of tools to return (default: ${defaultLimit})`,
        },
        detail: {
          type: 'string',
          enum: ['brief', 'detailed', 'full'],
          description:
            'Level of detail: brief (name & 1-line summary), detailed (name, summary, and parameters list), full (complete JSON Schema)',
        },
      },
      required: ['query'],
    },
    handler: async (
      args: { query: string; limit?: number; detail?: DetailLevel },
      ctx: ExecutionContext
    ) => {
      const limit = clampSearchLimit(args.limit, defaultLimit);
      const detail = args.detail ?? defaultDetail;
      const results = await searchFn(args.query, limit, ctx);
      const text = await serializeTools(results, detail);
      return { content: [{ type: 'text', text }] };
    },
  });
}

export function buildCallTool(
  name: string,
  resolveFn: (name: string, context?: ExecutionContext) => Promise<Tool | undefined>,
  searchToolName: string = 'search_tools'
): Tool {
  return new Tool<any, any>({
    name,
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
      if (args.name === name || args.name === searchToolName) {
        throw new Error(`'${args.name}' cannot be invoked through ${name}`);
      }

      const targetTool = await resolveFn(args.name, ctx);
      if (!targetTool) {
        throw new Error(
          `Tool '${args.name}' not found. Use ${searchToolName} to discover available tools.`
        );
      }

      const toolArgs = args.arguments ?? {};

      // 1. Validate arguments against target tool's schema before execution
      validateToolArguments(targetTool, toolArgs);

      // 2. Execute target tool through full NitroStack pipeline (guards, middleware, interceptors, pipes, handler).
      //    withBypass covers catalog listing inside the handler. Authorization already ran in resolveFn.
      return await CatalogTransform.withBypass(() => targetTool.execute(toolArgs, ctx));
    },
  });
}
