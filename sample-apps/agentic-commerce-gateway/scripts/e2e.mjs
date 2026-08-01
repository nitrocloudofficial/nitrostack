#!/usr/bin/env node
/**
 * End-to-end test for the Agentic Commerce Gateway.
 *
 * Speaks real MCP to the server and runs the three demo scenarios, so a green
 * run means the tools actually work through the protocol — not just that the
 * functions return.
 *
 *   node scripts/e2e.mjs                 # local build over STDIO
 *   node scripts/e2e.mjs --url <base>    # deployed server over Streamable HTTP
 *
 * Exits non-zero if any check fails.
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const urlFlag = process.argv.indexOf('--url');
const BASE_URL = urlFlag !== -1 ? process.argv[urlFlag + 1] : null;

// ---------------------------------------------------------------- transports

/** Talks to a local `node dist/index.js` over newline-delimited JSON-RPC. */
function stdioTransport() {
  const server = spawn('node', ['dist/index.js'], {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: 'development', MCP_TRANSPORT_TYPE: 'stdio' },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const pending = new Map();
  let buf = '';
  let markReady;
  const ready = new Promise((r) => { markReady = r; });

  server.stdout.on('data', (chunk) => {
    buf += chunk.toString();
    let i;
    while ((i = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line) continue;
      let msg;
      try { msg = JSON.parse(line); } catch { continue; }
      if (msg.id !== undefined && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      }
    }
  });

  // The stdio transport attaches after bootstrap; sending earlier drops the message.
  server.stderr.on('data', (c) => {
    if (c.toString().includes('started successfully')) markReady();
  });

  let nextId = 1;
  return {
    label: 'local build (STDIO)',
    async start() {
      await Promise.race([ready, new Promise((r) => setTimeout(r, 20000))]);
      await new Promise((r) => setTimeout(r, 300));
    },
    async send(method, params, isNotification = false) {
      if (isNotification) {
        server.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');
        return null;
      }
      const id = nextId++;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`timeout on ${method}`)), 30000);
        pending.set(id, (m) => { clearTimeout(timer); resolve(m); });
        server.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
      });
    },
    stop() { server.kill('SIGTERM'); },
  };
}

/** Talks to a deployed server over Streamable HTTP; replies arrive as SSE frames. */
function httpTransport(base) {
  const endpoint = base.replace(/\/+$/, '') + '/mcp';
  let sessionId = null;
  let nextId = 1;

  const parseSse = (text) =>
    text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('data:'))
      .flatMap((l) => {
        try { return [JSON.parse(l.slice(5).trim())]; } catch { return []; }
      });

  return {
    label: `deployed server (${endpoint})`,
    async start() {},
    async send(method, params, isNotification = false) {
      const body = isNotification
        ? { jsonrpc: '2.0', method, params }
        : { jsonrpc: '2.0', id: nextId++, method, params };
      const headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      };
      if (sessionId) headers['Mcp-Session-Id'] = sessionId;

      const res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
      const sid = res.headers.get('mcp-session-id');
      if (sid) sessionId = sid;
      if (isNotification) return null;

      const text = await res.text();
      const msgs = parseSse(text);
      const msg = msgs.find((m) => m.id === body.id) ?? msgs[0];
      if (!msg) throw new Error(`no response for ${method}: ${text.slice(0, 200)}`);
      return msg;
    },
    stop() {},
  };
}

// ------------------------------------------------------------------ harness

const t = BASE_URL ? httpTransport(BASE_URL) : stdioTransport();

function payload(res) {
  if (res.error) throw new Error(`RPC error: ${JSON.stringify(res.error)}`);
  if (res.result?.structuredContent) return res.result.structuredContent;
  const text = res.result?.content?.find((c) => c.type === 'text')?.text;
  if (!text) return res.result;
  try { return JSON.parse(text); } catch { return text; }
}

