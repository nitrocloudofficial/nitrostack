import { describe, it, expect } from '@jest/globals';
import 'reflect-metadata';
import { McpApp, McpApplicationFactory, getMcpAppMetadata } from '../app-decorator.js';
import { Module } from '../module.js';
import { Controller, Tool as ToolDecorator } from '../decorators.js';
import { NitroStackServer, sessionIsolationKey } from '../server.js';
import { Tool } from '../tool.js';
import { McpTransform } from '../transforms/transform.interface.js';
import { CatalogTransform } from '../transforms/catalog.transform.js';
import { VisibilityTransform } from '../transforms/visibility/visibility.transform.js';
import { SessionVisibilityStore } from '../transforms/visibility/session-store.js';
import { z } from 'zod';

const MODERN = '2026-07-28';
const META_PROTOCOL = 'io.modelcontextprotocol/protocolVersion';
const META_CLIENT_CAPS = 'io.modelcontextprotocol/clientCapabilities';
const META_CLIENT_INFO = 'io.modelcontextprotocol/clientInfo';

function modernRequest(
  method: string,
  params: Record<string, unknown> = {},
  opts: { name?: string; id?: number; sessionId?: string } = {},
): Request {
  const envelope = {
    [META_PROTOCOL]: MODERN,
    [META_CLIENT_CAPS]: {},
    [META_CLIENT_INFO]: { name: 'jest-client', version: '1.0.0' },
  };
  const body = {
    jsonrpc: '2.0',
    id: opts.id ?? 1,
    method,
    params: { ...params, _meta: { ...(params._meta as object), ...envelope } },
  };
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'MCP-Protocol-Version': MODERN,
    'Mcp-Method': method,
  };
  if (opts.name) headers['Mcp-Name'] = opts.name;
  if (opts.sessionId) headers['mcp-session-id'] = opts.sessionId;
  return new Request('http://localhost/mcp', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

class FilterTransform extends CatalogTransform {
  readonly name = 'filter-transform';
  protected async applyTransform(tools: Tool[]): Promise<Tool[]> {
    return tools.filter((t) => t.name !== 'secret_tool');
  }
}

class SyntheticTransform extends CatalogTransform {
  readonly name = 'synthetic-transform';
  private syntheticTool: Tool<any, any>;

  constructor() {
    super();
    this.syntheticTool = new Tool({
      name: 'synthetic_echo',
      description: 'Synthetic echo tool',
      inputSchema: z.object({ msg: z.string() }),
      handler: async (args: { msg: string }) => ({ echoed: args.msg }),
    });
  }

  protected async applyTransform(tools: Tool[]): Promise<Tool[]> {
    return [...tools, this.syntheticTool];
  }

  override async resolveTool(name: string, next: any, context?: any): Promise<Tool | undefined> {
    if (name === 'synthetic_echo') {
      return this.syntheticTool;
    }
    return next(name, context);
  }
}

describe('Dual-Adapter Wiring & @McpApp Decorator (NITRO-101-M3)', () => {
  it('should store transforms in @McpApp metadata and pass them to server instance', async () => {
    const filter = new FilterTransform();

    @Controller()
    class TestController {
      @ToolDecorator({ name: 'regular_tool', description: 'Regular tool', inputSchema: z.object({}) })
      regular() {
        return 'ok';
      }

      @ToolDecorator({ name: 'secret_tool', description: 'Secret tool', inputSchema: z.object({}) })
      secret() {
        return 'hidden';
      }
    }

    @Module({
      name: 'test-module',
      controllers: [TestController],
    })
    class TestModule {}

    @McpApp({
      module: TestModule,
      server: { name: 'app-with-transforms', version: '2.0.0' },
      transforms: [filter],
    })
    class TestApp {}

    const meta = getMcpAppMetadata(TestApp);
    expect(meta?.transforms).toBeDefined();
    expect(meta?.transforms?.length).toBe(1);
    expect(meta?.transforms?.[0]).toBe(filter);

    const server = await McpApplicationFactory.create(TestApp);
    expect(server).toBeInstanceOf(NitroStackServer);
    expect(server.getTransforms().length).toBe(1);
    expect(server.getTransforms()[0]).toBe(filter);

    const transformedTools = await server.runToolPipeline();
    expect(transformedTools.map((t) => t.name)).toEqual(['regular_tool']);
  });

  it('should expose transformed tools via ProtocolRegistry.getTransformedTools()', async () => {
    const filter = new FilterTransform();
    const server = new NitroStackServer({
      name: 'test-server',
      version: '1.0.0',
      transforms: [filter],
    });

    server.tool(new Tool({
      name: 'regular_tool',
      description: 'Regular',
      inputSchema: z.object({}),
      handler: async () => 'regular',
    }));
    server.tool(new Tool({
      name: 'secret_tool',
      description: 'Secret',
      inputSchema: z.object({}),
      handler: async () => 'secret',
    }));

    const registry = (server as any).buildProtocolRegistry();
    const rawMap = registry.getTools();
    expect(rawMap.size).toBe(2);

    const transformedMap = await registry.getTransformedTools();
    expect(transformedMap.size).toBe(1);
    expect(transformedMap.has('regular_tool')).toBe(true);
    expect(transformedMap.has('secret_tool')).toBe(false);
  });

  it('should register transformed tools and execute synthetic tools in ModernProtocolAdapter', async () => {
    const filter = new FilterTransform();
    const synthetic = new SyntheticTransform();

    const server = new NitroStackServer({
      name: 'modern-transformed-server',
      version: '1.0.0',
      protocolVersion: '2026-07-28',
      transforms: [filter, synthetic],
    });

    server.tool(new Tool({
      name: 'regular_tool',
      description: 'Regular tool',
      inputSchema: z.object({}),
      handler: async () => ({ status: 'regular' }),
    }));
    server.tool(new Tool({
      name: 'secret_tool',
      description: 'Secret tool',
      inputSchema: z.object({}),
      handler: async () => ({ status: 'secret' }),
    }));

    const adapter = await (server as unknown as { getModernAdapter: () => Promise<any> }).getModernAdapter();
    expect(adapter).toBeDefined();
    const handler = await adapter.getHttpHandler();

    try {
      // Call tools/list over modern wire
      const listReq = modernRequest('tools/list', {}, { id: 1 });
      const listRes = await handler.fetch(listReq);
      expect(listRes.status).toBe(200);
      const listText = await listRes.text();
      const listBody = JSON.parse(listText);
      const toolNames = listBody.result.tools.map((t: any) => t.name);

      expect(toolNames).toContain('regular_tool');
      expect(toolNames).toContain('synthetic_echo');
      expect(toolNames).not.toContain('secret_tool');

      // Call synthetic tool over modern wire
      const callReq = modernRequest('tools/call', {
        name: 'synthetic_echo',
        arguments: { msg: 'hello from modern wire' },
      }, { id: 2, name: 'synthetic_echo' });
      const callRes = await handler.fetch(callReq);
      expect(callRes.status).toBe(200);
      const callText = await callRes.text();
      const callBody = JSON.parse(callText);
      expect(callBody.result).toBeDefined();
      expect(callBody.result.content).toBeDefined();
      expect(callBody.result.content[0].text).toContain('hello from modern wire');
    } finally {
      await handler?.close?.();
      await (server as unknown as { stop?: () => Promise<void> }).stop?.().catch(() => undefined);
    }
  });

  it('filters modern tools/list by the request session', async () => {
    const store = new SessionVisibilityStore();
    const server = new NitroStackServer({
      name: 'modern-visibility-server',
      version: '1.0.0',
      protocolVersion: '2026-07-28',
      transforms: [new VisibilityTransform(store)],
    });

    server.tool(new Tool({
      name: 'lookup_order',
      description: 'Look up an order',
      inputSchema: z.object({}),
      handler: async () => ({ ok: true }),
    }));
    server.tool(new Tool({
      name: 'ping',
      description: 'Liveness check',
      inputSchema: z.object({}),
      handler: async () => ({ pong: true }),
    }));
    server.tool(new Tool({
      name: 'process_refund',
      description: 'Issue a refund',
      inputSchema: z.object({}),
      visibility: 'hidden',
      handler: async () => ({ refunded: true }),
    }));

    store.enableTools('anon:sess-revealed', ['process_refund']);
    store.disableTools('anon:sess-revoked', ['lookup_order']);

    const adapter = await (server as unknown as { getModernAdapter: () => Promise<any> }).getModernAdapter();
    const handler = await adapter.getHttpHandler();

    const names = async (sessionId: string) => {
      const res = await handler.fetch(modernRequest('tools/list', {}, { sessionId }));
      expect(res.status).toBe(200);
      const body = JSON.parse(await res.text());
      return body.result.tools.map((t: { name: string }) => t.name) as string[];
    };

    try {
      const revealed = await names('sess-revealed');
      expect(revealed).toContain('lookup_order');
      expect(revealed).toContain('process_refund');

      const revoked = await names('sess-revoked');
      expect(revoked).toContain('ping');
      expect(revoked).not.toContain('lookup_order');
      expect(revoked).not.toContain('process_refund');
    } finally {
      await handler?.close?.();
      await server.stop();
      store.destroy();
    }
  });

  it('does not adopt a session id from requestState', async () => {
    const store = new SessionVisibilityStore();
    const server = new NitroStackServer({
      name: 'modern-session-principal',
      version: '1.0.0',
      protocolVersion: '2026-07-28',
      transforms: [new VisibilityTransform(store)],
    });
    server.tool(new Tool({
      name: 'process_refund',
      description: 'Issue a refund',
      inputSchema: z.object({}),
      visibility: 'hidden',
      handler: async () => ({ refunded: true }),
    }));
    store.enableTools('anon:sess-revealed', ['process_refund']);

    const adapter = await (server as unknown as { getModernAdapter: () => Promise<any> }).getModernAdapter();

    try {
      expect(() =>
        adapter.buildContext(
          { mcpReq: { requestState: { sessionId: 'sess-revealed' } } },
          { toolName: 'process_refund' }
        )
      ).toThrow(/Session required/);

      const fromHeader = adapter.buildContext(
        {
          mcpReq: { requestState: { sessionId: 'sess-other' } },
          headers: { 'mcp-session-id': 'sess-revealed' },
        },
        { toolName: 'process_refund' }
      );
      expect(fromHeader.sessionId).toBe('anon:sess-revealed');
      await expect(server.resolveTool('process_refund', fromHeader)).resolves.toMatchObject({
        name: 'process_refund',
      });
    } finally {
      await server.stop();
      store.destroy();
    }
  });

  it('uses the same isolation key for list and call when authInfo is present', () => {
    const server = new NitroStackServer({
      name: 'modern-session-key',
      version: '1.0.0',
      protocolVersion: '2026-07-28',
      transforms: [new VisibilityTransform(new SessionVisibilityStore())],
    });
    const adapter = (server as unknown as { getModernAdapter: () => Promise<any> });
    return adapter.getModernAdapter().then(async (resolved: any) => {
      const authInfo = { subject: 'alice' };
      const headers = {
        get(name: string) {
          return name.toLowerCase() === 'mcp-session-id' ? 'sess-1' : null;
        },
      };
      const fromList = resolved.contextFromFactory({
        requestInfo: { headers },
        authInfo,
      });
      const fromCall = resolved.buildContext(
        { headers: { 'mcp-session-id': 'sess-1' }, authInfo },
        { toolName: 'lookup_order' }
      );
      expect(fromList.sessionId).toBe('user:alice:sess-1');
      expect(fromCall.sessionId).toBe(fromList.sessionId);
      await server.stop();
    });
  });

  it('rejects tools/list and tools/call that omit the session when visibility is installed', async () => {
    const store = new SessionVisibilityStore();
    const server = new NitroStackServer({
      name: 'modern-session-required',
      version: '1.0.0',
      protocolVersion: '2026-07-28',
      transforms: [new VisibilityTransform(store)],
    });
    server.tool(new Tool({
      name: 'lookup_order',
      description: 'Look up an order',
      inputSchema: z.object({}),
      handler: async () => ({ ok: true }),
    }));
    server.tool(new Tool({
      name: 'ping',
      description: 'Liveness check',
      inputSchema: z.object({}),
      handler: async () => ({ pong: true }),
    }));
    server.tool(new Tool({
      name: 'process_refund',
      description: 'Issue a refund',
      inputSchema: z.object({}),
      visibility: 'hidden',
      handler: async () => ({ refunded: true }),
    }));
    store.disableTools('anon:sess-revoked', ['lookup_order']);

    const adapter = await (server as unknown as { getModernAdapter: () => Promise<any> }).getModernAdapter();
    const handler = await adapter.getHttpHandler();

    const errorCode = async (request: Request) => {
      const res = await handler.fetch(request);
      const body = JSON.parse(await res.text());
      return body.error?.code as number | undefined;
    };

    try {
      const listed = await handler.fetch(modernRequest('tools/list', {}, { sessionId: 'sess-revoked', id: 4 }));
      const listedBody = JSON.parse(await listed.text());
      const names = listedBody.result.tools.map((t: { name: string }) => t.name);
      expect(names).not.toContain('lookup_order');
      expect(names).not.toContain('process_refund');

      expect(await errorCode(modernRequest('tools/list', {}, { id: 5 }))).toBe(-32600);
      expect(
        await errorCode(modernRequest('tools/call', { name: 'lookup_order', arguments: {} }, { name: 'lookup_order', id: 6 }))
      ).toBe(-32600);
      expect(
        await errorCode(
          modernRequest('tools/call', { name: 'process_refund', arguments: {} }, { name: 'process_refund', id: 7 })
        )
      ).toBe(-32600);
    } finally {
      await handler?.close?.();
      await server.stop();
      store.destroy();
    }
  });

  it('shows a disableTools revocation on the next tools/list for the same session', async () => {
    const store = new SessionVisibilityStore();
    const server = new NitroStackServer({
      name: 'modern-list-call-key',
      version: '1.0.0',
      protocolVersion: '2026-07-28',
      transforms: [new VisibilityTransform(store)],
    });
    server.tool(new Tool({
      name: 'lookup_order',
      description: 'Look up an order',
      inputSchema: z.object({}),
      handler: async () => ({ ok: true }),
    }));
    server.tool(new Tool({
      name: 'lock_down',
      description: 'Hide lookup_order',
      inputSchema: z.object({}),
      handler: async (_args: unknown, ctx: { disableTools?: (names: string[]) => Promise<void> }) => {
        await ctx.disableTools?.(['lookup_order']);
        return { locked: true };
      },
    }));

    const adapter = await (server as unknown as { getModernAdapter: () => Promise<any> }).getModernAdapter();
    const handler = await adapter.getHttpHandler();

    try {
      const call = await handler.fetch(
        modernRequest('tools/call', { name: 'lock_down', arguments: {} }, { name: 'lock_down', sessionId: 'sess-1' })
      );
      expect(call.status).toBe(200);
      const listed = await handler.fetch(modernRequest('tools/list', {}, { sessionId: 'sess-1' }));
      const body = JSON.parse(await listed.text());
      const names = body.result.tools.map((t: { name: string }) => t.name);
      expect(names).not.toContain('lookup_order');
    } finally {
      await handler?.close?.();
      await server.stop();
      store.destroy();
    }
  });

  describe('task-augmented tools/call', () => {
    async function flushBackground(): Promise<void> {
      await new Promise((resolve) => setImmediate(resolve));
    }

    function refundServer(opts: { hidden?: boolean; taskSupport?: 'optional' | 'forbidden' | 'required' } = {}) {
      const store = new SessionVisibilityStore();
      const calls: Array<{ sessionId?: string }> = [];
      const server = new NitroStackServer({
        name: 'task-visibility-server',
        version: '1.0.0',
        protocolVersion: '2026-07-28',
        transforms: [new VisibilityTransform(store)],
      });
      server.tool(new Tool({
        name: 'refund',
        description: 'Issue a refund',
        inputSchema: z.object({}),
        visibility: opts.hidden ? 'hidden' : undefined,
        taskSupport: opts.taskSupport ?? 'optional',
        handler: async (_args: unknown, ctx: { sessionId?: string }) => {
          calls.push({ sessionId: ctx.sessionId });
          return { refunded: true };
        },
      }));
      return { server, store, calls };
    }

    it('does not run a hidden tool when the call is task-augmented', async () => {
      const { server, store, calls } = refundServer({ hidden: true });
      const adapter = await (server as unknown as { getModernAdapter: () => Promise<any> }).getModernAdapter();
      const handler = await adapter.getHttpHandler();
      try {
        const res = await handler.fetch(modernRequest(
          'tools/call',
          { name: 'refund', arguments: {}, task: {} },
          { name: 'refund', sessionId: 'sess-hidden' },
        ));
        const body = JSON.parse(await res.text());
        expect(body.error?.code).toBe(-32601);
        await flushBackground();
        expect(calls).toEqual([]);
      } finally {
        await handler?.close?.();
        await server.stop();
        store.destroy();
      }
    });

    it('does not run a tool the session has disabled', async () => {
      const { server, store, calls } = refundServer();
      store.disableTools(sessionIsolationKey('sess-revoked', undefined)!, ['refund']);
      const adapter = await (server as unknown as { getModernAdapter: () => Promise<any> }).getModernAdapter();
      const handler = await adapter.getHttpHandler();
      try {
        const res = await handler.fetch(modernRequest(
          'tools/call',
          { name: 'refund', arguments: {}, task: {} },
          { name: 'refund', sessionId: 'sess-revoked' },
        ));
        const body = JSON.parse(await res.text());
        expect(body.error?.code).toBe(-32601);
        await flushBackground();
        expect(calls).toEqual([]);
      } finally {
        await handler?.close?.();
        await server.stop();
        store.destroy();
      }
    });

    it('runs an allowed task-augmented tool with the isolation key', async () => {
      const { server, store, calls } = refundServer();
      const adapter = await (server as unknown as { getModernAdapter: () => Promise<any> }).getModernAdapter();
      const handler = await adapter.getHttpHandler();
      try {
        const res = await handler.fetch(modernRequest(
          'tools/call',
          { name: 'refund', arguments: {}, task: {} },
          { name: 'refund', sessionId: 'sess-ok' },
        ));
        const body = JSON.parse(await res.text());
        expect(body.result?.resultType).toBe('task');
        expect(body.result?.task?.taskId).toEqual(expect.any(String));
        await flushBackground();
        expect(calls).toEqual([{ sessionId: sessionIsolationKey('sess-ok', undefined) }]);
      } finally {
        await handler?.close?.();
        await server.stop();
        store.destroy();
      }
    });

    it('binds the task execution context to the verified subject', async () => {
      const { server, store, calls } = refundServer();
      const adapter = await (server as unknown as { getModernAdapter: () => Promise<any> }).getModernAdapter();
      try {
        const body = await adapter['handleTaskPreDispatch'](
          {
            jsonrpc: '2.0',
            id: 7,
            method: 'tools/call',
            params: { name: 'refund', arguments: {}, task: {} },
          },
          {
            headers: {
              get: (name: string) => (name.toLowerCase() === 'mcp-session-id' ? '8f3c' : null),
            },
            authInfo: { subject: 'alice' },
          },
        );
        expect(body.result?.resultType).toBe('task');
        await flushBackground();
        expect(calls).toEqual([{ sessionId: 'user:alice:8f3c' }]);
      } finally {
        await server.stop();
        store.destroy();
      }
    });

    it('rejects task augmentation for a tool that forbids tasks', async () => {
      const { server, store, calls } = refundServer({ taskSupport: 'forbidden' });
      const adapter = await (server as unknown as { getModernAdapter: () => Promise<any> }).getModernAdapter();
      const handler = await adapter.getHttpHandler();
      try {
        const res = await handler.fetch(modernRequest(
          'tools/call',
          { name: 'refund', arguments: {}, task: {} },
          { name: 'refund', sessionId: 'sess-forbid' },
        ));
        const body = JSON.parse(await res.text());
        expect(body.error?.code).toBe(-32601);
        expect(body.error?.message).toContain('does not support task augmentation');
        await flushBackground();
        expect(calls).toEqual([]);
      } finally {
        await handler?.close?.();
        await server.stop();
        store.destroy();
      }
    });

    it('lets a tools/call without task reach the registered handler', async () => {
      const { server, store, calls } = refundServer();
      const adapter = await (server as unknown as { getModernAdapter: () => Promise<any> }).getModernAdapter();
      const handler = await adapter.getHttpHandler();
      try {
        const res = await handler.fetch(modernRequest(
          'tools/call',
          { name: 'refund', arguments: {} },
          { name: 'refund', sessionId: 'sess-sync' },
        ));
        const body = JSON.parse(await res.text());
        expect(body.result?.task).toBeUndefined();
        expect(body.result?.content?.[0]?.text).toContain('refunded');
        expect(calls).toEqual([{ sessionId: sessionIsolationKey('sess-sync', undefined) }]);
      } finally {
        await handler?.close?.();
        await server.stop();
        store.destroy();
      }
    });
  });
});
