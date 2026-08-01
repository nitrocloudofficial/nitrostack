/**
 * Runs the whole GroundTruth demo in a terminal, paced for screen recording.
 *
 * Studio is one MCP client among several; the server is the product. This drives
 * it directly over stdio (or HTTP against a deployed instance) so a demo can be
 * recorded without depending on a desktop GUI behaving on the day.
 *
 *   npm run demo:run                    local, from .env
 *   npm run demo:run -- <service-url>   a deployed instance
 *   npm run demo:run -- --fast          no pauses, for a quick check
 *
 * It does not fake the agent. Step 3 prints the real prompt the model receives
 * and the real evidence the tools return; the reasoning shown alongside is the
 * conclusion that evidence supports. Say so on camera — the honest framing is
 * stronger than implying a model is thinking live in your terminal.
 */
import 'dotenv/config';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const url = args.find((a) => a.startsWith('http'));
const FAST = args.includes('--fast');

const C = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, FAST ? 0 : ms));
const say = (s = '') => console.log(s);

async function beat(title, subtitle) {
  say();
  say(C.dim('─'.repeat(72)));
  say(`  ${C.bold(title)}${subtitle ? `   ${C.dim(subtitle)}` : ''}`);
  say(C.dim('─'.repeat(72)));
  await sleep(700);
}

/** Prints a line at a readable pace, so a viewer can follow on video. */
async function line(s = '', ms = 90) {
  say(s);
  await sleep(ms);
}

// ---------------------------------------------------------------- transport

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
      const headers = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };
      if (sessionId) headers['Mcp-Session-Id'] = sessionId;
      const res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
      const sid = res.headers.get('mcp-session-id');
      if (sid) sessionId = sid;
      const text = await res.text();
      if (notification) return null;
      if (text.includes('data:')) {
        let payload = null;
        for (const l of text.split(/\r?\n/)) {
          if (!l.startsWith('data:')) continue;
          try { const p = JSON.parse(l.slice(5).trim()); if (p.result || p.error) payload = p; } catch { /* scan on */ }
        }
        return payload;
      }
      try { return JSON.parse(text); } catch { return null; }
    },
    close() {},
  };
}

function stdioTransport() {
  const child = spawn('node', [path.join(PROJECT, 'dist/index.js')], {
    cwd: PROJECT, stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'development', MCP_TRANSPORT_TYPE: 'stdio' },
  });
  let buf = ''; const pending = new Map(); let nextId = 1;
  child.stdout.on('data', (chunk) => {
    buf += chunk.toString();
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const l = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (!l) continue;
      let m; try { m = JSON.parse(l); } catch { continue; }
      if (m.id && pending.has(m.id)) { pending.get(m.id).resolve(m); pending.delete(m.id); }
    }
  });
  child.stderr.on('data', () => {});
  return {
    label: 'local',
    send(method, params, { notification = false } = {}) {
      if (notification) {
        child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');
        return Promise.resolve(null);
      }
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
        setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error(`timeout: ${method}`)); } }, 30000);
      });
    },
    close() { child.kill(); },
  };
}

// --------------------------------------------------------------------- main

const t = url ? httpTransport(url) : stdioTransport();
const call = async (name, a) => {
  const r = await t.send('tools/call', { name, arguments: a });
  if (r?.error) throw new Error(`${name}: ${r.error.message ?? 'failed'}`);
  const text = r?.result?.content?.find((c) => c.type === 'text')?.text;
  if (!text) return r?.result ?? null;
  try { return JSON.parse(text); } catch { return text; }
};

