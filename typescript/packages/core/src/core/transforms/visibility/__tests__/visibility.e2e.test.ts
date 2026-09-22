import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NitroStackServer } from '../../../server.js';
import { Tool } from '../../../tool.js';
import { VisibilityTransform } from '../visibility.transform.js';
import { SessionVisibilityStore } from '../session-store.js';
import { z } from 'zod';

describe('Dynamic Session Visibility End-to-End (NITRO-104-M4)', () => {
  let server: NitroStackServer;
  let sessionStore: SessionVisibilityStore;
  let notificationsReceived: string[] = [];

  beforeEach(() => {
    notificationsReceived = [];
    sessionStore = new SessionVisibilityStore();
    server = new NitroStackServer({
      name: 'test-visibility-server',
      version: '1.0.0',
      transforms: [new VisibilityTransform(sessionStore)],
    });

    // Mock notification listener
    const mockMcp = server['mcpServer'] as any;
    mockMcp.notification = async (payload: { method: string }) => {
      notificationsReceived.push(payload.method);
    };
  });

  afterEach(async () => {
    await server.stop();
    sessionStore.destroy();
  });

  it('executes full disclosure lifecycle: initial hidden -> enable -> notify -> invoke -> disable', async () => {
    const sessionId = 'session-turn-1';

    // 1. Register tools: 'login' (visible) and 'transfer' (hidden)
    server.registerTool(
      new Tool({
        name: 'login',
        description: 'Login tool',
        inputSchema: z.object({}),
        visibility: 'visible',
        handler: async (_input, ctx) => {
          await ctx.enableTools(['transfer']);
          return { success: true };
        },
      })
    );

    server.registerTool(
      new Tool({
        name: 'transfer',
        description: 'Transfer funds',
        inputSchema: z.object({ amount: z.number() }),
        visibility: 'hidden',
        handler: async (input: any) => ({ transferred: input.amount }),
      })
    );

    // Step 1: Initial tools/list for session-turn-1 shows only 'login'
    const initialTools = await server.runToolPipeline({ sessionId } as any);
    expect(initialTools.map((t) => t.name)).toEqual(['login']);

    // Step 2: Attempting to call 'transfer' fails with -32601
    await expect(
      server.resolveTool('transfer', { sessionId } as any)
    ).rejects.toMatchObject({
      code: -32601,
      message: expect.stringContaining('not available in session'),
    });

    // Step 3: Invoke 'login', which triggers ctx.enableTools(['transfer'])
    const loginTool = await server.resolveTool('login', { sessionId } as any);
    expect(loginTool).toBeDefined();

    const ctx = server.createExecutionContext({ toolName: 'login' }, { sessionId } as any);
    await loginTool!.execute({}, ctx);

    // Step 4: Wait for microtask coalescer; verify notification received
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(notificationsReceived).toContain('notifications/tools/list_changed');

    // Step 5: tools/list for session-turn-1 now reveals 'transfer'
    const updatedTools = await server.runToolPipeline({ sessionId } as any);
    expect(updatedTools.map((t) => t.name)).toEqual(['login', 'transfer']);

    // Step 6: 'transfer' tool can now be resolved and executed
    const transferTool = await server.resolveTool('transfer', { sessionId } as any);
    expect(transferTool).toBeDefined();
    const result = await transferTool!.execute({ amount: 100 }, ctx);
    expect(result).toEqual({ transferred: 100 });

    // Step 7: Revoke access via disableTools
    await ctx.disableTools(['transfer']);
    const revokedTools = await server.runToolPipeline({ sessionId } as any);
    expect(revokedTools.map((t) => t.name)).toEqual(['login']);
  });

  it('maintains strict isolation between concurrent sessions', async () => {
    server.registerTool(
      new Tool({
        name: 'admin_panel',
        description: 'Admin panel',
        inputSchema: z.object({}),
        visibility: 'hidden',
        handler: async () => ({ ok: true }),
      })
    );

    const sessionA = 'user-alice';
    const sessionB = 'user-bob';

    sessionStore.enableTools(sessionA, ['admin_panel']);

    const toolsA = await server.runToolPipeline({ sessionId: sessionA } as any);
    const toolsB = await server.runToolPipeline({ sessionId: sessionB } as any);

    expect(toolsA.map((t) => t.name)).toContain('admin_panel');
    expect(toolsB.map((t) => t.name)).not.toContain('admin_panel');
  });

  it('coalesces multiple notifications into a single dispatch per microtask tick', async () => {
    notificationsReceived = [];

    // Trigger multiple notifications synchronously in the same tick
    server.notifyToolsListChanged('session-coalesce');
    server.notifyToolsListChanged('session-coalesce');
    server.notifyToolsListChanged('session-coalesce');

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(notificationsReceived.filter((m) => m === 'notifications/tools/list_changed')).toHaveLength(1);
  });

  it('delivers notifications targeting specific legacy SSE sessions without notifying unrelated sessions', async () => {
    const notifySessionA = jest.fn();
    const notifySessionB = jest.fn();

    const mockSessions = server['legacySdkSseSessions'] as Map<string, any>;
    mockSessions.set('sess-target-a', {
      server: { notification: notifySessionA },
      transport: {} as any,
      sessionContext: { sessionId: 'sess-target-a' },
    });
    mockSessions.set('sess-target-b', {
      server: { notification: notifySessionB },
      transport: {} as any,
      sessionContext: { sessionId: 'sess-target-b' },
    });

    server.notifyToolsListChanged('sess-target-a');

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(notifySessionA).toHaveBeenCalledWith({ method: 'notifications/tools/list_changed' });
    expect(notifySessionB).not.toHaveBeenCalled();

    mockSessions.clear();
  });

  it('broadcasts to all sessions when notifyToolsListChanged is called without sessionId', async () => {
    const notifySessionA = jest.fn();
    const notifySessionB = jest.fn();

    const mockSessions = server['legacySdkSseSessions'] as Map<string, any>;
    mockSessions.set('sess-all-a', {
      server: { notification: notifySessionA },
      transport: {} as any,
      sessionContext: { sessionId: 'sess-all-a' },
    });
    mockSessions.set('sess-all-b', {
      server: { notification: notifySessionB },
      transport: {} as any,
      sessionContext: { sessionId: 'sess-all-b' },
    });

    server.notifyToolsListChanged(); // Global broadcast

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(notifySessionA).toHaveBeenCalledWith({ method: 'notifications/tools/list_changed' });
    expect(notifySessionB).toHaveBeenCalledWith({ method: 'notifications/tools/list_changed' });

    mockSessions.clear();
  });
});
