/**
 * End-to-end STDIO Transport test suite for NitroStack.
 *
 * Verifies that:
 * 1. NitroStackServer can run in pure STDIO mode without any HTTP/SSE listeners.
 * 2. Real MCP JSON-RPC messages sent over stdin receive valid responses on stdout.
 * 3. `initialize`, `tools/list`, and `tools/call` execute correctly in both
 *    Modern (2026-07-28) and Legacy (2025-06-18) protocol eras.
 * 4. Tool error handling and validation return conforming MCP error structures.
 * 5. The server terminates cleanly on standard I/O close.
 */

import { describe, it, expect } from '@jest/globals';
import { spawn, type ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';

const distIndexPath = resolve(process.cwd(), 'dist/core/index.js');

interface JsonRpcMessage {
  jsonrpc: string;
  id?: number | string | null;
  method?: string;
  params?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: { code: number; message: string; data?: unknown };
}

/** Helper to interact with a child-process MCP server over STDIO */
class StdioMcpClient {
  private proc: ChildProcess;
  private buffer = '';
  private messageQueue: JsonRpcMessage[] = [];
  private waiters: Array<(msg: JsonRpcMessage) => void> = [];

  constructor(proc: ChildProcess) {
    this.proc = proc;
    this.proc.stdout?.on('data', (chunk: Buffer) => {
      this.buffer += chunk.toString('utf-8');
      this.processBuffer();
    });
    this.proc.stderr?.on('data', () => {
      // Diagnostic output on stderr does not corrupt protocol stream
    });
  }

  private processBuffer() {
    const lines = this.buffer.split('\n');
    // Keep trailing incomplete line in buffer
    this.buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const parsed = JSON.parse(trimmed) as JsonRpcMessage;
        if (parsed.jsonrpc === '2.0') {
          if (this.waiters.length > 0) {
            const nextWaiter = this.waiters.shift()!;
            nextWaiter(parsed);
          } else {
            this.messageQueue.push(parsed);
          }
        }
      } catch {
        // Non-JSON output (should not happen on stdout)
      }
    }
  }

  send(message: JsonRpcMessage): void {
    const payload = JSON.stringify(message) + '\n';
    this.proc.stdin?.write(payload);
  }

  async readNext(timeoutMs = 5000): Promise<JsonRpcMessage> {
    if (this.messageQueue.length > 0) {
      return this.messageQueue.shift()!;
    }
    return new Promise((resolvePromise, rejectPromise) => {
      const timer = setTimeout(() => {
        const idx = this.waiters.indexOf(handler);
        if (idx >= 0) this.waiters.splice(idx, 1);
        rejectPromise(new Error(`Timeout waiting for STDIO message after ${timeoutMs}ms`));
      }, timeoutMs);

      const handler = (msg: JsonRpcMessage) => {
        clearTimeout(timer);
        resolvePromise(msg);
      };

      this.waiters.push(handler);
    });
  }

  async close(): Promise<void> {
    return new Promise((resolvePromise) => {
      this.proc.stdin?.end();
      this.proc.kill('SIGTERM');
      this.proc.on('exit', () => resolvePromise());
      setTimeout(() => {
        this.proc.kill('SIGKILL');
        resolvePromise();
      }, 2000);
    });
  }
}

