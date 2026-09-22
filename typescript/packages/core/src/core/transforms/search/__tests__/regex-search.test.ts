import { describe, it, expect, beforeEach } from '@jest/globals';
import { z } from 'zod';
import { Tool } from '../../../../core/tool.js';
import { RegexSearchTransform } from '../regex-search.transform.js';

describe('RegexSearchTransform Integration Suite (NITRO-102-M4)', () => {
  let toolA: Tool;
  let toolB: Tool;
  let toolC: Tool;
  let toolAuth: Tool;

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
