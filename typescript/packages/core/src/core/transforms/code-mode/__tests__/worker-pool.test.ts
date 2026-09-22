import { describe, it, expect, afterEach } from '@jest/globals';
import { z } from 'zod';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Tool } from '../../../../core/tool.js';
import { Guard } from '../../../../core/guards/guard.interface.js';
import { ExecutionContext } from '../../../../core/types.js';
import { WorkerPool } from '../worker-pool.js';
import { ExecutionLimits } from '../types.js';

class MockAdminGuard implements Guard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const role = (context as any)?.role;
    if (role !== 'admin') {
      throw new Error('Guard access denied: requires admin role');
    }
    return true;
  }
}

describe('WorkerPool & Bidirectional IPC Tool Bridge (NITRO-103-M2)', () => {
  let pool: WorkerPool | null = null;

  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const workerPath = path.resolve(
    currentDir,
    '../../../../../../dist/core/transforms/code-mode/sandbox.worker.js'
  );

  afterEach(async () => {
    if (pool) {
      await pool.dispose();
      pool = null;
    }
  });

  const defaultLimits: ExecutionLimits = {
    timeoutMs: 2000,
    memoryLimitMb: 50,
    maxToolCalls: 10,
    allowDestructive: false,
  };

  const getFlightTool = new Tool({
    name: 'get_flight',
    description: 'Retrieve flight status',
    inputSchema: z.object({ flightNo: z.string() }),
    handler: async (args: any) => ({ flightNo: args.flightNo, status: 'ON_TIME' }),
  });

  const bookFlightTool = new Tool({
    name: 'book_flight',
    description: 'Book flight ticket seat',
    inputSchema: z.object({ flightNo: z.string() }),
    annotations: {
      destructiveHint: true,
    },
    handler: async () => ({ booked: true }),
  });

  const adminTool = new Tool({
    name: 'admin_action',
    description: 'Perform restricted administrative action',
    inputSchema: z.object({}),
    guards: [MockAdminGuard],
    handler: async () => ({ success: true }),
  });

  const toolsMap = new Map<string, Tool>([
    ['get_flight', getFlightTool],
    ['book_flight', bookFlightTool],
    ['admin_action', adminTool],
  ]);

  it('executes simple JavaScript expressions inside worker thread', async () => {
    pool = new WorkerPool(2, (name) => toolsMap.get(name), workerPath);

    const result = await pool.executeScript(
      'const a = 10; const b = 20; return a + b;',
      defaultLimits
    );

    expect(result.success).toBe(true);
    expect(result.value).toBe(30);
    expect(result.toolCallCount).toBe(0);
  });

  it('captures sandboxed console output', async () => {
    pool = new WorkerPool(1, (name) => toolsMap.get(name), workerPath);

    const result = await pool.executeScript(
      'console.log("Hello", "from", "worker"); return 42;',
      defaultLimits
    );

    expect(result.success).toBe(true);
    expect(result.logs.length).toBe(1);
    expect(result.logs[0].message).toBe('Hello from worker');
  });

  it('dispatches callTool across IPC to host and returns structured result', async () => {
    pool = new WorkerPool(2, (name) => toolsMap.get(name), workerPath);

    const code = `
      const flight = await callTool('get_flight', { flightNo: 'BA117' });
      return flight.status;
    `;

    const result = await pool.executeScript(code, defaultLimits);

    expect(result.success).toBe(true);
    expect(result.value).toBe('ON_TIME');
    expect(result.toolCallCount).toBe(1);
  });

  it('blocks destructive tools when allowDestructive is false', async () => {
    pool = new WorkerPool(1, (name) => toolsMap.get(name), workerPath);

    const code = `
      try {
        await callTool('book_flight', { flightNo: 'BA117' });
        return 'unexpected';
      } catch (err) {
        return err.message;
      }
    `;

    const result = await pool.executeScript(code, { ...defaultLimits, allowDestructive: false });

    expect(result.success).toBe(true);
    expect(result.value).toContain('destructive operations are disabled');
  });

  it('activates guards attached to target tool during IPC dispatch', async () => {
    pool = new WorkerPool(1, (name) => toolsMap.get(name), workerPath);

    const code = `
      try {
        await callTool('admin_action', {});
        return 'allowed';
      } catch (err) {
        return err.message;
      }
    `;

    // 1. Non-admin execution should fail guard
    const nonAdminCtx = { role: 'user' } as unknown as ExecutionContext;
    const result1 = await pool.executeScript(code, defaultLimits, nonAdminCtx);
    expect(result1.value).toContain('Guard access denied: requires admin role');

    // 2. Admin execution passes guard
    const adminCtx = { role: 'admin' } as unknown as ExecutionContext;
    const result2 = await pool.executeScript(
      "return await callTool('admin_action', {});",
      defaultLimits,
      adminCtx
    );
    expect(result2.value).toEqual({ success: true });
  });

  it('terminates runaway script on infinite loop via Tier 1 interrupt without crashing worker', async () => {
    pool = new WorkerPool(1, (name) => toolsMap.get(name), workerPath);

    // Tight timeout (500ms)
    const tightLimits: ExecutionLimits = {
      ...defaultLimits,
      timeoutMs: 500,
    };

    // Infinite synchronous while loop in guest code
    const infiniteLoopCode = 'while (true) {}';

    const result = await pool.executeScript(infiniteLoopCode, tightLimits);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/interrupted|timeout exceeded/);

    // Verify worker remains healthy and pool can immediately process new tasks
    const followupResult = await pool.executeScript('return 100 * 2;', defaultLimits);
    expect(followupResult.success).toBe(true);
    expect(followupResult.value).toBe(200);
  });

  it('handles worker termination and respawns replacement in pool', async () => {
    pool = new WorkerPool(1, (name) => toolsMap.get(name), workerPath);
    await pool.initialize();

    // Force terminate the underlying worker
    const workers = (pool as any).workers;
    expect(workers.length).toBe(1);
    const worker = workers[0];
    await worker.terminate();

    // Wait briefly for exit handler to trigger replacement
    await new Promise((r) => setTimeout(r, 50));

    // Followup task should succeed on newly spawned worker
    const followup = await pool.executeScript('return 42;', defaultLimits);
    expect(followup.success).toBe(true);
    expect(followup.value).toBe(42);
  });


  it('triggers circuit breaker when tool calls exceed maxToolCalls', async () => {
    pool = new WorkerPool(1, (name) => toolsMap.get(name), workerPath);

    const code = `
      try {
        for (let i = 0; i < 5; i++) {
          await callTool('get_flight', { flightNo: 'BA' + i });
        }
        return 'finished';
      } catch (err) {
        return err.message;
      }
    `;

    const result = await pool.executeScript(code, { ...defaultLimits, maxToolCalls: 2 });
    expect(result.value).toContain('Circuit breaker: exceeded maximum allowed tool calls (2)');
  });
});
