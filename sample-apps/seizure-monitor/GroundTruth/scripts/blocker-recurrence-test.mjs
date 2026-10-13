/**
 * Tests that a blocker reported on several days is recognised as ONE blocker
 * even when the wording changes.
 *
 * This was a real bug found by running the demo in production. Recurrence was
 * matched with exact string equality, so "blocked on the staging credentials"
 * and "still blocked on the staging database credentials, waiting on infra"
 * counted as two unrelated one-day blockers. A blocker stuck for a week showed
 * as recurring=0, which silently disables the most valuable signal the product
 * has — that someone has been stuck for days and nobody noticed.
 *
 * Run `npm run build` first, then `npm run test:blockers`.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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
const stderr = [];
child.stderr.on('data', (d) => stderr.push(d.toString()));

const send = (method, params) => {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    setTimeout(() => {
      if (pending.has(id)) { pending.delete(id); reject(new Error(`timeout: ${method}`)); }
    }, 25000);
  });
};
const toolJson = (res) => {
  const t = res?.result?.content?.find((c) => c.type === 'text')?.text;
  try { return JSON.parse(t); } catch { return t; }
};

const results = [];
const check = (name, ok, detail = '') => {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const pad = (n) => String(n).padStart(2, '0');
const dayAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

try {
  await send('initialize', {
    protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'blockers', version: '1' },
  });
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} }) + '\n');
  await send('tools/call', { name: 'reset_demo_data', arguments: { resetRoster: true } });

  // The same problem, described differently each day — as people actually write.
  const wordings = [
    [3, 'Blocked on the staging credentials.'],
    [2, 'Still blocked on the staging database credentials.'],
    [1, 'Waiting on infra for the staging database credentials, still blocked.'],
    [0, 'Still blocked on the staging DB credentials, no word from infra.'],
  ];
  for (const [ago, text] of wordings) {
    await send('tools/call', {
      name: 'submit_eod_report',
      arguments: { employeeId: 'emp-1', reportText: text, confidence: 3, date: dayAgo(ago) },
    });
  }

  const trend = toolJson(await send('tools/call', {
    name: 'analyze_wellbeing_trend', arguments: { employeeId: 'emp-1', days: 5 },
  }));
  const person = trend?.people?.[0];
  const runs = person?.recurringBlockers ?? [];

  check('four rewordings collapse into one blocker', runs.length === 1,
    `${runs.length} distinct blocker(s)`);
  check('the run spans all four days', runs[0]?.days === 4, `days=${runs[0]?.days}`);
  check('labelled with the most recent wording', /no word from infra/.test(runs[0]?.blocker ?? ''),
    `"${(runs[0]?.blocker ?? '').slice(0, 50)}"`);
  check('surfaced as a signal to the agent',
    (person?.signals ?? []).some((s) => /unresolved across 4 days/.test(s)));

  // The digest must agree with the trend.
  const digest = toolJson(await send('tools/call', {
    name: 'generate_daily_digest', arguments: { teamId: 'team-platform' },
  }));
  const row = digest?.rows?.find((r) => r.employee.id === 'emp-1');
  check('digest flags the recurrence too', (row?.recurringBlockers?.length ?? 0) >= 1,
    `recurring=${row?.recurringBlockers?.length}`);
  check('digest ranks the person as needing attention', row?.attentionRank >= 30,
    `rank=${row?.attentionRank}`);
  check('digest counts them in needsAttention', digest?.summary?.needsAttention >= 1,
    `needsAttention=${digest?.summary?.needsAttention}`);

  // A genuinely different blocker must stay separate.
  await send('tools/call', {
    name: 'submit_eod_report',
    arguments: {
      employeeId: 'emp-2',
      reportText: 'Blocked on the staging credentials.',
      confidence: 3,
      date: dayAgo(1),
    },
  });
  await send('tools/call', {
    name: 'submit_eod_report',
    arguments: {
      employeeId: 'emp-2',
      reportText: 'Blocked waiting for the design review sign-off.',
      confidence: 3,
      date: dayAgo(0),
    },
  });
  const trend2 = toolJson(await send('tools/call', {
    name: 'analyze_wellbeing_trend', arguments: { employeeId: 'emp-2', days: 5 },
  }));
  check('two different blockers are not merged',
    (trend2?.people?.[0]?.recurringBlockers?.length ?? 0) === 0,
    `${trend2?.people?.[0]?.recurringBlockers?.length} run(s) — expected 0`);

  await send('tools/call', { name: 'reset_demo_data', arguments: { resetRoster: true } });
} catch (err) {
  check('harness completed', false, err.message);
} finally {
  child.kill();
  const failed = results.filter((r) => !r).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  if (failed) console.log('\nstderr tail:\n' + stderr.join('').split('\n').slice(-15).join('\n'));
  process.exit(failed ? 1 : 0);
}
