import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { z } from 'zod';
import { NitroStackServer } from '../../server.js';
import { Tool } from '../../tool.js';
import { DataSpilloverInterceptor } from '../data-spillover.interceptor.js';
import { MemorySpilloverStore } from '../spillover/memory-spillover.store.js';

describe('Data Spillover & ResourceTemplate E2E Suite (NITRO-105-M4)', () => {
  let server: NitroStackServer;
  let sharedStore: MemorySpilloverStore;

  beforeEach(() => {
    sharedStore = new MemorySpilloverStore({ maxSizeBytes: 10 * 1024 * 1024 });
    server = new NitroStackServer({
      name: 'spillover-e2e-server',
      version: '1.0.0',
    });
    server.setSpilloverStore(sharedStore);
    server['registerSpilloverResourceTemplate']();
  });

  afterEach(async () => {
    await server.stop();
    await sharedStore.dispose();
  });

  it('advertises resource://data-spillover/{id} in resource template list', async () => {
    const templates = server['resourceTemplates'];
    expect(templates.has('resource://data-spillover/{id}')).toBe(true);
  });

  it('completes full cycle: large payload spills over -> resources/read returns raw data', async () => {
    // 1. Register tool with 1KB threshold
    const interceptor = new DataSpilloverInterceptor({
      maxPayloadBytes: 1024,
      storage: sharedStore,
      spilloverTtlSeconds: 60,
    });

    const mockDataset = Array.from({ length: 100 }, (_, i) => ({
      index: i,
      name: `Customer Transaction Record #${i}`,
      amount: i * 42.5,
    }));

    server.registerTool(
      new Tool({
        name: 'fetch_big_data',
        description: 'Fetches dataset',
        inputSchema: z.object({}),
        interceptors: [interceptor],
        handler: async () => mockDataset,
      })
    );

    // 2. Invoke tool
    const tool = server.getTool('fetch_big_data')!;
    const ctx = server['createExecutionContext']({ toolName: 'fetch_big_data' });
    const toolResult = (await tool.execute({}, ctx)) as any;

    expect(toolResult._spillover).toBe(true);
    expect(toolResult.resourceUri).toMatch(/^resource:\/\/data-spillover\/spill-/);
    expect(toolResult.preview.length).toBe(3);

    // 3. Perform MCP resources/read using the generated URI
    const resourceUri = toolResult.resourceUri;
    const templateResource = server['templateResources'].get('resource://data-spillover/{id}')!;
    expect(templateResource).toBeDefined();

    const resourceContent = await templateResource.fetch(ctx, resourceUri);
    expect(resourceContent.type).toBe('json');
    expect(resourceContent.data).toEqual(mockDataset);
  });

  it('refuses a spillover read from a different session', async () => {
    const interceptor = new DataSpilloverInterceptor({
      maxPayloadBytes: 64,
      storage: sharedStore,
    });
    server.registerTool(
      new Tool({
        name: 'fetch_private',
        description: 'Fetches a private dataset',
        inputSchema: z.object({}),
        interceptors: [interceptor],
        handler: async () => 'z'.repeat(200),
      })
    );

    const tool = server.getTool('fetch_private')!;
    const owner = server.createExecutionContext(
      { toolName: 'fetch_private', extra: { sessionId: 'sess-owner' } },
    );
    const toolResult = (await tool.execute({}, owner)) as { resourceUri: string };
    const templateResource = server['templateResources'].get('resource://data-spillover/{id}')!;

    await expect(
      templateResource.fetch(
        server.createExecutionContext({ extra: { sessionId: 'sess-other' } }),
        toolResult.resourceUri,
      ),
    ).rejects.toThrow();

    const ownRead = await templateResource.fetch(owner, toolResult.resourceUri);
    expect(ownRead.type).toBe('text');
    expect(ownRead.data).toBe('z'.repeat(200));
  });

  it('resolves spillover URIs with no storage option configured', async () => {
    // Regression: the interceptor used to build its own private store while the
    // resource handler read from the server's, so default-configured spillover
    // produced URIs that could never be read back.
    const interceptor = new DataSpilloverInterceptor({ maxPayloadBytes: 1024 });

    const mockDataset = Array.from({ length: 100 }, (_, i) => ({
      index: i,
      name: `Record #${i}`,
    }));

    server.registerTool(
      new Tool({
        name: 'fetch_defaults',
        description: 'Fetches dataset with a default-configured interceptor',
        inputSchema: z.object({}),
        interceptors: [interceptor],
        handler: async () => mockDataset,
      })
    );

    const ctx = server['createExecutionContext']({ toolName: 'fetch_defaults' });
    const toolResult = (await server.getTool('fetch_defaults')!.execute({}, ctx)) as any;
    expect(toolResult._spillover).toBe(true);

    const templateResource = server['templateResources'].get('resource://data-spillover/{id}')!;
    const resourceContent = await templateResource.fetch(ctx, toolResult.resourceUri);
    expect(resourceContent.data).toEqual(mockDataset);
  });

  it('throws ResourceNotFoundError when reading non-existent or expired spillover URI', async () => {
    const ctx = server['createExecutionContext']();
    const templateResource = server['templateResources'].get('resource://data-spillover/{id}')!;

    await expect(
      templateResource.fetch(ctx, 'resource://data-spillover/spill-does-not-exist')
    ).rejects.toThrow();
  });

  it('evicts expired spillover resource after TTL expires', async () => {
    jest.useFakeTimers();
    try {
      const interceptor = new DataSpilloverInterceptor({
        maxPayloadBytes: 100,
        storage: sharedStore,
        spilloverTtlSeconds: 2, // 2 second TTL
      });

      const tool = new Tool({
        name: 'ephemeral_tool',
        description: 'Ephemeral data tool',
        inputSchema: z.object({}),
        interceptors: [interceptor],
        handler: async () => ({ big: 'x'.repeat(200) }),
      });

      const ctx = server['createExecutionContext']({ toolName: 'ephemeral_tool' });
      const res = (await tool.execute({}, ctx)) as any;

      const templateResource = server['templateResources'].get('resource://data-spillover/{id}')!;

      // Immediately readable
      const initialRead = await templateResource.fetch(ctx, res.resourceUri);
      expect(initialRead).toBeDefined();

      // Fast-forward 3 seconds past TTL
      jest.advanceTimersByTime(3000);
      await sharedStore.cleanup();

      await expect(templateResource.fetch(ctx, res.resourceUri)).rejects.toThrow();
    } finally {
      jest.useRealTimers();
    }
  });

  it('correctly returns binary data for octet-stream spillover records', async () => {
    const rawBuffer = Buffer.from('Binary content of spilled asset', 'utf8');
    const interceptor = new DataSpilloverInterceptor({
      maxPayloadBytes: 10,
      storage: sharedStore,
      spilloverTtlSeconds: 60,
    });

    const tool = new Tool({
      name: 'binary_tool',
      description: 'Binary data tool',
      inputSchema: z.object({}),
      interceptors: [interceptor],
      handler: async () => rawBuffer,
    });

    const ctx = server['createExecutionContext']({ toolName: 'binary_tool' });
    const res = (await tool.execute({}, ctx)) as any;

    expect(res._spillover).toBe(true);
    expect(res.mimeType).toBe('application/octet-stream');

    const templateResource = server['templateResources'].get('resource://data-spillover/{id}')!;
    const content = await templateResource.fetch(ctx, res.resourceUri);

    expect(content.type).toBe('binary');
    expect(Buffer.isBuffer(content.data)).toBe(true);
    expect((content.data as Buffer).toString('utf8')).toBe('Binary content of spilled asset');
  });

  it('correctly returns text data for text/plain spillover records', async () => {
    const rawText = 'String of long text'.repeat(30);
    const interceptor = new DataSpilloverInterceptor({
      maxPayloadBytes: 20,
      storage: sharedStore,
      spilloverTtlSeconds: 60,
    });

    const tool = new Tool({
      name: 'text_tool',
      description: 'Text data tool',
      inputSchema: z.object({}),
      interceptors: [interceptor],
      handler: async () => rawText,
    });

    const ctx = server['createExecutionContext']({ toolName: 'text_tool' });
    const res = (await tool.execute({}, ctx)) as any;

    expect(res._spillover).toBe(true);
    expect(res.mimeType).toBe('text/plain');

    const templateResource = server['templateResources'].get('resource://data-spillover/{id}')!;
    const content = await templateResource.fetch(ctx, res.resourceUri);

    expect(content.type).toBe('text');
    expect(content.data).toBe(rawText);
  });
});
