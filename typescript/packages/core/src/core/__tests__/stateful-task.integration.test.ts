/**
 * Stateful (2025-06-18) MCP Tasks Protocol Integration Test Suite.
 *
 * Verifies end-to-end task lifecycle over StreamableHttpTransport:
 * 1. Session initialization handshake (`initialize` + `notifications/initialized`).
 * 2. Task creation via `tools/call` with `task: { ttl }`.
 * 3. Intermediate status polling via `tasks/get`.
 * 4. Two-step result delivery via `tasks/result`.
 * 5. Session isolation (Session B cannot poll, read, or cancel Session A tasks).
 * 6. Cursor-based task listing via `tasks/list`.
 * 7. Cooperative task cancellation via `tasks/cancel`.
 * 8. Task support enforcement (`required` vs `forbidden`).
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { NitroStackServer } from '../server.js';
import { Tool } from '../tool.js';
import { z } from 'zod';

const STATEFUL_PROTOCOL = '2025-06-18';
const TEST_PORT = 3877;
const BASE_URL = `http://localhost:${TEST_PORT}/mcp`;

interface RpcResponse {
  status: number;
  sessionId: string | null;
  body: {
    jsonrpc?: string;
    id?: unknown;
    result?: Record<string, any>;
    error?: { code: number; message: string; data?: unknown };
  };
}

async function sendRpc(
  sessionId: string | null,
  method: string,
  params: Record<string, unknown> = {},
  id: number | string = Date.now(),
): Promise<RpcResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
  };
  if (sessionId) {
    headers['Mcp-Session-Id'] = sessionId;
  }

  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id,
      method,
      params,
    }),
  });

  const sid = res.headers.get('mcp-session-id') || sessionId;
  const text = await res.text();

  let body: any = {};
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }
  } else {
    // SSE stream format
    const lines = text
      .split('\n')
      .filter((l) => l.startsWith('data:'))
      .map((l) => l.slice('data:'.length).trim());
    if (lines.length > 0) {
      try {
        body = JSON.parse(lines[lines.length - 1]);
      } catch {
        body = { raw: text };
      }
    }
  }

  return {
    status: res.status,
    sessionId: sid,
    body,
  };
}

describe('Stateful (2025-06-18) MCP Tasks Protocol Integration Suite', () => {
  let server: NitroStackServer;
  let sessionA: string;
  let sessionB: string;

  beforeAll(async () => {
    server = new NitroStackServer({
      name: 'stateful-task-test-server',
      version: '1.0.0',
      protocolVersion: STATEFUL_PROTOCOL,
      logging: { level: 'error' },
    });

    // 1. Multi-stage task tool with cooperative cancellation and progress
    server.tool(
      new Tool({
        name: 'audit_service',
        description: 'Multi-stage audit service',
        inputSchema: z.object({
          stages: z.number().default(3),
          stageDelayMs: z.number().default(40),
        }),
        taskSupport: 'optional',
        handler: async (args: any, ctx) => {
          const stages = args.stages ?? 3;
          const delay = args.stageDelayMs ?? 40;

          for (let i = 1; i <= stages; i++) {
            if (ctx?.task) {
              ctx.task.throwIfCancelled();
              await ctx.task.updateProgress(`Auditing item ${i}/${stages}`);
            }
            await new Promise((r) => setTimeout(r, delay));
          }

          return {
            audited: true,
            totalItems: stages,
          };
        },
      }),
    );

    // 2. Tool requiring task support
    server.tool(
      new Tool({
        name: 'heavy_export',
        description: 'Export job requiring tasks',
        inputSchema: z.object({ format: z.string() }),
        taskSupport: 'required',
        handler: async (args: any) => ({ exported: true, format: args.format }),
      }),
    );

    // 3. Tool forbidding task support
    server.tool(
      new Tool({
        name: 'fast_ping',
        description: 'Fast ping tool forbidding tasks',
        inputSchema: z.object({ query: z.string().optional() }),
        taskSupport: 'forbidden',
        handler: async (args: any) => ({ pong: true, query: args.query }),
      }),
    );

    // Start server in HTTP mode on dedicated port
    await server.start({
      transport: 'http',
      port: TEST_PORT,
      host: 'localhost',
      endpoint: '/mcp',
    });

    // Initialize Session A
    const initA = await sendRpc(null, 'initialize', {
      protocolVersion: STATEFUL_PROTOCOL,
      capabilities: {},
      clientInfo: { name: 'client-A', version: '1.0.0' },
    });
    sessionA = initA.sessionId!;
    await sendRpc(sessionA, 'notifications/initialized');

    // Initialize Session B
    const initB = await sendRpc(null, 'initialize', {
      protocolVersion: STATEFUL_PROTOCOL,
      capabilities: {},
      clientInfo: { name: 'client-B', version: '1.0.0' },
    });
    sessionB = initB.sessionId!;
    await sendRpc(sessionB, 'notifications/initialized');
  });

  afterAll(async () => {
    await server.stop();
  });

  it('initializes sessions with valid Mcp-Session-Id headers', () => {
    expect(sessionA).toBeDefined();
    expect(sessionB).toBeDefined();
    expect(sessionA).not.toBe(sessionB);
  });

  it('creates task via tools/call returning immediate TaskData', async () => {
    const res = await sendRpc(sessionA, 'tools/call', {
      name: 'audit_service',
      arguments: { stages: 2, stageDelayMs: 40 },
      task: { ttl: 60000 },
    });

    expect(res.status).toBe(200);
    expect(res.body.error).toBeUndefined();
    expect(res.body.result?.task).toBeDefined();
    expect(res.body.result?.task?.taskId).toBeDefined();
    expect(res.body.result?.task?.status).toBe('working');
    expect(res.body.result?.task?.ttl).toBe(60000);
  });

  it('tracks progress via tasks/get and delivers output via tasks/result (two-step flow)', async () => {
    const createRes = await sendRpc(sessionA, 'tools/call', {
      name: 'audit_service',
      arguments: { stages: 3, stageDelayMs: 40 },
      task: { ttl: 60000 },
    });
    const taskId = createRes.body.result?.task?.taskId;
    expect(taskId).toBeDefined();

    // 1. Poll intermediate status via tasks/get
    await new Promise((r) => setTimeout(r, 50));
    const pollRes = await sendRpc(sessionA, 'tasks/get', { taskId });
    expect(pollRes.body.error).toBeUndefined();
    expect(pollRes.body.result?.taskId).toBe(taskId);
    expect(['working', 'completed']).toContain(pollRes.body.result?.status);

    // 2. In 2025-06-18 stateful mode, tasks/get does NOT embed final tool result
    // Wait for task completion (3 * 40ms = 120ms)
    await new Promise((r) => setTimeout(r, 150));
    const completedGet = await sendRpc(sessionA, 'tasks/get', { taskId });
    expect(completedGet.body.result?.status).toBe('completed');
    expect(completedGet.body.result?.result).toBeUndefined();

    // 3. Retrieve final result payload via tasks/result
    const resultRes = await sendRpc(sessionA, 'tasks/result', { taskId });
    expect(resultRes.body.error).toBeUndefined();
    expect(resultRes.body.result).toBeDefined();
    const resultPayload = resultRes.body.result;
    expect(resultPayload?.content).toBeDefined();
  });

  it('enforces strict session isolation: Session B cannot read, poll, or fetch result of Session A task', async () => {
    // Session A creates task
    const createRes = await sendRpc(sessionA, 'tools/call', {
      name: 'audit_service',
      arguments: { stages: 1, stageDelayMs: 20 },
      task: { ttl: 60000 },
    });
    const taskId = createRes.body.result?.task?.taskId;
    expect(taskId).toBeDefined();

    // Session B attempts tasks/get on Session A task
    const getResB = await sendRpc(sessionB, 'tasks/get', { taskId });
    expect(getResB.body.error).toBeDefined();
    expect(getResB.body.error?.code).toBe(-32602);
    expect(getResB.body.error?.message).toContain('Task not found');

    // Session B attempts tasks/result on Session A task
    const resultResB = await sendRpc(sessionB, 'tasks/result', { taskId });
    expect(resultResB.body.error).toBeDefined();
    expect(resultResB.body.error?.code).toBe(-32602);

    // Session B attempts tasks/cancel on Session A task
    const cancelResB = await sendRpc(sessionB, 'tasks/cancel', { taskId });
    expect(cancelResB.body.error).toBeDefined();
    expect(cancelResB.body.error?.code).toBe(-32602);

    // Session A can read task without error
    const getResA = await sendRpc(sessionA, 'tasks/get', { taskId });
    expect(getResA.body.error).toBeUndefined();
    expect(getResA.body.result?.taskId).toBe(taskId);
  });

  it('supports cursor-based pagination via tasks/list filtered by session', async () => {
    // Create 2 additional tasks in Session A
    await sendRpc(sessionA, 'tools/call', {
      name: 'audit_service',
      arguments: { stages: 1, stageDelayMs: 10 },
      task: { ttl: 60000 },
    });
    await sendRpc(sessionA, 'tools/call', {
      name: 'audit_service',
      arguments: { stages: 1, stageDelayMs: 10 },
      task: { ttl: 60000 },
    });

    // List with limit: 2
    const page1 = await sendRpc(sessionA, 'tasks/list', { limit: 2 });
    expect(page1.body.error).toBeUndefined();
    expect(page1.body.result?.tasks.length).toBe(2);

    // All returned tasks must belong to Session A
    for (const task of page1.body.result?.tasks) {
      expect(task.sessionId).toBe(sessionA);
    }

    // Session B list only contains Session B tasks
    const listB = await sendRpc(sessionB, 'tasks/list', {});
    expect(listB.body.error).toBeUndefined();
    for (const task of listB.body.result?.tasks || []) {
      expect(task.sessionId).toBe(sessionB);
    }
  });

  it('cancels an in-progress task cooperatively via tasks/cancel', async () => {
    const createRes = await sendRpc(sessionA, 'tools/call', {
      name: 'audit_service',
      arguments: { stages: 10, stageDelayMs: 100 },
      task: { ttl: 60000 },
    });
    const taskId = createRes.body.result?.task?.taskId;
    expect(taskId).toBeDefined();

    const cancelRes = await sendRpc(sessionA, 'tasks/cancel', { taskId });
    expect(cancelRes.body.error).toBeUndefined();
    expect(cancelRes.body.result?.status).toBe('cancelled');

    const getRes = await sendRpc(sessionA, 'tasks/get', { taskId });
    expect(getRes.body.result?.status).toBe('cancelled');
  });

  it('enforces task support constraints in legacy era', async () => {
    // 1. Mandatory tool without task -> rejected -32600
    const res1 = await sendRpc(sessionA, 'tools/call', {
      name: 'heavy_export',
      arguments: { format: 'json' },
    });
    expect(res1.body.error?.code).toBe(-32600);

    // 2. Forbidden tool with task -> rejected -32601
    const res2 = await sendRpc(sessionA, 'tools/call', {
      name: 'fast_ping',
      arguments: {},
      task: { ttl: 60000 },
    });
    expect(res2.body.error?.code).toBe(-32601);

    // 3. Forbidden tool without task -> accepted
    const res3 = await sendRpc(sessionA, 'tools/call', {
      name: 'fast_ping',
      arguments: {},
    });
    expect(res3.body.error).toBeUndefined();
  });
});
