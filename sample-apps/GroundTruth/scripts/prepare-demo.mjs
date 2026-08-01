/**
 * Puts an instance into the state the demo script expects, in one command.
 *
 * Needed because a redeploy restarts the container and resets the data file, so
 * seeded history has to be recreated before every recording attempt — and doing
 * that by hand through the Tools page, minutes before a take, is how demos get
 * broken.
 *
 * Local (stdio, uses .env):
 *   npm run demo:prepare
 *
 * Deployed (streamable HTTP):
 *   npm run demo:prepare -- https://your-app.app.nitrocloud.ai
 *
 * Leaves today's report UNSUBMITTED on purpose — submitting it live is the demo's
 * second beat. Pass --submit-today to fill it in too, for a dry run.
 */
// The server loads .env itself; this script runs outside it and needs the same
// values (GITHUB_ORG, DEMO_GITHUB_*) to configure the demo identity.
import 'dotenv/config';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const url = args.find((a) => a.startsWith('http'));
const submitToday = args.includes('--submit-today');

const GITHUB_LOGIN = process.env.DEMO_GITHUB_LOGIN ?? process.env.GITHUB_ORG ?? '';
const GITHUB_EMAIL = process.env.DEMO_GITHUB_EMAIL ?? '';

// ---------------------------------------------------------------- transports

/** Talks to a deployed server over Streamable HTTP. */
function httpTransport(base) {
  const endpoint = base.replace(/\/+$/, '').endsWith('/mcp')
    ? base.replace(/\/+$/, '')
    : `${base.replace(/\/+$/, '')}/mcp`;
  let sessionId = null;

  return {
    label: endpoint,
    async send(method, params, { notification = false } = {}) {
      const body = notification
        ? { jsonrpc: '2.0', method, params }
        : { jsonrpc: '2.0', id: Math.floor(Math.random() * 1e6), method, params };
      const headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      };
      if (sessionId) headers['Mcp-Session-Id'] = sessionId;

      const res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
      const sid = res.headers.get('mcp-session-id');
      if (sid) sessionId = sid;
      const text = await res.text();
      if (notification) return null;

      if (text.includes('data:')) {
        let payload = null;
        for (const line of text.split(/\r?\n/)) {
          if (!line.startsWith('data:')) continue;
          try {
            const p = JSON.parse(line.slice(5).trim());
            if (p.result || p.error) payload = p;
          } catch { /* keep scanning */ }
        }
        return payload;
      }
      try { return JSON.parse(text); } catch { return null; }
    },
    close() {},
  };
}

/** Talks to the local build over stdio. */
function stdioTransport() {
  const child = spawn('node', [path.join(PROJECT, 'dist/index.js')], {
    cwd: PROJECT,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'development', MCP_TRANSPORT_TYPE: 'stdio' },
  });
  let buf = '';
  const pending = new Map();
  let nextId = 1;

  child.stdout.on('data', (chunk) => {
    buf += chunk.toString();
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line) continue;
      let m; try { m = JSON.parse(line); } catch { continue; }
      if (m.id && pending.has(m.id)) { pending.get(m.id).resolve(m); pending.delete(m.id); }
    }
  });
  child.stderr.on('data', () => {});

  return {
    label: 'local (stdio)',
    send(method, params, { notification = false } = {}) {
      if (notification) {
        child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');
        return Promise.resolve(null);
      }
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
        setTimeout(() => {
          if (pending.has(id)) { pending.delete(id); reject(new Error(`timeout: ${method}`)); }
        }, 30000);
      });
    },
    close() { child.kill(); },
  };
}

// ---------------------------------------------------------------------- main

const t = url ? httpTransport(url) : stdioTransport();
const callTool = async (name, args_) => {
  const r = await t.send('tools/call', { name, arguments: args_ });
  if (r?.error) throw new Error(`${name}: ${r.error.message ?? JSON.stringify(r.error)}`);
  const text = r?.result?.content?.find((c) => c.type === 'text')?.text;
  if (!text) return r?.result ?? null;
  try { return JSON.parse(text); } catch { return text; }
};

try {
  console.log(`target          ${t.label}`);
  await t.send('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'prepare-demo', version: '1.0.0' },
  });
  await t.send('notifications/initialized', {}, { notification: true });

  // Confirm GitHub is usable before bothering to seed.
  const health = await t.send('resources/read', { uri: 'health://checks' });
  const raw = health?.result?.contents?.[0]?.text;
  if (raw) {
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : (parsed.checks ?? parsed);
    const entries = Array.isArray(list)
      ? list
      : Object.entries(list).map(([name, v]) => ({ name, ...v }));
    for (const c of entries) {
      console.log(`health ${String(c.name).padEnd(8)} ${c.status}`);
    }
    const gh = entries.find((c) => c.name === 'github');
    if (gh && gh.status !== 'up') {
      console.log(`\nSTOP: github is "${gh.status}" — ${gh.message}`);
      console.log('Cross-checks will fail. Fix the env vars before recording.');
      process.exitCode = 1;
    }
  }

  await callTool('reset_demo_data', { resetRoster: true });

  if (GITHUB_LOGIN) {
    const ident = await callTool('set_employee_github', {
      employeeId: 'emp-1',
      githubUsername: GITHUB_LOGIN,
      githubEmail: GITHUB_EMAIL || undefined,
    });
    console.log(`\nidentity        emp-1 -> @${ident.githubUsername} / ${ident.githubEmail ?? '(no email)'}`);
    if (!GITHUB_EMAIL) {
      console.log('                no DEMO_GITHUB_EMAIL set — commits GitHub has not linked');
      console.log('                to this account will not be found. Set it to your');
      console.log('                `git config user.email`.');
    }
  } else {
    console.log('\nidentity        skipped (set DEMO_GITHUB_LOGIN or GITHUB_ORG)');
  }

  const seed = await callTool('seed_demo_data', { days: 3, includeToday: false });
  console.log(`seeded          ${seed.reportsCreated} reports, ${seed.dateRange.from} .. ${seed.dateRange.to}`);

  if (submitToday) {
    await callTool('submit_eod_report', {
      employeeId: 'emp-1',
      reportText:
        'Finished the login module and wired up session handling. Still blocked on the staging database credentials.',
      confidence: 2,
    });
    const cc = await callTool('crosscheck_activity', { employeeId: 'emp-1' });
    console.log(`dry run         verdict=${cc.verdict} commits=${cc.commits.length} recurring=${cc.recurringBlockers?.length ?? 0}`);
  }

  const digest = await callTool('generate_daily_digest', { teamId: 'team-platform' });
  console.log(`\ntoday submitted ${digest.summary.submitted} of ${digest.summary.headcount}${submitToday ? '' : '   <- 0 is correct, you submit live'}`);
  console.log(`needsAttention  ${digest.summary.needsAttention}`);
  console.log(`open alerts     ${digest.summary.openAlerts}`);
  console.log('\nReady. Next: open_eod_form, then the review_eod_submission prompt in AI Chat.');
} catch (err) {
  console.error(`\nFailed: ${err.message}`);
  process.exitCode = 1;
} finally {
  t.close();
}
