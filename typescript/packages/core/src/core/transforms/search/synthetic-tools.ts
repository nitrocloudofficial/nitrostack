import { Tool } from '../../tool.js';
import { ExecutionContext } from '../../types.js';
import { DetailLevel, serializeTools } from './tool-serializer.js';

export function validateToolArguments(tool: Tool, args: Record<string, unknown>): void {
  // 1. Zod Schema Validation
  const schema = tool.inputSchema as any;
  if (schema && typeof schema.safeParse === 'function') {
    const result = schema.safeParse(args);
    if (!result.success) {
      const issues = result.error.issues
        .map((i: any) => `Parameter '${i.path.join('.')}': ${i.message}`)
        .join('; ');
      throw new Error(`Argument validation failed for tool '${tool.name}': ${issues}`);
    }
    return;
  }

  // 2. JSON Schema Required Properties Validation
  if (schema && typeof schema === 'object' && Array.isArray(schema.required)) {
    for (const req of schema.required) {
      if (args[req] === undefined) {
        throw new Error(`Missing required parameter '${req}' for tool '${tool.name}'`);
      }
    }
  }
}

export function buildSearchTool(
  name: string,
  searchFn: (query: string, limit: number) => Promise<Tool[]>,
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
    handler: async (args: { query: string; limit?: number; detail?: DetailLevel }) => {
      const limit = args.limit ?? defaultLimit;
      const detail = args.detail ?? defaultDetail;
      const results = await searchFn(args.query, limit);
      const text = await serializeTools(results, detail);
      return { content: [{ type: 'text', text }] };
    },
  });
}

export function buildCallTool(
  name: string,
  resolveFn: (name: string) => Tool | undefined,
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
      const targetTool = resolveFn(args.name);
      if (!targetTool) {
        throw new Error(
          `Tool '${args.name}' not found. Use ${searchToolName} to discover available tools.`
        );
      }

      const toolArgs = args.arguments ?? {};

      // 1. Validate arguments against target tool's schema before execution
      validateToolArguments(targetTool, toolArgs);

      // 2. Execute target tool through full NitroStack pipeline (guards, middleware, interceptors, pipes, handler)
      return await targetTool.execute(toolArgs, ctx);
    },
  });
}
