import { describe, it, expect, afterEach } from '@jest/globals';
import { z } from 'zod';
import { Tool } from '../../../../core/tool.js';
import { NitroStackServer } from '../../../../core/server.js';
import { ExecutionContext } from '../../../../core/types.js';
import { CodeModeTransform } from '../code-mode.transform.js';
import { AuthorizedToolFilter, buildCodeModeTools } from '../synthetic-tools.js';
import { BM25Engine } from '../../search/bm25.engine.js';
import { MAX_SEARCH_RESULTS } from '../../search/synthetic-tools.js';
import { WorkerPool } from '../worker-pool.js';
import { ExecutionLimits } from '../types.js';
import { assertToolAllowed } from '../destructive-guard.js';

describe('CodeModeTransform & Destructive Guardrails (NITRO-103-M4)', () => {
  let transform: CodeModeTransform | null = null;

  afterEach(async () => {
    if (transform) {
      await transform.dispose();
      transform = null;
    }
  });

  const getFlightTool = new Tool({
    name: 'get_flight',
    description: 'Retrieve flight status by flight number',
    annotations: { readOnlyHint: true },
    inputSchema: z.object({ flightNo: z.string() }),
    handler: async (args: any) => ({ flightNo: args.flightNo, status: 'ON_TIME', gate: 'B12' }),
  });

  const bookSeatTool = new Tool({
    name: 'book_seat',
    description: 'Reserve a seat on a flight',
    annotations: { destructiveHint: false },
    inputSchema: z.object({ flightNo: z.string(), seat: z.string() }),
    handler: async (args: any) => ({ booked: true, seat: args.seat }),
  });

  const cancelAllBookingsTool = new Tool({
    name: 'cancel_all_bookings',
    description: 'Cancels all customer bookings in the database',
    annotations: { destructiveHint: true },
    inputSchema: z.object({ confirm: z.boolean() }),
    handler: async () => ({ cancelled: true }),
  });

  const healthCheckTool = new Tool({
    name: 'health_check',
    description: 'Server health check',
    inputSchema: z.object({}),
    handler: async () => ({ status: 'ok' }),
  });

  describe('Destructive Guardrail (assertToolAllowed)', () => {
    it('permits non-destructive tools when allowDestructive is false', () => {
      expect(() => assertToolAllowed(getFlightTool, false)).not.toThrow();
    });

    it('rejects tools that omit destructiveHint when allowDestructive is false', () => {
      const unannotated = new Tool({
        name: 'update_profile',
        description: 'Updates a profile',
        inputSchema: z.object({}),
        handler: async () => ({ ok: true }),
      });
      expect(() => assertToolAllowed(unannotated, false)).toThrow(
        /destructive operations are disabled in Code Mode batch scripts/
      );
    });

    it('permits tools with readOnlyHint when destructiveHint is omitted', () => {
      expect(() => assertToolAllowed(getFlightTool, false)).not.toThrow();
    });

    it('permits tools that set destructiveHint to false', () => {
      expect(() => assertToolAllowed(bookSeatTool, false)).not.toThrow();
    });

    it('rejects tools with annotations.destructiveHint when allowDestructive is false', () => {
      expect(() => assertToolAllowed(cancelAllBookingsTool, false)).toThrow(
        /destructive operations are disabled in Code Mode batch scripts/
      );
    });

    it('permits destructive tools when allowDestructive is true', () => {
      expect(() => assertToolAllowed(cancelAllBookingsTool, true)).not.toThrow();
    });

    it('rejects tools with legacy destructive property when allowDestructive is false', () => {
      const legacyTool = new Tool({
        name: 'purge_db',
        description: 'Purge entire database',
        inputSchema: z.object({}),
        handler: async () => ({ purged: true }),
      });
      (legacyTool as any).destructive = true;

      expect(() => assertToolAllowed(legacyTool, false)).toThrow(
        /destructive operations are disabled in Code Mode batch scripts/
      );
    });
  });

  describe('Catalog Transformation', () => {
    it('replaces raw tools with 3 synthetic meta-tools (search, get_schema, execute)', async () => {
      transform = new CodeModeTransform({ workerPoolSize: 1 });
      const rawTools = [getFlightTool, bookSeatTool, cancelAllBookingsTool];

      const transformed = await (transform as any).applyTransform(rawTools);

      expect(transformed.length).toBe(3);
      const names = transformed.map((t: Tool) => t.name);
      expect(names).toContain('search');
      expect(names).toContain('get_schema');
      expect(names).toContain('execute');
    });

    it('preserves alwaysVisible tools in the catalog', async () => {
      transform = new CodeModeTransform({
        workerPoolSize: 1,
        alwaysVisible: ['health_check'],
      });
      const rawTools = [getFlightTool, bookSeatTool, healthCheckTool];

      const transformed = await (transform as any).applyTransform(rawTools);

      expect(transformed.length).toBe(4);
      const names = transformed.map((t: Tool) => t.name);
      expect(names).toContain('search');
      expect(names).toContain('get_schema');
      expect(names).toContain('execute');
      expect(names).toContain('health_check');
    });

    it('preserves tools marked with visibility: visible', async () => {
      const visibleTool = new Tool({
        name: 'public_status',
        description: 'Public status endpoint',
        inputSchema: z.object({}),
        handler: async () => ({ online: true }),
      });
      visibleTool.visibility = 'visible';

      transform = new CodeModeTransform({ workerPoolSize: 1 });
      const transformed = await (transform as any).applyTransform([getFlightTool, visibleTool]);

      const names = transformed.map((t: Tool) => t.name);
      expect(names).toContain('public_status');
    });

    it('supports custom names for synthetic tools', async () => {
      transform = new CodeModeTransform({
        workerPoolSize: 1,
        searchToolName: 'tool_search',
        getSchemaToolName: 'inspect_tool',
        executeToolName: 'run_script',
      });

      const transformed = await (transform as any).applyTransform([getFlightTool]);
      const names = transformed.map((t: Tool) => t.name);
      expect(names).toContain('tool_search');
      expect(names).toContain('inspect_tool');
      expect(names).toContain('run_script');
    });

    it('does not resurrect a raw tool the rest of the chain declined to resolve', async () => {
      transform = new CodeModeTransform({ workerPoolSize: 1 });
      await (transform as any).applyTransform([getFlightTool, bookSeatTool]);

      // Falling back to the local index here would let a caller bypass downstream
      // visibility guards for a tool Code Mode removed from the catalog.
      const resolved = await transform.resolveTool('get_flight', async () => undefined);
      expect(resolved).toBeUndefined();
    });

    it('resolves a raw tool when the chain supplies it', async () => {
      transform = new CodeModeTransform({ workerPoolSize: 1 });
      await (transform as any).applyTransform([getFlightTool, bookSeatTool]);

      const resolved = await transform.resolveTool('get_flight', async () => getFlightTool);
      expect(resolved).toBe(getFlightTool);
    });

    it('resolves its own synthetic meta-tools', async () => {
      transform = new CodeModeTransform({ workerPoolSize: 1 });
      await (transform as any).applyTransform([getFlightTool, bookSeatTool]);

      const resolved = await transform.resolveTool('execute', async () => undefined);
      expect(resolved?.name).toBe('execute');
    });

    it('prefers the execute meta-tool over a business tool of the same name', async () => {
      const business = new Tool({
        name: 'execute',
        description: 'Business handler that must not run the script',
        inputSchema: z.object({ code: z.string() }),
        handler: async () => ({ business: true }),
      });
      transform = new CodeModeTransform({ workerPoolSize: 1 });
      await (transform as any).applyTransform([getFlightTool, business]);

      const resolved = await transform.resolveTool('execute', async () => business);
      expect(resolved).not.toBe(business);

      const result = await resolved!.execute({ code: 'return 1' }, {} as ExecutionContext);
      expect(result).toEqual({ content: [{ type: 'text', text: '1' }] });
    });
  });

  describe('Synthetic Meta-Tools Execution', () => {
    it('search tool finds tools via BM25 ranking', async () => {
      transform = new CodeModeTransform({ workerPoolSize: 1 });
      const tools = await (transform as any).applyTransform([getFlightTool, bookSeatTool]);

      const searchTool = tools.find((t: Tool) => t.name === 'search')!;
      const result = await searchTool.execute({ query: 'flight status' }, {} as ExecutionContext);

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('get_flight');
    });

    it('get_schema tool returns parameter schemas and types in markdown JSON format', async () => {
      transform = new CodeModeTransform({ workerPoolSize: 1 });
      const tools = await (transform as any).applyTransform([getFlightTool, bookSeatTool]);

      const getSchemaTool = tools.find((t: Tool) => t.name === 'get_schema')!;
      const result = await getSchemaTool.execute(
        { tools: ['get_flight', 'missing_tool'] },
        {} as ExecutionContext
      );

      expect(result.content[0].text).toContain('### get_flight');
      expect(result.content[0].text).toContain('"flightNo"');
      expect(result.content[0].text).toContain('### missing_tool');
      expect(result.content[0].text).toContain('*Tool not found.*');
    });

    it('execute tool runs guest script in QuickJS sandbox and chains callTool calls', async () => {
      transform = new CodeModeTransform({ workerPoolSize: 1 });
      const tools = await (transform as any).applyTransform([getFlightTool, bookSeatTool]);

      const executeTool = tools.find((t: Tool) => t.name === 'execute')!;
      const script = `
        const flight = await callTool('get_flight', { flightNo: 'AA100' });
        const reservation = await callTool('book_seat', { flightNo: flight.flightNo, seat: '12A' });
        return {
          flightStatus: flight.status,
          assignedSeat: reservation.seat
        };
      `;

      const result = await executeTool.execute({ code: script }, {} as ExecutionContext);
      expect(result.content[0].type).toBe('text');

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual({
        flightStatus: 'ON_TIME',
        assignedSeat: '12A',
      });
    });

    it('execute tool rejects an unannotated tool when allowDestructive is false', async () => {
      transform = new CodeModeTransform({ workerPoolSize: 1, allowDestructive: false });
      const tools = await (transform as any).applyTransform([healthCheckTool]);
      const executeTool = tools.find((t: Tool) => t.name === 'execute')!;
      await expect(
        executeTool.execute(
          { code: `const res = await callTool('health_check', {}); return res.status;` },
          {} as ExecutionContext,
        )
      ).rejects.toThrow(/destructive operations are disabled in Code Mode batch scripts/);
    });

    it('execute tool blocks destructive tools when allowDestructive is false', async () => {
      transform = new CodeModeTransform({
        workerPoolSize: 1,
        allowDestructive: false,
      });
      const tools = await (transform as any).applyTransform([cancelAllBookingsTool]);

      const executeTool = tools.find((t: Tool) => t.name === 'execute')!;
      const script = `
        try {
          await callTool('cancel_all_bookings', { confirm: true });
          return { success: true };
        } catch (err) {
          return { blocked: true, message: err.message };
        }
      `;

      const result = await executeTool.execute({ code: script }, {} as ExecutionContext);
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.blocked).toBe(true);
      expect(parsed.message).toContain('destructive operations are disabled in Code Mode batch scripts');
    });

    it('execute tool allows destructive tools when allowDestructive is true', async () => {
      transform = new CodeModeTransform({
        workerPoolSize: 1,
        allowDestructive: true,
      });
      const tools = await (transform as any).applyTransform([cancelAllBookingsTool]);

      const executeTool = tools.find((t: Tool) => t.name === 'execute')!;
      const script = `
        const res = await callTool('cancel_all_bookings', { confirm: true });
        return res;
      `;

      const result = await executeTool.execute({ code: script }, {} as ExecutionContext);
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.cancelled).toBe(true);
    });

    it('execute tool throws formatted error when script execution fails', async () => {
      transform = new CodeModeTransform({ workerPoolSize: 1 });
      const tools = await (transform as any).applyTransform([getFlightTool]);

      const executeTool = tools.find((t: Tool) => t.name === 'execute')!;
      const badScript = `
        throw new Error('Database disconnected unexpectedly');
      `;

      await expect(executeTool.execute({ code: badScript }, {} as ExecutionContext)).rejects.toThrow(
        /Script execution failed: Database disconnected unexpectedly/
      );
    });
  });

  describe('Integration with NitroStackServer', () => {
    it('integrates seamlessly with NitroStackServer transforms pipeline', async () => {
      const server = new NitroStackServer({ name: 'code-mode-server', version: '1.0.0' });
      server.tool(getFlightTool);
      server.tool(bookSeatTool);

      transform = new CodeModeTransform({ workerPoolSize: 1 });
      server.addTransform(transform);

      const catalog: Tool[] = await server.runToolPipeline();
      expect(catalog.length).toBe(3);
      expect(catalog.map((t: Tool) => t.name)).toEqual(['search', 'get_schema', 'execute']);

      // Execute through server
      const executeTool = catalog.find((t: Tool) => t.name === 'execute')!;

      const res: any = await executeTool.execute(
        {
          code: `
          const f = await callTool('get_flight', { flightNo: 'UA999' });
          return f.gate;
        `,
        },
        {} as ExecutionContext
      );

      expect(res.content[0].text).toBe('B12');
    });

    it('caps search results at 20 tools', async () => {
      const tools = Array.from({ length: 25 }, (_, i) => new Tool({
        name: `widget_tool_${i}`,
        description: 'inventory widget record',
        annotations: { readOnlyHint: true },
        inputSchema: z.object({}),
        handler: async () => ({}),
      }));
      const engine = new BM25Engine<Tool>();
      engine.indexTools(tools);
      const limits: ExecutionLimits = {
        timeoutMs: 1000,
        memoryLimitMb: 32,
        maxToolCalls: 5,
        allowDestructive: false,
      };
      const { searchTool } = buildCodeModeTools(
        engine,
        new Map(tools.map((tool) => [tool.name, tool])),
        {} as WorkerPool,
        limits
      );
      const res = (await searchTool.execute({ query: 'inventory', limit: 10_000 }, {} as ExecutionContext)) as {
        content: Array<{ text: string }>;
      };
      const lines = res.content[0].text.split('\n').filter((line) => line.startsWith('- '));
      expect(lines).toHaveLength(20);
    });

    it('keeps a single worker pool across concurrent catalog rebuilds', async () => {
      transform = new CodeModeTransform({ workerPoolSize: 2 });
      const tools = [getFlightTool, bookSeatTool];

      await Promise.all([transform.transformTools(tools), transform.transformTools(tools)]);

      const pool = transform.getWorkerPool();
      expect(pool).not.toBeNull();
      expect(pool!.getStats().totalWorkers).toBe(2);
      expect([...transform.getRawTools().keys()].sort()).toEqual(['book_seat', 'get_flight']);

      await transform.dispose();
      await expect(transform.transformTools(tools)).rejects.toThrow(/CodeModeTransform is disposed/);
      await transform.dispose();
      transform = null;
    });

    it('searches a complete catalog while another rebuild is in flight', async () => {
      transform = new CodeModeTransform({ workerPoolSize: 1 });
      await transform.transformTools([getFlightTool]);
      const listed = transform.transformTools([getFlightTool, bookSeatTool]);
      const search = await transform.resolveTool('search', async () => undefined);
      const result = (await search!.execute({ query: 'flight', limit: 5 }, {} as ExecutionContext)) as {
        content: Array<{ text: string }>;
      };
      await listed;
      expect(transform.getRawTools().size).toBeGreaterThan(0);
      expect(
        result.content[0].text.includes('get_flight') || result.content[0].text.includes('book_seat'),
      ).toBe(true);
    });

  });

  describe('catalog browsing', () => {
    const limits: ExecutionLimits = {
      timeoutMs: 1000,
      memoryLimitMb: 32,
      maxToolCalls: 5,
      allowDestructive: false,
    };

    function searchHarness(tools: Tool[], filterAuthorized?: AuthorizedToolFilter) {
      const engine = new BM25Engine<Tool>();
      engine.indexTools(tools);
      return buildCodeModeTools(
        engine,
        new Map(tools.map((tool) => [tool.name, tool])),
        {} as WorkerPool,
        limits,
        {},
        filterAuthorized
      ).searchTool;
    }

    function catalogTool(name: string, description: string) {
      return new Tool({
        name,
        description,
        annotations: { readOnlyHint: true },
        inputSchema: z.object({}),
        handler: async () => ({}),
      });
    }

    async function textOf(tool: Tool, args: Record<string, unknown>) {
      const res = (await tool.execute(args, {} as ExecutionContext)) as {
        content: Array<{ text: string }>;
      };
      return res.content[0].text;
    }

    function briefNames(text: string) {
      return text
        .split('\n')
        .filter((line) => line.startsWith('- **'))
        .map((line) => line.slice(4, line.indexOf('**', 4)));
    }

    it('does not require a query', () => {
      const schema = searchHarness([getFlightTool]).inputSchema as { required?: string[] };
      expect(schema.required ?? []).not.toContain('query');
    });

    it.each([{}, { query: '' }, { query: '*' }, { query: 'show tools' }, { query: 'what can you do?' }, { query: 42 }])(
      'lists the catalog in brief for %j',
      async (args) => {
        const text = await textOf(searchHarness([getFlightTool, bookSeatTool]), args);
        expect(text).toContain('- **get_flight**');
        expect(text).toContain('- **book_seat**');
        expect(text).not.toContain('No matching tools found.');
        expect(text).not.toContain('More tools are available');
      }
    );

    it('respects an explicit limit and appends a truncation footer', async () => {
      const text = await textOf(searchHarness([getFlightTool, bookSeatTool]), { limit: 1 });
      const lines = text.split('\n').filter((line) => line.startsWith('- '));
      expect(lines).toHaveLength(1);
      expect(text).toContain('More tools are available. Call search with keywords');
    });

    it('caps catalog browsing at 20 tools and appends a footer past that', async () => {
      const catalog = Array.from({ length: 25 }, (_, i) => catalogTool(`catalog_tool_${i}`, `Tool number ${i}`));
      const text = await textOf(searchHarness(catalog), {});
      const lines = text.split('\n').filter((line) => line.startsWith('- '));
      expect(lines).toHaveLength(20);
      expect(text).toContain('More tools are available. Call search with keywords');
    });

    it('keeps "show stock" on BM25 and applies the default limit of 5', async () => {
      const stock = catalogTool('check_stock', 'Check stock levels in the warehouse');
      const widgets = Array.from({ length: 8 }, (_, i) =>
        catalogTool(`inventory_widget_${i}`, 'inventory widget record')
      );
      const searchTool = searchHarness([stock, ...widgets]);

      const browseBoundary = await textOf(searchTool, { query: 'show stock' });
      expect(browseBoundary).toContain('- **check_stock**');
      expect(browseBoundary).not.toContain('inventory_widget_0');
      expect(browseBoundary).not.toContain('More tools are available');

      const ranked = await textOf(searchTool, { query: 'inventory' });
      const lines = ranked.split('\n').filter((line) => line.startsWith('- '));
      expect(lines).toHaveLength(5);
      expect(ranked).not.toContain('More tools are available');
      expect(ranked).not.toContain('check_stock');
    });

    it('fills the browse page when the first registry tools are denied', async () => {
      const catalog = Array.from({ length: 30 }, (_, i) => catalogTool(`catalog_tool_${i}`, `Tool number ${i}`));
      const denied = new Set(catalog.slice(0, 8).map((tool) => tool.name));
      transform = new CodeModeTransform({ workerPoolSize: 1 });
      transform.onRegister({
        getTools: () => new Map(catalog.map((tool) => [tool.name, tool])),
        resolveTool: async (name) => {
          if (denied.has(name)) {
            throw new Error('denied');
          }
          return catalog.find((tool) => tool.name === name);
        },
      });

      const tools = await transform.transformTools(catalog);
      const searchTool = tools.find((tool) => tool.name === 'search')!;
      const text = await textOf(searchTool, {});
      const names = briefNames(text);
      expect(names).toHaveLength(20);
      expect(names[0]).toBe('catalog_tool_8');
      expect(names[19]).toBe('catalog_tool_27');
      expect(names.some((name) => /^catalog_tool_[0-7]$/.test(name))).toBe(false);
      expect(text).toContain('More tools are available. Call search with keywords');
    });

    it('stops the default authorization filter at limit + 1', async () => {
      const catalog = Array.from({ length: 30 }, (_, i) => catalogTool(`catalog_tool_${i}`, `Tool number ${i}`));
      let lookups = 0;
      const raw = new Map(catalog.map((tool) => [tool.name, tool]));
      const watched = new Proxy(raw, {
        get(target, prop, receiver) {
          if (prop === 'get') {
            return (name: string) => {
              lookups += 1;
              return target.get(name);
            };
          }
          const value = Reflect.get(target, prop, receiver);
          return typeof value === 'function' ? value.bind(target) : value;
        },
      });
      const engine = new BM25Engine<Tool>();
      engine.indexTools(catalog);
      const searchTool = buildCodeModeTools(engine, watched, {} as WorkerPool, limits).searchTool;

      const names = briefNames(await textOf(searchTool, {}));
      expect(names).toHaveLength(20);
      expect(lookups).toBe(21);
    });

    it('passes maxCount only while browsing', async () => {
      const catalog = [
        catalogTool('check_stock', 'Check stock levels in the warehouse'),
        ...Array.from({ length: 8 }, (_, i) => catalogTool(`inventory_widget_${i}`, 'inventory widget record')),
      ];
      const calls: Array<number | undefined> = [];
      const filter: AuthorizedToolFilter = async (names, _context, maxCount) => {
        calls.push(maxCount);
        const byName = new Map(catalog.map((tool) => [tool.name, tool]));
        const authorized: Tool[] = [];
        for (const name of names) {
          if (maxCount !== undefined && authorized.length >= maxCount) break;
          const tool = byName.get(name);
          if (tool) authorized.push(tool);
        }
        return authorized;
      };

      const searchTool = searchHarness(catalog, filter);
      await textOf(searchTool, {});
      await textOf(searchTool, { query: 'inventory' });
      expect(calls).toEqual([MAX_SEARCH_RESULTS + 1, undefined]);
    });
  });
});
