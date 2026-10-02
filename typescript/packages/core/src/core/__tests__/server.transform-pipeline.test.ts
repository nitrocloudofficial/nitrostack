import { describe, it, expect, beforeEach } from '@jest/globals';
import { NitroStackServer } from '../server.js';
import { Tool } from '../tool.js';
import { McpTransform, NextToolHandler } from '../transforms/transform.interface.js';
import { ExecutionContext } from '../types.js';
import { z } from 'zod';

describe('NitroStackServer Pipeline Runner & Resolution Chain (NITRO-101-M2)', () => {
  let server: NitroStackServer;
  let tool1: Tool;
  let tool2: Tool;

  beforeEach(() => {
    server = new NitroStackServer({
      name: 'test-pipeline-server',
      version: '1.0.0',
    });

    tool1 = new Tool({
      name: 'alpha_tool',
      description: 'Alpha tool',
      inputSchema: z.object({ value: z.string() }),
      handler: async () => ({ executed: 'alpha' }),
    });

    tool2 = new Tool({
      name: 'beta_tool',
      description: 'Beta tool',
      inputSchema: z.object({ count: z.number() }),
      handler: async () => ({ executed: 'beta' }),
    });

    server.tool(tool1);
    server.tool(tool2);
  });

  it('should return raw tools directly when no transforms are configured (pass-through)', async () => {
    const tools = await server.runToolPipeline();
    expect(tools.length).toBe(2);
    expect(tools.map((t) => t.name)).toEqual(['alpha_tool', 'beta_tool']);
  });

  it('should execute transforms sequentially in registered array order', async () => {
    const executionOrder: string[] = [];

    const transform1: McpTransform = {
      name: 't1',
      transformTools: async (tools) => {
        executionOrder.push('t1');
        return [...tools, new Tool({
          name: 'synthetic_from_t1',
          description: 'Synthetic 1',
          inputSchema: z.object({}),
          handler: async () => 't1',
        })];
      },
    };

    const transform2: McpTransform = {
      name: 't2',
      transformTools: async (tools) => {
        executionOrder.push('t2');
        // Filter out alpha_tool
        return tools.filter((t) => t.name !== 'alpha_tool');
      },
    };

    server.addTransform(transform1);
    server.addTransform(transform2);

    const tools = await server.runToolPipeline();
    expect(executionOrder).toEqual(['t1', 't2']);
    expect(tools.map((t) => t.name)).toEqual(['beta_tool', 'synthetic_from_t1']);
  });

  it('should bubble errors thrown during transformTools', async () => {
    const brokenTransform: McpTransform = {
      name: 'broken',
      transformTools: async () => {
        throw new Error('Transform failure');
      },
    };

    server.addTransform(brokenTransform);
    await expect(server.runToolPipeline()).rejects.toThrow('Transform failure');
  });

  it('should resolve raw tools when no transforms intercept resolveTool', async () => {
    const resolved = await server.resolveTool('alpha_tool');
    expect(resolved).toBe(tool1);

    const missing = await server.resolveTool('unknown_tool');
    expect(missing).toBeUndefined();
  });

  it('should resolve synthetic tools intercepted by a transform', async () => {
    const syntheticTool = new Tool({
      name: 'synthetic_search',
      description: 'Search tools',
      inputSchema: z.object({ query: z.string() }),
      handler: async () => 'results',
    });

    const searchTransform: McpTransform = {
      name: 'search-transform',
      resolveTool: async (name, next) => {
        if (name === 'synthetic_search') {
          return syntheticTool;
        }
        return next(name);
      },
    };

    server.addTransform(searchTransform);

    const resolved = await server.resolveTool('synthetic_search');
    expect(resolved).toBe(syntheticTool);

    const fallback = await server.resolveTool('beta_tool');
    expect(fallback).toBe(tool2);
  });

  it('should allow transforms to alias or rewrite tool names', async () => {
    const aliasTransform: McpTransform = {
      name: 'alias-transform',
      resolveTool: async (name, next, context) => {
        if (name === 'alpha_alias') {
          return next('alpha_tool', context);
        }
        return next(name, context);
      },
    };

    server.addTransform(aliasTransform);

    const resolved = await server.resolveTool('alpha_alias');
    expect(resolved).toBe(tool1);
  });

  it('should pass ExecutionContext through the resolveTool onion chain', async () => {
    let capturedContext: ExecutionContext | undefined;

    const contextTransform: McpTransform = {
      name: 'context-transform',
      resolveTool: async (name, next, context) => {
        capturedContext = context;
        return next(name, context);
      },
    };

    server.addTransform(contextTransform);

    const mockContext = {
      toolName: 'alpha_tool',
      metadata: { userId: '123' },
    } as unknown as ExecutionContext;

    const resolved = await server.resolveTool('alpha_tool', mockContext);
    expect(resolved).toBe(tool1);
    expect(capturedContext).toBe(mockContext);
  });

  it('should safely handle concurrent resolveTool dispatches without shared index bleed', async () => {
    const delayTransform: McpTransform = {
      name: 'delay-transform',
      resolveTool: async (name, next, context) => {
        if (name === 'alpha_tool') {
          await new Promise((resolve) => setTimeout(resolve, 20));
        } else {
          await new Promise((resolve) => setTimeout(resolve, 5));
        }
        return next(name, context);
      },
    };

    server.addTransform(delayTransform);

    const [resolvedAlpha, resolvedBeta] = await Promise.all([
      server.resolveTool('alpha_tool'),
      server.resolveTool('beta_tool'),
    ]);

    expect(resolvedAlpha).toBe(tool1);
    expect(resolvedBeta).toBe(tool2);
  });
});
