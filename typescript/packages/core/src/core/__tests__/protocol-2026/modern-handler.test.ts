/**
 * End-to-end 2026-07-28 wire tests driving the official v2 engine through the
 * NitroStack modern adapter's web-standard `fetch` handler (the SDK-recommended
 * in-process approach; the 2025-era `InMemoryTransport` is legacy-only).
 *
 * These prove the adapter binds the NitroStack registry to real stateless HTTP:
 * `server/discover`, `_meta` envelope → `ExecutionContext`, and SEP-2164 error
 * mapping. No `Mcp-Session-Id` is ever used.
 */

import { NitroStackServer } from '../../server.js';
import { Tool } from '../../tool.js';
import { Resource } from '../../resource.js';
import { ResourceNotFoundError } from '../../errors.js';
import { z } from 'zod';

const MODERN = '2026-07-28';
const META_PROTOCOL = 'io.modelcontextprotocol/protocolVersion';
const META_CLIENT_CAPS = 'io.modelcontextprotocol/clientCapabilities';
const META_CLIENT_INFO = 'io.modelcontextprotocol/clientInfo';

interface RpcResult {
  status: number;
  body: { jsonrpc?: string; id?: unknown; result?: any; error?: { code: number; message: string } };
}

/** Build a well-formed modern (2026-07-28) JSON-RPC request. */
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
    Accept: 'application/json, text/event-stream',
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

function extractRpc(text: string, isSse: boolean): RpcResult['body'] | undefined {
  if (isSse) {
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data:')) {
        try {
          const parsed = JSON.parse(trimmed.slice(5).trim());
          if (parsed && (parsed.result !== undefined || parsed.error !== undefined)) {
            return parsed;
          }
        } catch {
          /* keep scanning */
        }
      }
    }
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/**
 * Parse a JSON or SSE response into the first JSON-RPC message. Reads the body
 * stream incrementally and returns as soon as a message is found, then cancels
 * — so a long-lived SSE stream (the legacy Streamable HTTP response channel)
 * never blocks the test.
 */
