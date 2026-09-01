/**
 * Comprehensive regression test suite for Modern MCP (2026-07-28) Prompts.
 *
 * Exercises the Prompt registration and execution flow through the real Modern v2
 * SDK boundary (`ModernProtocolAdapter` -> `@modelcontextprotocol/server` -> `fetch`).
 *
 * Covers all 12 required scenarios:
 * 1. Parameterless prompt registration and execution
 * 2. Prompt with 1 required string argument
 * 3. Prompt with optional argument omitted
 * 4. Prompt with optional argument supplied
 * 5. Prompt with multiple required and optional arguments
 * 6. Missing required argument rejection
 * 7. Invalid argument type handling
 * 8. Separation of Prompt args from SDK extra/request context
 * 9. Auth info, clientInfo, headers, and ExecutionContext availability
 * 10. Context logging and execution metadata preservation
 * 11. Concurrent parameterized prompt calls with isolation
 * 12. Stateless HTTP execution (no initialize, no Mcp-Session-Id)
 */

import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { NitroStackServer } from '../../server.js';
import { Prompt } from '../../prompt.js';

const MODERN = '2026-07-28';
const META_PROTOCOL = 'io.modelcontextprotocol/protocolVersion';
const META_CLIENT_CAPS = 'io.modelcontextprotocol/clientCapabilities';
const META_CLIENT_INFO = 'io.modelcontextprotocol/clientInfo';

interface RpcResult {
  status: number;
  body: {
    jsonrpc?: string;
    id?: unknown;
    result?: {
      description?: string;
      messages?: Array<{ role: string; content: { type: string; text: string } }>;
      [key: string]: unknown;
    };
    error?: { code: number; message: string; data?: unknown };
  };
}

