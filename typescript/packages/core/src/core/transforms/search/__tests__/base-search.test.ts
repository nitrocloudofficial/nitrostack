import { describe, it, expect, beforeEach } from '@jest/globals';
import { z } from 'zod';
import { Tool } from '../../../../core/tool.js';
import { RegexSearchTransform } from '../regex-search.transform.js';
import { BM25SearchTransform } from '../bm25-search.transform.js';
import { catalogCacheKey } from '../../tool-cache-key.js';

describe('BaseSearchTransform, RegexSearchTransform & BM25SearchTransform (NITRO-102-M2)', () => {
  let toolA: Tool;
  let toolB: Tool;
  let toolC: Tool;
  let toolAuth: Tool;
  let toolAdmin: Tool;

  beforeEach(() => {
    toolA = new Tool({
      name: 'search_flights',
      description: 'Search available airline flights and ticket fares',
      inputSchema: z.object({
        origin: z.string().describe('Origin airport IATA code'),
        destination: z.string().describe('Destination airport IATA code'),
      }),
      handler: async (args: any) => ({ results: [`Flight from ${args.origin} to ${args.destination}`] }),
    });

    toolB = new Tool({
      name: 'order_pizza',
      description: 'Place an order for pepperoni or margherita pizza',
      inputSchema: {
        type: 'object',
        properties: {
          crust: { type: 'string', description: 'Thin or thick crust' },
          toppings: { type: 'string', description: 'Selected toppings' },
        },
        required: ['crust'],
      },
      handler: async (args: any) => ({ status: 'ordered', crust: args.crust }),
    });

    toolC = new Tool({
      name: 'get_weather_forecast',
      description: 'Retrieve current weather and 7-day meteorological forecast',
      inputSchema: z.object({
        city: z.string(),
      }),
      handler: async (args: any) => ({ temp: 72, city: args.city }),
    });

    toolAuth = new Tool({
      name: 'auth_login',
      description: 'Authenticate user with OAuth2 or API token',
      inputSchema: z.object({
        token: z.string(),
      }),
      visibility: 'visible',
      handler: async () => ({ authenticated: true }),
    });

    toolAdmin = new Tool({
      name: 'admin_metrics',
      description: 'System metrics and resource utilization',
      inputSchema: z.object({}),
      annotations: {
        alwaysVisible: true,
      },
      handler: async () => ({ cpu: '10%' }),
    });
  });

  describe('Catalog Caching & alwaysVisible Filtering', () => {
    it('replaces raw tools with search_tools, call_tool, and alwaysVisible tools', async () => {
      const transform = new BM25SearchTransform({
        alwaysVisible: ['order_pizza'],
      });

      const catalog = [toolA, toolB, toolC, toolAuth, toolAdmin];
      const transformed = await transform.transformTools(catalog);

      // Expected: search_tools, call_tool, order_pizza (options), auth_login (visibility), admin_metrics (annotations)
      expect(transformed.length).toBe(5);
      const names = transformed.map((t) => t.name);
      expect(names).toContain('search_tools');
      expect(names).toContain('call_tool');
      expect(names).toContain('order_pizza');
      expect(names).toContain('auth_login');
      expect(names).toContain('admin_metrics');
      expect(names).not.toContain('search_flights');
      expect(names).not.toContain('get_weather_forecast');
    });

    it('caches transformed catalog when raw tools catalog is unchanged', async () => {
      const transform = new BM25SearchTransform();
      const catalog = [toolA, toolB];

      const firstResult = await transform.transformTools(catalog);
      const secondResult = await transform.transformTools(catalog);

      expect(firstResult).toBe(secondResult);
    });

    it('rebuilds the catalog when a tool schema changes', async () => {
      const transform = new BM25SearchTransform();
      const firstResult = await transform.transformTools([toolA]);

      (toolA as { inputSchema: unknown }).inputSchema = z.object({ extra: z.string() });
      const secondResult = await transform.transformTools([toolA]);

      expect(secondResult).not.toBe(firstResult);
    });

    it('rebuilds transformed catalog when raw tools change', async () => {
      const transform = new BM25SearchTransform();
      const catalog1 = [toolA];
      const catalog2 = [toolA, toolB];

      const firstResult = await transform.transformTools(catalog1);
      const secondResult = await transform.transformTools(catalog2);

      expect(firstResult).not.toBe(secondResult);
    });
  });

  describe('Direct Resolution & Fallback (resolveTool)', () => {
    it('resolves synthetic meta-tools directly', async () => {
      const transform = new BM25SearchTransform();
      await transform.transformTools([toolA, toolB]);

      const searchTool = await transform.resolveTool('search_tools', async () => undefined);
      expect(searchTool).toBeDefined();
      expect(searchTool?.name).toBe('search_tools');

      const callTool = await transform.resolveTool('call_tool', async () => undefined);
      expect(callTool).toBeDefined();
      expect(callTool?.name).toBe('call_tool');
    });

    it('does not resurrect a tool the rest of the chain declined to resolve', async () => {
      const transform = new BM25SearchTransform();
      await transform.transformTools([toolA, toolB]);

      // search_flights is indexed but hidden from tools/list. Falling back to the
      // local index here would let a caller bypass downstream visibility guards.
      const resolved = await transform.resolveTool('search_flights', async () => undefined);
      expect(resolved).toBeUndefined();
    });

    it('resolves a raw tool when the chain supplies it', async () => {
      const transform = new BM25SearchTransform();
      await transform.transformTools([toolA, toolB]);

      const resolved = await transform.resolveTool('search_flights', async () => toolA);
      expect(resolved).toBe(toolA);
    });

    it('returns undefined for non-existent tools', async () => {
      const transform = new BM25SearchTransform();
      await transform.transformTools([toolA, toolB]);

      const resolved = await transform.resolveTool('completely_non_existent', async () => undefined);
      expect(resolved).toBeUndefined();
    });
  });

  describe('RegexSearchTransform', () => {
    it('matches tools by name with regular expressions', async () => {
      const transform = new RegexSearchTransform({ allowRegex: true });
      await transform.transformTools([toolA, toolB, toolC]);

      const searchTool = await transform.resolveTool('search_tools', async () => undefined);
      expect(searchTool).toBeDefined();

      const result = (await searchTool!.execute({ query: '^search_.*' }, {} as any)) as any;
      expect(result.content[0].text).toContain('search_flights');
      expect(result.content[0].text).not.toContain('order_pizza');
    });

    it('matches tools by description and parameter keywords', async () => {
      const transform = new RegexSearchTransform();
      await transform.transformTools([toolA, toolB, toolC]);

      const searchTool = await transform.resolveTool('search_tools', async () => undefined);
      // Query matches "toppings" parameter in toolB
      const result = (await searchTool!.execute({ query: 'toppings' }, {} as any)) as any;
      expect(result.content[0].text).toContain('order_pizza');
    });

    it('degrades gracefully on invalid regex queries to case-insensitive literal substring search', async () => {
      const transform = new RegexSearchTransform();
      await transform.transformTools([toolA, toolB, toolC]);

      const searchTool = await transform.resolveTool('search_tools', async () => undefined);
      // Invalid regex syntax with unclosed bracket or parenthesis
      expect(async () => {
        await searchTool!.execute({ query: '[search*(unclosed' }, {} as any);
      }).not.toThrow();

      // Query with regex metacharacters that matches literally
      const result = (await searchTool!.execute({ query: 'flight' }, {} as any)) as any;
      expect(result.content[0].text).toContain('search_flights');
    });
  });

  describe('BM25SearchTransform', () => {
    it('ranks tools using BM25 Okapi relevance scoring', async () => {
      const transform = new BM25SearchTransform();
      await transform.transformTools([toolA, toolB, toolC]);

      const searchTool = await transform.resolveTool('search_tools', async () => undefined);
      const result = (await searchTool!.execute({ query: 'airline tickets flight fare' }, {} as any)) as any;

      expect(result.content[0].text).toContain('search_flights');
      expect(result.content[0].text).not.toContain('order_pizza');
    });

    it('respects limit parameter in search_tools', async () => {
      const transform = new BM25SearchTransform();
      await transform.transformTools([toolA, toolB, toolC]);

      const searchTool = await transform.resolveTool('search_tools', async () => undefined);
      // Query that matches everything broadly
      const result = (await searchTool!.execute(
        { query: 'search order weather', limit: 1, detail: 'brief' },
        {} as any
      )) as any;
      const lines = result.content[0].text.split('\n').filter((l: string) => l.startsWith('- **'));
      expect(lines.length).toBe(1);
    });
  });

  describe('Synthetic Meta-Tools Execution (search_tools & call_tool)', () => {
    it('executes target tool successfully through call_tool', async () => {
      const transform = new BM25SearchTransform();
      await transform.transformTools([toolA, toolB]);

      const callTool = await transform.resolveTool('call_tool', async () => undefined);
      expect(callTool).toBeDefined();

      const result = (await callTool!.execute(
        { name: 'order_pizza', arguments: { crust: 'thin' } },
        {} as any
      )) as any;

      expect(result).toEqual({ status: 'ordered', crust: 'thin' });
    });

    it('throws informative error when target tool does not exist in call_tool', async () => {
      const transform = new BM25SearchTransform();
      await transform.transformTools([toolA]);

      const callTool = await transform.resolveTool('call_tool', async () => undefined);
      await expect(
        callTool!.execute({ name: 'ghost_tool', arguments: {} }, {} as any)
      ).rejects.toThrow("Tool 'ghost_tool' not found.");
    });
  });

  it('changes the catalog cache key when a parameter type changes', () => {
    const stringId = new Tool({
      name: 'lookup',
      description: 'Look up a record',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
      handler: async () => ({}),
    });
    const numberId = new Tool({
      name: 'lookup',
      description: 'Look up a record',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'number' } },
        required: ['id'],
      },
      handler: async () => ({}),
    });

    expect(catalogCacheKey([stringId], [])).not.toBe(catalogCacheKey([numberId], []));
  });
});
