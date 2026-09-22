import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { z } from 'zod';
import { Tool } from '../../tool.js';
import { NitroStackServer } from '../../server.js';
import { CodeModeTransform } from '../code-mode/code-mode.transform.js';
import { BM25SearchTransform } from '../search/bm25-search.transform.js';
import { RegexSearchTransform } from '../search/regex-search.transform.js';
import { VisibilityTransform } from '../visibility/visibility.transform.js';
import { SessionVisibilityStore } from '../visibility/session-store.js';

/**
 * Regression coverage for the authorization and availability defects found in PR #347.
 *
 * These drive the server's public resolution surface rather than transform internals,
 * because every one of these bugs was invisible to a test that reached past it.
 */
describe('Transform pipeline authorization regressions (PR #347)', () => {
  const SESSION = 'session-under-test';

  let server: NitroStackServer;
  let sessionStore: SessionVisibilityStore;
  let codeMode: CodeModeTransform | undefined;

  const publicTool = new Tool({
    name: 'lookup_order',
    description: 'Look up an order by identifier',
    annotations: { readOnlyHint: true },
    inputSchema: z.object({ id: z.number() }),
    handler: async (args: any) => ({ id: args.id, status: 'shipped' }),
  });

  const refundTool = new Tool({
    name: 'process_refund',
    description: 'Issue a refund against a completed order',
    annotations: { destructiveHint: false },
    inputSchema: z.object({ id: z.number() }),
    visibility: 'hidden',
    handler: async () => ({ refunded: true }),
  });

  beforeEach(() => {
    sessionStore = new SessionVisibilityStore();
    server = new NitroStackServer({
      name: 'authz-regression',
      version: '1.0.0',
      transforms: [new VisibilityTransform(sessionStore)],
    });
    server.tool(publicTool);
    server.tool(refundTool);
  });

  afterEach(async () => {
    await server.stop();
    sessionStore.destroy();
    codeMode = undefined;
  });

  describe('Code Mode sandbox honours session visibility', () => {
    beforeEach(async () => {
      codeMode = new CodeModeTransform({ workerPoolSize: 1 });
      server.addTransform(codeMode);
      await server.runToolPipeline();
    });

    it('rejects callTool for a tool hidden from the session', async () => {
      const ctx = server.createExecutionContext({}, { sessionId: SESSION } as any);

      const result = await codeMode!
        .execute(
          `try { await callTool('process_refund', { id: 1 }); return 'REACHED'; }
           catch (e) { return 'DENIED: ' + e.message; }`,
          ctx
        );

      expect(result.value).toEqual(expect.stringContaining('DENIED'));
      expect(result.value).not.toEqual('REACHED');
    });

    it('allows callTool once the session enables the tool', async () => {
      sessionStore.enableTools(SESSION, ['process_refund']);
      const ctx = server.createExecutionContext({}, { sessionId: SESSION } as any);

      const result = await codeMode!.execute(
        `const r = await callTool('process_refund', { id: 1 }); return r.refunded;`,
        ctx
      );

      expect(result.value).toBe(true);
    });

    it('omits hidden tools from the sandbox search meta-tool', async () => {
      const ctx = server.createExecutionContext({}, { sessionId: SESSION } as any);
      const searchTool = await server.resolveTool('search', ctx);

      const res: any = await searchTool!.execute({ query: 'refund order' }, ctx);
      expect(res.content[0].text).toContain('lookup_order');
      expect(res.content[0].text).not.toContain('process_refund');
    });

    it('does not disclose the schema of a hidden tool via get_schema', async () => {
      const ctx = server.createExecutionContext({}, { sessionId: SESSION } as any);
      const schemaTool = await server.resolveTool('get_schema', ctx);

      const res: any = await schemaTool!.execute({ tools: ['process_refund'] }, ctx);
      expect(res.content[0].text).toContain('Tool not found');
      expect(res.content[0].text).not.toContain('properties');
    });

    it('validates sandbox arguments against the target schema before executing', async () => {
      const ctx = server.createExecutionContext({}, { sessionId: SESSION } as any);

      const result = await codeMode!.execute(
        `try { await callTool('lookup_order', { id: 'not-a-number' }); return 'REACHED'; }
         catch (e) { return 'REJECTED'; }`,
        ctx
      );

      expect(result.value).toBe('REJECTED');
    });
  });

  describe('resolveTool does not resurrect filtered tools', () => {
    it('denies a hidden tool behind CodeModeTransform', async () => {
      codeMode = new CodeModeTransform({ workerPoolSize: 1 });
      server.addTransform(codeMode);
      await server.runToolPipeline();

      const ctx = server.createExecutionContext({}, { sessionId: SESSION } as any);
      await expect(server.resolveTool('process_refund', ctx)).rejects.toMatchObject({
        code: -32601,
      });
    });

    it('denies a hidden tool behind BM25SearchTransform', async () => {
      server.addTransform(new BM25SearchTransform());
      await server.runToolPipeline();

      const ctx = server.createExecutionContext({}, { sessionId: SESSION } as any);
      await expect(server.resolveTool('process_refund', ctx)).rejects.toMatchObject({
        code: -32601,
      });
    });

    it('denies a hidden tool routed through the call_tool proxy', async () => {
      server.addTransform(new BM25SearchTransform());
      await server.runToolPipeline();

      const ctx = server.createExecutionContext({}, { sessionId: SESSION } as any);
      const callTool = await server.resolveTool('call_tool', ctx);

      await expect(
        callTool!.execute({ name: 'process_refund', arguments: { id: 1 } }, ctx)
      ).rejects.toThrow();
    });
  });

  describe('Regex search is not a denial-of-service vector', () => {
    it('completes promptly on a catastrophic-backtracking pattern', async () => {
      const transform = new RegexSearchTransform();
      await transform.transformTools([
        new Tool({
          name: 'a'.repeat(40),
          description: 'a'.repeat(400),
          inputSchema: z.object({}),
          handler: async () => ({}),
        }),
      ]);

      const searchTool = await transform.resolveTool('search_tools', async () => undefined);

      const started = Date.now();
      await searchTool!.execute({ query: '(a+)+$' }, {} as any);
      expect(Date.now() - started).toBeLessThan(1000);
    });

    it('does not stall on a nested quantifier when regex is opted in', async () => {
      const transform = new RegexSearchTransform({ allowRegex: true });
      await transform.transformTools([
        new Tool({
          name: 'a'.repeat(40),
          description: 'a'.repeat(400),
          inputSchema: z.object({}),
          handler: async () => ({}),
        }),
      ]);

      const searchTool = await transform.resolveTool('search_tools', async () => undefined);
      const started = Date.now();
      await searchTool!.execute({ query: '(a+)+$' }, {} as any);
      expect(Date.now() - started).toBeLessThan(1000);
    });

    it('treats the query literally unless allowRegex is set', async () => {
      const tool = new Tool({
        name: 'exact_name',
        description: 'A tool',
        inputSchema: z.object({}),
        handler: async () => ({}),
      });

      const literal = new RegexSearchTransform();
      await literal.transformTools([tool]);
      const literalSearch = await literal.resolveTool('search_tools', async () => undefined);
      const literalRes: any = await literalSearch!.execute({ query: '^exact_.*' }, {} as any);
      expect(literalRes.content[0].text).not.toContain('exact_name');

      const regex = new RegexSearchTransform({ allowRegex: true });
      await regex.transformTools([tool]);
      const regexSearch = await regex.resolveTool('search_tools', async () => undefined);
      const regexRes: any = await regexSearch!.execute({ query: '^exact_.*' }, {} as any);
      expect(regexRes.content[0].text).toContain('exact_name');
    });
  });

  describe('Transform lifecycle', () => {
    it('disposes transforms on server.stop so sandbox workers do not outlive it', async () => {
      const transform = new CodeModeTransform({ workerPoolSize: 2 });
      server.addTransform(transform);
      await server.runToolPipeline();
      await transform.execute('return 1;');

      expect(transform.getWorkerPool()!.getStats().totalWorkers).toBeGreaterThan(0);

      await server.stop();

      expect(transform.getWorkerPool()).toBeNull();
    });
  });
});
