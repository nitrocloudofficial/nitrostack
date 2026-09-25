import { describe, it, expect, beforeEach } from '@jest/globals';
import { NitroStackServer } from '../../server.js';
import { Tool } from '../../tool.js';
import { CatalogTransform } from '../catalog.transform.js';
import { BM25SearchTransform } from '../search/bm25-search.transform.js';
import { z } from 'zod';

class RecursiveSyntheticTransform extends CatalogTransform {
  readonly name = 'recursive-synthetic-transform';
  private serverRef?: NitroStackServer;
  public applyTransformCount = 0;

  setServer(server: NitroStackServer) {
    this.serverRef = server;
  }

  protected async applyTransform(tools: Tool[]): Promise<Tool[]> {
    this.applyTransformCount++;
    const metaTool = new Tool({
      name: 'query_raw_catalog',
      description: 'Queries underlying raw catalog without recursion',
      inputSchema: z.object({}),
      handler: async () => {
        return CatalogTransform.withBypass(async () => {
          // Inside withBypass, runToolPipeline should return raw tools without triggering applyTransform again
          const rawTools = await this.serverRef?.runToolPipeline();
          return { toolCount: rawTools?.length ?? 0, toolNames: rawTools?.map((t) => t.name) };
        });
      },
    });
    return [metaTool];
  }

  override async resolveTool(name: string, next: any, context?: any): Promise<Tool | undefined> {
    if (name === 'query_raw_catalog') {
      const tools = await this.applyTransform([]);
      return tools[0];
    }
    return next(name, context);
  }
}

describe('Re-entrancy Bypass & AsyncLocalStorage Isolation (NITRO-101-M4)', () => {
  let server: NitroStackServer;

  beforeEach(() => {
    server = new NitroStackServer({
      name: 'reentrancy-server',
      version: '1.0.0',
    });
  });

  it('prevents infinite recursion when synthetic tool queries catalog via withBypass', async () => {
    const transform = new RecursiveSyntheticTransform();
    transform.setServer(server);
    server.addTransform(transform);

    server.tool(new Tool({
      name: 'db_query',
      description: 'Database query tool',
      inputSchema: z.object({}),
      handler: async () => 'db',
    }));

    server.tool(new Tool({
      name: 'send_email',
      description: 'Send email tool',
      inputSchema: z.object({}),
      handler: async () => 'email',
    }));

    // List tools through the pipeline: should return only query_raw_catalog
    const visibleTools = await server.runToolPipeline();
    expect(visibleTools.length).toBe(1);
    expect(visibleTools[0].name).toBe('query_raw_catalog');
    expect(transform.applyTransformCount).toBe(1);

    // Now resolve and execute query_raw_catalog
    const resolved = await server.resolveTool('query_raw_catalog');
    expect(resolved).toBeDefined();

    const result = (await resolved?.execute({}, {} as any)) as { toolCount: number; toolNames: string[] };
    expect(result).toBeDefined();
    expect(result.toolCount).toBe(2);
    expect(result.toolNames).toEqual(['db_query', 'send_email']);

    // applyTransform count should only have incremented for the resolveTool call, NOT inside withBypass!
    expect(transform.applyTransformCount).toBe(2);
  });

  it('isolates bypass state across concurrent async operations', async () => {
    expect(CatalogTransform.isBypassed()).toBe(false);

    let taskASawInside: boolean | undefined;
    let taskBSawDuring: boolean | undefined;

    await Promise.all([
      CatalogTransform.withBypass(async () => {
        expect(CatalogTransform.isBypassed()).toBe(true);
        await new Promise((r) => setTimeout(r, 40));
        taskASawInside = CatalogTransform.isBypassed();
        expect(taskASawInside).toBe(true);
      }),
      (async () => {
        await new Promise((r) => setTimeout(r, 10));
        taskBSawDuring = CatalogTransform.isBypassed();
        expect(taskBSawDuring).toBe(false);
        await new Promise((r) => setTimeout(r, 40));
        expect(CatalogTransform.isBypassed()).toBe(false);
      })(),
    ]);

    expect(taskASawInside).toBe(true);
    expect(taskBSawDuring).toBe(false);
    expect(CatalogTransform.isBypassed()).toBe(false);
  });

  it('handles multiple nested withBypass scopes without stack leakage', async () => {
    await CatalogTransform.withBypass(async () => {
      expect(CatalogTransform.isBypassed()).toBe(true);

      await CatalogTransform.withBypass(async () => {
        expect(CatalogTransform.isBypassed()).toBe(true);

        await CatalogTransform.withBypass(async () => {
          expect(CatalogTransform.isBypassed()).toBe(true);
        });

        expect(CatalogTransform.isBypassed()).toBe(true);
      });

      expect(CatalogTransform.isBypassed()).toBe(true);
    });

    expect(CatalogTransform.isBypassed()).toBe(false);
  });

  it('does not re-enter the catalog pipeline when call_tool executes a tool', async () => {
    class CountingTransform extends CatalogTransform {
      readonly name = 'counting';
      applyTransformCount = 0;
      protected async applyTransform(tools: Tool[]): Promise<Tool[]> {
        this.applyTransformCount++;
        return tools;
      }
    }

    const counting = new CountingTransform();
    server.addTransform(counting);
    server.addTransform(new BM25SearchTransform());
    server.tool(
      new Tool({
        name: 'list_catalog',
        description: 'List the catalog',
        inputSchema: z.object({}),
        handler: async () => {
          const listed = await server.runToolPipeline();
          return { count: listed.length };
        },
      })
    );

    await server.runToolPipeline();
    const before = counting.applyTransformCount;
    const callTool = await server.resolveTool('call_tool');
    const result = (await callTool!.execute({ name: 'list_catalog', arguments: {} }, {} as any)) as {
      count: number;
    };

    expect(result.count).toBeGreaterThan(0);
    expect(counting.applyTransformCount).toBe(before);
  });
});
