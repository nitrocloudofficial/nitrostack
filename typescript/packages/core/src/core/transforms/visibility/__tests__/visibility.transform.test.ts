import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { z } from 'zod';
import { VisibilityTransform, VisibilityResolutionError } from '../visibility.transform.js';
import { SessionVisibilityStore } from '../session-store.js';
import { Tool } from '../../../tool.js';
import { CatalogTransform } from '../../catalog.transform.js';
import { BM25SearchTransform } from '../../search/bm25-search.transform.js';
import { CodeModeTransform } from '../../code-mode/code-mode.transform.js';
import { createMockContext } from '../../../../testing/index.js';

describe('VisibilityTransform (NITRO-104-M3)', () => {
  let store: SessionVisibilityStore;
  let transform: VisibilityTransform;

  const publicTool = new Tool({
    name: 'public_tool',
    description: 'Public tool accessible by all',
    inputSchema: z.object({}),
    visibility: 'visible',
    handler: async () => ({ ok: true }),
  });

  const hiddenTool = new Tool({
    name: 'secret_tool',
    description: 'Secret tool requiring dynamic unlock',
    inputSchema: z.object({}),
    visibility: 'hidden',
    handler: async () => ({ ok: true }),
  });

  const defaultTool = new Tool({
    name: 'default_tool',
    description: 'Tool without explicit visibility (default visible)',
    inputSchema: z.object({}),
    handler: async () => ({ ok: true }),
  });

  beforeEach(() => {
    store = new SessionVisibilityStore();
    transform = new VisibilityTransform(store);
  });

  afterEach(() => {
    store.destroy();
  });

  describe('transformTools (Catalog filtering)', () => {
    it('should filter out hidden tools for unauthenticated/stateless requests', async () => {
      const result = await transform.transformTools([publicTool, hiddenTool, defaultTool]);
      expect(result.map((t) => t.name)).toEqual(['public_tool', 'default_tool']);
    });

    it('should reveal hidden tool once enabled in the session', async () => {
      store.enableTools('sess-1', ['secret_tool']);

      const context = createMockContext({ sessionId: 'sess-1' });
      const result = await transform.transformTools([publicTool, hiddenTool, defaultTool], context);
      expect(result.map((t) => t.name)).toEqual(['public_tool', 'secret_tool', 'default_tool']);
    });

    it('should hide public tool once disabled in the session', async () => {
      store.disableTools('sess-1', ['public_tool']);

      const context = createMockContext({ sessionId: 'sess-1' });
      const result = await transform.transformTools([publicTool, hiddenTool], context);
      expect(result.map((t) => t.name)).toEqual([]);
    });

    it('should treat explicitly enabled tool as visible even if disabled on another session', async () => {
      store.enableTools('sess-1', ['secret_tool']);
      store.disableTools('sess-2', ['secret_tool']);

      const ctx1 = createMockContext({ sessionId: 'sess-1' });
      const ctx2 = createMockContext({ sessionId: 'sess-2' });

      const res1 = await transform.transformTools([publicTool, hiddenTool], ctx1);
      const res2 = await transform.transformTools([publicTool, hiddenTool], ctx2);

      expect(res1.map((t) => t.name)).toEqual(['public_tool', 'secret_tool']);
      expect(res2.map((t) => t.name)).toEqual(['public_tool']);
    });

    it('should bypass visibility filter when CatalogTransform.withBypass is active', async () => {
      await CatalogTransform.withBypass(async () => {
        const result = await transform.transformTools([publicTool, hiddenTool]);
        expect(result.map((t) => t.name)).toEqual(['public_tool', 'secret_tool']);
      });
    });
  });

  describe('resolveTool (Direct invocation guard)', () => {
    it('should throw -32601 when calling hidden tool before it is enabled', async () => {
      const next = async (name: string) => (name === 'secret_tool' ? hiddenTool : undefined);
      const context = createMockContext({ sessionId: 'sess-1' });

      await expect(transform.resolveTool('secret_tool', next, context)).rejects.toMatchObject({
        code: -32601,
        message: expect.stringContaining('not available in session'),
      });
    });

    it('should allow tool call after tool is enabled in session', async () => {
      store.enableTools('sess-1', ['secret_tool']);
      const next = async (name: string) => (name === 'secret_tool' ? hiddenTool : undefined);
      const context = createMockContext({ sessionId: 'sess-1' });

      const resolved = await transform.resolveTool('secret_tool', next, context);
      expect(resolved?.name).toBe('secret_tool');
    });

    it('should throw -32601 when calling tool that was explicitly disabled in session', async () => {
      store.disableTools('sess-1', ['public_tool']);
      const next = async (name: string) => (name === 'public_tool' ? publicTool : undefined);
      const context = createMockContext({ sessionId: 'sess-1' });

      await expect(transform.resolveTool('public_tool', next, context)).rejects.toMatchObject({
        code: -32601,
        message: expect.stringContaining("Tool 'public_tool' is disabled in session 'sess-1'."),
      });
    });

    it('should throw -32601 when calling hidden tool in stateless request (no sessionId)', async () => {
      const next = async (name: string) => (name === 'secret_tool' ? hiddenTool : undefined);
      const context = createMockContext(); // No sessionId

      await expect(transform.resolveTool('secret_tool', next, context)).rejects.toMatchObject({
        code: -32601,
        message: expect.stringContaining('Tool \'secret_tool\' is hidden and cannot be invoked in stateless mode.'),
      });
    });

    it('should allow public tool call in stateless request', async () => {
      const next = async (name: string) => (name === 'public_tool' ? publicTool : undefined);
      const context = createMockContext();

      const resolved = await transform.resolveTool('public_tool', next, context);
      expect(resolved?.name).toBe('public_tool');
    });

    it('should return undefined if next returns undefined', async () => {
      const next = async () => undefined;
      const context = createMockContext({ sessionId: 'sess-1' });

      const resolved = await transform.resolveTool('unknown_tool', next, context);
      expect(resolved).toBeUndefined();
    });

    it('still rejects a hidden tool when CatalogTransform.withBypass is active', async () => {
      const next = async (name: string) => (name === 'secret_tool' ? hiddenTool : undefined);
      const context = createMockContext({ sessionId: 'sess-1' });

      await CatalogTransform.withBypass(async () => {
        await expect(transform.resolveTool('secret_tool', next, context)).rejects.toMatchObject({
          code: -32601,
        });
      });
    });
  });

  describe('Pipeline chaining with downstream transforms', () => {
    it('should ensure downstream BM25SearchTransform indexes only visible tools', async () => {
      const searchTransform = new BM25SearchTransform();
      const allTools = [publicTool, hiddenTool];
      const context = createMockContext({ sessionId: 'sess-chain' });

      // Step 1: VisibilityTransform filters catalog
      const visibleTools = await transform.transformTools(allTools, context);
      expect(visibleTools.map((t) => t.name)).toEqual(['public_tool']);

      // Step 2: BM25SearchTransform indexes only what VisibilityTransform passed
      const indexedTools = await searchTransform.transformTools(visibleTools, context);
      const searchTool = indexedTools.find((t) => t.name === 'search_tools');
      expect(searchTool).toBeDefined();

      // Search for "secret" should return empty because secret_tool was hidden
      const searchResult = (await searchTool!.execute({ query: 'secret' }, context)) as {
        content: Array<{ type: string; text: string }>;
      };
      expect(searchResult.content[0].text).not.toContain('secret_tool');

      // Search for "public" should find public_tool
      const publicResult = (await searchTool!.execute({ query: 'public' }, context)) as {
        content: Array<{ type: string; text: string }>;
      };
      expect(publicResult.content[0].text).toContain('public_tool');
    });

    it('should ensure downstream CodeModeTransform exposes typings only for visible tools', async () => {
      const codeModeTransform = new CodeModeTransform();
      const allTools = [publicTool, hiddenTool];
      const context = createMockContext({ sessionId: 'sess-code-mode' });

      // Step 1: VisibilityTransform filters catalog
      const visibleTools = await transform.transformTools(allTools, context);

      // Step 2: CodeModeTransform generates definitions from visibleTools
      const codeModeTools = await codeModeTransform.transformTools(visibleTools, context);
      const searchCodeMode = codeModeTools.find((t) => t.name === 'search');
      expect(searchCodeMode).toBeDefined();

      const searchResult = (await searchCodeMode!.execute({ query: 'secret' }, context)) as {
        content: Array<{ type: string; text: string }>;
      };
      expect(searchResult.content[0].text).not.toContain('secret_tool');

      const publicResult = (await searchCodeMode!.execute({ query: 'public' }, context)) as {
        content: Array<{ type: string; text: string }>;
      };
      expect(publicResult.content[0].text).toContain('public_tool');

      await codeModeTransform.dispose();
    });
  });
});
