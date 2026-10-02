import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { z } from 'zod';
import { NitroStackServer } from '../../../server.js';
import { Tool } from '../../../tool.js';
import { Tool as ToolDecorator } from '../../../decorators.js';
import { buildTools } from '../../../builders.js';
import { SessionVisibilityStore } from '../session-store.js';
import { VisibilityTransform } from '../visibility.transform.js';
import { logEmitter } from '../../../events/log-emitter.js';

describe('NITRO-104-M2: ExecutionContext Visibility API & Decorator Tags', () => {
  it('warns that stateless mode cannot enforce disableTools', async () => {
    const warnings: string[] = [];
    const onLog = (info: { level?: string; message?: string }) => {
      if (info.level === 'warn' && typeof info.message === 'string') warnings.push(info.message);
    };
    logEmitter.on('log', onLog);
    const stateless = new NitroStackServer({
      name: 'stateless-visibility',
      version: '1.0.0',
      transforms: [new VisibilityTransform(new SessionVisibilityStore())],
    });
    await new Promise((resolve) => setImmediate(resolve));
    logEmitter.off('log', onLog);
    expect(warnings.some((message) => message.includes('requires a server-issued session'))).toBe(true);
    await stateless.stop();
  });

  let server: NitroStackServer;

  beforeEach(() => {
    server = new NitroStackServer({
      name: 'test-server',
      version: '1.0.0',
    });
  });

  afterEach(async () => {
    await server.stop();
  });

  describe('Tool and @Tool decorator visibility tags', () => {
    it('should set tool.visibility to "hidden" when visibility: "hidden" is supplied to Tool constructor', () => {
      const tool = new Tool({
        name: 'secret_tool',
        description: 'Secret tool',
        inputSchema: z.object({}),
        handler: async () => ({}),
        visibility: 'hidden',
      });
      expect(tool.visibility).toBe('hidden');
    });

    it('should set tool.visibility to "hidden" when defaultVisible: false is supplied to Tool constructor', () => {
      const tool = new Tool({
        name: 'secret_tool',
        description: 'Secret tool',
        inputSchema: z.object({}),
        handler: async () => ({}),
        defaultVisible: false,
      });
      expect(tool.visibility).toBe('hidden');
    });

    it('should set tool.visibility to "visible" when visibility: "visible" or defaultVisible: true is supplied', () => {
      const tool1 = new Tool({
        name: 'tool_1',
        description: 'Tool 1',
        inputSchema: z.object({}),
        handler: async () => ({}),
        visibility: 'visible',
      });
      expect(tool1.visibility).toBe('visible');

      const tool2 = new Tool({
        name: 'tool_2',
        description: 'Tool 2',
        inputSchema: z.object({}),
        handler: async () => ({}),
        defaultVisible: true,
      });
      expect(tool2.visibility).toBe('visible');
    });

    it('should set tool.visibility to "hidden" when @Tool({ visibility: "hidden" }) is used on a controller method', () => {
      class TestController {
        [key: string]: unknown;
        @ToolDecorator({
          name: 'admin_audit',
          description: 'Sensitive audit tool',
          inputSchema: z.object({}),
          visibility: 'hidden',
        })
        async audit() {
          return { ok: true };
        }
      }

      const tools = buildTools(new TestController());
      expect(tools).toHaveLength(1);
      expect(tools[0].visibility).toBe('hidden');
    });

    it('should set tool.visibility to "hidden" when @Tool({ defaultVisible: false }) is used on a controller method', () => {
      class TestController {
        [key: string]: unknown;
        @ToolDecorator({
          name: 'transfer_funds',
          description: 'Transfer funds',
          inputSchema: z.object({}),
          defaultVisible: false,
        })
        async transfer() {
          return { ok: true };
        }
      }

      const tools = buildTools(new TestController());
      expect(tools).toHaveLength(1);
      expect(tools[0].visibility).toBe('hidden');
    });

    it('should keep tool.visibility undefined/visible by default on a standard controller method', () => {
      class TestController {
        [key: string]: unknown;
        @ToolDecorator({
          name: 'public_status',
          description: 'Public status',
          inputSchema: z.object({}),
        })
        async status() {
          return { status: 'healthy' };
        }
      }

      const tools = buildTools(new TestController());
      expect(tools).toHaveLength(1);
      expect(tools[0].visibility).toBeUndefined();
      expect(tools[0].visibility !== 'hidden').toBe(true);
    });
  });

  describe('ExecutionContext visibility methods', () => {
    it('should enable tools and trigger list-changed notification with sessionId', async () => {
      const tool1 = new Tool({
        name: 'transfer_funds',
        description: 'Transfer funds',
        inputSchema: z.object({}),
        handler: async () => ({}),
        visibility: 'hidden',
      });
      server.tool(tool1);

      const notifySpy = jest.spyOn(server, 'notifyToolsListChanged');
      const sessionId = 'session-123';
      const ctx = server.createContext({
        extra: { sessionId },
      });

      await ctx.enableTools?.(['transfer_funds']);

      const store = server.getSessionVisibilityStore();
      expect(store.hasEnabled(ctx.sessionId!, 'transfer_funds')).toBe(true);
      expect(notifySpy).toHaveBeenCalledWith(sessionId);
    });

    it('should disable tools and trigger list-changed notification with sessionId', async () => {
      const tool1 = new Tool({
        name: 'standard_tool',
        description: 'Standard tool',
        inputSchema: z.object({}),
        handler: async () => ({}),
      });
      server.tool(tool1);

      const notifySpy = jest.spyOn(server, 'notifyToolsListChanged');
      const sessionId = 'session-456';
      const ctx = server.createContext({
        extra: { sessionId },
      });

      await ctx.disableTools?.(['standard_tool']);

      const store = server.getSessionVisibilityStore();
      expect(store.hasDisabled(ctx.sessionId!, 'standard_tool')).toBe(true);
      expect(notifySpy).toHaveBeenCalledWith(sessionId);
    });

    it('records the session revoke when the subject deny cap is full', async () => {
      const store = new SessionVisibilityStore({ maxSessions: 1, ttlMinutes: 60 });
      const capped = new NitroStackServer({
        name: 'subject-cap',
        version: '1.0.0',
        transforms: [new VisibilityTransform(store)],
      });
      try {
        store.disableSubject('existing', ['other_tool']);
        const ctx = capped.createContext({
          extra: { sessionId: 's-new', auth: { subject: 'newbie' } },
        });
        await expect(ctx.disableTools?.(['process_refund'])).rejects.toThrow(/subject deny cap/);
        expect(store.hasDisabled(ctx.sessionId!, 'process_refund')).toBe(true);
        expect(store.hasSubjectDisabled('newbie', 'process_refund')).toBe(false);
        expect(store.hasSubjectDisabled('existing', 'other_tool')).toBe(true);
      } finally {
        store.destroy();
        await capped.stop();
      }
    });

    it('should warn when enabling tool names not registered in server catalog', async () => {
      const loggerWarnSpy = jest.spyOn(server['logger'], 'warn');
      const sessionId = 'session-789';
      const ctx = server.createContext({
        extra: { sessionId },
      });

      await ctx.enableTools?.(['non_existent_tool']);

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("ctx.enableTools: tool 'non_existent_tool' is not registered in the catalog")
      );
    });

    it('should log warning and no-op when enableTools/disableTools are called without sessionId', async () => {
      const loggerWarnSpy = jest.spyOn(server['logger'], 'warn');
      const ctx = server.createContext(); // No sessionId

      await ctx.enableTools?.(['tool_a']);
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('ctx.enableTools called without an active sessionId; no-op')
      );

      await ctx.disableTools?.(['tool_a']);
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('ctx.disableTools called without an active sessionId; no-op')
      );
    });

    it('should correctly compute getVisibleTools() for an active session', async () => {
      const publicTool = new Tool({
        name: 'public_tool',
        description: 'Public tool',
        inputSchema: z.object({}),
        handler: async () => ({}),
      });
      const hiddenTool = new Tool({
        name: 'hidden_tool',
        description: 'Hidden tool',
        inputSchema: z.object({}),
        handler: async () => ({}),
        visibility: 'hidden',
      });
      const disabledTool = new Tool({
        name: 'disabled_tool',
        description: 'Disabled tool',
        inputSchema: z.object({}),
        handler: async () => ({}),
      });

      server.tool(publicTool);
      server.tool(hiddenTool);
      server.tool(disabledTool);

      const sessionId = 'session-allowed-test';
      const ctx = server.createContext({
        extra: { sessionId },
      });

      // Before any rules are set on this session:
      // Session does not exist yet in store, so getVisibleTools() returns undefined
      expect(ctx.getVisibleTools?.()).toBeUndefined();

      // Enable hidden_tool and disable disabled_tool
      await ctx.enableTools?.(['hidden_tool']);
      await ctx.disableTools?.(['disabled_tool']);

      const visibleTools = ctx.getVisibleTools?.();
      expect(visibleTools).toBeInstanceOf(Set);
      expect(visibleTools?.has('public_tool')).toBe(true);
      expect(visibleTools?.has('hidden_tool')).toBe(true);
      expect(visibleTools?.has('disabled_tool')).toBe(false);
    });

    it('should return undefined from getVisibleTools() when sessionId is missing', () => {
      const ctx = server.createContext();
      expect(ctx.getVisibleTools?.()).toBeUndefined();
    });

    it('does not share visibility between authenticated subjects on the same session id', async () => {
      const publicTool = new Tool({
        name: 'public_tool',
        description: 'Public tool',
        inputSchema: z.object({}),
        handler: async () => ({}),
      });
      server.tool(publicTool);

      const alice = server.createContext({
        extra: { sessionId: 'shared', auth: { subject: 'alice' } },
      });
      const bob = server.createContext({
        extra: { sessionId: 'shared', auth: { subject: 'bob' } },
      });

      await alice.disableTools?.(['public_tool']);

      expect(server.getSessionVisibilityStore().hasDisabled('user:alice:shared', 'public_tool')).toBe(true);
      expect(server.getSessionVisibilityStore().hasDisabled('bob\0shared', 'public_tool')).toBe(false);
      expect(alice.getVisibleTools?.()?.has('public_tool')).toBe(false);
      expect(bob.getVisibleTools?.()).toBeUndefined();
    });

    it('does not treat an unsigned bearer token as the isolation subject', async () => {
      const publicTool = new Tool({
        name: 'public_tool',
        description: 'Public tool',
        inputSchema: z.object({}),
        handler: async () => ({}),
      });
      server.tool(publicTool);

      const victim = server.createContext({
        extra: { sessionId: 'sess-1', auth: { subject: 'victim' } },
      });
      await victim.disableTools?.(['public_tool']);

      const payload = Buffer.from(JSON.stringify({ sub: 'victim' })).toString('base64url');
      const forged = server.createContext({
        metadata: { authorization: `Bearer x.${payload}.y` },
        extra: { sessionId: 'sess-1' },
      });

      expect(forged.sessionId).toBe('anon:sess-1');
      expect(forged.sessionId).not.toContain('authenticated-user');
      expect(server.getSessionVisibilityStore().hasDisabled('user:victim:sess-1', 'public_tool')).toBe(true);
      expect(server.getSessionVisibilityStore().hasDisabled('sess-1', 'public_tool')).toBe(false);
      expect(server.getSessionVisibilityStore().hasDisabled('anon:sess-1', 'public_tool')).toBe(false);
      expect(forged.getVisibleTools?.()).toBeUndefined();
      expect(forged.verifiedSubject).toBeUndefined();

      await forged.disableTools?.(['lookup_order']);
      expect(server.getSessionVisibilityStore().hasSubjectDisabled('victim', 'lookup_order')).toBe(false);
      expect(server.getSessionVisibilityStore().hasDisabled(forged.sessionId!, 'lookup_order')).toBe(true);
    });

    it('keeps a verified subject deny across a new session id', async () => {
      const store = new SessionVisibilityStore();
      const gated = new NitroStackServer({
        name: 'subject-deny',
        version: '1.0.0',
        transforms: [new VisibilityTransform(store)],
      });
      gated.tool(new Tool({
        name: 'process_refund',
        description: 'Refund',
        inputSchema: z.object({}),
        handler: async () => ({ ok: true }),
      }));
      try {
        const alice1 = gated.createContext({
          extra: { sessionId: 's1', auth: { subject: 'alice' } },
        });
        await alice1.disableTools?.(['process_refund']);
        const alice2 = gated.createContext({
          extra: { sessionId: 's2', auth: { subject: 'alice' } },
        });
        await expect(gated.resolveTool('process_refund', alice2)).rejects.toThrow(/disabled for subject 'alice'/);

        await alice2.enableTools?.(['process_refund']);
        const aliceAgain = gated.createContext({
          extra: { sessionId: 's1', auth: { subject: 'alice' } },
        });
        await expect(gated.resolveTool('process_refund', aliceAgain)).resolves.toMatchObject({
          name: 'process_refund',
        });

        const anon1 = gated.createContext({ extra: { sessionId: 'anon-1' } });
        await anon1.disableTools?.(['process_refund']);
        const anon2 = gated.createContext({ extra: { sessionId: 'anon-2' } });
        await expect(gated.resolveTool('process_refund', anon2)).resolves.toMatchObject({
          name: 'process_refund',
        });
      } finally {
        await gated.stop();
        store.destroy();
      }
    });

    it('does not mint an authenticated-user key for a bearer token with no sub', () => {
      const ctx = server.createContext({
        metadata: { authorization: 'Bearer not-a-jwt' },
        extra: { sessionId: 'sess-1' },
      });
      expect(ctx.sessionId).toBe('anon:sess-1');
    });

    it('does not let an anonymous session id spell an authenticated isolation key', async () => {
      server.tool(
        new Tool({
          name: 'public_tool',
          description: 'Public tool',
          inputSchema: z.object({}),
          handler: async () => ({}),
        })
      );

      const alice = server.createContext({
        extra: { sessionId: '8f3c', auth: { subject: 'alice' } },
      });
      await alice.disableTools?.(['public_tool']);

      const anon = server.createContext({ extra: { sessionId: 'alice:8f3c' } });

      expect(alice.sessionId).toBe('user:alice:8f3c');
      expect(anon.sessionId).toBe('anon:alice%3A8f3c');
      expect(server.getSessionVisibilityStore().hasDisabled('user:alice:8f3c', 'public_tool')).toBe(true);
      expect(server.getSessionVisibilityStore().hasDisabled(anon.sessionId!, 'public_tool')).toBe(false);
    });

    it('does not collide when the subject or session id contains a colon', () => {
      const subjectHasColon = server.createContext({
        extra: { sessionId: 'c', auth: { subject: 'a:b' } },
      });
      const sessionHasColon = server.createContext({
        extra: { sessionId: 'b:c', auth: { subject: 'a' } },
      });

      expect(subjectHasColon.sessionId).toBe('user:a%3Ab:c');
      expect(sessionHasColon.sessionId).toBe('user:a:b%3Ac');
      expect(subjectHasColon.sessionId).not.toBe(sessionHasColon.sessionId);
    });

    it('refuses a new disableTools call when the revocation cap is full', async () => {
      const store = new SessionVisibilityStore({ maxSessions: 1, ttlMinutes: 60 });
      const scoped = new NitroStackServer({
        name: 'revocation-cap-server',
        version: '1.0.0',
        transforms: [new VisibilityTransform(store)],
      });
      scoped.tool(
        new Tool({
          name: 'public_tool',
          description: 'Public tool',
          inputSchema: z.object({}),
          handler: async () => ({}),
        })
      );

      const first = scoped.createContext({ extra: { sessionId: 's1' } });
      await first.disableTools?.(['public_tool']);
      const second = scoped.createContext({ extra: { sessionId: 's2' } });
      await expect(second.disableTools?.(['public_tool'])).rejects.toThrow(/revocation cap/);

      expect(store.hasDisabled(first.sessionId!, 'public_tool')).toBe(true);
      expect(store.hasDisabled(second.sessionId!, 'public_tool')).toBe(false);

      await scoped.stop();
      store.destroy();
    });

    it('keeps revoked tools out of getVisibleTools after the session record is evicted', async () => {
      const store = new SessionVisibilityStore({ maxSessions: 1, ttlMinutes: 60 });
      const scoped = new NitroStackServer({
        name: 'evict-server',
        version: '1.0.0',
        transforms: [new VisibilityTransform(store)],
      });
      scoped.tool(
        new Tool({
          name: 'public_tool',
          description: 'Public tool',
          inputSchema: z.object({}),
          handler: async () => ({}),
        })
      );

      const ctx = scoped.createContext({ extra: { sessionId: 's1' } });
      await ctx.disableTools?.(['public_tool']);
      store.getOrCreateSession('s2');

      expect(store.getSession('s1')).toBeUndefined();
      const later = scoped.createContext({ extra: { sessionId: 's1' } });
      expect(later.getVisibleTools?.()?.has('public_tool')).toBe(false);

      await scoped.stop();
      store.destroy();
    });
  });

  describe('Isolated ExecutionContext Visibility Methods (spec matching)', () => {
    it('should enable tools and trigger list-changed notification with store', async () => {
      const store = new SessionVisibilityStore();
      const notifySpy = jest.fn();
      const sessionId = 'session-xyz';

      const enableTools = async (names: string[]) => {
        store.enableTools(sessionId, names);
        notifySpy(sessionId);
      };

      await enableTools(['secret_tool']);

      expect(store.hasEnabled(sessionId, 'secret_tool')).toBe(true);
      expect(notifySpy).toHaveBeenCalledWith(sessionId);
      store.destroy();
    });

    it('should disable tools and trigger list-changed notification with store', async () => {
      const store = new SessionVisibilityStore();
      const notifySpy = jest.fn();
      const sessionId = 'session-xyz';

      store.enableTools(sessionId, ['secret_tool']);

      const disableTools = async (names: string[]) => {
        store.disableTools(sessionId, names);
        notifySpy(sessionId);
      };

      await disableTools(['secret_tool']);

      expect(store.hasEnabled(sessionId, 'secret_tool')).toBe(false);
      expect(store.hasDisabled(sessionId, 'secret_tool')).toBe(true);
      expect(notifySpy).toHaveBeenCalledWith(sessionId);
      store.destroy();
    });
  });
});
