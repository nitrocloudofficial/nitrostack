import { getQuickJS } from 'quickjs-emscripten';
import { evaluateGuestScript, memoryUsedMb } from '../guest-evaluator.js';
import { QuickJsWasmSandboxProvider } from '../quickjs-wasm.provider.js';
import { ExecutionLimits } from '../types.js';

describe('memoryUsedMb', () => {
  it('prefers a numeric reading when the text dump is unrecognized', () => {
    const mb = memoryUsedMb({
      computeMemoryUsage: () => 2 * 1024 * 1024,
      dumpMemoryUsage: () => 'unrecognized format',
    });
    expect(mb).toBe(2);
  });

  it('reports 0 when neither the numeric API nor the text dump can be read', () => {
    expect(memoryUsedMb({
      computeMemoryUsage: () => { throw new Error('nope'); },
      dumpMemoryUsage: () => 'unrecognized format',
    })).toBe(0);
  });
});

describe('QuickJS WASM Runtime & Evaluator (NITRO-103-M3)', () => {
  const defaultLimits: ExecutionLimits = {
    timeoutMs: 3000,
    memoryLimitMb: 32,
    maxToolCalls: 10,
    allowDestructive: false,
  };

  it('evaluates basic ES2020 guest code returning objects and primitives', async () => {
    const code = `
      const a = 10;
      const b = 20;
      return { sum: a + b, message: 'hello from quickjs' };
    `;

    const result = await evaluateGuestScript(code, defaultLimits, async () => ({}));

    expect(result.success).toBe(true);
    expect(result.value).toEqual({
      sum: 30,
      message: 'hello from quickjs',
    });
    expect(result.toolCallCount).toBe(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('yields, dispatches callTool asynchronously, pumps microtasks, and resumes seamlessly', async () => {
    const code = `
      const user = await callTool('get_user', { id: 42 });
      const orders = await callTool('get_orders', { userId: user.id });
      return {
        user: user.name,
        orderCount: orders.length,
        total: orders.reduce((acc, o) => acc + o.price, 0)
      };
    `;

    const toolDispatcher = async (name: string, args: Record<string, unknown>) => {
      if (name === 'get_user') {
        expect(args).toEqual({ id: 42 });
        return { id: 42, name: 'Alice' };
      }
      if (name === 'get_orders') {
        expect(args).toEqual({ userId: 42 });
        return [
          { orderId: 'ord-1', price: 25 },
          { orderId: 'ord-2', price: 75 },
        ];
      }
      throw new Error(`Unknown tool: ${name}`);
    };

    const result = await evaluateGuestScript(code, defaultLimits, toolDispatcher);

    expect(result.success).toBe(true);
    expect(result.value).toEqual({
      user: 'Alice',
      orderCount: 2,
      total: 100,
    });
    expect(result.toolCallCount).toBe(2);
  });

  it('captures sandboxed console.log, console.warn, and console.error messages', async () => {
    const code = `
      console.log('info message', 123);
      console.warn('warning message');
      console.error('error message', { detail: 'critical' });
      return 'done';
    `;

    const result = await evaluateGuestScript(code, defaultLimits, async () => ({}));

    expect(result.success).toBe(true);
    expect(result.logs.length).toBe(3);
    expect(result.logs[0].level).toBe('log');
    expect(result.logs[0].message).toContain('info message 123');
    expect(result.logs[1].level).toBe('warn');
    expect(result.logs[1].message).toContain('warning message');
    expect(result.logs[2].level).toBe('error');
    expect(result.logs[2].message).toContain('error message');
  });

  it('enforces Tier 1 soft interrupt on infinite synchronous loops without crashing the host', async () => {
    const tightLimits: ExecutionLimits = {
      ...defaultLimits,
      timeoutMs: 300,
    };

    const infiniteLoopCode = `
      let x = 0;
      while (true) {
        x++;
      }
      return x;
    `;

    const startTime = Date.now();
    const result = await evaluateGuestScript(infiniteLoopCode, tightLimits, async () => ({}));
    const elapsed = Date.now() - startTime;

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/interrupted|timeout exceeded/i);
    expect(elapsed).toBeLessThan(1500);
  });

  it('enforces memory limits and throws out-of-memory error on heap allocation spikes', async () => {
    const tightMemoryLimits: ExecutionLimits = {
      ...defaultLimits,
      memoryLimitMb: 1, // 1 MB heap limit
      timeoutMs: 4000,
    };

    const memorySpikeCode = `
      const arr = [];
      while (true) {
        arr.push("chunk-".repeat(200000));
      }
    `;

    const result = await evaluateGuestScript(memorySpikeCode, tightMemoryLimits, async () => ({}));

    expect(result.success).toBe(false);
    expect(result.error?.toLowerCase()).toContain('out of memory');
  });

  it('enforces 16MB memory limit on array allocation loop and stops well below 2GB RSS', async () => {
    const limits: ExecutionLimits = {
      ...defaultLimits,
      memoryLimitMb: 16,
      timeoutMs: 4000,
    };

    const arrayLeakCode = `
      const leak = [];
      while (true) {
        leak.push(new Array(1e5).fill(1));
      }
    `;

    const startTime = Date.now();
    const result = await evaluateGuestScript(arrayLeakCode, limits, async () => ({}));
    const elapsed = Date.now() - startTime;
    const endRss = process.memoryUsage().rss;

    expect(result.success).toBe(false);
    expect(result.error?.toLowerCase()).toContain('out of memory');
    expect(result.error).toContain('16MB');
    expect(elapsed).toBeLessThan(1000);
    expect(endRss).toBeLessThan(500 * 1024 * 1024);
  });

  it('enforces 16MB memory limit on string repeat loop in under 1 second', async () => {
    const limits: ExecutionLimits = {
      ...defaultLimits,
      memoryLimitMb: 16,
      timeoutMs: 4000,
    };

    const stringLeakCode = `
      const arr = [];
      while (true) {
        arr.push("chunk-".repeat(10000));
      }
    `;

    const startTime = Date.now();
    const result = await evaluateGuestScript(stringLeakCode, limits, async () => ({}));
    const elapsed = Date.now() - startTime;

    expect(result.success).toBe(false);
    expect(result.error?.toLowerCase()).toContain('out of memory');
    expect(result.error).toContain('16MB');
    expect(elapsed).toBeLessThan(1000);
  });

  it('allows safe allocations within the memory cap to complete normally', async () => {
    const limits: ExecutionLimits = {
      ...defaultLimits,
      memoryLimitMb: 16,
    };

    const safeCode = `
      const arr = [];
      for (let i = 0; i < 50; i++) {
        arr.push("data-".repeat(5000));
      }
      return { count: arr.length, totalChars: arr.reduce((acc, s) => acc + s.length, 0) };
    `;

    const result = await evaluateGuestScript(safeCode, limits, async () => ({}));

    expect(result.success).toBe(true);
    expect(result.value).toEqual({
      count: 50,
      totalChars: 50 * 25000,
    });
  });

  it('holds reuse ceiling across multiple leaks and prevents unbounded heap growth', async () => {
    const limits: ExecutionLimits = {
      ...defaultLimits,
      memoryLimitMb: 16,
      timeoutMs: 4000,
    };

    const arrayLeakCode = `
      const leak = [];
      while (true) {
        leak.push(new Array(1e5).fill(1));
      }
    `;

    const QuickJS = await getQuickJS();
    const startRss = process.memoryUsage().rss;

    // Run 4 consecutive leaks in the same process
    for (let i = 0; i < 4; i++) {
      const startTime = Date.now();
      const result = await evaluateGuestScript(arrayLeakCode, limits, async () => ({}));
      const elapsed = Date.now() - startTime;

      expect(result.success).toBe(false);
      expect(result.error?.toLowerCase()).toContain('out of memory');
      expect(result.error).toContain('16MB');
      expect(elapsed).toBeLessThan(1000);
    }

    // Assert WebAssembly linear memory stayed bounded at/near high-water mark (<= 48MB)
    const wasmMem = QuickJS.getWasmMemory();
    expect(wasmMem.buffer.byteLength).toBeLessThanOrEqual(48 * 1024 * 1024);

    // Assert process RSS stayed bounded (well under 500MB, not climbing towards 2GB)
    const currentRss = process.memoryUsage().rss;
    expect(currentRss).toBeLessThan(500 * 1024 * 1024);
    expect(currentRss - startRss).toBeLessThan(150 * 1024 * 1024);

    // Assert subsequent safe allocation in the same process completes cleanly
    const safeCode = `
      const arr = [];
      for (let i = 0; i < 50; i++) {
        arr.push("data-".repeat(1000));
      }
      return arr.length;
    `;
    const safeResult = await evaluateGuestScript(safeCode, limits, async () => ({}));
    expect(safeResult.success).toBe(true);
    expect(safeResult.value).toBe(50);
  });

  it('enforces circuit breaker and halts immediately when maxToolCalls is exceeded', async () => {
    const circuitLimits: ExecutionLimits = {
      ...defaultLimits,
      maxToolCalls: 3,
    };

    const loopCallsCode = `
      for (let i = 0; i < 10; i++) {
        await callTool('ping', { i });
      }
      return 'completed';
    `;

    let callCount = 0;
    const result = await evaluateGuestScript(loopCallsCode, circuitLimits, async () => {
      callCount++;
      return { ok: true };
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Circuit breaker: exceeded maximum allowed tool calls (3)');
    expect(result.toolCallCount).toBeGreaterThan(3);
  });

  it('enforces strict process isolation: host globals process, require, Buffer are undefined', async () => {
    const code = `
      return {
        hasProcess: typeof process !== 'undefined',
        hasRequire: typeof require !== 'undefined',
        hasBuffer: typeof Buffer !== 'undefined',
        hasGlobal: typeof global !== 'undefined'
      };
    `;

    const result = await evaluateGuestScript(code, defaultLimits, async () => ({}));

    expect(result.success).toBe(true);
    expect(result.value).toEqual({
      hasProcess: false,
      hasRequire: false,
      hasBuffer: false,
      hasGlobal: false,
    });
  });

  it('handles tool execution failures cleanly and propagates error to guest code', async () => {
    const code = `
      try {
        await callTool('failing_tool', {});
        return 'unexpected';
      } catch (err) {
        return { caught: true, message: err.message };
      }
    `;

    const dispatcher = async () => {
      throw new Error('Database connection failed');
    };

    const result = await evaluateGuestScript(code, defaultLimits, dispatcher);

    expect(result.success).toBe(true);
    expect(result.value).toEqual({
      caught: true,
      message: 'Database connection failed',
    });
  });

  describe('QuickJsWasmSandboxProvider', () => {
    it('initializes and executes code through SandboxProvider interface', async () => {
      const provider = new QuickJsWasmSandboxProvider();
      expect(provider.name).toBe('quickjs-wasm');

      await provider.initialize();

      const result = await provider.execute(
        'return 7 * 6;',
        async () => ({}),
        defaultLimits
      );

      expect(result.success).toBe(true);
      expect(result.value).toBe(42);

      await provider.dispose();
    });
  });
});
