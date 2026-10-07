import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { z } from 'zod';
import { Tool } from '../../../../core/tool.js';
import { NitroStackServer } from '../../../../core/server.js';
import { CatalogTransform } from '../../catalog.transform.js';
import { CodeModeTransform } from '../code-mode.transform.js';
import { VisibilityTransform } from '../../visibility/visibility.transform.js';
import { SessionVisibilityStore } from '../../visibility/session-store.js';

describe('Code Mode Multi-Tool Chaining & E2E Suite (NITRO-103-M5)', () => {
  let server: NitroStackServer;
  let codeModeTransform: CodeModeTransform;

  const getUserTool = new Tool({
    name: 'get_user',
    description: 'Retrieve user details by user ID',
    annotations: { readOnlyHint: true },
    inputSchema: z.object({ id: z.number() }),
    handler: async (args: any) => ({ id: args.id, name: 'Alice' }),
  });

  const getOrdersTool = new Tool({
    name: 'get_orders',
    description: 'Retrieve list of orders for a user',
    annotations: { readOnlyHint: true },
    inputSchema: z.object({ userId: z.number() }),
    handler: async (args: any) => [
      { id: 1, amount: 150 },
      { id: 2, amount: 200 },
      { id: 3, amount: 100 },
    ],
  });

  const pingTool = new Tool({
    name: 'ping',
    description: 'Simple ping utility',
    annotations: { readOnlyHint: true },
    inputSchema: z.object({}),
    handler: async () => ({ pong: true }),
  });

  const deleteDatabaseTool = new Tool({
    name: 'delete_database',
    description: 'Permanently destroys database records',
    annotations: { destructiveHint: true },
    inputSchema: z.object({ confirm: z.boolean() }),
    handler: async () => ({ deleted: true }),
  });

  beforeEach(() => {
    server = new NitroStackServer({ name: 'code-mode-e2e', version: '1.0.0' });
    server.tool(getUserTool);
    server.tool(getOrdersTool);
    server.tool(pingTool);
    server.tool(deleteDatabaseTool);
  });

  afterEach(async () => {
    if (codeModeTransform) {
      await codeModeTransform.dispose();
    }
  });

  it('executes a 3-tool data processing pipeline in a single turn', async () => {
    codeModeTransform = new CodeModeTransform({ workerPoolSize: 2 });
    server.addTransform(codeModeTransform);
    await server.runToolPipeline();

    const script = `
      const user = await callTool('get_user', { id: 42 });
      const orders = await callTool('get_orders', { userId: user.id });
      const total = orders.reduce((sum, o) => sum + o.amount, 0);
      return { customer: user.name, totalOrders: orders.length, revenue: total };
    `;

    const result = await codeModeTransform.execute(script);
    expect(result.value).toEqual({ customer: 'Alice', totalOrders: 3, revenue: 450 });
    expect(result.toolCallCount).toBe(2);
  });

  it('enforces circuit breaker on runaway tool call loops', async () => {
    codeModeTransform = new CodeModeTransform({
      workerPoolSize: 1,
      maxToolCalls: 10,
    });
    server.addTransform(codeModeTransform);
    await server.runToolPipeline();

    const runawayScript = `
      for (let i = 0; i < 100; i++) {
        await callTool('ping', {});
      }
    `;

    await expect(codeModeTransform.execute(runawayScript)).rejects.toThrow(
      /Circuit breaker: exceeded maximum allowed tool calls/
    );
  });

  it('rejects destructive tools when allowDestructive is false', async () => {
    codeModeTransform = new CodeModeTransform({
      workerPoolSize: 1,
      allowDestructive: false,
    });
    server.addTransform(codeModeTransform);
    await server.runToolPipeline();

    const script = `await callTool('delete_database', { confirm: true });`;

    await expect(codeModeTransform.execute(script)).rejects.toThrow(
      /destructive operations are disabled in Code Mode/
    );
  });

  it('allows destructive tools when allowDestructive is true', async () => {
    codeModeTransform = new CodeModeTransform({
      workerPoolSize: 1,
      allowDestructive: true,
    });
    server.addTransform(codeModeTransform);
    await server.runToolPipeline();

    const script = `return await callTool('delete_database', { confirm: true });`;

    const result = await codeModeTransform.execute(script);
    expect(result.value).toEqual({ deleted: true });
  });

  it('preserves bypass scope across worker IPC without main thread leakage', async () => {
    // Tool 'inspect_catalog' queries server.runToolPipeline()
    const inspectCatalogTool = new Tool({
      name: 'inspect_catalog',
      description: 'Inspects active tool catalog',
      annotations: { readOnlyHint: true },
      inputSchema: z.object({}),
      handler: async () => {
        const tools = await server.runToolPipeline();
        return {
          isBypassed: CatalogTransform.isBypassed(),
          toolNames: tools.map((t) => t.name),
        };
      },
    });

    server.tool(inspectCatalogTool);

    codeModeTransform = new CodeModeTransform({ workerPoolSize: 1 });
    server.addTransform(codeModeTransform);

    // 1. On main thread outside script, catalog is transformed (meta-tools only)
    const outsideCatalog = await server.runToolPipeline();
    expect(outsideCatalog.map((t) => t.name)).toEqual(['search', 'get_schema', 'execute']);
    expect(CatalogTransform.isBypassed()).toBe(false);

    // 2. Inside worker script, tool executes under withBypass
    const script = `return await callTool('inspect_catalog', {});`;
    const result = await codeModeTransform.execute(script);

    const data = result.value as { isBypassed: boolean; toolNames: string[] };
    expect(data.isBypassed).toBe(true);
    // Inside bypass, it sees the raw tools
    expect(data.toolNames).toContain('get_user');
    expect(data.toolNames).toContain('get_orders');
    expect(data.toolNames).toContain('inspect_catalog');

    // 3. Main thread remains un-bypassed after worker IPC finishes
    expect(CatalogTransform.isBypassed()).toBe(false);
  });

  it('omits a session-disabled tool from a catalog list inside callTool', async () => {
    const store = new SessionVisibilityStore({ maxSessions: 10 });
    server.addTransform(new VisibilityTransform(store));

    const inspectCatalogTool = new Tool({
      name: 'inspect_catalog',
      description: 'Inspects active tool catalog',
      annotations: { readOnlyHint: true },
      inputSchema: z.object({}),
      handler: async (_args, ctx) => {
        const tools = await server.runToolPipeline(ctx);
        return tools.map((tool) => tool.name);
      },
    });
    server.tool(inspectCatalogTool);

    codeModeTransform = new CodeModeTransform({ workerPoolSize: 1 });
    server.addTransform(codeModeTransform);

    const ctx = server.createContext({ extra: { sessionId: 'sess-1' } });
    await ctx.disableTools?.(['get_orders']);

    const result = await codeModeTransform.execute(
      `return await callTool('inspect_catalog', {});`,
      ctx
    );

    const names = result.value as string[];
    expect(names).toContain('get_user');
    expect(names).toContain('inspect_catalog');
    expect(names).not.toContain('get_orders');
    store.destroy();
  });

  it('runs the sandbox when a business tool is also named execute', async () => {
    server.tool(
      new Tool({
        name: 'execute',
        description: 'Business handler',
        inputSchema: z.object({ code: z.string() }),
        handler: async () => ({ business: true }),
      })
    );
    codeModeTransform = new CodeModeTransform({ workerPoolSize: 1 });
    server.addTransform(codeModeTransform);

    const tool = await server.resolveTool('execute');
    const result = await tool!.execute({ code: 'return 1' }, {} as any);
    expect(result).toEqual({ content: [{ type: 'text', text: '1' }] });
  });
});
