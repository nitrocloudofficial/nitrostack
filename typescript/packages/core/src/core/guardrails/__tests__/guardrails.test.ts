import { z } from 'zod';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Tool } from '../../tool.js';
import { createServer } from '../../server.js';
import { createLogger } from '../../logger.js';
import { Guardrail, GuardrailDecisionError, InMemoryPolicyProvider, getGuardrailMetadata, assertValidPolicy } from '../index.js';
import type { ExecutionContext } from '../../types.js';
import type { Policy } from '../index.js';
import { OAuthGuard } from '../../guards/oauth.guard.js';
import { OAuthModule } from '../../oauth-module.js';
import { BM25SearchTransform } from '../../transforms/search/bm25-search.transform.js';
import { CodeModeTransform } from '../../transforms/code-mode/code-mode.transform.js';
import { Tool as ToolDecorator } from '../../decorators.js';
import { buildTools } from '../../builders.js';
import { Cache } from '../../decorators/cache.decorator.js';

const context = (): ExecutionContext => ({ requestId: 'r1', logger: createLogger({ level: 'error' }) });
const policy = (effect: 'allow' | 'deny', tenantId = 'tenant-a'): Policy => ({
  schemaVersion: 1, id: 'transfer', tenantId, version: 1, defaultEffect: 'deny',
  rules: [{ id: 'rule', effect, all: [{ field: 'transfer.amount', op: 'gt', value: 0 }] }],
});

