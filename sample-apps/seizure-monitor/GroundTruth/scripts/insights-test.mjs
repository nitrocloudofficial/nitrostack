/**
 * Covers the drill-down and the weekly rollup.
 *
 * Both answer questions the daily digest cannot: the digest says who needs you
 * today, get_employee_detail says why, and generate_weekly_summary says what kind
 * of week the team had. The assertions that matter most are the ones about what
 * these must NOT say — a week with nothing wrong has to be reported as such, and
 * nobody may appear in two lists that imply opposite actions.
 *
 * Run `npm run build` first, then `npm run test:insights`.
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
    }, 30000);
  });
};
const tool = async (name, args) => {
  const r = await send('tools/call', { name, arguments: args });
  const t = r?.result?.content?.find((c) => c.type === 'text')?.text;
  try { return JSON.parse(t); } catch { return t; }
};

const results = [];
const check = (name, ok, detail = '') => {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

try {
  await send('initialize', {
    protocolVersion: '2024-11-05', capabilities: {},
    clientInfo: { name: 'insights', version: '1.0.0' },
  });
  child.stdin.write(
    JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} }) + '\n',
  );

  await tool('reset_demo_data', { resetRoster: true });
  await tool('seed_demo_data', { days: 7, includeToday: true });
  const alert = await tool('send_manager_alert', {
    employeeId: 'emp-1',
    severity: 'high',
    reason: 'Claimed the login module was finished with no matching commit or PR, and the staging blocker is on its fourth day.',
  });

  // ---- get_employee_detail ----
  const detail = await tool('get_employee_detail', { employeeId: 'emp-1', days: 7 });
  check('detail resolves the person and their team',
    detail?.employee?.id === 'emp-1' && detail?.employee?.teamId === 'team-platform');
  check('timeline covers the whole window', detail?.timeline?.length === 7,
    `${detail?.timeline?.length} day(s)`);
  check('timeline is newest first',
    detail.timeline[0].date > detail.timeline[detail.timeline.length - 1].date,
    `${detail.timeline[0].date} … ${detail.timeline[detail.timeline.length - 1].date}`);
  check('finds the blocker run', (detail?.summary?.longestBlockerRun ?? 0) >= 4,
    `${detail?.summary?.longestBlockerRun} days`);
  check('confidence slope is negative for a declining week',
    detail?.summary?.confidenceDelta < 0, `delta=${detail?.summary?.confidenceDelta}`);
  check('surfaces the open alert', detail?.summary?.openAlerts === 1
    && detail.alerts.some((a) => a.id === alert.alertId));
  check('says it is history, not a verdict', /not a verdict/i.test(detail?.reminder ?? ''));

  const healthy = await tool('get_employee_detail', { employeeId: 'emp-2', days: 7 });
  check('a healthy week shows no blocker run and no alerts',
    healthy?.summary?.longestBlockerRun === 0 && healthy?.summary?.openAlerts === 0);

  await tool('get_employee_detail', { employeeId: 'nobody' }).then(
    (r) => check('unknown employee is refused clearly',
      typeof r === 'string' && /No employee matches/i.test(r)),
    () => check('unknown employee is refused clearly', false),
  );

  // ---- generate_weekly_summary ----
  const week = await tool('generate_weekly_summary', { teamId: 'team-platform', days: 7 });
  check('weekly window matches the request', week?.window?.days === 7);
  check('reporting rate is a percentage of possible reports',
    week?.summary?.reportingRate > 0 && week.summary.reportingRate <= 100
      && week.summary.reportsPossible === week.people.length * 7,
    `${week?.summary?.reportingRate}% (${week?.summary?.reportsFiled}/${week?.summary?.reportsPossible})`);
  check('the stuck person is named', week?.stuck?.some((p) => p.name === 'Aarav Menon'),
    week?.stuck?.map((p) => `${p.name} ${p.longestBlockerRun}d`).join(', '));
  check('the declining people are named', week?.wearingDown?.length >= 1,
    week?.wearingDown?.map((p) => p.name).join(', '));

  // The property that makes it usable: no contradictory advice.
  const reliableIds = new Set(week.reliable.map((p) => p.name));
  const flagged = new Set(
    [...week.stuck, ...week.wearingDown, ...week.claimsOutrunningWork].map((p) => p.name),
  );
  check('nobody is both reliable and flagged',
    [...reliableIds].every((n) => !flagged.has(n)),
    `reliable: ${[...reliableIds].join(', ') || 'none'}`);
  check('the healthy people are still recognised', week?.reliable?.length >= 1,
    `${week?.reliable?.length} reliable`);

  // A quiet team must read as quiet rather than manufacture a concern.
  await tool('reset_demo_data', { resetRoster: true });
  await tool('submit_eod_report', {
    employeeId: 'emp-2', reportText: 'Shipped the dashboard and opened a PR.', confidence: 5,
  });
  const quietWeek = await tool('generate_weekly_summary', { teamId: 'team-platform', days: 7 });
  check('a week with nothing wrong flags nobody',
    quietWeek.stuck.length === 0 && quietWeek.claimsOutrunningWork.length === 0,
    `stuck ${quietWeek.stuck.length}, outrunning ${quietWeek.claimsOutrunningWork.length}`);
  check('and says so rather than inventing a concern',
    /do not manufacture a concern/i.test(quietWeek?.reminder ?? ''));

  await tool('generate_weekly_summary', { teamId: 'no-such-team' }).then(
    (r) => check('unknown team is refused clearly',
      typeof r === 'string' && /No employees on team/i.test(r)),
    () => check('unknown team is refused clearly', false),
  );

  await tool('reset_demo_data', { resetRoster: true });
} catch (err) {
  check('harness completed', false, err.message);
} finally {
  child.kill();
  const failed = results.filter((r) => !r).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  if (failed) console.log('\nstderr tail:\n' + stderr.join('').split('\n').slice(-12).join('\n'));
  process.exit(failed ? 1 : 0);
}
