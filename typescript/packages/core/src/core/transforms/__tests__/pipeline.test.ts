import { describe, it, expect, beforeEach } from '@jest/globals';
import { NitroStackServer } from '../../server.js';
import { Tool } from '../../tool.js';
import { CatalogTransform } from '../catalog.transform.js';
import { McpTransform } from '../transform.interface.js';
import { z } from 'zod';

class PrefixTransform extends CatalogTransform {
  readonly name: string;
  private prefix: string;

  constructor(prefix: string) {
    super();
    this.prefix = prefix;
    this.name = `prefix-${prefix}`;
  }

  protected async applyTransform(tools: Tool[]): Promise<Tool[]> {
    return tools.map((tool) => {
      return new Tool({
        name: `${this.prefix}_${tool.name}`,
        description: tool.description,
        inputSchema: tool.inputSchema,
        handler: async (args: any, ctx: any) => tool.execute(args, ctx),
      });
    });
  }
}

class FilterTransform extends CatalogTransform {
  readonly name = 'filter-hidden';

  protected async applyTransform(tools: Tool[]): Promise<Tool[]> {
    return tools.filter((t) => !t.name.startsWith('hidden_'));
  }
}

class SyntheticMetaTransform extends CatalogTransform {
  readonly name = 'synthetic-meta';
  private syntheticTool: Tool<any, any>;

  constructor() {
    super();
    this.syntheticTool = new Tool({
      name: 'meta_tool',
      description: 'Synthetic meta tool for testing',
      inputSchema: z.object({ query: z.string() }),
      handler: async (input: { query: string }) => ({ status: 'synthetic_ok', query: input.query }),
    });
  }

  protected async applyTransform(tools: Tool[]): Promise<Tool[]> {
    return [...tools, this.syntheticTool];
  }

  override async resolveTool(name: string, next: any, context?: any): Promise<Tool | undefined> {
    if (name === 'meta_tool') {
      return this.syntheticTool;
    }
    return next(name, context);
  }
}

describe('Transform Pipeline Chaining (NITRO-101-M4)', () => {
  let server: NitroStackServer;

  beforeEach(() => {
    server = new NitroStackServer({
      name: 'pipeline-test-server',
      version: '1.0.0',
    });
  });

  it('executes transforms in registered order', async () => {
    const transformA = new PrefixTransform('a');
    const transformB = new PrefixTransform('b');

    server.addTransform(transformA);
    server.addTransform(transformB);

    server.tool(new Tool({
      name: 'fetch',
      description: 'Fetch resource',
      inputSchema: z.object({}),
      handler: async () => 'ok',
    }));

    const tools = await server.runToolPipeline();
    expect(tools.length).toBe(1);
    expect(tools[0].name).toBe('b_a_fetch');
  });

  it('allows transforms to filter out tools', async () => {
    server.addTransform(new FilterTransform());

    server.tool(new Tool({
      name: 'public_tool',
      description: 'Public tool',
      inputSchema: z.object({}),
      handler: async () => 'public',
    }));

    server.tool(new Tool({
      name: 'hidden_tool',
      description: 'Hidden internal tool',
      inputSchema: z.object({}),
      handler: async () => 'hidden',
    }));

    const tools = await server.runToolPipeline();
    expect(tools.length).toBe(1);
    expect(tools[0].name).toBe('public_tool');
  });

  it('allows transforms to inject synthetic tools with valid schemas', async () => {
    server.addTransform(new SyntheticMetaTransform());

    server.tool(new Tool({
      name: 'base_tool',
      description: 'Base tool',
      inputSchema: z.object({}),
      handler: async () => 'base',
    }));

    const tools = await server.runToolPipeline();
    const names = tools.map((t) => t.name);
    expect(names).toContain('base_tool');
    expect(names).toContain('meta_tool');

    const resolved = await server.resolveTool('meta_tool');
    expect(resolved).toBeDefined();
    expect(resolved?.name).toBe('meta_tool');

    const executionResult = await resolved?.execute({ query: 'test-search' }, {} as any);
    expect(executionResult).toEqual({ status: 'synthetic_ok', query: 'test-search' });
  });

  it('propagates transform errors gracefully without crashing the server', async () => {
    const errorTransform: McpTransform = {
      name: 'error-transform',
      transformTools: async () => {
        throw new Error('Pipeline transform failure');
      },
    };

    server.addTransform(errorTransform);
    server.tool(new Tool({
      name: 'tool_1',
      description: 'Tool 1',
      inputSchema: z.object({}),
      handler: async () => '1',
    }));

    await expect(server.runToolPipeline()).rejects.toThrow('Pipeline transform failure');
  });

  it('exposes transformed tools in HTTP documentation callback', async () => {
    const filter = new FilterTransform();
    server.addTransform(filter);

    server.tool(new Tool({
      name: 'public_action',
      description: 'Public action',
      inputSchema: z.object({}),
      handler: async () => 'pub',
    }));
    server.tool(new Tool({
      name: 'hidden_action',
      description: 'Hidden action',
      inputSchema: z.object({}),
      handler: async () => 'priv',
    }));

    // Mock HttpTransport tools callback invocation
    let registeredCallback: (() => Promise<unknown[]>) | undefined;
    const mockHttpTransport = {
      setToolsCallback: (cb: () => Promise<unknown[]>) => {
        registeredCallback = cb;
      },
    };

    // Use server.runToolPipeline inside the tools callback exactly like server.ts
    mockHttpTransport.setToolsCallback(async () => {
      const rawTools = await server.runToolPipeline();
      return Promise.all(rawTools.map((t) => t.toMcpTool()));
    });

    expect(registeredCallback).toBeDefined();
    const docTools = (await registeredCallback!()) as any[];
    expect(docTools.length).toBe(1);
    expect(docTools[0].name).toBe('public_action');
  });
});