async function readRpc(res: Response): Promise<RpcResult> {
  const contentType = res.headers.get('content-type') || '';
  const isSse = contentType.includes('text/event-stream');
  if (!res.body) {
    return { status: res.status, body: extractRpc(await res.text(), isSse) ?? {} };
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    // Overall guard so a stuck stream cannot hang the suite.
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const { value, done } = await reader.read();
      if (value) buffer += decoder.decode(value, { stream: true });
      const parsed = extractRpc(buffer, isSse);
      if (parsed) return { status: res.status, body: parsed };
      if (done) break;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  return { status: res.status, body: extractRpc(buffer, isSse) ?? {} };
}

describe('modern (2026-07-28) handler via fetch', () => {
  let server: NitroStackServer;
  let handler: { fetch: (req: Request) => Promise<Response>; close: () => Promise<void> };
  let lastToolContext: { protocolVersion?: string; clientInfo?: unknown } | undefined;

  beforeAll(async () => {
    server = new NitroStackServer({ name: 'modern-test', version: '9.9.9', protocolVersion: MODERN });

    server.tool(
      new Tool({
        name: 'echo',
        description: 'Echo the input text back.',
        inputSchema: z.object({ text: z.string() }),
        cacheTtlSeconds: 30,
        handler: async (input, ctx) => {
          lastToolContext = { protocolVersion: ctx.protocolVersion, clientInfo: ctx.clientInfo };
          return { echoed: (input as { text: string }).text };
        },
      }),
    );

    server.tool(
      new Tool({
        name: 'must_be_task',
        description: 'Tool requiring task augmentation',
        inputSchema: z.object({}),
        taskSupport: 'required',
        handler: async (input, ctx) => {
          if (ctx?.task) {
            await ctx.task.updateProgress('task working');
          }
          return { processed: true };
        },
      }),
    );

    server.tool(
      new Tool({
        name: 'forbidden_task',
        description: 'Tool forbidding task augmentation',
        inputSchema: z.object({}),
        taskSupport: 'forbidden',
        handler: async () => ({ immediate: true }),
      }),
    );

    server.tool(
      new Tool({
        name: 'optional_task',
        description: 'Tool with optional task augmentation',
        inputSchema: z.object({}),
        taskSupport: 'optional',
        handler: async (input, ctx) => ({ hasTask: !!ctx?.task }),
      }),
    );

    server.resource(
      new Resource({
        uri: 'mcp://data/greeting',
        name: 'greeting',
        description: 'A static greeting.',
        mimeType: 'text/plain',
        handler: async () => ({ type: 'text', data: 'hello' }),
      }),
    );

    // A resource whose handler raises NitroStack's ResourceNotFoundError, to
    // exercise the modern adapter's SEP-2164 mapping (-> -32602).
    server.resource(
      new Resource({
        uri: 'mcp://data/flaky',
        name: 'flaky',
        description: 'Always missing.',
        mimeType: 'text/plain',
        handler: async (uri: string) => {
          throw new ResourceNotFoundError(uri);
        },
      }),
    );

    const adapter = await (server as unknown as { getModernAdapter: () => Promise<any> }).getModernAdapter();
    handler = await adapter.getHttpHandler();
  });

  afterAll(async () => {
    await handler?.close?.();
    await (server as unknown as { stop?: () => Promise<void> }).stop?.().catch(() => undefined);
  });

  it('lists tools statelessly (no Mcp-Session-Id) via tools/list', async () => {
    const res = await handler.fetch(modernRequest('tools/list', {}, { id: 1 }));
    const { status, body } = await readRpc(res);
    expect(status).toBe(200);
    expect(body.error).toBeUndefined();
    const toolNames = (body.result?.tools ?? []).map((t: any) => t.name);
    expect(toolNames).toContain('echo');
    // No session header should ever be issued on the modern (stateless) path.
    expect(res.headers.get('Mcp-Session-Id')).toBeNull();
  });

  it('answers server/discover with a result (capabilities negotiated)', async () => {
    const res = await handler.fetch(modernRequest('server/discover', {}, { id: 2 }));
    const { status, body } = await readRpc(res);
    expect(status).toBe(200);
    expect(body.error).toBeUndefined();
    expect(body.result).toBeDefined();
  });

  it('populates ExecutionContext from the _meta envelope on tools/call', async () => {
    lastToolContext = undefined;
    const res = await handler.fetch(
      modernRequest('tools/call', { name: 'echo', arguments: { text: 'hi' } }, { name: 'echo', id: 3 }),
    );
    const { body } = await readRpc(res);
    expect(body.error).toBeUndefined();
    const seen = lastToolContext as { protocolVersion?: string; clientInfo?: unknown } | undefined;
    expect(seen?.protocolVersion).toBe(MODERN);
    expect(seen?.clientInfo).toMatchObject({ name: 'jest-client' });
  });

  it('maps a missing resource to -32602 (SEP-2164), not the 2025-era -32002', async () => {
    const res = await handler.fetch(
      modernRequest('resources/read', { uri: 'mcp://data/flaky' }, { name: 'mcp://data/flaky', id: 4 }),
    );
    const { body } = await readRpc(res);
    expect(body.error).toBeDefined();
    expect(body.error?.code).toBe(-32602);
  });

  it('rejects a tools/call missing the required SEP-2243 Mcp-Name header (-32020)', async () => {
    // Same body as a valid call, but no Mcp-Name header naming the tool.
    const res = await handler.fetch(
      modernRequest('tools/call', { name: 'echo', arguments: { text: 'x' } }, { id: 5 }),
    );
    const { status, body } = await readRpc(res);
    expect(status).toBe(400);
    expect(body.error?.code).toBe(-32020);
  });

  it('rejects an Mcp-Method header that disagrees with the body (-32020)', async () => {
    // Body says tools/list but the Mcp-Method header claims server/discover.
    const req = modernRequest('tools/list', {}, { id: 6 });
    const headers = new Headers(req.headers);
    headers.set('Mcp-Method', 'server/discover');
    const mismatched = new Request(req.url, { method: 'POST', headers, body: await req.text() });
    const res = await handler.fetch(mismatched);
    const { status, body } = await readRpc(res);
    expect(status).toBe(400);
    expect(body.error?.code).toBe(-32020);
  });

  describe('taskSupport negotiation in modern era', () => {
    it('rejects tools/call on tool with taskSupport=required when task param is missing (-32600)', async () => {
      const res = await handler.fetch(
        modernRequest('tools/call', { name: 'must_be_task', arguments: {} }, { name: 'must_be_task', id: 7 }),
      );
      const { body } = await readRpc(res);
      expect(body.error).toBeDefined();
      expect(body.error?.code).toBe(-32600);
      expect(body.error?.message).toContain("Task augmentation required for tools/call requests on tool 'must_be_task'");
    });

    it('accepts tools/call on tool with taskSupport=required when task param is supplied', async () => {
      const res = await handler.fetch(
        modernRequest(
          'tools/call',
          { name: 'must_be_task', arguments: {}, task: { ttl: 60000 } },
          { name: 'must_be_task', id: 8 },
        ),
      );
      const { body } = await readRpc(res);
      expect(body.error).toBeUndefined();
      expect(body.result?.resultType).toBe('task');
      expect(body.result?.task?.taskId).toBeDefined();
      expect(body.result?.task?.status).toBe('working');
    });

    it('rejects tools/call on tool with taskSupport=forbidden when task param is supplied (-32601)', async () => {
      const res = await handler.fetch(
        modernRequest(
          'tools/call',
          { name: 'forbidden_task', arguments: {}, task: { ttl: 60000 } },
          { name: 'forbidden_task', id: 9 },
        ),
      );
      const { body } = await readRpc(res);
      expect(body.error).toBeDefined();
      expect(body.error?.code).toBe(-32601);
      expect(body.error?.message).toContain("Tool 'forbidden_task' does not support task augmentation");
    });

    it('accepts tools/call on tool with taskSupport=forbidden when task param is omitted', async () => {
      const res = await handler.fetch(
        modernRequest('tools/call', { name: 'forbidden_task', arguments: {} }, { name: 'forbidden_task', id: 10 }),
      );
      const { body } = await readRpc(res);
      expect(body.error).toBeUndefined();
      expect(body.result?.content).toBeDefined();
    });

    it('accepts tools/call on tool with taskSupport=optional both with and without task param', async () => {
      // Without task param
      const res1 = await handler.fetch(
        modernRequest('tools/call', { name: 'optional_task', arguments: {} }, { name: 'optional_task', id: 11 }),
      );
      const rpc1 = await readRpc(res1);
      expect(rpc1.body.error).toBeUndefined();
      expect(rpc1.body.result?.content).toBeDefined();

      // With task param
      const res2 = await handler.fetch(
        modernRequest(
          'tools/call',
          { name: 'optional_task', arguments: {}, task: { ttl: 60000 } },
          { name: 'optional_task', id: 12 },
        ),
      );
      const rpc2 = await readRpc(res2);
      expect(rpc2.body.error).toBeUndefined();
      expect(rpc2.body.result?.resultType).toBe('task');
      expect(rpc2.body.result?.task?.taskId).toBeDefined();
    });
  });
});

describe('auto mode: one handler serves both eras', () => {
  let server: NitroStackServer;
  let handler: { fetch: (req: Request) => Promise<Response>; close: () => Promise<void> };

  beforeAll(async () => {
    server = new NitroStackServer({ name: 'auto-test', version: '1.0.0', protocolVersion: 'auto' });
    server.tool(
      new Tool({
        name: 'ping',
        description: 'Ping.',
        inputSchema: z.object({}),
        handler: async () => ({ pong: true }),
      }),
    );
    const adapter = await (server as unknown as { getModernAdapter: () => Promise<any> }).getModernAdapter();
    handler = await adapter.getHttpHandler();
  });

  afterAll(async () => {
    await handler?.close?.();
    await (server as unknown as { stop?: () => Promise<void> }).stop?.().catch(() => undefined);
  });

  it('serves a 2026 server/discover', async () => {
    const res = await handler.fetch(modernRequest('server/discover', {}, { id: 1 }));
    const { status, body } = await readRpc(res);
    expect(status).toBe(200);
    expect(body.error).toBeUndefined();
    expect(body.result).toBeDefined();
  });

  it('also accepts a 2025-era initialize handshake on the same endpoint', async () => {
    // Legacy request: no per-request envelope and no modern headers.
    const initialize = new Request('http://localhost/mcp', {
      method: 'POST',
      headers: {
        // Legacy Streamable HTTP requires the client to accept text/event-stream;
        // readRpc reads the first frame and then cancels the stream.
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'legacy-client', version: '1.0.0' },
        },
      }),
    });
    const res = await handler.fetch(initialize);
    const { status, body } = await readRpc(res);
    // The v2 stateless-legacy fallback answers the 2025 handshake.
    expect(status).toBe(200);
    expect(body.error).toBeUndefined();
    expect(body.result?.protocolVersion).toBeDefined();
  });
});
