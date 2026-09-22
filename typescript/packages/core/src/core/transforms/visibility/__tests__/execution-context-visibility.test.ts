import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { z } from 'zod';
import { NitroStackServer } from '../../../server.js';
import { Tool } from '../../../tool.js';
import { Tool as ToolDecorator } from '../../../decorators.js';
import { buildTools } from '../../../builders.js';
import { SessionVisibilityStore } from '../session-store.js';

describe('NITRO-104-M2: ExecutionContext Visibility API & Decorator Tags', () => {
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
      expect(store.hasEnabled(sessionId, 'transfer_funds')).toBe(true);
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
      expect(store.hasDisabled(sessionId, 'standard_tool')).toBe(true);
      expect(notifySpy).toHaveBeenCalledWith(sessionId);
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
