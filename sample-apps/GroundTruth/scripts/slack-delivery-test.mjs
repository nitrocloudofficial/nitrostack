/**
 * Tests optional Slack delivery for manager alerts against a local mock.
 *
 * The failure paths matter more than the happy path here. An alert is a real
 * escalation: if Slack is down, misconfigured, or hanging, the alert must still
 * be recorded and the tool must still report success, because the escalation
 * did in fact happen. A notification failure that looks like an escalation
 * failure would teach the agent to retry something that already worked.
 *
 * No message is ever sent anywhere real — every case points at 127.0.0.1.
 *
 * Run `npm run build` first, then `npm run test:slack`.
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// --- Mock Slack ------------------------------------------------------------

const received = [];
let mode = 'ok'; // ok | error | hang

const slack = createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    received.push({
      method: req.method,
      contentType: req.headers['content-type'],
      body: (() => { try { return JSON.parse(body); } catch { return body; } })(),
    });

    if (mode === 'hang') return; // never respond; exercises the timeout
    if (mode === 'error') {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      return res.end('invalid_token');
    }
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
  });
});
await new Promise((r) => slack.listen(0, '127.0.0.1', r));
const SLACK_URL = `http://127.0.0.1:${slack.address().port}/services/TEST/HOOK`;

// --- MCP client ------------------------------------------------------------

function startServer(env) {
  const child = spawn('node', [path.join(PROJECT, 'dist/index.js')], {
    cwd: PROJECT,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'development', MCP_TRANSPORT_TYPE: 'stdio', ...env },
  });
  const state = { buf: '', pending: new Map(), nextId: 1, stderr: [] };
  child.stdout.on('data', (chunk) => {
    state.buf += chunk.toString();
    let i;
    while ((i = state.buf.indexOf('\n')) >= 0) {
      const line = state.buf.slice(0, i).trim();
      state.buf = state.buf.slice(i + 1);
      if (!line) continue;
      let m; try { m = JSON.parse(line); } catch { continue; }
      if (m.id && state.pending.has(m.id)) {
        state.pending.get(m.id).resolve(m);
        state.pending.delete(m.id);
      }
    }
  });
  child.stderr.on('data', (d) => state.stderr.push(d.toString()));

  const send = (method, params) => {
    const id = state.nextId++;
    return new Promise((resolve, reject) => {
      state.pending.set(id, { resolve, reject });
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
      setTimeout(() => {
        if (state.pending.has(id)) { state.pending.delete(id); reject(new Error(`timeout: ${method}`)); }
      }, 30000);
    });
  };
  return { child, send, state };
}

const toolJson = (res) => {
  const t = res?.result?.content?.find((c) => c.type === 'text')?.text;
  try { return JSON.parse(t); } catch { return t; }
};

const results = [];
const check = (name, ok, detail = '') => {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

async function raiseAlert(session, reason = 'Reported the login module as finished, but the only commit was a README edit and no PR was opened.') {
  await session.send('initialize', {
    protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'slack', version: '1' },
  });
  session.child.stdin.write(
    JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} }) + '\n',
  );
  await session.send('tools/call', { name: 'reset_demo_data', arguments: { resetRoster: true } });
  return toolJson(await session.send('tools/call', {
    name: 'send_manager_alert',
    arguments: { employeeId: 'emp-1', reason, severity: 'high' },
  }));
}

const sessions = [];
try {
  // --- 1. No webhook configured: nothing sent, alert unaffected ---
  {
    const s = startServer({ SLACK_WEBHOOK_URL: '' });
    sessions.push(s);
    const alert = await raiseAlert(s);
    check('alert is raised with no webhook configured', alert?.raised === true);
    check('nothing is sent when SLACK_WEBHOOK_URL is unset',
      alert?.slack?.attempted === false && received.length === 0,
      alert?.slack?.reason);
    s.child.kill();
  }

  // --- 2. Webhook configured and healthy ---
  {
    mode = 'ok';
    const s = startServer({ SLACK_WEBHOOK_URL: SLACK_URL });
    sessions.push(s);
    const alert = await raiseAlert(s);
    check('alert is raised and delivered', alert?.raised === true && alert?.slack?.delivered === true);
    check('posted exactly one JSON message', received.length === 1
      && received[0].method === 'POST'
      && /application\/json/.test(received[0].contentType ?? ''));

    const msg = received[0]?.body;
    check('message leads with severity and the person',
      /Needs attention today/.test(msg?.text ?? '') && /Aarav Menon/.test(msg?.text ?? ''),
      msg?.text);
    check('message carries the specific evidence, not a score',
      /README edit/.test(JSON.stringify(msg)) && !/matchScore/.test(JSON.stringify(msg)));
    check('message includes team and date context',
      /team-platform/.test(JSON.stringify(msg)));
    s.child.kill();
  }

  // --- 3. Slack rejects the webhook ---
  {
    mode = 'error';
    received.length = 0;
    const s = startServer({ SLACK_WEBHOOK_URL: SLACK_URL });
    sessions.push(s);
    const alert = await raiseAlert(s);
    check('alert still succeeds when Slack returns an error',
      alert?.raised === true && alert?.slack?.delivered === false,
      alert?.slack?.reason);
    check('failure reason names the status code', /403/.test(alert?.slack?.reason ?? ''));
    s.child.kill();
  }

  // --- 4. Malformed webhook URL: refuse to send, don't crash ---
  {
    received.length = 0;
    const s = startServer({ SLACK_WEBHOOK_URL: 'not-a-url' });
    sessions.push(s);
    const alert = await raiseAlert(s);
    check('malformed webhook is rejected before sending',
      alert?.raised === true && alert?.slack?.attempted === false && received.length === 0,
      alert?.slack?.reason);
    s.child.kill();
  }

  // --- 5. Slack hangs: alert must not hang with it ---
  {
    mode = 'hang';
    received.length = 0;
    const s = startServer({ SLACK_WEBHOOK_URL: SLACK_URL });
    sessions.push(s);
    const started = Date.now();
    const alert = await raiseAlert(s);
    const elapsed = Date.now() - started;
    check('alert still returns when Slack never responds',
      alert?.raised === true && alert?.slack?.delivered === false,
      alert?.slack?.reason);
    check('gave up within ~5s rather than hanging', elapsed < 20000, `${(elapsed / 1000).toFixed(1)}s`);
    s.child.kill();
  }
} catch (err) {
  check('harness completed', false, err.message);
} finally {
  for (const s of sessions) { try { s.child.kill(); } catch { /* already dead */ } }
  slack.close();
  const failed = results.filter((r) => !r).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
}
