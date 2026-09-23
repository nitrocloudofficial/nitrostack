import { Tool } from '../../tool.js';
import { ExecutionContext } from '../../types.js';
import { BM25Engine } from '../search/bm25.engine.js';
import { clampSearchLimit } from '../search/synthetic-tools.js';
import { WorkerPool } from './worker-pool.js';
import { ExecutionLimits } from './types.js';

export interface CodeModeSyntheticToolNames {
  searchToolName?: string;
  getSchemaToolName?: string;
  executeToolName?: string;
}

/**
 * Narrows a set of tool names to those the caller is authorized to see.
 */
export type AuthorizedToolFilter = (
  names: string[],
  context?: ExecutionContext
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
  filterAuthorized: AuthorizedToolFilter = async (names) =>
    names.map((n) => rawTools.get(n)).filter((t): t is Tool => t !== undefined)
): { searchTool: Tool; getSchemaTool: Tool; executeTool: Tool } {
  const searchName = customNames.searchToolName || 'search';
  const getSchemaName = customNames.getSchemaToolName || 'get_schema';
  const executeName = customNames.executeToolName || 'execute';

  // 1. search meta-tool
  const searchTool = new Tool<any, any>({
    name: searchName,
    description:
      'Searches available tools using natural language query or keywords. Returns tool names and brief summaries.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Natural language search query or keywords' },
        limit: { type: 'number', description: 'Maximum number of tools to return (default: 5)' },
      },
      required: ['query'],
    },
    handler: async (args: { query: string; limit?: number }, context: ExecutionContext) => {
      const limit = clampSearchLimit(args.limit, 5);
      // Rank the full index, then drop what this session may not see, so a page
      // of hidden tools cannot shrink the requested limit.
      const ranked = bm25Engine.search(args.query, Number.MAX_SAFE_INTEGER);
      const authorized = await filterAuthorized(
        ranked.map((r) => r.item.name),
        context
      );
      const text = authorized
        .slice(0, limit)
        .map((tool) => `- **${tool.name}**: ${tool.description || 'No description'}`)
        .join('\n');
      return { content: [{ type: 'text', text: text || 'No matching tools found.' }] };
    },
  });

  // 2. get_schema meta-tool
  const getSchemaTool = new Tool<any, any>({
    name: getSchemaName,
    description:
      'Returns parameter schemas, types, and required fields for specified tools, plus ES2020 scripting constraints.',
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
    description:
      'Executes a JavaScript (ES2020) script within an isolated QuickJS WebAssembly sandbox with async callTool() access.',
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
