import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { NitroStackServer } from '../../server.js';
import { Tool } from '../../tool.js';
import { Component } from '../../component.js';
import { CatalogTransform } from '../catalog.transform.js';
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
    [META_CLIENT_INFO]: { name: 'jest-parity-client', version: '1.0.0' },
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

class CatalogFilterTransform extends CatalogTransform {
  readonly name = 'catalog-filter';
  protected async applyTransform(tools: Tool[]): Promise<Tool[]> {
    return tools.filter((t) => !t.name.startsWith('internal_'));
  }
}

describe('Dual-Spec Protocol Parity (NITRO-101-M4)', () => {
  let server: NitroStackServer;
  let handler: any;

  beforeEach(() => {
    server = new NitroStackServer({
      name: 'parity-test-server',
      version: '1.0.0',
      protocolVersion: 'auto',
      transforms: [new CatalogFilterTransform()],
    });
  });

  afterEach(async () => {
    await handler?.close?.();
    await (server as unknown as { stop?: () => Promise<void> }).stop?.().catch(() => undefined);
  });

  it('returns identical tool catalog structure on modern and legacy transports', async () => {
    const publicTool = new Tool({
      name: 'calculate_tax',
      description: 'Calculates sales tax',
      inputSchema: z.object({ amount: z.number(), state: z.string() }),
      handler: async () => ({ tax: 5.0 }),
    });

    const internalTool = new Tool({
      name: 'internal_reset_db',
      description: 'Internal reset',
      inputSchema: z.object({}),
      handler: async () => 'done',
    });

    server.tool(publicTool);
    server.tool(internalTool);

    // 1. Legacy view: runToolPipeline() converted to McpTool[]
    const legacyRawTools = await server.runToolPipeline();
    const legacyTools = await Promise.all(legacyRawTools.map((t) => t.toMcpTool()));

    expect(legacyTools.length).toBe(1);
    expect(legacyTools[0].name).toBe('calculate_tax');
    expect(legacyTools[0].description).toBe('Calculates sales tax');

    // 2. Modern view: tools/list via ModernProtocolAdapter HTTP handler
    const adapter = await (server as unknown as { getModernAdapter: () => Promise<any> }).getModernAdapter();
    handler = await adapter.getHttpHandler();

    const listRes = await handler.fetch(modernRequest('tools/list', {}, { id: 1 }));
    expect(listRes.status).toBe(200);
    const listBody = JSON.parse(await listRes.text());
    const modernTools = listBody.result.tools;

    expect(modernTools.length).toBe(1);
    expect(modernTools[0].name).toBe('calculate_tax');
    expect(modernTools[0].description).toBe('Calculates sales tax');

    // Compare schemas: property types should match
    expect(modernTools[0].name).toEqual(legacyTools[0].name);
    expect(modernTools[0].description).toEqual(legacyTools[0].description);
    expect(modernTools[0].inputSchema.properties.amount.type).toBe('number');
    expect(modernTools[0].inputSchema.properties.state.type).toBe('string');
  });

  it('preserves tool metadata, annotations, and UI component templates across both adapters', async () => {
    const component = new Component({
      id: 'receipt_widget_id',
      name: 'receipt_widget',
      description: 'Receipt display widget',
      html: '<div>Receipt</div>',
    });

    const widgetTool = new Tool({
      name: 'show_receipt',
      description: 'Show customer receipt',
      inputSchema: z.object({ orderId: z.string() }),
      annotations: { readOnlyHint: true },
      handler: async () => ({ orderId: '12345' }),
    });
    widgetTool.setComponent(component);

    server.tool(widgetTool);

    // Verify legacy tool metadata
    const legacyRawTools = await server.runToolPipeline();
    const legacyMcpTool = await legacyRawTools.find((t) => t.name === 'show_receipt')?.toMcpTool();
    expect(legacyMcpTool).toBeDefined();
    expect(legacyMcpTool?.annotations?.readOnlyHint).toBe(true);

    // Verify modern wire representation
    const adapter = await (server as unknown as { getModernAdapter: () => Promise<any> }).getModernAdapter();
    handler = await adapter.getHttpHandler();

    const listRes = await handler.fetch(modernRequest('tools/list', {}, { id: 2 }));
    const listBody = JSON.parse(await listRes.text());
    const modernTool = listBody.result.tools.find((t: any) => t.name === 'show_receipt');

    expect(modernTool).toBeDefined();
    expect(modernTool.annotations?.readOnlyHint).toBe(true);
    expect(modernTool._meta).toBeDefined();
    expect(modernTool._meta['ui/template']).toBe(component.getResourceUri());
  });
});