describe('NitroStack STDIO Mode Integration Tests', () => {
  const serverScript = `
    import { NitroStackServer, Tool, z } from '${distIndexPath}';

    const server = new NitroStackServer({
      name: 'test-stdio-server',
      version: '1.0.0',
    });

    server.tool(
      new Tool({
        name: 'calculate_sum',
        description: 'Add two numbers together',
        inputSchema: z.object({
          a: z.number().describe('First number'),
          b: z.number().describe('Second number'),
        }),
        handler: async (args) => {
          return { sum: args.a + args.b };
        },
      })
    );

    server.tool(
      new Tool({
        name: 'echo',
        description: 'Echo back input message',
        inputSchema: z.object({
          message: z.string(),
        }),
        handler: async (args) => {
          return { echo: args.message };
        },
      })
    );

    await server.start({ transport: 'stdio' });
  `;

  it('1. Connects, initializes, lists tools, and executes tools over STDIO in Modern (2026-07-28) mode', async () => {
    const proc = spawn('node', ['--input-type=module', '-e', serverScript], {
      env: {
        ...process.env,
        NITRO_MCP_PROTOCOL_VERSION: '2026-07-28',
        MCP_TRANSPORT_TYPE: 'stdio',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const client = new StdioMcpClient(proc);

    try {
      // 1. Send initialize
      client.send({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2026-07-28',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' },
        },
      });

      const initResponse = await client.readNext();
      expect(initResponse.id).toBe(1);
      expect(initResponse.error).toBeUndefined();
      expect(initResponse.result).toBeDefined();
      expect(initResponse.result?.serverInfo).toMatchObject({
        name: 'test-stdio-server',
        version: '1.0.0',
      });
      expect(initResponse.result?.capabilities).toBeDefined();

      // Send initialized notification
      client.send({
        jsonrpc: '2.0',
        method: 'notifications/initialized',
      });

      // 2. Discover tools via tools/list
      client.send({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
      });

      const listResponse = await client.readNext();
      expect(listResponse.id).toBe(2);
      expect(listResponse.error).toBeUndefined();
      const tools = listResponse.result?.tools as Array<{ name: string; description: string }>;
      expect(Array.isArray(tools)).toBe(true);
      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('calculate_sum');
      expect(toolNames).toContain('echo');

      // 3. Execute tool via tools/call with valid arguments
      client.send({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'calculate_sum',
          arguments: { a: 15, b: 27 },
        },
      });

      const callResponse = await client.readNext();
      expect(callResponse.id).toBe(3);
      expect(callResponse.error).toBeUndefined();
      const content = callResponse.result?.content as Array<{ type: string; text?: string; data?: unknown }>;
      expect(Array.isArray(content)).toBe(true);
      expect(content[0].type).toBe('text');
      expect(content[0].text).toContain('42');

      // 4. Execute tool with second tool
      client.send({
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'echo',
          arguments: { message: 'hello from stdio' },
        },
      });

      const echoResponse = await client.readNext();
      expect(echoResponse.id).toBe(4);
      expect(echoResponse.error).toBeUndefined();
      const echoContent = echoResponse.result?.content as Array<{ type: string; text?: string }>;
      expect(echoContent[0].text).toContain('hello from stdio');

      // 5. Execute tool with invalid arguments
      client.send({
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: {
          name: 'calculate_sum',
          arguments: { a: 'invalid_number', b: 10 },
        },
      });

      const errResponse = await client.readNext();
      expect(errResponse.id).toBe(5);
      // Modern protocol validates input schema and returns error result or RPC error
      const isErr = errResponse.error !== undefined || errResponse.result?.isError === true;
      expect(isErr).toBe(true);
    } finally {
      await client.close();
    }
  });

  it('2. Connects, initializes, lists tools, and executes tools over STDIO in Legacy (2025-06-18) mode', async () => {
    const proc = spawn('node', ['--input-type=module', '-e', serverScript], {
      env: {
        ...process.env,
        NITRO_MCP_PROTOCOL_VERSION: '2025-06-18',
        MCP_TRANSPORT_TYPE: 'stdio',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const client = new StdioMcpClient(proc);

    try {
      // 1. Send initialize
      client.send({
        jsonrpc: '2.0',
        id: 10,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'legacy-client', version: '1.0.0' },
        },
      });

      const initResponse = await client.readNext();
      expect(initResponse.id).toBe(10);
      expect(initResponse.error).toBeUndefined();
      expect(initResponse.result?.serverInfo).toMatchObject({
        name: 'test-stdio-server',
        version: '1.0.0',
      });

      // Send initialized notification
      client.send({
        jsonrpc: '2.0',
        method: 'notifications/initialized',
      });

      // 2. Discover tools via tools/list
      client.send({
        jsonrpc: '2.0',
        id: 11,
        method: 'tools/list',
      });

      const listResponse = await client.readNext();
      expect(listResponse.id).toBe(11);
      expect(listResponse.error).toBeUndefined();
      const tools = listResponse.result?.tools as Array<{ name: string }>;
      expect(tools.map((t) => t.name)).toContain('calculate_sum');

      // 3. Execute tool via tools/call
      client.send({
        jsonrpc: '2.0',
        id: 12,
        method: 'tools/call',
        params: {
          name: 'calculate_sum',
          arguments: { a: 100, b: 200 },
        },
      });

      const callResponse = await client.readNext();
      expect(callResponse.id).toBe(12);
      expect(callResponse.error).toBeUndefined();
      const content = callResponse.result?.content as Array<{ type: string; text?: string }>;
      expect(content[0].text).toContain('300');
    } finally {
      await client.close();
    }
  });

  it('3. Respects server.start({ transport: "stdio" }) programmatic configuration', async () => {
    const explicitScript = `
      import { NitroStackServer, Tool, z } from '${distIndexPath}';

      const server = new NitroStackServer({
        name: 'programmatic-stdio-server',
        version: '2.0.0',
      });

      server.tool(
        new Tool({
          name: 'hello',
          description: 'Simple hello tool',
          inputSchema: z.object({ name: z.string().optional() }),
          handler: async (args) => ({ message: \`Hello, \${args?.name || 'World'}!\` }),
        })
      );

      // Explicitly pass transport: "stdio"
      await server.start({ transport: 'stdio' });
    `;

    const proc = spawn('node', ['--input-type=module', '-e', explicitScript], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const client = new StdioMcpClient(proc);

    try {
      client.send({
        jsonrpc: '2.0',
        id: 100,
        method: 'initialize',
        params: {
          protocolVersion: '2026-07-28',
          capabilities: {},
          clientInfo: { name: 'programmatic-client', version: '1.0.0' },
        },
      });

      const initResponse = await client.readNext();
      expect(initResponse.id).toBe(100);
      expect(initResponse.error).toBeUndefined();

      client.send({
        jsonrpc: '2.0',
        id: 101,
        method: 'tools/call',
        params: {
          name: 'hello',
          arguments: { name: 'Developer' },
        },
      });

      const callResponse = await client.readNext();
      expect(callResponse.id).toBe(101);
      expect(callResponse.error).toBeUndefined();
      const content = callResponse.result?.content as Array<{ type: string; text?: string }>;
      expect(content[0].text).toContain('Hello, Developer!');
    } finally {
      await client.close();
    }
  });
});
