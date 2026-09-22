import { describe, it, expect, afterEach } from '@jest/globals';
import { z } from 'zod';
import { Tool } from '../../../../core/tool.js';
import { NitroStackServer } from '../../../../core/server.js';
import { ExecutionContext } from '../../../../core/types.js';
import { CodeModeTransform } from '../code-mode.transform.js';
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
    inputSchema: z.object({ flightNo: z.string() }),
    handler: async (args: any) => ({ flightNo: args.flightNo, status: 'ON_TIME', gate: 'B12' }),
  });

  const bookSeatTool = new Tool({
    name: 'book_seat',
    description: 'Reserve a seat on a flight',
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

  });
});
