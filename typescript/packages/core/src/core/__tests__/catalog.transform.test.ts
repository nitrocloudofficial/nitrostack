import { describe, it, expect, beforeEach } from '@jest/globals';
import { CatalogTransform } from '../transforms/catalog.transform.js';
import { McpTransform, NextToolHandler } from '../transforms/transform.interface.js';
import { Tool } from '../tool.js';
import { ExecutionContext } from '../types.js';
import * as coreExports from '../index.js';

class DummyTransform extends CatalogTransform {
  readonly name = 'dummy-transform';
  public applyTransformCallCount = 0;

  protected async applyTransform(tools: Tool[], _context?: ExecutionContext): Promise<Tool[]> {
    this.applyTransformCallCount++;
    return tools.filter((t) => t.name.startsWith('allowed_'));
  }
}

describe('CatalogTransform & AsyncLocalStorage Bypass Storage (NITRO-101-M1)', () => {
  beforeEach(() => {
    expect(CatalogTransform.isBypassed()).toBe(false);
  });

  it('should export McpTransform and CatalogTransform in core/index.ts', () => {
    expect(coreExports.CatalogTransform).toBeDefined();
    expect(coreExports.CatalogTransform).toBe(CatalogTransform);
  });

  it('should have isBypassed() return false by default', () => {
    expect(CatalogTransform.isBypassed()).toBe(false);
  });

  it('should enable bypass within withBypass and revert afterwards', async () => {
    expect(CatalogTransform.isBypassed()).toBe(false);

    let insideBypassState = false;
    const result = await CatalogTransform.withBypass(async () => {
      insideBypassState = CatalogTransform.isBypassed();
      return 'success';
    });

    expect(insideBypassState).toBe(true);
    expect(result).toBe('success');
    expect(CatalogTransform.isBypassed()).toBe(false);
  });

  it('should support synchronous callbacks in withBypass', async () => {
    const result = await CatalogTransform.withBypass(() => {
      expect(CatalogTransform.isBypassed()).toBe(true);
      return 42;
    });

    expect(result).toBe(42);
    expect(CatalogTransform.isBypassed()).toBe(false);
  });

  it('should correctly propagate errors in withBypass and reset bypass state', async () => {
    await expect(
      CatalogTransform.withBypass(async () => {
        expect(CatalogTransform.isBypassed()).toBe(true);
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');

    expect(CatalogTransform.isBypassed()).toBe(false);
  });

  it('should handle nested withBypass calls idempotently', async () => {
    await CatalogTransform.withBypass(async () => {
      expect(CatalogTransform.isBypassed()).toBe(true);

      await CatalogTransform.withBypass(async () => {
        expect(CatalogTransform.isBypassed()).toBe(true);
      });

      expect(CatalogTransform.isBypassed()).toBe(true);
    });

    expect(CatalogTransform.isBypassed()).toBe(false);
  });

  it('should isolate concurrent asynchronous scopes', async () => {
    let task1SawBypass = false;
    let task2SawBypass = false;

    const task1 = CatalogTransform.withBypass(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      task1SawBypass = CatalogTransform.isBypassed();
    });

    const task2 = (async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      task2SawBypass = CatalogTransform.isBypassed();
    })();

    await Promise.all([task1, task2]);

    expect(task1SawBypass).toBe(true);
    expect(task2SawBypass).toBe(false);
  });

  it('should apply transformation when bypass is inactive', async () => {
    const transform = new DummyTransform();
    const mockTools = [
      { name: 'allowed_tool_1' } as Tool,
      { name: 'hidden_tool_2' } as Tool,
      { name: 'allowed_tool_3' } as Tool,
    ];

    const result = await transform.transformTools(mockTools);

    expect(transform.applyTransformCallCount).toBe(1);
    expect(result.length).toBe(2);
    expect(result.map((t) => t.name)).toEqual(['allowed_tool_1', 'allowed_tool_3']);
  });

  it('should bypass transformation when withBypass is active', async () => {
    const transform = new DummyTransform();
    const mockTools = [
      { name: 'allowed_tool_1' } as Tool,
      { name: 'hidden_tool_2' } as Tool,
      { name: 'allowed_tool_3' } as Tool,
    ];

    const result = await CatalogTransform.withBypass(async () => {
      return transform.transformTools(mockTools);
    });

    expect(transform.applyTransformCallCount).toBe(0);
    expect(result.length).toBe(3);
    expect(result).toBe(mockTools);
  });

  it('should provide default resolveTool forwarding to next()', async () => {
    const transform = new DummyTransform();
    const mockTool = { name: 'target_tool' } as Tool;
    const next: NextToolHandler = async (name: string) => {
      return name === 'target_tool' ? mockTool : undefined;
    };

    const resolved = await transform.resolveTool('target_tool', next);
    expect(resolved).toBe(mockTool);

    const unresolved = await transform.resolveTool('unknown_tool', next);
    expect(unresolved).toBeUndefined();
  });
});
