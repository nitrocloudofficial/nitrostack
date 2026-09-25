import { describe, it, expect, beforeEach } from '@jest/globals';
import { z } from 'zod';
import { Tool } from '../../../../core/tool.js';
import { Guard } from '../../../../core/guards/guard.interface.js';
import { ExecutionContext } from '../../../../core/types.js';
import { BM25SearchTransform } from '../bm25-search.transform.js';
import { NitroStackServer } from '../../../../core/server.js';

class MockRoleGuard implements Guard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const role = (context as any)?.role;
    if (role !== 'admin') {
      throw new Error('Access denied by guard: insufficient privileges');
    }
    return true;
  }
}

describe('BM25 Progressive Discovery Suite (NITRO-102-M4)', () => {
  let refundTool: Tool;
  let mergePrTool: Tool;
  let explainSqlTool: Tool;
  let sendDigestTool: Tool;
  let authLoginTool: Tool;
  let adminWipeTool: Tool;
  let toolsCatalog: Tool[];

  beforeEach(() => {
    refundTool = new Tool({
      name: 'stripe_refund_payment',
      description: 'Refund customer order payment transaction',
      inputSchema: z.object({
        chargeId: z.string().describe('Stripe payment charge ID'),
        amount: z.number().optional().describe('Partial refund amount in cents'),
      }),
      handler: async (args: any) => ({ refunded: true, chargeId: args.chargeId }),
    });

    mergePrTool = new Tool({
      name: 'github_merge_pr',
      description: 'Merge pull request to main branch in GitHub repository',
      inputSchema: z.object({
        pr_id: z.number().describe('Pull request number'),
        commit_title: z.string().describe('Squash commit message title'),
      }),
      handler: async (args: any) => ({ merged: true, pr_id: args.pr_id, title: args.commit_title }),
    });

    explainSqlTool = new Tool({
      name: 'pg_explain_plan',
      description: 'Explain slow sql query execution plan and analyze cost',
      inputSchema: z.object({
        query: z.string().describe('Raw SQL select query string'),
      }),
      handler: async (args: any) => ({ plan: 'Seq Scan on users', query: args.query }),
    });

    sendDigestTool = new Tool({
      name: 'send_digest',
      description: 'Publish weekly executive update report',
      inputSchema: z.object({
        slack_webhook_url: z.string().describe('Slack incoming webhook URL for delivery'),
        body: z.string().describe('Formatted markdown content of digest'),
      }),
      handler: async () => ({ sent: true }),
    });

    authLoginTool = new Tool({
      name: 'auth_login',
      description: 'Authenticate user with corporate credentials',
      inputSchema: z.object({
        token: z.string(),
      }),
      handler: async () => ({ authenticated: true }),
    });

    adminWipeTool = new Tool({
      name: 'admin_wipe_cache',
      description: 'Purge all caches and restart workers',
      inputSchema: z.object({
        confirm: z.boolean(),
      }),
      guards: [MockRoleGuard],
      handler: async () => ({ wiped: true }),
    });

    toolsCatalog = [refundTool, mergePrTool, explainSqlTool, sendDigestTool, authLoginTool, adminWipeTool];
  });

  describe('Natural Language Ranking & Precision', () => {
    it('ranks domain-specific tools top-1 on natural language queries', async () => {
      const transform = new BM25SearchTransform();
      await transform.transformTools(toolsCatalog);

      const searchTool = await transform.resolveTool('search_tools', async () => undefined);
      expect(searchTool).toBeDefined();

      // Query 1: "refund customer order payment" -> stripe_refund_payment (rank #1)
      const res1 = (await searchTool!.execute({ query: 'refund customer order payment', limit: 1 }, {} as any)) as any;
      expect(res1.content[0].text).toContain('stripe_refund_payment');

      // Query 2: "merge pull request to main" -> github_merge_pr (rank #1)
      const res2 = (await searchTool!.execute({ query: 'merge pull request to main', limit: 1 }, {} as any)) as any;
      expect(res2.content[0].text).toContain('github_merge_pr');

      // Query 3: "explain slow sql query" -> pg_explain_plan (rank #1)
      const res3 = (await searchTool!.execute({ query: 'explain slow sql query', limit: 1 }, {} as any)) as any;
      expect(res3.content[0].text).toContain('pg_explain_plan');
    });

    it('matches on parameter names and descriptions', async () => {
      const transform = new BM25SearchTransform();
      await transform.transformTools(toolsCatalog);

      const searchTool = await transform.resolveTool('search_tools', async () => undefined);

      // Tool: 'send_digest' with param 'slack_webhook_url'
      // Query: "slack webhook" -> ranks 'send_digest' in top-3
      const res = (await searchTool!.execute({ query: 'slack webhook', limit: 3 }, {} as any)) as any;
      expect(res.content[0].text).toContain('send_digest');
    });

    it('formats output according to requested detail level', async () => {
      const transform = new BM25SearchTransform();
      await transform.transformTools(toolsCatalog);

      const searchTool = await transform.resolveTool('search_tools', async () => undefined);

      // 1. detail: 'brief' returns single-line bullet points
      const briefRes = (await searchTool!.execute(
        { query: 'github merge', detail: 'brief', limit: 1 },
        {} as any
      )) as any;
      expect(briefRes.content[0].text).toContain('- **github_merge_pr**:');
      expect(briefRes.content[0].text).not.toContain('**Parameters**:');

      // 2. detail: 'detailed' returns markdown section with parameter lists and types
      const detailedRes = (await searchTool!.execute(
        { query: 'github merge', detail: 'detailed', limit: 1 },
        {} as any
      )) as any;
      expect(detailedRes.content[0].text).toContain('### github_merge_pr');
      expect(detailedRes.content[0].text).toContain('**Parameters**:');
      expect(detailedRes.content[0].text).toContain('`pr_id`');

      // 3. detail: 'full' returns complete embedded JSON Schema
      const fullRes = (await searchTool!.execute(
        { query: 'github merge', detail: 'full', limit: 1 },
        {} as any
      )) as any;
      expect(fullRes.content[0].text).toContain('### github_merge_pr');
      expect(fullRes.content[0].text).toContain('```json');
    });

    it('does not re-index catalog when catalog hash is identical', async () => {
      const transform = new BM25SearchTransform();
      const statsBefore = transform.getEngineStats();
      expect(statsBefore.contentHash).toBe('');

      // First run: indexes catalog
      await transform.transformTools(toolsCatalog);
      const statsAfterFirst = transform.getEngineStats();
      expect(statsAfterFirst.docCount).toBe(6);
      const hash = statsAfterFirst.contentHash;
      expect(hash).not.toBe('');

      // Spy on engine buildIndex to verify cache hit
      const engine = transform.getEngine();
      let indexCalled = false;
      const origBuildIndex = engine.buildIndex.bind(engine);
      engine.buildIndex = (...args: any[]) => {
        indexCalled = true;
        return (origBuildIndex as any)(...args);
      };

      // Second run: should hit cache and NOT rebuild index
      await transform.transformTools(toolsCatalog);
      expect(indexCalled).toBe(false);
      expect(transform.getEngineStats().contentHash).toBe(hash);
    });
  });

  describe('call_tool Proxy Execution', () => {
    it('successfully executes target tool with valid arguments and execution context', async () => {
      const transform = new BM25SearchTransform();
      await transform.transformTools(toolsCatalog);

      const callTool = await transform.resolveTool('call_tool', async () => undefined);
      expect(callTool).toBeDefined();

      const result = await callTool!.execute(
        {
          name: 'github_merge_pr',
          arguments: { pr_id: 42, commit_title: 'Ship v2' },
        },
        {} as any
      );

      expect(result).toEqual({ merged: true, pr_id: 42, title: 'Ship v2' });
    });

    it('rejects execution when required arguments are missing', async () => {
      const transform = new BM25SearchTransform();
      await transform.transformTools(toolsCatalog);

      const callTool = await transform.resolveTool('call_tool', async () => undefined);

      await expect(
        callTool!.execute({ name: 'github_merge_pr', arguments: {} }, {} as any)
      ).rejects.toThrow(/Parameter 'pr_id'/);
    });

    it('runs guards and middleware attached to the target tool', async () => {
      const transform = new BM25SearchTransform();
      await transform.transformTools(toolsCatalog);

      const callTool = await transform.resolveTool('call_tool', async () => undefined);

      // Non-admin context should be rejected by MockRoleGuard
      const nonAdminCtx = { role: 'developer' } as unknown as ExecutionContext;
      await expect(
        callTool!.execute({ name: 'admin_wipe_cache', arguments: { confirm: true } }, nonAdminCtx)
      ).rejects.toThrow('Access denied by guard: insufficient privileges');

      // Admin context succeeds
      const adminCtx = { role: 'admin' } as unknown as ExecutionContext;
      const result = await callTool!.execute(
        { name: 'admin_wipe_cache', arguments: { confirm: true } },
        adminCtx
      );
      expect(result).toEqual({ wiped: true });
    });

    it('allows alwaysVisible tools to be called directly without call_tool', async () => {
      const server = new NitroStackServer({
        name: 'test-server',
        version: '1.0.0',
        transforms: [
          new BM25SearchTransform({
            alwaysVisible: ['auth_login'],
          }),
        ],
      });

      // Register tools on server
      server.tool(refundTool);
      server.tool(authLoginTool);

      // Verify transformed tools/list: contains search_tools, call_tool, auth_login
      const catalog = await server.runToolPipeline();
      const names = catalog.map((t) => t.name);
      expect(names).toContain('search_tools');
      expect(names).toContain('call_tool');
      expect(names).toContain('auth_login');
      expect(names).not.toContain('stripe_refund_payment');

      // Direct invocation of alwaysVisible tool succeeds
      const resolvedDirect = await server.resolveTool('auth_login');
      expect(resolvedDirect).toBeDefined();
      const result = await resolvedDirect!.execute({ token: 'test_token' }, {} as any);
      expect(result).toEqual({ authenticated: true });
    });
  });

  it('caps a search at 20 tools', async () => {
    const tools = Array.from({ length: 25 }, (_, i) => new Tool({
      name: `widget_tool_${i}`,
      description: 'inventory widget record',
      inputSchema: z.object({}),
      handler: async () => ({}),
    }));
    const transform = new BM25SearchTransform();
    await transform.transformTools(tools);
    const searchTool = await transform.resolveTool('search_tools', async () => undefined);
    const res = (await searchTool!.execute(
      { query: 'inventory', limit: 10_000, detail: 'brief' },
      {} as any
    )) as { content: Array<{ text: string }> };
    const lines = res.content[0].text.split('\n').filter((line) => line.startsWith('- '));
    expect(lines).toHaveLength(20);
  });
});