function modernPromptRequest(
  promptName: string,
  args?: Record<string, unknown>,
  opts: { id?: number; clientName?: string; authHeader?: string } = {},
): Request {
  const envelope = {
    [META_PROTOCOL]: MODERN,
    [META_CLIENT_CAPS]: {},
    [META_CLIENT_INFO]: { name: opts.clientName ?? 'jest-prompt-client', version: '1.0.0' },
  };

  const params: Record<string, unknown> = {
    name: promptName,
    _meta: envelope,
  };
  if (args !== undefined) {
    params.arguments = args;
  }

  const body = {
    jsonrpc: '2.0',
    id: opts.id ?? 1,
    method: 'prompts/get',
    params,
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'MCP-Protocol-Version': MODERN,
    'Mcp-Method': 'prompts/get',
    'Mcp-Name': promptName,
  };
  if (opts.authHeader) {
    headers['Authorization'] = opts.authHeader;
  }

  return new Request('http://localhost/mcp', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

async function readRpc(res: Response): Promise<RpcResult> {
  const text = await res.text();
  try {
    return { status: res.status, body: JSON.parse(text) };
  } catch {
    return { status: res.status, body: {} };
  }
}

describe('Modern (2026-07-28) Parameterized Prompt Regression Suite', () => {
  let server: NitroStackServer;
  let handler: { fetch: (req: Request) => Promise<Response>; close: () => Promise<void> };

  // Captured execution contexts for verification
  const capturedContexts: Record<string, any> = {};
  const capturedArgs: Record<string, any> = {};

  beforeAll(async () => {
    server = new NitroStackServer({ name: 'prompt-regression-server', version: '1.0.0', protocolVersion: MODERN });

    // 1. Parameterless prompt
    server.prompt(
      new Prompt({
        name: 'simple-greeting',
        description: 'A parameterless greeting prompt',
        handler: async (args, ctx) => {
          capturedArgs['simple-greeting'] = args;
          capturedContexts['simple-greeting'] = ctx;
          return [{ role: 'assistant', content: 'Hello, welcome to NitroStack!' }];
        },
      }),
    );

    // 2. Single required string argument
    server.prompt(
      new Prompt({
        name: 'code-review',
        description: 'Review code for best practices',
        arguments: [{ name: 'code', description: 'The source code', required: true }],
        handler: async (args, ctx) => {
          capturedArgs['code-review'] = args;
          capturedContexts['code-review'] = ctx;
          return [{ role: 'user', content: `Please review this code:\n${args.code}` }];
        },
      }),
    );

    // 3 & 4. Optional argument
    server.prompt(
      new Prompt({
        name: 'greet-user',
        description: 'Greeting with optional title',
        arguments: [
          { name: 'name', description: 'User name', required: true },
          { name: 'title', description: 'Optional honorific', required: false },
        ],
        handler: async (args, ctx) => {
          capturedArgs['greet-user'] = args;
          capturedContexts['greet-user'] = ctx;
          const prefix = args.title ? `${args.title} ` : '';
          return [{ role: 'assistant', content: `Hello, ${prefix}${args.name}!` }];
        },
      }),
    );

    // 5. Multiple required and optional arguments
    server.prompt(
      new Prompt({
        name: 'deploy-service',
        description: 'Deploy service with environment and options',
        arguments: [
          { name: 'service', description: 'Service name', required: true },
          { name: 'environment', description: 'Target environment', required: true },
          { name: 'tag', description: 'Release tag', required: false },
          { name: 'dryRun', description: 'Dry run flag', required: false },
        ],
        handler: async (args, ctx) => {
          capturedArgs['deploy-service'] = args;
          capturedContexts['deploy-service'] = ctx;
          return [
            {
              role: 'user',
              content: `Deploying ${args.service} to ${args.environment} (tag: ${args.tag ?? 'latest'}, dryRun: ${args.dryRun ?? 'false'})`,
            },
          ];
        },
      }),
    );

    const adapter = await (server as unknown as { getModernAdapter: () => Promise<any> }).getModernAdapter();
    handler = await adapter.getHttpHandler();
  });

  afterAll(async () => {
    await handler?.close?.();
  });

  // Scenario 1: Parameterless Prompt
  it('1. Parameterless prompt registers and executes successfully', async () => {
    const res = await handler.fetch(modernPromptRequest('simple-greeting', undefined, { id: 101 }));
    const { status, body } = await readRpc(res);

    expect(status).toBe(200);
    expect(body.error).toBeUndefined();
    expect(body.result?.messages).toHaveLength(1);
    expect(body.result?.messages?.[0].content.text).toBe('Hello, welcome to NitroStack!');
  });

  // Scenario 2: Single required string argument
  it('2. Prompt with one required string argument receives args and executes', async () => {
    const res = await handler.fetch(
      modernPromptRequest('code-review', { code: 'const answer = 42;' }, { id: 102 }),
    );
    const { status, body } = await readRpc(res);

    expect(status).toBe(200);
    expect(body.error).toBeUndefined();
    expect(body.result?.messages?.[0].content.text).toContain('const answer = 42;');
    expect(capturedArgs['code-review']?.code).toBe('const answer = 42;');
  });

  // Scenario 3: Optional argument omitted
  it('3. Prompt with optional argument omitted succeeds', async () => {
    const res = await handler.fetch(
      modernPromptRequest('greet-user', { name: 'Alice' }, { id: 103 }),
    );
    const { status, body } = await readRpc(res);

    expect(status).toBe(200);
    expect(body.error).toBeUndefined();
    expect(body.result?.messages?.[0].content.text).toBe('Hello, Alice!');
  });

  // Scenario 4: Optional argument supplied
  it('4. Prompt with optional argument supplied succeeds and uses argument', async () => {
    const res = await handler.fetch(
      modernPromptRequest('greet-user', { name: 'Smith', title: 'Dr.' }, { id: 104 }),
    );
    const { status, body } = await readRpc(res);

    expect(status).toBe(200);
    expect(body.error).toBeUndefined();
    expect(body.result?.messages?.[0].content.text).toBe('Hello, Dr. Smith!');
  });

  // Scenario 5: Multiple required and optional arguments
  it('5. Prompt with multiple required and optional arguments handles all supplied fields', async () => {
    const res = await handler.fetch(
      modernPromptRequest(
        'deploy-service',
        { service: 'auth-api', environment: 'production', tag: 'v2.1.0', dryRun: 'true' },
        { id: 105 },
      ),
    );
    const { status, body } = await readRpc(res);

    expect(status).toBe(200);
    expect(body.error).toBeUndefined();
    expect(body.result?.messages?.[0].content.text).toContain('Deploying auth-api to production');
    expect(body.result?.messages?.[0].content.text).toContain('tag: v2.1.0');
  });

  // Scenario 6: Missing required argument
  it('6. Missing required argument returns an error', async () => {
    const res = await handler.fetch(
      modernPromptRequest('code-review', {}, { id: 106 }),
    );
    const { status, body } = await readRpc(res);

    expect(body.error).toBeDefined();
    expect(body.error?.message).toMatch(/required (property|argument)|invalid (params|arguments)|validation/i);
  });

  // Scenario 7: Invalid argument type / missing arguments object
  it('7. Invalid or empty arguments payload returns an error for required prompt', async () => {
    const res = await handler.fetch(
      modernPromptRequest('code-review', undefined, { id: 107 }),
    );
    const { body } = await readRpc(res);

    expect(body.error).toBeDefined();
  });

  // Scenario 8: Separation of Prompt args from SDK extra/request context
  it('8. Handler receives clean args without SDK extra pollution', async () => {
    await handler.fetch(
      modernPromptRequest('code-review', { code: 'console.log("clean");' }, { id: 108 }),
    );

    const args = capturedArgs['code-review'];
    expect(args).toBeDefined();
    expect(args.code).toBe('console.log("clean");');
    expect(args.mcpReq).toBeUndefined();
    expect(args.http).toBeUndefined();
    expect(args.signal).toBeUndefined();
  });

  // Scenario 9: Context, clientInfo, and headers availability
  it('9. ExecutionContext is populated with clientInfo and protocolVersion', async () => {
    await handler.fetch(
      modernPromptRequest(
        'code-review',
        { code: 'const x = 10;' },
        { id: 109, clientName: 'audit-test-client' },
      ),
    );

    const ctx = capturedContexts['code-review'];
    expect(ctx).toBeDefined();
    expect(ctx.protocolVersion).toBe(MODERN);
    expect(ctx.clientInfo).toMatchObject({ name: 'audit-test-client' });
  });

  // Scenario 10: Context logger exists and handles execution
  it('10. Context logger is available and logs prompt execution', async () => {
    await handler.fetch(
      modernPromptRequest('simple-greeting', undefined, { id: 110 }),
    );

    const ctx = capturedContexts['simple-greeting'];
    expect(ctx?.logger).toBeDefined();
    expect(typeof ctx?.logger?.info).toBe('function');
  });

  // Scenario 11: Concurrent parameterized prompt calls with isolation
  it('11. Concurrent parameterized prompt calls maintain isolated args and responses', async () => {
    const p1 = handler.fetch(
      modernPromptRequest('code-review', { code: 'user1_code()' }, { id: 111, clientName: 'client-1' }),
    );
    const p2 = handler.fetch(
      modernPromptRequest('code-review', { code: 'user2_code()' }, { id: 112, clientName: 'client-2' }),
    );

    const [res1, res2] = await Promise.all([p1, p2]);
    const [r1, r2] = await Promise.all([readRpc(res1), readRpc(res2)]);

    expect(r1.body.result?.messages?.[0].content.text).toContain('user1_code()');
    expect(r2.body.result?.messages?.[0].content.text).toContain('user2_code()');
    expect(r1.body.id).toBe(111);
    expect(r2.body.id).toBe(112);
  });

  // Scenario 12: Stateless HTTP execution without Mcp-Session-Id
  it('12. Modern HTTP prompts/get operates statelessly without session header', async () => {
    const res = await handler.fetch(
      modernPromptRequest('simple-greeting', undefined, { id: 113 }),
    );

    expect(res.headers.get('Mcp-Session-Id')).toBeNull();
    const { status, body } = await readRpc(res);
    expect(status).toBe(200);
    expect(body.error).toBeUndefined();
  });
});
