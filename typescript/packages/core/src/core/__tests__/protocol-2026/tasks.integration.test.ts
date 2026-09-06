/**
 * Modern (2026-07-28) MCP Tasks Protocol Integration Test Suite.
 *
 * Verifies end-to-end task lifecycle, multi-tenant isolation, cooperative abort,
 * and single-step embedded result delivery over the modern protocol adapter.
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
    result?: Record<string, any>;
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
    auth?: { userId?: string; tenantId?: string; sessionId?: string };
  } = {},
): Request {
  const envelope = {
    [META_PROTOCOL]: options.protocolVersion ?? MODERN,
    [META_CLIENT_CAPS]: {},
    [META_CLIENT_INFO]: { name: options.clientName ?? 'jest-modern-task-client', version: '1.0.0' },
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
    ...(options.auth?.sessionId ? { 'Mcp-Session-Id': options.auth.sessionId } : {}),
    ...(options.extraHeaders ?? {}),
  };

  const req = new Request('http://localhost/mcp', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (options.auth) {
    (req as any).auth = {
      userId: options.auth.userId,
      tenantId: options.auth.tenantId,
    };
  }

  return req;
}

async function readRpc(res: Response): Promise<RpcResult> {
  const text = await res.text();
  try {
    return { status: res.status, headers: res.headers, body: JSON.parse(text) };
  } catch {
    return { status: res.status, headers: res.headers, body: {} };
  }
}

describe('Modern MCP 2.0 Tasks Protocol Integration Suite', () => {
  let server: NitroStackServer;
  let handler: { fetch: (req: Request) => Promise<Response>; close: () => Promise<void> };

  beforeAll(async () => {
    server = new NitroStackServer({
      name: 'modern-task-test-server',
      version: '1.0.0',
      protocolVersion: MODERN,
    });

    // 1. Long running task tool with progress updates
    server.tool(
      new Tool({
        name: 'data_pipeline',
        description: 'Multi-stage data pipeline',
        inputSchema: z.object({
          stages: z.number().default(3),
          stageDelayMs: z.number().default(30),
        }),
        taskSupport: 'optional',
        handler: async (args: any, ctx) => {
          const totalStages = args.stages ?? 3;
          const delay = args.stageDelayMs ?? 30;

          for (let i = 1; i <= totalStages; i++) {
            if (ctx?.task) {
              ctx.task.throwIfCancelled();
              await ctx.task.updateProgress(`Processing stage ${i}/${totalStages}`);
            }
            await new Promise((r) => setTimeout(r, delay));
          }

          return {
            stagesCompleted: totalStages,
            outputRecords: 42,
          };
        },
      }),
    );

    // 2. Mandatory task tool
    server.tool(
      new Tool({
        name: 'mandatory_export',
        description: 'Export job that strictly requires task augmentation',
        inputSchema: z.object({ format: z.string() }),
        taskSupport: 'required',
        handler: async (args: any) => ({ exported: true, format: args.format }),
      }),
    );

    // 3. Forbidden task tool
    server.tool(
      new Tool({
        name: 'instant_lookup',
        description: 'Instant lookup that strictly forbids task augmentation',
        inputSchema: z.object({ key: z.string() }),
        taskSupport: 'forbidden',
        handler: async (args: any) => ({ value: `val_${args.key}` }),
      }),
    );

    const adapter = await (server as unknown as { getModernAdapter: () => Promise<any> }).getModernAdapter();
    handler = await adapter.getHttpHandler();
  });

  afterAll(async () => {
    await handler?.close?.();
    await server.stop();
  });

  it('creates task via tools/call returning CreateTaskResult immediately', async () => {
    const res = await handler.fetch(
      createModernRequest(
        'tools/call',
        {
          name: 'data_pipeline',
          arguments: { stages: 2, stageDelayMs: 40 },
          task: { ttl: 60000 },
        },
        { toolName: 'data_pipeline', id: 101 },
      ),
    );

    const { status, body } = await readRpc(res);
    expect(status).toBe(200);
    expect(body.error).toBeUndefined();
    expect(body.result?.resultType).toBe('task');
    expect(body.result?.task?.taskId).toBeDefined();
    expect(body.result?.task?.status).toBe('working');
    expect(body.result?.task?.ttl).toBe(60000);
  });

  it('tracks progress updates and delivers embedded final result via tasks/get', async () => {
    const createRes = await handler.fetch(
      createModernRequest(
        'tools/call',
        {
          name: 'data_pipeline',
          arguments: { stages: 3, stageDelayMs: 40 },
          task: { ttl: 60000 },
        },
        { toolName: 'data_pipeline', id: 102 },
      ),
    );
    const { body: createBody } = await readRpc(createRes);
    const taskId = createBody.result?.task?.taskId;
    expect(taskId).toBeDefined();

    // Poll intermediate progress
    await new Promise((r) => setTimeout(r, 50));
    const pollRes = await handler.fetch(
      createModernRequest('tasks/get', { taskId }, { id: 103 }),
    );
    const { body: pollBody } = await readRpc(pollRes);
    expect(pollBody.result?.taskId).toBe(taskId);
    expect(['working', 'completed']).toContain(pollBody.result?.status);

    // Wait for full completion (3 stages * 40ms = 120ms)
    await new Promise((r) => setTimeout(r, 150));
    const finalRes = await handler.fetch(
      createModernRequest('tasks/get', { taskId }, { id: 104 }),
    );
    const { body: finalBody } = await readRpc(finalRes);
    expect(finalBody.result?.status).toBe('completed');
    expect(finalBody.result?.result).toEqual({
      stagesCompleted: 3,
      outputRecords: 42,
    });
  });

  it('cancels an in-progress task cooperatively via tasks/cancel', async () => {
    // Start long task (10 stages * 100ms = 1000ms)
    const createRes = await handler.fetch(
      createModernRequest(
        'tools/call',
        {
          name: 'data_pipeline',
          arguments: { stages: 10, stageDelayMs: 100 },
          task: { ttl: 60000 },
        },
        { toolName: 'data_pipeline', id: 105 },
      ),
    );
    const { body: createBody } = await readRpc(createRes);
    const taskId = createBody.result?.task?.taskId;
    expect(taskId).toBeDefined();

    // Send cancellation request
    const cancelRes = await handler.fetch(
      createModernRequest('tasks/cancel', { taskId }, { id: 106 }),
    );
    const { body: cancelBody } = await readRpc(cancelRes);
    expect(cancelBody.result?.status).toBe('cancelled');

    // Confirm tasks/get shows cancelled status
    const getRes = await handler.fetch(
      createModernRequest('tasks/get', { taskId }, { id: 107 }),
    );
    const { body: getBody } = await readRpc(getRes);
    expect(getBody.result?.status).toBe('cancelled');
  });

  it('enforces multi-tenant isolation: Tenant B cannot access Tenant A task', async () => {
    // Tenant A creates task
    const tenantAReq = createModernRequest(
      'tools/call',
      {
        name: 'data_pipeline',
        arguments: { stages: 1, stageDelayMs: 20 },
        task: { ttl: 60000 },
      },
      {
        toolName: 'data_pipeline',
        id: 201,
        auth: { tenantId: 'tenant-alpha', userId: 'user-alice' },
      },
    );
    const createRes = await handler.fetch(tenantAReq);
    const { body: createBody } = await readRpc(createRes);
    const taskId = createBody.result?.task?.taskId;
    expect(taskId).toBeDefined();

    // Tenant B attempts to read Tenant A's task
    const tenantBGetReq = createModernRequest(
      'tasks/get',
      { taskId },
      {
        id: 202,
        auth: { tenantId: 'tenant-beta', userId: 'user-bob' },
      },
    );
    const getResB = await handler.fetch(tenantBGetReq);
    const { body: getBodyB } = await readRpc(getResB);
    expect(getBodyB.error).toBeDefined();
    expect(getBodyB.error?.code).toBe(-32602);
    expect(getBodyB.error?.message).toContain('Task not found');

    // Tenant B attempts to cancel Tenant A's task
    const tenantBCancelReq = createModernRequest(
      'tasks/cancel',
      { taskId },
      {
        id: 203,
        auth: { tenantId: 'tenant-beta', userId: 'user-bob' },
      },
    );
    const cancelResB = await handler.fetch(tenantBCancelReq);
    const { body: cancelBodyB } = await readRpc(cancelResB);
    expect(cancelBodyB.error).toBeDefined();
    expect(cancelBodyB.error?.code).toBe(-32602);

    // Tenant A reads their task successfully
    const tenantAGetReq = createModernRequest(
      'tasks/get',
      { taskId },
      {
        id: 204,
        auth: { tenantId: 'tenant-alpha', userId: 'user-alice' },
      },
    );
    const getResA = await handler.fetch(tenantAGetReq);
    const { body: getBodyA } = await readRpc(getResA);
    expect(getBodyA.error).toBeUndefined();
    expect(getBodyA.result?.taskId).toBe(taskId);
  });

  it('enforces mandatory and forbidden task support constraints', async () => {
    // 1. Mandatory tool without task -> rejected -32600
    const req1 = createModernRequest(
      'tools/call',
      { name: 'mandatory_export', arguments: { format: 'csv' } },
      { toolName: 'mandatory_export', id: 301 },
    );
    const res1 = await handler.fetch(req1);
    const { body: body1 } = await readRpc(res1);
    expect(body1.error?.code).toBe(-32600);

    // 2. Mandatory tool with task -> accepted
    const req2 = createModernRequest(
      'tools/call',
      { name: 'mandatory_export', arguments: { format: 'csv' }, task: { ttl: 60000 } },
      { toolName: 'mandatory_export', id: 302 },
    );
    const res2 = await handler.fetch(req2);
    const { body: body2 } = await readRpc(res2);
    expect(body2.error).toBeUndefined();
    expect(body2.result?.resultType).toBe('task');

    // 3. Forbidden tool with task -> rejected -32601
    const req3 = createModernRequest(
      'tools/call',
      { name: 'instant_lookup', arguments: { key: 'foo' }, task: { ttl: 60000 } },
      { toolName: 'instant_lookup', id: 303 },
    );
    const res3 = await handler.fetch(req3);
    const { body: body3 } = await readRpc(res3);
    expect(body3.error?.code).toBe(-32601);

    // 4. Forbidden tool without task -> accepted
    const req4 = createModernRequest(
      'tools/call',
      { name: 'instant_lookup', arguments: { key: 'foo' } },
      { toolName: 'instant_lookup', id: 304 },
    );
    const res4 = await handler.fetch(req4);
    const { body: body4 } = await readRpc(res4);
    expect(body4.error).toBeUndefined();
    expect(body4.result?.content).toBeDefined();
  });

  it('rejects legacy tasks/result and tasks/list with explicit -32601', async () => {
    const resResult = await handler.fetch(
      createModernRequest('tasks/result', { taskId: 'any-id' }, { id: 401 }),
    );
    const { body: bodyResult } = await readRpc(resResult);
    expect(bodyResult.error?.code).toBe(-32601);
    expect(bodyResult.error?.message).toContain('tasks/get');

    const resList = await handler.fetch(
      createModernRequest('tasks/list', {}, { id: 402 }),
    );
    const { body: bodyList } = await readRpc(resList);
    expect(bodyList.error?.code).toBe(-32601);
  });
});
