import { Tool } from '../../tool.js';
import { ExecutionContext } from '../../types.js';
import { CatalogTransform } from '../catalog.transform.js';
import { DetailLevel, serializeTools } from './tool-serializer.js';
import { tokenize } from './tokenizer.js';
import { validateToolArguments } from '../validate-tool-arguments.js';

/** One search call cannot dump the whole catalog. */
export const MAX_SEARCH_RESULTS = 20;

export function clampSearchLimit(requested: unknown, fallback: number): number {
  if (typeof requested !== 'number' || !Number.isFinite(requested) || requested <= 0) {
    return fallback;
  }
  return Math.min(Math.floor(requested), MAX_SEARCH_RESULTS);
}

/** Words that ask about the catalog itself rather than a task ("show tools", "list all tools"). */
const BROWSE_TERMS = new Set(['tool', 'tools', 'list', 'show', 'available', 'capabilities', 'everything']);

const REGEX_SYNTAX = /[\\^$.|?*+()[\]{}]/;

/**
 * True when the query names no task: empty, punctuation, stop words only
 * ("what can you do?"), or catalog words only ("show tools").
 *
 * When the query is a regular expression, any regex syntax makes it a search:
 * tokenizing `(a+)+$` leaves nothing, but it is still a pattern to match.
 */
export function isBrowseQuery(query: string, queryIsPattern: boolean = false): boolean {
  if (queryIsPattern && REGEX_SYNTAX.test(query)) {
    return false;
  }
  return tokenize(query).every((token) => BROWSE_TERMS.has(token));
}

export { validateToolArguments };

export const DEFAULT_SEARCH_TOOL_DESCRIPTION =
  'Searches available tools by natural language query or keywords. CRITICAL: You only have a minimal initial tool catalog loaded. Whenever the user requests any task, calculation, inventory action, ticket, or domain operation not in your immediate catalog, you MUST call this tool first with task keywords to discover and inspect the required tool before answering. Never decline a user request without searching first. If the user asks what you can do or wants to see the available tools, call it with no query to get a brief index of the catalog. Returns matching tool names, descriptions, and parameter schemas.';

export const DEFAULT_CALL_TOOL_DESCRIPTION =
  'Executes a discovered tool by name with the specified arguments object.';

export function buildSearchTool(
  name: string,
  searchFn: (query: string, limit: number, context?: ExecutionContext) => Promise<Tool[]>,
  defaultLimit: number = 5,
  defaultDetail: DetailLevel = 'detailed',
  customDescription?: string,
  queryIsPattern: boolean = false
): Tool {
  return new Tool<any, any>({
    name,
    description: customDescription || DEFAULT_SEARCH_TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'Keywords or a natural language description of the task. Omit to browse a brief index of available tools.',
        },
        limit: {
          type: 'number',
          description: `Maximum number of tools to return (default: ${defaultLimit}, or ${MAX_SEARCH_RESULTS} when browsing)`,
        },
        detail: {
          type: 'string',
          enum: ['brief', 'detailed', 'full'],
          description:
            'Level of detail: brief (name & 1-line summary), detailed (name, summary, and parameters list), full (complete JSON Schema). Browsing defaults to brief.',
        },
      },
    },
    handler: async (
      args: { query?: unknown; limit?: number; detail?: DetailLevel },
      ctx: ExecutionContext
    ) => {
      const query = typeof args.query === 'string' ? args.query.trim() : '';
      const browse = isBrowseQuery(query, queryIsPattern);
      const limit =
        browse && args.limit === undefined
          ? MAX_SEARCH_RESULTS
          : clampSearchLimit(args.limit, defaultLimit);
      const detail = args.detail ?? (browse ? 'brief' : defaultDetail);
      if (!browse) {
        const results = await searchFn(query, limit, ctx);
        return { content: [{ type: 'text', text: await serializeTools(results, detail) }] };
      }
      // One extra result reveals whether the index was cut off; it is never returned.
      const found = await searchFn('', limit + 1, ctx);
      let text = await serializeTools(found.slice(0, limit), detail);
      if (found.length > limit) {
        text += `\n\nMore tools are available. Call ${name} with keywords for the task to narrow the results.`;
      }
      return { content: [{ type: 'text', text }] };
    },
  });
}

export function buildCallTool(
  name: string,
  resolveFn: (name: string, context?: ExecutionContext) => Promise<Tool | undefined>,
  searchToolName: string = 'search_tools',
  customDescription?: string
): Tool {
  return new Tool<any, any>({
    name,
    description: customDescription || DEFAULT_CALL_TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the tool to execute' },
        arguments: {
          anyOf: [
            { type: 'object', description: 'Arguments object matching the target tool parameters' },
            { type: 'string', description: 'Arguments JSON string matching the target tool parameters' },
          ],
          description: 'Arguments object matching the target tool parameters',
        },
      },
      required: ['name'],
    },
    handler: async (
      args: { name: string; arguments?: Record<string, unknown> | string },
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

      let rawArgs = args.arguments ?? {};
      if (typeof rawArgs === 'string') {
        try {
          rawArgs = rawArgs.trim() === '' ? {} : JSON.parse(rawArgs);
        } catch (e) {
          throw new Error(`Invalid JSON in 'arguments': ${(e as Error).message}`);
        }
      }

      const toolArgs = typeof rawArgs === 'object' && rawArgs !== null ? rawArgs : {};

      // 1. Validate arguments against target tool's schema before execution.
      //    Zod defaults and coercions are applied; JSON Schema checks throw only.
      const parsedArgs = validateToolArguments(targetTool, toolArgs as Record<string, unknown>);

      // 2. Execute target tool through full NitroStack pipeline (guards, middleware, interceptors, pipes, handler).
      //    withBypass covers catalog listing inside the handler. Authorization already ran in resolveFn.
      const targetResult = await CatalogTransform.withBypass(() => targetTool.execute(parsedArgs, ctx));

      if (targetTool.hasComponent()) {
        const component = targetTool.getComponent()!;
        const transformedData = await component.transformData(targetResult, ctx);
        const widgetMeta = (await component.getWidgetMeta(targetResult, ctx)) || {};
        const resourceUri = component.getResourceUri();
        const meta: Record<string, unknown> = {
          ...widgetMeta,
          'openai/outputTemplate': resourceUri,
          'ui/template': resourceUri,
          ui: { resourceUri },
          toolName: targetTool.name,
          'ui/toolName': targetTool.name,
        };
        return {
          content: [
            {
              type: 'text',
              text: typeof targetResult === 'string' ? targetResult : JSON.stringify(targetResult, null, 2),
            },
          ],
          structuredContent: transformedData as any,
          _meta: meta as any,
        };
      }

      return targetResult;
    },
  });
}
