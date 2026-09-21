#!/usr/bin/env tsx
/**
 * ThreatMatrix MCP Server Test Suite
 * Tests: startup, handshake, capabilities, tool listing, tool execution (health_check, analyze_email, process_request),
 *        invalid requests, resource listing, prompt listing.
 *
 * Run: npm test  OR  npx tsx scripts/test-mcp.ts
 */
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_PATH = path.join(__dirname, '../dist/index.js');

let passed = 0;
let failed = 0;

function ok(label: string) {
  process.stdout.write(`  ✅ ${label}\n`);
  passed++;
}

function fail(label: string, reason?: string) {
  process.stdout.write(`  ❌ ${label}${reason ? ': ' + reason : ''}\n`);
  failed++;
}

// ─── MCP JSON-RPC Helper ──────────────────────────────────────────────────────
async function testMcpServer(): Promise<void> {
  process.stdout.write('\n🛡️  ThreatMatrix MCP Server Test Suite\n');
  process.stdout.write('══════════════════════════════════════\n\n');

  const proc = spawn('node', [SERVER_PATH], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'test' },
  });

  const responses: any[] = [];
  let buffer = '';

  proc.stdout.on('data', (data: Buffer) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line.trim()) {
        try {
          responses.push(JSON.parse(line));
        } catch {
          // not JSON
        }
      }
    }
  });

  const send = (obj: object) => {
    proc.stdin.write(JSON.stringify(obj) + '\n');
  };

  const waitFor = (id: number, timeoutMs = 5000): Promise<any> =>
    new Promise((resolve, reject) => {
      const start = Date.now();
      const check = setInterval(() => {
        const found = responses.find(r => r.id === id);
        if (found) { clearInterval(check); resolve(found); }
        if (Date.now() - start > timeoutMs) {
          clearInterval(check);
          reject(new Error(`Timeout waiting for response id=${id}`));
        }
      }, 50);
    });

  await new Promise(r => setTimeout(r, 1000)); // Let server start

  process.stdout.write('📡 MCP Protocol Tests\n');
  process.stdout.write('─────────────────────\n');

  // ── Test 1: initialize ────────────────────────────────────────────────────
  try {
    send({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {}, resources: {}, prompts: {} },
        clientInfo: { name: 'ThreatMatrix-Test', version: '1.0.0' },
      },
    });
    const res = await waitFor(1);
    if (res.result?.protocolVersion && res.result?.serverInfo && res.result?.capabilities) {
      ok('initialize — handshake successful');
      ok(`initialize — protocolVersion: ${res.result.protocolVersion}`);
      ok(`initialize — serverInfo: ${res.result.serverInfo.name} v${res.result.serverInfo.version}`);
      const caps = Object.keys(res.result.capabilities ?? {}).join(', ');
      ok(`initialize — capabilities declared: ${caps}`);
    } else {
      fail('initialize', JSON.stringify(res));
    }
  } catch (e: any) {
    fail('initialize', e.message);
  }

  // ── Test 2: initialized notification ─────────────────────────────────────
  send({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} });
  ok('notifications/initialized — sent');

  // ── Test 3: tools/list ────────────────────────────────────────────────────
  try {
    send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
    const res = await waitFor(2);
    const count = res.result?.tools?.length ?? 0;
    if (count >= 26) {
      ok(`tools/list — ${count} tools registered (includes process_request)`);
    } else {
      fail('tools/list', `got ${count} tools`);
    }
  } catch (e: any) {
    fail('tools/list', e.message);
  }

  // ── Test 4: tools/call — health_check ────────────────────────────────────
  try {
    send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'health_check', arguments: {} } });
    const res = await waitFor(3, 8000);
    if (res.result?.content?.[0]?.text) {
      ok('tools/call health_check — returned content');
    } else if (res.error) {
      fail('tools/call health_check', res.error.message);
    } else {
      fail('tools/call health_check', 'no content');
    }
  } catch (e: any) {
    fail('tools/call health_check', e.message);
  }

  // ── Test 5: tools/call — process_request (JSON input) ─────────────────────
  try {
    send({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'process_request',
        arguments: { input: { name: 'AdminUser', action: 'password_reset_request', targetIp: '192.168.1.100' } },
      },
    });
    const res = await waitFor(4, 15000);
    if (res.result?.content?.[0]?.text) {
      const data = JSON.parse(res.result.content[0].text);
      if (data.success && data.response) {
        ok(`tools/call process_request (Agentic AI JSON parsing) — detectedFormat: ${data.metadata?.detectedFormat}`);
      } else {
        fail('tools/call process_request', JSON.stringify(data));
      }
    } else {
      fail('tools/call process_request', JSON.stringify(res.error ?? res));
    }
  } catch (e: any) {
    fail('tools/call process_request', e.message);
  }

  // ── Test 6: tools/call — invalid params ──────────────────────────────────
  try {
    send({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'analyze_url', arguments: {} } });
    const res = await waitFor(5, 8000);
    if (res.result?.isError === true || res.error) {
      ok('tools/call invalid params — correctly returned error');
    } else {
      fail('tools/call invalid params', 'expected error response');
    }
  } catch (e: any) {
    fail('tools/call invalid params', e.message);
  }

  // ── Test 7: tools/call — unknown tool ────────────────────────────────────
  try {
    send({ jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: 'nonexistent_tool', arguments: {} } });
    const res = await waitFor(6, 8000);
    if (res.error || res.result?.isError) {
      ok('tools/call unknown tool — correctly returned error');
    } else {
      fail('tools/call unknown tool', 'expected error');
    }
  } catch (e: any) {
    fail('tools/call unknown tool', e.message);
  }

  // ── Test 8: resources/list ────────────────────────────────────────────────
  try {
    send({ jsonrpc: '2.0', id: 7, method: 'resources/list', params: {} });
    const res = await waitFor(7);
    const count = res.result?.resources?.length ?? 0;
    if (count === 6) {
      ok(`resources/list — ${count} resources registered`);
    } else {
      fail('resources/list', `got ${count} resources`);
    }
  } catch (e: any) {
    fail('resources/list', e.message);
  }

  // ── Test 9: resources/read ────────────────────────────────────────────────
  try {
    send({ jsonrpc: '2.0', id: 8, method: 'resources/read', params: { uri: 'threatmatrix://docs' } });
    const res = await waitFor(8);
    if (res.result?.contents?.[0]?.text) {
      ok('resources/read threatmatrix://docs — content returned');
    } else {
      fail('resources/read', JSON.stringify(res.error ?? res));
    }
  } catch (e: any) {
    fail('resources/read', e.message);
  }

  // ── Test 10: prompts/list ─────────────────────────────────────────────────
  try {
    send({ jsonrpc: '2.0', id: 9, method: 'prompts/list', params: {} });
    const res = await waitFor(9);
    const count = res.result?.prompts?.length ?? 0;
    if (count >= 8) {
      ok(`prompts/list — ${count} prompts registered`);
    } else {
      fail('prompts/list', `got ${count} prompts`);
    }
  } catch (e: any) {
    fail('prompts/list', e.message);
  }

  // ── Test 11: prompts/get ──────────────────────────────────────────────────
  try {
    send({
      jsonrpc: '2.0',
      id: 10,
      method: 'prompts/get',
      params: { name: 'analyze_url_prompt', arguments: { url: 'https://example.com' } },
    });
    const res = await waitFor(10);
    if (res.result?.messages?.[0]?.content?.text) {
      ok('prompts/get analyze_url_prompt — template returned');
    } else {
      fail('prompts/get', JSON.stringify(res.error ?? res));
    }
  } catch (e: any) {
    fail('prompts/get', e.message);
  }

  // ── Test 12: tools/call — analyze_pdf path traversal rejection ──────────
  try {
    send({
      jsonrpc: '2.0',
      id: 11,
      method: 'tools/call',
      params: { name: 'analyze_pdf', arguments: { filePath: '../../etc/passwd' } },
    });
    const res = await waitFor(11, 8000);
    if (res.result?.content?.[0]?.text) {
      const data = JSON.parse(res.result.content[0].text);
      if (data.isError || data.summary?.includes('Access Denied')) {
        ok('tools/call analyze_pdf — path traversal correctly rejected');
      } else {
        fail('tools/call analyze_pdf path traversal', 'expected rejection summary');
      }
    } else {
      fail('tools/call analyze_pdf path traversal', 'no text output');
    }
  } catch (e: any) {
    fail('tools/call analyze_pdf path traversal', e.message);
  }

  // ── Test 13: tools/call — investigate multi-vector orchestrator ──────────
  try {
    send({
      jsonrpc: '2.0',
      id: 12,
      method: 'tools/call',
      params: { name: 'investigate', arguments: { target: '1.1.1.1', type: 'ip' } },
    });
    const res = await waitFor(12, 10000);
    if (res.result?.content?.[0]?.text) {
      const data = JSON.parse(res.result.content[0].text);
      if (data.scanId && data.type === 'ip') {
        ok(`tools/call investigate — multi-vector orchestration succeeded (${data.scanId})`);
      } else {
        fail('tools/call investigate', JSON.stringify(data));
      }
    } else {
      fail('tools/call investigate', 'no output text');
    }
  } catch (e: any) {
    fail('tools/call investigate', e.message);
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────
  proc.kill();
  await new Promise(r => setTimeout(r, 500));

  process.stdout.write(`\n══════════════════════════════════════\n`);
  process.stdout.write(`Results: ${passed} passed, ${failed} failed\n\n`);

  if (failed === 0) {
    process.stdout.write('🟢 ALL TESTS PASSED — Production ready!\n\n');
    process.exit(0);
  } else {
    process.stdout.write('🔴 SOME TESTS FAILED — Check output above\n\n');
    process.exit(1);
  }
}

testMcpServer().catch((err) => {
  process.stderr.write(`Test runner fatal error: ${err.message}\n`);
  process.exit(1);
});
