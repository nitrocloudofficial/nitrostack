import { describe, it, expect } from '@jest/globals';
import { z } from 'zod';
import { Tool } from '../../../../core/tool.js';
import { Guard } from '../../../../core/guards/guard.interface.js';
import { ExecutionContext } from '../../../../core/types.js';
import { serializeTool, serializeTools } from '../tool-serializer.js';
import { buildSearchTool, buildCallTool, validateToolArguments } from '../synthetic-tools.js';

class MockAdminGuard implements Guard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const role = (context as any)?.user?.role;
    if (role !== 'admin') {
      throw new Error('Access denied by AdminGuard: requires admin role');
    }
    return true;
  }
}

describe('Synthetic Meta-Tools & Detail Serialization (NITRO-102-M3)', () => {
  const toolZod = new Tool({
    name: 'github_merge_pr',
    description: 'Merge an approved pull request into target branch',
    inputSchema: z.object({
      pr_id: z.number().describe('Pull request number'),
      commit_title: z.string().describe('Squash commit title'),
      fast_forward: z.boolean().optional().default(false),
    }),
    handler: async (args: any) => ({ merged: true, pr_id: args.pr_id }),
  });

  const toolJsonSchema = new Tool({
    name: 'pg_query',
    description: 'Execute an arbitrary SQL query on the primary database',
    inputSchema: {
      type: 'object',
      properties: {
        sql: { type: 'string', description: 'SQL query statement' },
        timeout_ms: { type: 'number', description: 'Execution timeout in ms', default: 5000 },
      },
      required: ['sql'],
    },
    handler: async (args: any) => ({ rows: [], query: args.sql }),
  });

  const toolGuarded = new Tool({
    name: 'admin_wipe_cache',
    description: 'Purge all caches globally',
    inputSchema: z.object({
      force: z.boolean(),
    }),
    guards: [MockAdminGuard],
    handler: async () => ({ purged: true }),
  });

  describe('tool-serializer.ts', () => {
    it('serializes tool in "brief" format', async () => {
      const text = await serializeTool(toolZod, 'brief');
      expect(text).toBe('- **github_merge_pr**: Merge an approved pull request into target branch');
    });

    it('serializes tool in "detailed" format with parameter breakdown', async () => {
      const text = await serializeTool(toolZod, 'detailed');
      expect(text).toContain('### github_merge_pr');
      expect(text).toContain('Merge an approved pull request into target branch');
      expect(text).toContain('**Parameters**:');
      expect(text).toContain('`pr_id`');
      expect(text).toContain('required');
      expect(text).toContain('`commit_title`');
      expect(text).toContain('`fast_forward`');
    });

    it('serializes tool in "full" format with complete JSON Schema block', async () => {
      const text = await serializeTool(toolJsonSchema, 'full');
      expect(text).toContain('### pg_query');
      expect(text).toContain('```json');
      expect(text).toContain('"sql"');
      expect(text).toContain('"timeout_ms"');
    });

    it('returns "No matching tools found." when serializing empty tool array', async () => {
      const text = await serializeTools([], 'detailed');
      expect(text).toBe('No matching tools found.');
    });

    it('combines multiple tools with double newlines', async () => {
      const text = await serializeTools([toolZod, toolJsonSchema], 'brief');
      expect(text).toContain('- **github_merge_pr**');
      expect(text).toContain('- **pg_query**');
      expect(text.split('\n\n').length).toBe(2);
    });
  });

  describe('synthetic-tools.ts - Argument Validation', () => {
    it('validates Zod schemas and rejects missing required parameters', () => {
      expect(() => {
        validateToolArguments(toolZod, { commit_title: 'Title' }); // missing pr_id
      }).toThrow(/Argument validation failed for tool 'github_merge_pr': Parameter 'pr_id'/);
    });

    it('validates JSON Schema and rejects missing required fields', () => {
      expect(() => {
        validateToolArguments(toolJsonSchema, {}); // missing sql
      }).toThrow("Missing required parameter 'sql' for tool 'pg_query'");
    });

    it('rejects a required JSON Schema property with the wrong type', () => {
      expect(() => {
        validateToolArguments(toolJsonSchema, { sql: 12 });
      }).toThrow(/Parameter 'sql' for tool 'pg_query' must be string/);
    });

    it('accepts valid arguments matching schema', () => {
      expect(() => {
        validateToolArguments(toolZod, { pr_id: 123, commit_title: 'Ship it' });
      }).not.toThrow();

      expect(() => {
        validateToolArguments(toolJsonSchema, { sql: 'SELECT 1;' });
      }).not.toThrow();
    });
  });

  describe('synthetic-tools.ts - buildSearchTool', () => {
    it('executes searchFn and formats results according to requested detail level', async () => {
      const searchFn = async (query: string, limit: number) => {
        return [toolZod, toolJsonSchema].slice(0, limit);
      };

      const searchTool = buildSearchTool('search_tools', searchFn, 5, 'detailed');
      expect(searchTool.name).toBe('search_tools');

      // 1. Default detail ('detailed')
      const detailedResult = (await searchTool.execute({ query: 'github' }, {} as any)) as any;
      expect(detailedResult.content[0].text).toContain('### github_merge_pr');
      expect(detailedResult.content[0].text).toContain('**Parameters**:');

      // 2. Explicit 'brief' detail
      const briefResult = (await searchTool.execute({ query: 'github', detail: 'brief' }, {} as any)) as any;
      expect(briefResult.content[0].text).toContain('- **github_merge_pr**');
      expect(briefResult.content[0].text).not.toContain('**Parameters**:');

      // 3. Explicit 'full' detail
      const fullResult = (await searchTool.execute({ query: 'github', detail: 'full' }, {} as any)) as any;
      expect(fullResult.content[0].text).toContain('```json');
    });
  });

  describe('synthetic-tools.ts - buildCallTool', () => {
    const registry = new Map<string, Tool>([
      ['github_merge_pr', toolZod],
      ['pg_query', toolJsonSchema],
      ['admin_wipe_cache', toolGuarded],
    ]);

    const callTool = buildCallTool('call_tool', async (name: string) => registry.get(name));

    it('successfully executes target tool with arguments and returns raw structured result', async () => {
      const result = await callTool.execute(
        {
          name: 'github_merge_pr',
          arguments: { pr_id: 42, commit_title: 'Fix issue' },
        },
        {} as any
      );

      // Verifies result is not double-stringified
      expect(result).toEqual({ merged: true, pr_id: 42 });
    });

    it('throws validation error before handler invocation when argument fails schema', async () => {
      await expect(
        callTool.execute({ name: 'pg_query', arguments: {} }, {} as any)
      ).rejects.toThrow("Missing required parameter 'sql' for tool 'pg_query'");
    });

    it('rejects a call_tool invocation of itself or of search_tools', async () => {
      await expect(callTool.execute({ name: 'call_tool', arguments: {} }, {} as any)).rejects.toThrow(
        /cannot be invoked through call_tool/
      );
      await expect(
        callTool.execute({ name: 'search_tools', arguments: { query: 'x' } }, {} as any)
      ).rejects.toThrow(/cannot be invoked through call_tool/);
    });

    it('throws descriptive error directing caller to search_tools when tool is not found', async () => {
      await expect(
        callTool.execute({ name: 'unknown_tool', arguments: {} }, {} as any)
      ).rejects.toThrow(
        "Tool 'unknown_tool' not found. Use search_tools to discover available tools."
      );
    });

    it('activates target tool guard pipeline during call_tool execution', async () => {
      // 1. Non-admin execution should fail guard
      const nonAdminCtx = { user: { role: 'guest' } } as unknown as ExecutionContext;
      await expect(
        callTool.execute({ name: 'admin_wipe_cache', arguments: { force: true } }, nonAdminCtx)
      ).rejects.toThrow('Access denied by AdminGuard: requires admin role');

      // 2. Admin execution should pass guard
      const adminCtx = { user: { role: 'admin' } } as unknown as ExecutionContext;
      const result = await callTool.execute(
        { name: 'admin_wipe_cache', arguments: { force: true } },
        adminCtx
      );
      expect(result).toEqual({ purged: true });
    });
  });
});
