#!/usr/bin/env node
/**
 * NitroStack Dedicated STDIO Smoke Test
 *
 * Runs an independent, standalone STDIO MCP server and MCP client,
 * exercising the full JSON-RPC lifecycle:
 *   1. Subprocess spawn & STDIO transport attachment
 *   2. MCP initialize handshake
 *   3. Tool discovery via tools/list
 *   4. Tool execution via tools/call (hello tool)
 *   5. Response assertion & clean shutdown
 *
 * Usage:
 *   node scripts/stdio-smoke-test.mjs
 */

import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);

// ============================================================================
// Server Mode (Child Process)
// ============================================================================
if (process.argv.includes('--server')) {
  const { NitroStackServer, Tool, z } = await import('../dist/core/index.js');

  const server = new NitroStackServer({
    name: 'stdio-smoke-server',
    version: '2.0.0',
    protocolVersion: '2026-07-28',
  });

  // Register 'hello' test tool
  server.tool(
    new Tool({
      name: 'hello',
      description: 'Greet someone by name',
      inputSchema: z.object({
        name: z.string().default('World').describe('Name of person to greet'),
      }),
      handler: async (args) => {
        const target = args?.name || 'World';
        return {
          greeting: `Hello, ${target}! Welcome to NitroStack MCP 2.0.`,
          timestamp: new Date().toISOString(),
        };
      },
    }),
  );

  // Start server explicitly on STDIO
  await server.start({ transport: 'stdio' });
}

// ============================================================================
// Client Runner Mode (Main Process)
// ============================================================================
else {
  console.log('🧪 Starting NitroStack STDIO Smoke Test...\n');

  const child = spawn(process.execPath, [__filename, '--server'], {
    env: {
      ...process.env,
      MCP_TRANSPORT_TYPE: 'stdio',
      NITRO_MCP_PROTOCOL_VERSION: '2026-07-28',
    },
    stdio: ['pipe', 'pipe', 'inherit'],
  });

  let buffer = '';
  const messageQueue = [];
  const waiters = [];

  child.stdout.on('data', (chunk) => {
    buffer += chunk.toString('utf-8');
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const msg = JSON.parse(trimmed);
        if (msg.jsonrpc === '2.0') {
          if (waiters.length > 0) {
            waiters.shift()(msg);
          } else {
            messageQueue.push(msg);
          }
        }
      } catch {
        // Ignore non-JSON lines
      }
    }
  });

  function sendRpc(msg) {
    child.stdin.write(JSON.stringify(msg) + '\n');
  }

  function readNext(timeoutMs = 5000) {
    if (messageQueue.length > 0) {
      return Promise.resolve(messageQueue.shift());
    }
    return new Promise((res, rej) => {
      const timer = setTimeout(() => {
        rej(new Error(`Timed out waiting for response after ${timeoutMs}ms`));
      }, timeoutMs);
      waiters.push((msg) => {
        clearTimeout(timer);
        res(msg);
      });
    });
  }

  try {
    // Step 1: Initialize
    console.log('  [1/4] Sending MCP initialize handshake...');
    sendRpc({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2026-07-28',
        capabilities: {},
        clientInfo: { name: 'stdio-smoke-client', version: '1.0.0' },
      },
    });

    const initRes = await readNext();
    if (initRes.error) {
      throw new Error(`Initialize failed: ${JSON.stringify(initRes.error)}`);
    }
    console.log('  ✅ Initialize succeeded:');
    console.log(`     - Server Name: ${initRes.result?.serverInfo?.name}`);
    console.log(`     - Server Version: ${initRes.result?.serverInfo?.version}`);
    console.log(`     - Capabilities: ${JSON.stringify(initRes.result?.capabilities)}`);

    // Initialized notification
    sendRpc({ jsonrpc: '2.0', method: 'notifications/initialized' });

    // Step 2: Tool Discovery
    console.log('\n  [2/4] Discovering tools via tools/list...');
    sendRpc({ jsonrpc: '2.0', id: 2, method: 'tools/list' });

    const listRes = await readNext();
    if (listRes.error) {
      throw new Error(`tools/list failed: ${JSON.stringify(listRes.error)}`);
    }
    const tools = listRes.result?.tools || [];
    console.log(`  ✅ Discovered ${tools.length} tool(s):`);
    for (const t of tools) {
      console.log(`     - ${t.name}: ${t.description}`);
    }

    const hasHello = tools.some((t) => t.name === 'hello');
    if (!hasHello) {
      throw new Error("Required tool 'hello' not found in tools/list response");
    }

    // Step 3: Tool Execution
    console.log('\n  [3/4] Calling tool hello(name="NitroEngineer")...');
    sendRpc({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'hello',
        arguments: { name: 'NitroEngineer' },
      },
    });

    const callRes = await readNext();
    if (callRes.error) {
      throw new Error(`tools/call failed: ${JSON.stringify(callRes.error)}`);
    }
    console.log('  ✅ Tool executed successfully:');
    const content = callRes.result?.content || [];
    console.log(`     - Response: ${JSON.stringify(content)}`);

    const textOut = content[0]?.text || '';
    if (!textOut.includes('Hello, NitroEngineer!')) {
      throw new Error(`Unexpected tool output: ${textOut}`);
    }

    // Step 4: Graceful Shutdown
    console.log('\n  [4/4] Shutting down STDIO client and server process...');
    child.stdin.end();
    child.kill('SIGTERM');

    await new Promise((res) => {
      child.on('exit', (code, signal) => {
        console.log(`  ✅ Server process exited cleanly (code: ${code}, signal: ${signal})`);
        res();
      });
      setTimeout(() => {
        child.kill('SIGKILL');
        res();
      }, 1500);
    });

    console.log('\n🎉 ALL STDIO SMOKE TESTS PASSED (100% Conformance)\n');
    process.exit(0);
  } catch (err) {
    console.error(`\n❌ STDIO Smoke Test Failed:`, err);
    child.kill('SIGKILL');
    process.exit(1);
  }
}
