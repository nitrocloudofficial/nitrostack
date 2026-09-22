import { describe, it, expect } from '@jest/globals';
import 'reflect-metadata';
import { McpApp, McpApplicationFactory, getMcpAppMetadata } from '../app-decorator.js';
import { Module } from '../module.js';
import { Controller, Tool as ToolDecorator } from '../decorators.js';
import { NitroStackServer } from '../server.js';
import { Tool } from '../tool.js';
import { McpTransform } from '../transforms/transform.interface.js';
import { CatalogTransform } from '../transforms/catalog.transform.js';
import { z } from 'zod';

const MODERN = '2026-07-28';
const META_PROTOCOL = 'io.modelcontextprotocol/protocolVersion';
const META_CLIENT_CAPS = 'io.modelcontextprotocol/clientCapabilities';
const META_CLIENT_INFO = 'io.modelcontextprotocol/clientInfo';

function modernRequest(
  method: string,
  params: Record<string, unknown> = {},
  opts: { name?: string; id?: number } = {},
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
});