try {
  await t.send('initialize', {
    protocolVersion: '2024-11-05', capabilities: {},
    clientInfo: { name: 'demo-run', version: '1.0.0' },
  });
  await t.send('notifications/initialized', {}, { notification: true });

  // ── The problem ────────────────────────────────────────────────────────
  await beat('GROUNDTRUTH', `verifying EOD reports against real GitHub activity · ${t.label}`);
  await line('  Every IT company runs on end-of-day reports.', 800);
  await line('  Managers read ten or twenty a day and verify none of them.', 800);
  await line(C.dim('  What someone says they did, and what actually landed in GitHub,'), 500);
  await line(C.dim('  are different things — and nobody checks.'), 1200);

  // ── An employee reports ────────────────────────────────────────────────
  await beat('1. An employee submits their end of day', 'submit_eod_report');
  const text = 'Finished the login module and wired up session handling. Still blocked on the staging database credentials.';
  await line(`  ${C.cyan(`"${text}"`)}`, 600);
  await line(`  ${C.dim('confidence 2 of 5')}`, 800);
  const sub = await call('submit_eod_report', { employeeId: 'emp-1', reportText: text, confidence: 2 });
  await line();
  await line(`  ${C.green('stored')}  ${sub.reportId}`, 400);
  for (const c of sub.claims ?? []) {
    await line(`  claim    ${c.text}${c.assertsCompletion ? C.yellow('   [asserts done]') : ''}`, 300);
  }
  for (const b of sub.blockers ?? []) await line(`  blocker  ${C.yellow(b)}`, 400);
  await line();
  await line(C.dim('  A normal, plausible report. Nothing about it looks suspicious.'), 1200);

  // ── Verify against reality ─────────────────────────────────────────────
  await beat('2. GroundTruth checks it against GitHub', 'crosscheck_activity — live API');
  // Pass the claims explicitly, as the prompt instructs a model to. Without them
  // the tool warns that its keyword parse is unreliable — true, and worth saying
  // to an agent, but noise on a recording.
  const cc = await call('crosscheck_activity', {
    employeeId: 'emp-1',
    claims: [
      { text: 'Finished the login module and wired up session handling', assertsCompletion: true },
    ],
  });
  await line(`  ${C.bold(`${cc.commitCount} commits`)} and ${C.bold(`${cc.pullRequestCount} pull requests`)} today, from the real GitHub API`, 700);
  await line();
  for (const c of (cc.commits ?? []).slice(0, 6)) {
    await line(`    ${C.dim(c.sha)}  ${c.message.slice(0, 58)}`, 220);
  }
  if ((cc.commits?.length ?? 0) > 6) await line(C.dim(`    … and ${cc.commits.length - 6} more`), 300);
  await line();
  await line(C.dim('  He committed plenty. But read the messages —'), 700);
  await line(C.dim('  not one of them mentions login, session, or auth.'), 1000);
  await line();
  for (const c of cc.claimSupport ?? []) {
    await line(`  ${c.supported ? C.green('MATCHED ') : C.red('NO MATCH')}  ${c.claim.slice(0, 52)}`, 400);
  }
  if (cc.recurringBlockers?.length) {
    await line();
    for (const r of cc.recurringBlockers) {
      await line(`  ${C.red(`BLOCKER · ${r.days} DAYS RUNNING`)}  ${r.blocker.slice(0, 44)}`, 300);
      await line(`  ${C.dim(`          ${r.dates.join('  ')}`)}`, 900);
    }
  }

  // ── The agent decides ──────────────────────────────────────────────────
  await beat('3. The agent reasons and decides', 'review_eod_submission');
  await line(C.dim('  Every tool above is deterministic — fetch, diff, store.'), 600);
  await line(C.dim('  None of them decides anything. This is the part that does:'), 900);
  await line();
  for (const o of cc.observations ?? []) {
    await line(`  ${C.dim('·')} ${o.slice(0, 88)}`, 380);
  }
  await line();
  await line(`  ${C.bold('Decision:')} ${C.red('needs attention today')}`, 600);
  await line(C.dim('  A completion claim with no matching commit and no PR, plus a'), 400);
  await line(C.dim('  blocker on its fourth day and confidence down to 2 of 5.'), 900);

  const alert = await call('send_manager_alert', {
    employeeId: 'emp-1',
    severity: 'high',
    reason:
      `Reported the login module and session handling as finished, but none of the ${cc.commitCount} commits ` +
      'today mention login, session, or auth, and no pull request was opened. The staging credentials ' +
      'blocker is now on its fourth day and confidence has fallen to 2 of 5. Unblock the credentials ' +
      'with infra today, and ask what the login module still needs before it is called done.',
  });
  await line();
  await line(`  ${C.green('alert raised')}  ${alert.alertId}  ${C.red('[high]')}`, 900);

  // ── What the manager sees ──────────────────────────────────────────────
  await beat('4. What the manager opens', 'generate_daily_digest');
  const digest = await call('generate_daily_digest', { teamId: 'team-platform' });
  await line(`  ${digest.summary.needsAttention} of ${digest.summary.headcount} need attention today`, 700);
  await line();
  for (const r of digest.rows) {
    const flag = r.alerts.length ? C.red('!') : ' ';
    await line(`  ${flag} ${String(r.attentionRank).padStart(3)}  ${r.employee.name.padEnd(17)} ${C.dim((r.verdict ?? '—').padEnd(12))}`, 260);
  }
  await line();
  await line(C.dim('  The manager never asked for any of this.'), 900);

  await beat('5. And across the week', 'analyze_wellbeing_trend');
  const trend = await call('analyze_wellbeing_trend', { teamId: 'team-platform', days: 4 });
  for (const p of trend.people) {
    const series = p.series.map((s) => s.confidence ?? '·').join(' ');
    const dir = p.direction === 'declining' ? C.red(p.direction) : C.dim(p.direction);
    await line(`  ${p.employee.name.padEnd(17)} [${series}]  ${dir}`, 320);
  }

  const karthik = trend.people.find((p) => p.employee.id === 'emp-3');
  await line();
  await line(C.dim('  And the one that matters most —'), 700);
  await line(`  ${C.bold(karthik?.employee.name ?? 'Karthik Iyer')} has almost no commits. Review, pairing, design.`, 600);
  await line(`  GroundTruth looked at him and ${C.green('stayed quiet')}.`, 800);
  await line(C.dim('  A tool that flagged him would be worse than useless — a manager'), 400);
  await line(C.dim('  who learns to ignore these alerts is worse off than one'), 400);
  await line(C.dim('  who never had them.'), 1200);

  await beat('GROUNDTRUTH', 'one honest paragraph a day, checked against what actually happened');
  await line();
} catch (err) {
  console.error(`\n${C.red('Failed')}: ${err.message}`);
  console.error(C.dim('Run `npm run demo:prepare` first, and check health://checks shows github: up.'));
  process.exitCode = 1;
} finally {
  t.close();
}
