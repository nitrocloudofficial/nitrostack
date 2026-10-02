import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { z } from 'zod';
import { Tool } from '../../../../core/tool.js';
import { Worker } from 'node:worker_threads';
import {
  REGEX_TIMEOUT_COOLDOWN_MS,
  RegexSearchTransform,
  regexWorkerPeak,
  resetRegexWorkerStats,
  setRegexWorkerFactoryForTests,
} from '../regex-search.transform.js';

/** Fake worker whose terminate() emits exit, so the host can free the slot. */
function workerThatExitsOnTerminate(): Worker {
  const listeners = new Map<string, () => void>();
  const worker = {
    once(event: string, cb: () => void) {
      listeners.set(event, cb);
      return worker;
    },
    terminate() {
      listeners.get('exit')?.();
      return Promise.resolve();
    },
  };
  return worker as unknown as Worker;
}

describe('RegexSearchTransform Integration Suite (NITRO-102-M4)', () => {
  let toolA: Tool;
  let toolB: Tool;
  let toolC: Tool;
  let toolAuth: Tool;

  afterEach(() => {
    setRegexWorkerFactoryForTests();
    resetRegexWorkerStats();
    jest.useRealTimers();
  });

  beforeEach(() => {
    toolA = new Tool({
      name: 'stripe_charge_customer',
      description: 'Process credit card charge transaction for customer',
      inputSchema: z.object({
        customer_id: z.string().describe('Unique customer ID in billing system'),
        amount_cents: z.number().describe('Charge amount in pennies'),
      }),
      handler: async (args: any) => ({ charged: true, customer: args.customer_id }),
    });

    toolB = new Tool({
      name: 'pg_execute_query',
      description: 'Execute database SQL statement on replica',
      inputSchema: {
        type: 'object',
        properties: {
          statement: { type: 'string', description: 'SQL query string to run' },
          read_only: { type: 'boolean', description: 'Force transaction read only' },
        },
        required: ['statement'],
      },
      handler: async (args: any) => ({ executed: true, sql: args.statement }),
    });

    toolC = new Tool({
      name: 'slack_send_notification',
      description: 'Post notification message into ops channel',
      inputSchema: z.object({
        channel: z.string().describe('Target destination channel'),
        text: z.string(),
      }),
      handler: async () => ({ sent: true }),
    });

    toolAuth = new Tool({
      name: 'auth_sso_login',
      description: 'Single sign-on enterprise authentication',
      inputSchema: z.object({ sso_ticket: z.string() }),
      handler: async () => ({ sso: true }),
    });
  });

  it('matches tools by name with regular expression patterns', async () => {
    const transform = new RegexSearchTransform({ allowRegex: true });
    await transform.transformTools([toolA, toolB, toolC]);

    const searchTool = await transform.resolveTool('search_tools', async () => undefined);
    expect(searchTool).toBeDefined();

    // Query with regex prefix anchor
    const res = (await searchTool!.execute({ query: '^stripe_.*', detail: 'brief' }, {} as any)) as any;
    expect(res.content[0].text).toContain('stripe_charge_customer');
    expect(res.content[0].text).not.toContain('pg_execute_query');
    expect(res.content[0].text).not.toContain('slack_send_notification');
  });

  it('matches tools by parameter keywords from both Zod and JSON Schema', async () => {
    const transform = new RegexSearchTransform();
    await transform.transformTools([toolA, toolB, toolC]);

    const searchTool = await transform.resolveTool('search_tools', async () => undefined);

    // 1. Zod parameter keyword: 'amount_cents'
    const resZod = (await searchTool!.execute({ query: 'amount_cents', detail: 'brief' }, {} as any)) as any;
    expect(resZod.content[0].text).toContain('stripe_charge_customer');

    // 2. JSON Schema parameter keyword: 'read_only'
    const resJson = (await searchTool!.execute({ query: 'read_only', detail: 'brief' }, {} as any)) as any;
    expect(resJson.content[0].text).toContain('pg_execute_query');
  });

  it('safely recovers from invalid regex queries without throwing unhandled exceptions', async () => {
    const transform = new RegexSearchTransform({ allowRegex: true });
    await transform.transformTools([toolA, toolB, toolC]);

    const searchTool = await transform.resolveTool('search_tools', async () => undefined);

    // 1. Unclosed bracket
    await expect(searchTool!.execute({ query: '[stripe' }, {} as any)).resolves.toBeDefined();

    // 2. Unbalanced parenthesis
    await expect(searchTool!.execute({ query: '(pg_execute' }, {} as any)).resolves.toBeDefined();

    // 3. Leading quantifier
    await expect(searchTool!.execute({ query: '*query' }, {} as any)).resolves.toBeDefined();

    // 4. Literal match with special regex metacharacters
    const res = (await searchTool!.execute({ query: 'stripe', detail: 'brief' }, {} as any)) as any;
    expect(res.content[0].text).toContain('stripe_charge_customer');
  });

  it('preserves alwaysVisible tools in tools/list while keeping others searchable', async () => {
    const transform = new RegexSearchTransform({
      alwaysVisible: ['auth_sso_login'],
      allowRegex: true,
    });

    const transformed = await transform.transformTools([toolA, toolB, toolC, toolAuth]);

    // Transformed list should contain: search_tools, call_tool, auth_sso_login
    expect(transformed.length).toBe(3);
    const names = transformed.map((t) => t.name);
    expect(names).toContain('search_tools');
    expect(names).toContain('call_tool');
    expect(names).toContain('auth_sso_login');
    expect(names).not.toContain('stripe_charge_customer');
    expect(names).not.toContain('pg_execute_query');

    // But stripe_charge_customer can still be found through search_tools
    const searchTool = await transform.resolveTool('search_tools', async () => undefined);
    const searchRes = (await searchTool!.execute({ query: 'charge.*customer' }, {} as any)) as any;
    expect(searchRes.content[0].text).toContain('stripe_charge_customer');
  });

  it('falls back to a literal match when a regex would stall the event loop', async () => {
    const stallTool = new Tool({
      name: 'stall_tool',
      description: 'a'.repeat(25),
      inputSchema: z.object({}),
      handler: async () => ({}),
    });
    const literalTool = new Tool({
      name: 'literal_tool',
      description: 'pattern (a?){25}b is stored as text',
      inputSchema: z.object({}),
      handler: async () => ({}),
    });

    const transform = new RegexSearchTransform({ allowRegex: true });
    await transform.transformTools([stallTool, literalTool]);
    const searchTool = await transform.resolveTool('search_tools', async () => undefined);

    const start = Date.now();
    const res = (await searchTool!.execute({ query: '(a?){25}b', detail: 'brief' }, {} as any)) as any;
    expect(Date.now() - start).toBeLessThan(2000);
    expect(res.content[0].text).toContain('literal_tool');
    expect(res.content[0].text).not.toContain('stall_tool');
  });

  it('caps concurrent regex workers and falls back to a literal match', async () => {
    resetRegexWorkerStats();
    const tools = Array.from({ length: 4 }, (_, i) => new Tool({
      name: `tool_${i}`,
      description: 'a'.repeat(24),
      inputSchema: z.object({}),
      handler: async () => ({}),
    }));
    const transform = new RegexSearchTransform({ allowRegex: true });
    await transform.transformTools(tools);
    const searchTool = await transform.resolveTool('search_tools', async () => undefined);

    await Promise.all(
      Array.from({ length: 8 }, () => searchTool!.execute({ query: '(a+)+$', detail: 'brief' }, {} as any))
    );

    expect(regexWorkerPeak()).toBeLessThanOrEqual(4);
    expect(regexWorkerPeak()).toBeGreaterThan(0);
  });

  it('releases the regex worker slot when the worker fails to start', async () => {
    resetRegexWorkerStats();
    let failures = 4;
    setRegexWorkerFactoryForTests((filename, options) => {
      if (failures > 0) {
        failures -= 1;
        throw new Error('worker failed to start');
      }
      return new Worker(filename, options);
    });

    try {
      const tool = new Tool({
        name: 'tool_0',
        description: 'plain',
        inputSchema: z.object({}),
        handler: async () => ({}),
      });
      const transform = new RegexSearchTransform({ allowRegex: true });
      await transform.transformTools([tool]);
      const searchTool = await transform.resolveTool('search_tools', async () => undefined);
      for (let i = 0; i < 4; i++) {
        await searchTool!.execute({ query: '^tool_0$', detail: 'brief' }, {} as any);
      }
      const res = (await searchTool!.execute({ query: '^tool_0$', detail: 'brief' }, {} as any)) as {
        content: Array<{ text: string }>;
      };
      expect(res.content[0].text).toContain('tool_0');
    } finally {
      setRegexWorkerFactoryForTests();
    }
  });

  it('stops opting into regex after repeated match timeouts', async () => {
    resetRegexWorkerStats();
    let spawned = 0;
    setRegexWorkerFactoryForTests(() => {
      spawned += 1;
      return workerThatExitsOnTerminate();
    });

    const transform = new RegexSearchTransform({ allowRegex: true });
    await transform.transformTools([toolA]);
    const searchTool = await transform.resolveTool('search_tools', async () => undefined);

    for (let i = 0; i < 3; i++) {
      await searchTool!.execute({ query: 'stripe', detail: 'brief' }, {} as any);
    }
    expect(spawned).toBe(3);

    const res = (await searchTool!.execute({ query: '^stripe_.*', detail: 'brief' }, {} as any)) as {
      content: Array<{ text: string }>;
    };
    expect(spawned).toBe(3);
    expect(res.content[0].text).not.toContain('stripe_charge_customer');
  });

  it('keeps the regex fuse on one transform and clears it after the cooldown', async () => {
    jest.useFakeTimers();
    let spawned = 0;
    setRegexWorkerFactoryForTests(() => {
      spawned += 1;
      return workerThatExitsOnTerminate();
    });

    const stalled = new RegexSearchTransform({ allowRegex: true });
    const other = new RegexSearchTransform({ allowRegex: true });
    await stalled.transformTools([toolA]);
    await other.transformTools([toolA]);
    const stalledSearch = await stalled.resolveTool('search_tools', async () => undefined);
    const otherSearch = await other.resolveTool('search_tools', async () => undefined);

    const run = async (searchTool: Tool) => {
      const pending = searchTool.execute({ query: 'stripe', detail: 'brief' }, {} as any);
      await jest.advanceTimersByTimeAsync(50);
      await pending;
    };

    for (let i = 0; i < 3; i++) {
      await run(stalledSearch!);
    }
    expect(spawned).toBe(3);

    await run(otherSearch!);
    expect(spawned).toBe(4);

    await run(stalledSearch!);
    expect(spawned).toBe(4);

    await jest.advanceTimersByTimeAsync(REGEX_TIMEOUT_COOLDOWN_MS);
    await run(stalledSearch!);
    expect(spawned).toBe(5);
  });

  it('keeps a timed-out regex worker slot until the thread exits', async () => {
    resetRegexWorkerStats();
    const exits: Array<() => void> = [];
    let spawned = 0;
    setRegexWorkerFactoryForTests(() => {
      spawned += 1;
      const listeners = new Map<string, () => void>();
      const worker = {
        once(event: string, cb: () => void) {
          listeners.set(event, cb);
          return worker;
        },
        terminate() {
          return Promise.resolve();
        },
      };
      exits.push(() => listeners.get('exit')?.());
      return worker as unknown as Worker;
    });

    const searches = [];
    for (let i = 0; i < 4; i++) {
      const transform = new RegexSearchTransform({ allowRegex: true });
      await transform.transformTools([toolA]);
      searches.push(await transform.resolveTool('search_tools', async () => undefined));
    }

    await Promise.all(
      searches.map(async (searchTool) => {
        const pending = searchTool!.execute({ query: '(a+)+$', detail: 'brief' }, {} as any);
        await new Promise((resolve) => setTimeout(resolve, 80));
        await pending;
      }),
    );
    expect(spawned).toBe(4);

    const blocked = new RegexSearchTransform({ allowRegex: true });
    await blocked.transformTools([toolA]);
    const blockedSearch = await blocked.resolveTool('search_tools', async () => undefined);
    await blockedSearch!.execute({ query: '(a+)+$', detail: 'brief' }, {} as any);
    expect(spawned).toBe(4);

    for (const exit of exits) exit();
    await blockedSearch!.execute({ query: '(a+)+$', detail: 'brief' }, {} as any);
    expect(spawned).toBe(5);
  });

  it('delegates execution properly through call_tool', async () => {
    const transform = new RegexSearchTransform();
    await transform.transformTools([toolA, toolB]);

    const callTool = await transform.resolveTool('call_tool', async () => undefined);
    expect(callTool).toBeDefined();

    const result = await callTool!.execute(
      {
        name: 'pg_execute_query',
        arguments: { statement: 'SELECT * FROM users;' },
      },
      {} as any
    );

    expect(result).toEqual({ executed: true, sql: 'SELECT * FROM users;' });
  });
});