describe('guardrail enforcement', () => {
  const provider = new InMemoryPolicyProvider();
  const handler = jest.fn(async () => 'transferred');
  const config = {
    mode: 'enforce' as const, requireDeclaration: true, provider,
    identityResolver: async (_ctx: ExecutionContext) => ({ principalId: 'p1', tenantId: 'tenant-a', scopes: [], source: 'test' }),
    contextResolver: ({ input }: { input: unknown }) => ({ 'transfer.amount': (input as { amount: number }).amount }),
  };

  beforeEach(() => { handler.mockClear(); provider.publish(policy('deny')); });

  function guardedTool() {
    return new Tool({ name: 'transfer', description: 'Transfer', inputSchema: z.object({ amount: z.number().int() }),
      guardrail: { policy: 'transfer', facts: ['transfer.amount'] }, handler });
  }

  it('denies before the handler, then allows a live policy update', async () => {
    const tool = guardedTool();
    createServer({ name: 'test', version: '1', guardrails: config }).tool(tool);
    await expect(tool.execute({ amount: 5 }, context())).rejects.toBeInstanceOf(GuardrailDecisionError);
    expect(handler).not.toHaveBeenCalled();
    provider.publish(policy('allow'));
    await expect(tool.execute({ amount: 5 }, context())).resolves.toBe('transferred');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('rejects malformed or extra input before policy and handler', async () => {
    const tool = guardedTool();
    createServer({ name: 'test', version: '1', guardrails: config }).tool(tool);
    await expect(tool.execute({ amount: '5' } as any, context())).rejects.toMatchObject({ reasonCode: 'INVALID_INPUT' });
    await expect(tool.execute({ amount: 5, isAdmin: true } as any, context())).rejects.toMatchObject({ reasonCode: 'INVALID_INPUT' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('fails closed without trusted identity or matching tenant policy', async () => {
    const tool = guardedTool();
    createServer({ name: 'test', version: '1', guardrails: { ...config, identityResolver: () => null } }).tool(tool);
    await expect(tool.execute({ amount: 5 }, context())).rejects.toMatchObject({ reasonCode: 'UNAUTHENTICATED' });
    expect(handler).not.toHaveBeenCalled();
    const other = guardedTool();
    const otherProvider = new InMemoryPolicyProvider();
    otherProvider.publish(policy('allow', 'tenant-b'));
    createServer({ name: 'test', version: '1', guardrails: { ...config, provider: otherProvider } }).tool(other);
    await expect(other.execute({ amount: 5 }, context())).rejects.toMatchObject({ reasonCode: 'UNAVAILABLE' });
  });

  it('requires a declaration and configuration at registration', () => {
    const tool = guardedTool();
    expect(() => createServer({ name: 'test', version: '1' }).tool(tool)).toThrow(/requires guardrails/);
    const plain = new Tool({ name: 'plain', description: 'Plain', inputSchema: z.object({}), handler });
    expect(() => createServer({ name: 'test', version: '1', guardrails: config }).tool(plain)).toThrow(/declaration required/);
    expect(() => createServer({ name: 'test', version: '1', guardrails: { ...config, mode: undefined } as any })
      .tool(guardedTool())).toThrow(/Invalid guardrails configuration/);
  });

  it('stores decorator metadata', () => {
    class Tools {
      @ToolDecorator({ name: 'transfer', description: 'Transfer', inputSchema: z.object({ amount: z.number() }) })
      @Guardrail({ policy: 'transfer', facts: ['transfer.amount'] })
      async run() { return undefined; }
    }
    expect(getGuardrailMetadata(Tools.prototype, 'run')).toEqual({ policy: 'transfer', facts: ['transfer.amount'] });
    expect(buildTools(new Tools() as unknown as Record<string, unknown>)[0].guardrail).toEqual({ policy: 'transfer', facts: ['transfer.amount'] });
  });

  it('rejects input-only caching on guarded tools', () => {
    class CachedTools {
      @ToolDecorator({ name: 'transfer', description: 'Transfer', inputSchema: z.object({ amount: z.number() }) })
      @Guardrail({ policy: 'transfer', facts: ['transfer.amount'] })
      @Cache({ ttl: 60 })
      async run() { return undefined; }
    }
    expect(() => buildTools(new CachedTools() as unknown as Record<string, unknown>)).toThrow(/@Cache is not yet supported/);
  });

  it('rejects invalid policy fields and conflicting tenant identity', () => {
    const invalid = { ...policy('allow'), rules: [{ id: 'rule', effect: 'allow', all: [
      { field: '__proto__.admin', op: 'eq', value: true },
    ] }] } as unknown as Policy;
    expect(() => assertValidPolicy(invalid, 'tenant-a', 'transfer', ['__proto__.admin'])).toThrow();
    expect(() => assertValidPolicy(policy('allow', 'tenant-b'), 'tenant-a', 'transfer', ['transfer.amount'])).toThrow();
  });

  it('keeps filter handlers from swallowing a guardrail denial', async () => {
    class SwallowFilter { catch() { return 'allowed'; } }
    const tool = new Tool({ name: 'transfer', description: 'Transfer', inputSchema: z.object({ amount: z.number() }),
      guardrail: { policy: 'transfer', facts: ['transfer.amount'] }, filters: [SwallowFilter as any], handler });
    createServer({ name: 'test', version: '1', guardrails: config }).tool(tool);
    await expect(tool.execute({ amount: 5 }, context())).rejects.toBeInstanceOf(GuardrailDecisionError);
    expect(handler).not.toHaveBeenCalled();
  });

  it('does not accept an unsigned auth subject as OAuth verification', async () => {
    const authRequired = jest.spyOn(OAuthModule, 'isAuthRequired').mockReturnValue(true);
    try {
      const forged = context();
      forged.auth = { authenticated: true, subject: 'admin', scopes: [] };
      await expect(new OAuthGuard().canActivate(forged)).rejects.toThrow(/OAuth token required/);
    } finally {
      authRequired.mockRestore();
    }
  });

  it('denies a target reached through call_tool and Code Mode', async () => {
    const codeMode = new CodeModeTransform({ workerPoolSize: 1 });
    const server = createServer({ name: 'test', version: '1', guardrails: config,
      transforms: [new BM25SearchTransform(), codeMode] });
    server.tool(guardedTool());
    try {
      await server.runToolPipeline();
      const ctx = server.createExecutionContext();
      const proxy = await server.resolveTool('call_tool', ctx);
      await expect(proxy!.execute({ name: 'transfer', arguments: { amount: 5 } }, ctx))
        .rejects.toBeInstanceOf(GuardrailDecisionError);
      const codeResult = await codeMode.execute(
        `try { await callTool('transfer', { amount: 5 }); return 'REACHED'; }
         catch (e) { return 'DENIED'; }`, ctx);
      expect(codeResult.value).toBe('DENIED');
      expect(handler).not.toHaveBeenCalled();
    } finally {
      await server.stop();
    }
  });

  it('returns only a safe error on modern tools/call', async () => {
    const server = createServer({ name: 'test', version: '1', protocolVersion: 'modern', guardrails: config });
    server.tool(guardedTool());
    const adapter = await (server as unknown as { getModernAdapter(): Promise<any> }).getModernAdapter();
    const http = await adapter.getHttpHandler();
    try {
      const request = new Request('http://localhost/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json',
          'MCP-Protocol-Version': '2026-07-28', 'Mcp-Method': 'tools/call', 'Mcp-Name': 'transfer' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: {
          name: 'transfer', arguments: { amount: 5 }, _meta: {
            'io.modelcontextprotocol/protocolVersion': '2026-07-28',
            'io.modelcontextprotocol/clientCapabilities': {},
            'io.modelcontextprotocol/clientInfo': { name: 'jest', version: '1' },
          },
        } }),
      });
      const response = await http.fetch(request);
      const body = JSON.parse(await response.text());
      expect(body.result.isError).toBe(true);
      expect(body.result.content[0].text).toBe("This action isn't permitted.");
      expect(handler).not.toHaveBeenCalled();
    } finally {
      await http?.close?.();
      await server.stop();
    }
  });

  it('returns only a safe error on legacy tools/call', async () => {
    const server = createServer({ name: 'test', version: '1', protocolVersion: 'legacy', guardrails: config });
    server.tool(guardedTool());
    const mcp = (server as unknown as { mcpServer: { _requestHandlers: Map<string, Function> } }).mcpServer;
    const callTool = mcp._requestHandlers.get('tools/call');
    expect(callTool).toBeDefined();
    const result = await callTool!({ method: 'tools/call', params: { name: 'transfer', arguments: { amount: 5 } } });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("This action isn't permitted.");
    expect(handler).not.toHaveBeenCalled();
    await server.stop();
  });

  it('fails a task without executing the guarded handler', async () => {
    const server = createServer({ name: 'test', version: '1', protocolVersion: 'legacy', guardrails: config });
    const tool = new Tool({ name: 'transfer', description: 'Transfer', inputSchema: z.object({ amount: z.number() }),
      taskSupport: 'optional', guardrail: { policy: 'transfer', facts: ['transfer.amount'] }, handler });
    server.tool(tool);
    const internal = server as unknown as {
      mcpServer: { _requestHandlers: Map<string, Function> };
      taskManager: { getTask(id: string): { status: string } };
    };
    const callTool = internal.mcpServer._requestHandlers.get('tools/call')!;
    const result = await callTool({ method: 'tools/call', params: { name: 'transfer', arguments: { amount: 5 }, task: {} } });
    await new Promise(resolve => setImmediate(resolve));
    expect(internal.taskManager.getTask(result.task.taskId).status).toBe('failed');
    expect(handler).not.toHaveBeenCalled();
    await server.stop();
  });
});