const fails = [];
function check(label, cond, detail = '') {
  console.log(`   ${cond ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!cond) fails.push(label);
}

const call = async (name, args) => payload(await t.send('tools/call', { name, arguments: args }));

async function main() {
  await t.start();

  const init = await t.send('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'gateway-e2e', version: '1.0.0' },
  });
  console.log(`\nTarget: ${t.label}`);
  console.log(`Server: ${init.result?.serverInfo?.name} ${init.result?.serverInfo?.version}\n`);
  await t.send('notifications/initialized', {}, true);

  console.log('── SURFACE ──');
  const tools = (await t.send('tools/list', {})).result.tools.map((x) => x.name).sort();
  const expected = [
    'blocklist_agent', 'compute_trust_score', 'flag_order', 'get_sales_dashboard',
    'list_products', 'place_agent_order', 'reset_demo', 'screen_agent', 'verify_receipt',
  ];
  check('all 9 tools registered', expected.every((e) => tools.includes(e)), `${tools.length} tools`);

  const resources = ((await t.send('resources/list', {})).result?.resources ?? []).map((r) => r.uri);
  check('3 widget resources served', resources.filter((u) => u.startsWith('ui://widget/')).length === 3);
  check('3 gateway resources served', resources.filter((u) => u.startsWith('novagear://')).length === 3);
  check('2 prompts registered', ((await t.send('prompts/list', {})).result?.prompts ?? []).length === 2);

  await call('reset_demo', {});

  const cat = await call('list_products', {});
  check('catalog has 8 SKUs', cat.count === 8);

  console.log('\n── SCENARIO 1: clean sale ──');
  const o1 = await call('place_agent_order', { order_ref: 'ord_1001' });
  check('ACP payload normalized', o1.protocol === 'acp', `${o1.orderId} ${o1.total}`);
  const s1 = await call('screen_agent', { order_id: 'ord_1001' });
  check('signature verifies', s1.signatureValid === true);
  check('no failed identity checks', s1.failedChecks === 0);
  const t1 = await call('compute_trust_score', { order_id: 'ord_1001' });
  check('approved', t1.verdict === 'approve', `score ${t1.score}/100`);

  console.log('\n── SCENARIO 2: fraudulent buyer blocked ──');
  const o2 = await call('place_agent_order', { order_ref: 'ord_1002' });
  check('x402 payload normalized', o2.protocol === 'x402', `${o2.orderId} ${o2.total}`);
  const s2 = await call('screen_agent', { order_id: 'ord_1002' });
  check('spoofed signature rejected', s2.signatureValid === false);
  const t2 = await call('compute_trust_score', { order_id: 'ord_1002' });
  check('declined', t2.verdict === 'decline', `score ${t2.score}/100`);
  check('multiple risk signals failed', t2.failedSignals >= 3, `${t2.failedSignals} of 5 failed`);
  const b2 = await call('blocklist_agent', {
    agent_id: 'agt_ghost_nyx', reason: 'Spoofed signature on a 40-unit order',
  });
  check('agent blocklisted', b2.blocked === true);

  const o2b = await call('place_agent_order', {
    protocol: 'acp', agent_id: 'agt_ghost_nyx', items: [{ sku: 'NG-MS-01', qty: 1 }],
  });
  const t2b = await call('compute_trust_score', { order_id: o2b.orderId });
  check("blocklist stops that agent's next order", t2b.verdict === 'decline');

  console.log('\n── SCENARIO 3: tampered receipt caught ──');
  const t3 = await call('compute_trust_score', { order_id: 'ord_1003' });
  check('sale passes screening', t3.verdict === 'approve', `score ${t3.score}/100`);
  const v3 = await call('verify_receipt', { order_id: 'ord_1003' });
  check('mismatch detected', v3.verified === false, `${v3.mismatchCount} fields disagree`);
  check('exposure priced exactly', v3.exposureMinor === 4499100, v3.exposure);
  const amount = v3.diffs.find((d) => d.field === 'amount');
  check('amount diff surfaced', amount && !amount.match, `${amount?.receiptValue} vs ${amount?.chainValue}`);
  const f3 = await call('flag_order', {
    order_id: 'ord_1003',
    reason: 'Receipt disagrees with the on-chain settlement',
    evidence: ['amount mismatch', 'quantity mismatch'],
  });
  check('order flagged', f3.status === 'flagged', f3.exposure);
  check('clean settlement still verifies', (await call('verify_receipt', { order_id: 'ord_1001' })).verified === true);

  console.log('\n── HOLDS AND EDGE CASES ──');
  check('high-value order held for a human', (await call('compute_trust_score', { order_id: 'ord_1009' })).verdict === 'hold');
  check('velocity abuse held', (await call('compute_trust_score', { order_id: 'ord_1005' })).verdict === 'hold');
  check('unregistered agent not auto-approved', (await call('compute_trust_score', { order_id: 'ord_1006' })).verdict !== 'approve');
  check('signed underpayment held', (await call('compute_trust_score', { order_id: 'ord_1008' })).verdict === 'hold');
  check('payee redirect caught', (await call('verify_receipt', { order_id: 'ord_1008' })).verified === false);

  const bad = await t.send('tools/call', { name: 'screen_agent', arguments: { order_id: 'ord_9999' } });
  check(
    'unknown order rejected cleanly',
    bad.result?.isError === true || bad.error !== undefined ||
      JSON.stringify(bad.result ?? '').toLowerCase().includes('unknown order'),
  );

  console.log('\n── DASHBOARD ──');
  const dash = await call('get_sales_dashboard', {});
  check('revenue protected counted', dash.revenueProtectedMinor > 0, dash.revenueProtected);
  check('disputed order listed', dash.flagged.length === 1);
  check('blocklist populated', dash.blocklist.length >= 1);

  const reset = await call('reset_demo', {});
  check('reset restores fixtures', reset.orders === 9);
  check('reset clears blocklist', (await call('get_sales_dashboard', {})).blocklist.length === 0);

  console.log('\n' + '─'.repeat(60));
  if (fails.length) {
    console.log(`\x1b[31mFAILED (${fails.length}):\x1b[0m ${fails.join('; ')}`);
    process.exitCode = 1;
  } else {
    console.log('\x1b[32mALL CHECKS PASSED\x1b[0m');
    process.exitCode = 0;
  }
}

main()
  .catch((e) => {
    console.error('\nE2E ERROR:', e.message);
    process.exitCode = 1;
  })
  .finally(() => {
    t.stop();
    // The SDK keeps handles open; exit once results are reported.
    setTimeout(() => process.exit(process.exitCode ?? 0), 250).unref();
  });
