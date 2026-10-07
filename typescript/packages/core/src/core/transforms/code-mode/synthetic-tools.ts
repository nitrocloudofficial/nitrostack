import { Tool } from '../../tool.js';
import { ExecutionContext } from '../../types.js';
import { BM25Engine } from '../search/bm25.engine.js';
import { clampSearchLimit, isBrowseQuery, MAX_SEARCH_RESULTS } from '../search/synthetic-tools.js';
import { WorkerPool } from './worker-pool.js';
import { ExecutionLimits } from './types.js';

export interface CodeModeSyntheticToolNames {
  searchToolName?: string;
  getSchemaToolName?: string;
  executeToolName?: string;
  searchToolDescription?: string;
  getSchemaToolDescription?: string;
  executeToolDescription?: string;
}

export const DEFAULT_CODE_MODE_SEARCH_DESCRIPTION =
  'Searches available tools using natural language query or keywords. ' +
  'CRITICAL: Only a minimal tool set is visible initially. When the user asks for any capability not in your current tools, ' +
  'you MUST call search first to discover tools, then get_schema, then execute. Never decline without searching. ' +
  'If the user asks what you can do or wants to see the tools, call search with no query to get a brief index of available tools. ' +
  'Returns tool names and brief summaries.';

export const DEFAULT_CODE_MODE_GET_SCHEMA_DESCRIPTION =
  'Returns parameter schemas, types, and required fields for specified tools, plus ES2020 scripting constraints. Call this before writing code in execute.';

export const DEFAULT_CODE_MODE_EXECUTE_DESCRIPTION =
  'Executes a JavaScript (ES2020) script within an isolated QuickJS WebAssembly sandbox with async callTool() access to orchestrate discovered tools.';

/**
 * Narrows a set of tool names to those the caller is authorized to see.
 */
export type AuthorizedToolFilter = (
  names: string[],
  context?: ExecutionContext,
  maxCount?: number
) => Promise<Tool[]>;

/**
 * Builds the 3 synthetic meta-tools (search, get_schema, execute) for Code Mode.
 */
export function buildCodeModeTools(
  bm25Engine: BM25Engine<Tool>,
  rawTools: Map<string, Tool>,
  workerPool: WorkerPool,
  limits: ExecutionLimits,
  customNames: CodeModeSyntheticToolNames = {},
  filterAuthorized: AuthorizedToolFilter = async (names, _context, maxCount) => {
    const authorized: Tool[] = [];
    for (const name of names) {
      if (maxCount !== undefined && authorized.length >= maxCount) {
        break;
      }
      const tool = rawTools.get(name);
      if (tool) authorized.push(tool);
    }
    return authorized;
  }
): { searchTool: Tool; getSchemaTool: Tool; executeTool: Tool } {
  const searchName = customNames.searchToolName || 'search';
  const getSchemaName = customNames.getSchemaToolName || 'get_schema';
  const executeName = customNames.executeToolName || 'execute';

  // 1. search meta-tool
  const searchTool = new Tool<any, any>({
    name: searchName,
    description: customNames.searchToolDescription || DEFAULT_CODE_MODE_SEARCH_DESCRIPTION,
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
          description: `Maximum number of tools to return (default: 5, or ${MAX_SEARCH_RESULTS} when browsing)`,
        },
      },
    },
    handler: async (args: { query?: unknown; limit?: number }, context: ExecutionContext) => {
      const query = typeof args.query === 'string' ? args.query.trim() : '';
      const browse = isBrowseQuery(query);
      const limit =
        browse && args.limit === undefined
          ? MAX_SEARCH_RESULTS
          : clampSearchLimit(args.limit, 5);

      let candidateNames: string[];
      if (browse) {
        candidateNames = [...rawTools.keys()];
      } else {
        const ranked = bm25Engine.search(query, Number.MAX_SAFE_INTEGER);
        candidateNames = ranked.map((r) => r.item.name);
      }

      // Rank the full index, then drop what this session may not see, so a page
      // of hidden tools cannot shrink the requested limit. Keyword search therefore
      // passes no maxCount. Browse probes limit + 1 to detect a cutoff without
      // pre-slicing candidates that authorization may deny.
      const authorized = await filterAuthorized(
        candidateNames,
        context,
        browse ? limit + 1 : undefined
      );

      if (authorized.length === 0) {
        return { content: [{ type: 'text', text: 'No matching tools found.' }] };
      }

      let text = authorized
        .slice(0, limit)
        .map((tool) => `- **${tool.name}**: ${tool.description || 'No description'}`)
        .join('\n');

      if (browse && authorized.length > limit) {
        text += `\n\nMore tools are available. Call ${searchName} with keywords for the task to narrow the results.`;
      }

      return { content: [{ type: 'text', text }] };
    },
  });

  // 2. get_schema meta-tool
  const getSchemaTool = new Tool<any, any>({
    name: getSchemaName,
    description:
      customNames.getSchemaToolDescription || DEFAULT_CODE_MODE_GET_SCHEMA_DESCRIPTION,
    inputSchema: {
      type: 'object',
      properties: {
        tools: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of tool names to inspect',
        },
      },
      required: ['tools'],
    },
    handler: async (args: { tools: string[] }, context: ExecutionContext) => {
      const toolNames = args.tools || [];
      if (toolNames.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No tools specified. Pass an array of tool names to inspect.',
            },
          ],
        };
      }

      // Schemas are as sensitive as the tools themselves, so unauthorized names are
      // reported as not found rather than distinguished from nonexistent ones.
      const authorized = await filterAuthorized(toolNames, context);
      const byName = new Map(authorized.map((tool) => [tool.name, tool]));

      const sections: string[] = [];
      for (const name of toolNames) {
        const tool = byName.get(name);
        if (!tool) {
          sections.push(`### ${name}\n*Tool not found.*`);
          continue;
        }
        const mcpTool = await tool.toMcpTool();
        sections.push(
          `### ${tool.name}\n${tool.description || ''}\n\`\`\`json\n${JSON.stringify(mcpTool.inputSchema, null, 2)}\n\`\`\``
        );
      }
      return { content: [{ type: 'text', text: sections.join('\n\n') }] };
    },
  });

  // 3. execute meta-tool
  const executeTool = new Tool<any, any>({
    name: executeName,
    description: customNames.executeToolDescription || DEFAULT_CODE_MODE_EXECUTE_DESCRIPTION,
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'JavaScript (ES2020) script to execute. Use await callTool(name, args).',
        },
      },
      required: ['code'],
    },
    handler: async (args: { code: string }, context: ExecutionContext) => {
      const result = await workerPool.executeScript(args.code, limits, context);
      if (!result.success) {
        throw new Error(`Script execution failed: ${result.error}`);
      }
      return {
        content: [
          {
            type: 'text',
            text:
              typeof result.value === 'string'
                ? result.value
                : JSON.stringify(result.value ?? null, null, 2),
          },
        ],
      };
    },
  });

  return { searchTool, getSchemaTool, executeTool };
}
