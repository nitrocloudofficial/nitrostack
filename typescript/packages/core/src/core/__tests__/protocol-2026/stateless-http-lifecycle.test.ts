/**
 * Stateless HTTP Lifecycle & Multi-Client Concurrency Test Suite.
 *
 * Verifies that:
 * 1. The Modern MCP 2.0 (2026-07-28) HTTP server operates completely statelessly.
 * 2. Multiple independent clients (Client A, Client B) execute concurrently with zero cross-talk.
 * 3. Concurrent requests with identical JSON-RPC IDs execute with full isolation.
 * 4. No `Mcp-Session-Id` header is required or emitted.
 * 5. Invalid protocol versions and missing required headers are rejected with standard JSON-RPC codes.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { NitroStackServer } from '../../server.js';
import { Tool } from '../../tool.js';
import { z } from 'zod';

const MODERN = '2026-07-28';
const META_PROTOCOL = 'io.modelcontextprotocol/protocolVersion';
const META_CLIENT_CAPS = 'io.modelcontextprotocol/clientCapabilities';
const META_CLIENT_INFO = 'io.modelcontextprotocol/clientInfo';

interface RpcResult {
  status: number;
  headers: Headers;
  body: {
    jsonrpc?: string;
    id?: unknown;
    result?: Record<string, unknown>;
    error?: { code: number; message: string; data?: unknown };
  };
}

function createModernRequest(
  method: string,
  params: Record<string, unknown> = {},
  options: {
    id?: number | string;
    clientName?: string;
    protocolVersion?: string;
    toolName?: string;
    extraHeaders?: Record<string, string>;
  } = {},
): Request {
  const envelope = {
    [META_PROTOCOL]: options.protocolVersion ?? MODERN,
    [META_CLIENT_CAPS]: {},
    [META_CLIENT_INFO]: { name: options.clientName ?? 'jest-stateless-client', version: '1.0.0' },
  };

  const body = {
    jsonrpc: '2.0',
    id: options.id ?? 1,
    method,
    params: {
      ...params,
      _meta: envelope,
    },
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'MCP-Protocol-Version': options.protocolVersion ?? MODERN,
    'Mcp-Method': method,
    ...(options.toolName ? { 'Mcp-Name': options.toolName } : {}),
    ...(options.extraHeaders ?? {}),
  };

  return new Request('http://localhost/mcp', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

async function readRpc(res: Response): Promise<RpcResult> {
  const text = await res.text();
  try {
    return { status: res.status, headers: res.headers, body: JSON.parse(text) };
  } catch {
    return { status: res.status, headers: res.headers, body: {} };
  }
}

describe('Modern MCP 2.0 Stateless HTTP Lifecycle Suite', () => {
  let server: NitroStackServer;
  let handler: { fetch: (req: Request) => Promise<Response>; close: () => Promise<void> };
  let executionLog: string[] = [];

  beforeAll(async () => {
    server = new NitroStackServer({
      name: 'stateless-http-server',
      version: '2.0.0',
      protocolVersion: MODERN,
    });

    server.tool(
      new Tool({
        name: 'delayed_echo',
        description: 'Echo message after delay to test concurrency',
        inputSchema: z.object({
          message: z.string(),
          delayMs: z.number().default(10),
        }),
        handler: async (args: any, ctx) => {
          const clientName = (ctx.clientInfo?.name as string) || 'unknown';
          executionLog.push(`start:${clientName}:${args.message}`);
          await new Promise((resolve) => setTimeout(resolve, args.delayMs ?? 10));
          executionLog.push(`end:${clientName}:${args.message}`);
          return {
            echo: args.message,
            clientName,
            protocolVersion: ctx.protocolVersion,
          };
        },
      }),
    );

    server.tool(
      new Tool({
        name: 'compute_factorial',
        description: 'Compute factorial of a number',
        inputSchema: z.object({
          n: z.number().min(0).max(20),
        }),
        handler: async (args: any) => {
          let result = 1;
          for (let i = 2; i <= args.n; i++) result *= i;
          return { n: args.n, factorial: result };
        },
      }),
    );

    const adapter = await (server as unknown as { getModernAdapter: () => Promise<any> }).getModernAdapter();
    handler = await adapter.getHttpHandler();
  });

  afterAll(async () => {
    await handler?.close?.();
  });

  it('1. Executes tools/list statelessly without requiring an initialize handshake', async () => {
    const res = await handler.fetch(createModernRequest('tools/list', {}, { id: 10 }));
    const { status, headers, body } = await readRpc(res);

    expect(status).toBe(200);
    expect(headers.get('Mcp-Session-Id')).toBeNull();
    expect(body.error).toBeUndefined();
    expect(body.result?.tools).toBeDefined();
    const tools = body.result?.tools as Array<{ name: string }>;
    expect(tools.map((t) => t.name)).toContain('delayed_echo');
    expect(tools.map((t) => t.name)).toContain('compute_factorial');
  });

  it('2. Independent Client A and Client B execute tool calls without state leakage', async () => {
    const reqA = createModernRequest(
      'tools/call',
      { name: 'delayed_echo', arguments: { message: 'from-Client-A', delayMs: 5 } },
      { id: 'req-A', clientName: 'Client-Alpha', toolName: 'delayed_echo' },
    );
    const reqB = createModernRequest(
      'tools/call',
      { name: 'delayed_echo', arguments: { message: 'from-Client-B', delayMs: 5 } },
      { id: 'req-B', clientName: 'Client-Beta', toolName: 'delayed_echo' },
    );

    const [resA, resB] = await Promise.all([handler.fetch(reqA), handler.fetch(reqB)]);
    const [rpcA, rpcB] = await Promise.all([readRpc(resA), readRpc(resB)]);

    expect(rpcA.status).toBe(200);
    expect(rpcB.status).toBe(200);
    expect(rpcA.body.id).toBe('req-A');
    expect(rpcB.body.id).toBe('req-B');

    // Neither response has session IDs
    expect(rpcA.headers.get('Mcp-Session-Id')).toBeNull();
    expect(rpcB.headers.get('Mcp-Session-Id')).toBeNull();

    const textA = (rpcA.body.result?.content as Array<{ text: string }>)[0].text;
    const textB = (rpcB.body.result?.content as Array<{ text: string }>)[0].text;

    expect(textA).toContain('from-Client-A');
    expect(textA).toContain('Client-Alpha');
    expect(textB).toContain('from-Client-B');
    expect(textB).toContain('Client-Beta');
  });

  it('3. 10 Concurrent requests with identical JSON-RPC IDs execute with full isolation', async () => {
    const promises = Array.from({ length: 10 }, (_, i) => {
      const req = createModernRequest(
        'tools/call',
        { name: 'compute_factorial', arguments: { n: i + 1 } },
        { id: 'same-id-999', toolName: 'compute_factorial' },
      );
      return handler.fetch(req);
    });

    const responses = await Promise.all(promises);
    const results = await Promise.all(responses.map(readRpc));

    for (let i = 0; i < 10; i++) {
      const r = results[i];
      expect(r.status).toBe(200);
      expect(r.body.id).toBe('same-id-999');
      const text = (r.body.result?.content as Array<{ text: string }>)[0].text;
      expect(text).toContain(`"n": ${i + 1}`);
    }
  });

  it('4. Rejects request with unsupported MCP protocol version with appropriate error', async () => {
    const req = createModernRequest(
      'tools/list',
      {},
      { id: 404, protocolVersion: '1999-01-01' },
    );
    const res = await handler.fetch(req);
    const { status, body } = await readRpc(res);

    // Modern adapter returns 400 with -32022 Unsupported Protocol Version Error
    expect(status).toBe(400);
    expect(body.error).toBeDefined();
    expect(body.error?.code).toBe(-32022);
  });

  it('5. Rejects request when required header Mcp-Name is missing on tools/call', async () => {
    const envelope = {
      [META_PROTOCOL]: MODERN,
      [META_CLIENT_CAPS]: {},
      [META_CLIENT_INFO]: { name: 'test', version: '1.0.0' },
    };

    // Omit Mcp-Name header
    const req = new Request('http://localhost/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'MCP-Protocol-Version': MODERN,
        'Mcp-Method': 'tools/call',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 501,
        method: 'tools/call',
        params: { name: 'compute_factorial', arguments: { n: 5 }, _meta: envelope },
      }),
    });

    const res = await handler.fetch(req);
    const { status, body } = await readRpc(res);

    expect(status).toBe(400);
    expect(body.error).toBeDefined();
    expect(body.error?.code).toBe(-32020);
  });
});
