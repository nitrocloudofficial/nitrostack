/**
 * End-to-end smoke test for the GroundTruth MCP server.
 *
 * Speaks raw JSON-RPC over stdio to the built server and walks the whole agent
 * path: register, submit a report, extract claims, cross-check, alert, digest.
 *
 * Run `npm run build` first, then `npm run smoke`. Exits non-zero on failure,
 * so it is safe to wire into CI.
 *
 * crosscheck_activity passes either way here: with GITHUB_TOKEN set it hits the
 * real API, and without one it must return a clear configuration error rather
 * than crashing.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const child = spawn('node', ['dist/index.js'], {
  cwd: PROJECT,
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, NODE_ENV: 'development', MCP_TRANSPORT_TYPE: 'stdio' },
});

let buf = '';
const pending = new Map();
let nextId = 1;

child.stdout.on('data', (chunk) => {
  buf += chunk.toString();
  let idx;
  while ((idx = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { continue; }
    if (msg.id && pending.has(msg.id)) {
      const { resolve } = pending.get(msg.id);
      pending.delete(msg.id);
      resolve(msg);
    }
  }
});

const stderrLines = [];
child.stderr.on('data', (d) => stderrLines.push(d.toString()));

function send(method, params) {
  const id = nextId++;
  const payload = JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n';
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    child.stdin.write(payload);
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error(`timeout: ${method}`));
      }
    }, 30000);
  });
}

function notify(method, params) {
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');
}

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

function toolJson(res) {
  const text = res?.result?.content?.find((c) => c.type === 'text')?.text;
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

try {
  const init = await send('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'smoke', version: '1.0.0' },
  });
  check('initialize', !!init.result, init.result?.serverInfo?.name);
  notify('notifications/initialized', {});

  // --- Registration ---
  const tools = await send('tools/list', {});
  const toolNames = (tools.result?.tools ?? []).map((t) => t.name).sort();
  const expectedTools = [
    'analyze_wellbeing_trend', 'crosscheck_activity',
    'generate_daily_digest', 'generate_org_digest', 'generate_weekly_summary',
    'get_employee_detail', 'open_eod_form', 'reset_demo_data',
    'resolve_manager_alert', 'search_reports', 'seed_demo_data',
    'send_manager_alert', 'set_employee_github', 'submit_eod_report',
  ];
  const missing = expectedTools.filter((t) => !toolNames.includes(t));
  check(`all ${expectedTools.length} tools registered`, missing.length === 0,
    missing.length ? `missing ${missing.join(',')}` : `${toolNames.length} total`);

  const prompts = await send('prompts/list', {});
  const promptNames = (prompts.result?.prompts ?? []).map((p) => p.name);
  const expectedPrompts = ['review_eod_submission', 'review_team_day', 'ask_about_team'];
  const missingPrompts = expectedPrompts.filter((p) => !promptNames.includes(p));
  check('prompts registered', missingPrompts.length === 0,
    missingPrompts.length ? `missing ${missingPrompts.join(',')}` : promptNames.join(', '));

  const resources = await send('resources/list', {});
  const resNames = (resources.result?.resources ?? []).map((r) => r.uri ?? r.uriTemplate);
  const templates = await send('resources/templates/list', {}).catch(() => ({ result: {} }));
  const tmplNames = (templates.result?.resourceTemplates ?? []).map((r) => r.uriTemplate);
  check('resources registered', resNames.length + tmplNames.length >= 4,
    [...resNames, ...tmplNames].join(', '));

  // --- Roster resource ---
  const roster = await send('resources/read', { uri: 'team://employees' });
  const rosterText = roster.result?.contents?.[0]?.text;
  const rosterData = rosterText ? JSON.parse(rosterText) : null;
  // The default roster is the realistic one: 12 people across two teams.
  check('team://employees returns the full roster', rosterData?.count === 12,
    `count=${rosterData?.count}`);
  check('roster spans two teams',
    new Set((rosterData?.employees ?? []).map((e) => e.teamId)).size === 2);

  const empId = rosterData?.employees?.[0]?.id;

  // --- Submit a report with a deliberately unsupported completion claim ---
  const submit = await send('tools/call', {
    name: 'submit_eod_report',
    arguments: {
      employeeId: empId,
      reportText: 'Finished the login module and wired up the session cache. Still blocked on the staging database credentials.',
      confidence: 4,
    },
  });
  const submitData = toolJson(submit);
  check('submit_eod_report stores report', submitData?.stored === true, `reportId=${submitData?.reportId}`);
  check('extraction found claims', (submitData?.claims?.length ?? 0) >= 1,
    `${submitData?.claims?.length} claims, ${submitData?.blockers?.length} blockers, sentiment=${submitData?.sentiment}`);
  check('blocker detected', (submitData?.blockers?.length ?? 0) >= 1,
    JSON.stringify(submitData?.blockers));

  // --- Report resource round-trip ---
  const today = submitData?.date;
  const reportRes = await send('resources/read', { uri: `eod://reports/${empId}/${today}` });
  const reportData = JSON.parse(reportRes.result?.contents?.[0]?.text ?? '{}');
  check('eod://reports/{id}/{date} resolves params', reportData?.submitted === true,
    `date=${reportData?.date}`);

  // --- The report resource is what the agent reads, now that the
  // extract tool is gone; it must carry the raw text and the pre-parse. ---
  const readBack = JSON.parse(
    (await send('resources/read', { uri: `eod://reports/${empId}/${today}` }))
      .result?.contents?.[0]?.text ?? '{}',
  );
  check('report resource carries the raw text for the agent to read',
    typeof readBack?.report?.rawText === 'string' && readBack.report.rawText.length > 0);
  check('report resource still carries the fallback pre-parse',
    Array.isArray(readBack?.report?.claims), `${readBack?.report?.claims?.length} claims`);

  // --- crosscheck without a token should fail with a helpful message ---
  const cross = await send('tools/call', { name: 'crosscheck_activity', arguments: { employeeId: empId } });
  const crossErr = cross.result?.content?.find((c) => c.type === 'text')?.text ?? '';
  const isConfigError = /GITHUB_TOKEN|GITHUB_ORG/.test(crossErr);
  const crossData = toolJson(cross);
  const gotRealData = crossData && typeof crossData === 'object' && 'matchScore' in crossData;
  check('crosscheck_activity behaves without token', isConfigError || gotRealData,
    gotRealData ? `ran live, matchScore=${crossData.matchScore}` : 'clear config error returned');

  // --- Agent decides to alert ---
  const alert = await send('tools/call', {
    name: 'send_manager_alert',
    arguments: {
      employeeId: empId,
      reason: 'Reported the login module as finished but no PR was opened, and the staging credentials blocker is on its second day.',
      severity: 'high',
    },
  });
  const alertData = toolJson(alert);
  check('send_manager_alert raises alert', alertData?.raised === true, `id=${alertData?.alertId}`);

  const alertsRes = await send('resources/read', { uri: 'alerts://team/team-platform' });
  const alertsData = JSON.parse(alertsRes.result?.contents?.[0]?.text ?? '{}');
  check('alerts://team/{teamId} lists it', alertsData?.openCount >= 1,
    `open=${alertsData?.openCount} high=${alertsData?.bySeverity?.high}`);

  // --- Digest ---
  const digest = await send('tools/call', { name: 'generate_daily_digest', arguments: { teamId: 'team-platform' } });
  const digestData = toolJson(digest);
  check('generate_daily_digest builds a row per team member',
    (digestData?.rows?.length ?? 0) === 6,
    `submitted=${digestData?.summary?.submitted} alerts=${digestData?.summary?.openAlerts}`);
  check('digest ranks alerted person first',
    digestData?.rows?.[0]?.employee?.id === empId,
    `first=${digestData?.rows?.[0]?.employee?.name} rank=${digestData?.rows?.[0]?.attentionRank}`);

  // --- Form widget tool ---
  const form = await send('tools/call', { name: 'open_eod_form', arguments: {} });
  const formData = toolJson(form);
  check('open_eod_form returns roster', (formData?.employees?.length ?? 0) === 12);

  // --- The agent-loop prompt ---
  const prompt = await send('prompts/get', {
    name: 'review_eod_submission',
    arguments: { employeeId: empId },
  });
  const promptContent = prompt.result?.messages?.[0]?.content;
  const contentStr =
    typeof promptContent === 'string' ? promptContent : (promptContent?.text ?? '');
  check('review_eod_submission returns loop instructions',
    /Perceive/.test(contentStr) && /crosscheck_activity/.test(contentStr) && /Decide/.test(contentStr),
    `${contentStr.length} chars`);

  // --- Resolve alert ---
  const resolved = await send('tools/call', {
    name: 'resolve_manager_alert',
    arguments: { alertId: alertData.alertId },
  });
  check('resolve_manager_alert clears it', toolJson(resolved)?.resolved === true);

  // --- Search over the single stored report ---
  const search = await send('tools/call', {
    name: 'search_reports',
    arguments: { query: 'login module' },
  });
  const searchData = toolJson(search);
  check('search_reports finds by keyword', (searchData?.resultCount ?? 0) >= 1,
    `${searchData?.resultCount} result(s)`);

  const searchNone = await send('tools/call', {
    name: 'search_reports',
    arguments: { query: 'zzzznonexistentterm' },
  });
  check('search_reports reports empty honestly', toolJson(searchNone)?.resultCount === 0);

  // --- Seeding history, which the trend signals depend on ---
  const seed = await send('tools/call', {
    name: 'seed_demo_data',
    arguments: { days: 4, includeToday: false, scale: 'demo' },
  });
  const seedData = toolJson(seed);
  check('demo scale narrows the roster to four', seedData?.headcount === 4,
    `headcount=${seedData?.headcount}`);
  check('seed_demo_data creates history', seedData?.reportsCreated === 16,
    `${seedData?.reportsCreated} reports, ${seedData?.dateRange?.from}..${seedData?.dateRange?.to}`);
  check('seed leaves today empty for a live demo', seedData?.todayLeftEmpty === true);

  // --- Trend analysis over the seeded history ---
  const trend = await send('tools/call', {
    name: 'analyze_wellbeing_trend',
    arguments: { teamId: 'team-platform', days: 5 },
  });
  const trendData = toolJson(trend);
  check('analyze_wellbeing_trend covers the team', trendData?.people?.length === 4);  // demo scale

  const aarav = trendData?.people?.find((p) => p.employee.id === 'emp-1');
  check('detects the recurring blocker', (aarav?.recurringBlockers?.[0]?.days ?? 0) >= 3,
    `${aarav?.recurringBlockers?.[0]?.days} days running`);
  check('detects declining confidence', aarav?.direction === 'declining',
    `delta=${aarav?.confidenceDelta}`);

  const divya = trendData?.people?.find((p) => p.employee.id === 'emp-2');
  check('healthy person not flagged', divya?.direction !== 'declining'
    && divya?.recurringBlockers?.length === 0, `direction=${divya?.direction}`);

  const karthik = trendData?.people?.find((p) => p.employee.id === 'emp-3');
  check('non-code worker shows no false signal', karthik?.direction === 'steady'
    && karthik?.recurringBlockers?.length === 0, `direction=${karthik?.direction}`);

  check('trend ranks the concerning person first',
    trendData?.people?.[0]?.employee?.id === 'emp-1',
    `first=${trendData?.people?.[0]?.employee?.name}`);

  // --- Manager Q&A prompt ---
  const askPrompt = await send('prompts/get', {
    name: 'ask_about_team',
    arguments: { question: 'What is blocking the team this week?' },
  });
  const askContent = askPrompt.result?.messages?.[0]?.content;
  const askStr = typeof askContent === 'string' ? askContent : (askContent?.text ?? '');
  check('ask_about_team embeds the question and tools',
    /blocking the team this week/.test(askStr) && /search_reports/.test(askStr),
    `${askStr.length} chars`);

  // --- Health checks, including the GitHub credential probe ---
  const health = await send('resources/read', { uri: 'health://checks' });
  const healthText = health.result?.contents?.[0]?.text ?? '{}';
  check('health resource includes a github check', /github/i.test(healthText));

  // --- Reset clears reports but leaves whatever roster is loaded ---
  // The demo-scale seed above narrowed it to four, and reset without resetRoster
  // must not silently put the other eight back.
  const reset = await send('tools/call', { name: 'reset_demo_data', arguments: {} });
  const resetData = toolJson(reset);
  check('reset_demo_data keeps the loaded roster', resetData?.reset === true
    && resetData?.employeesKept === 4, `kept=${resetData?.employeesKept}`);

  const restored = toolJson(await send('tools/call', {
    name: 'reset_demo_data', arguments: { resetRoster: true },
  }));
  check('resetRoster restores the full default roster', restored?.employeesKept === 12,
    `kept=${restored?.employeesKept}`);

  const afterReset = await send('tools/call', {
    name: 'search_reports', arguments: {},
  });
  check('reset clears all reports', toolJson(afterReset)?.resultCount === 0);

  // --- Org digest spans every team ---
  const orgSeed = toolJson(await send('tools/call', {
    name: 'seed_demo_data', arguments: { days: 3, includeToday: true },
  }));
  const org = toolJson(await send('tools/call', {
    name: 'generate_org_digest', arguments: {},
  }));
  check('org digest covers every team', org?.teams?.length === 2,
    `${org?.teams?.length} team(s), headcount ${org?.summary?.headcount}`);
  check('org totals match the roster', org?.summary?.headcount === orgSeed?.headcount,
    `${org?.summary?.headcount} vs ${orgSeed?.headcount}`);
  check('org digest lists only the concerning people',
    Array.isArray(org?.needsAttention)
      && org.needsAttention.every((r) => r.attentionRank >= 40),
    `${org?.needsAttention?.length} flagged of ${org?.summary?.headcount}`);
  check('every flagged person carries their team', 
    (org?.needsAttention ?? []).every((r) => typeof r.teamId === 'string'));
  check('team cards name a top concern where one exists',
    (org?.teams ?? []).every((t) => t.summary.needsAttention === 0 || t.topConcern));

  const oneTeam = toolJson(await send('tools/call', {
    name: 'generate_org_digest', arguments: { teams: ['team-mobile'] },
  }));
  check('org digest can be filtered to one team', oneTeam?.teams?.length === 1
    && oneTeam?.teams?.[0]?.teamId === 'team-mobile');

  // Team and org digests must never disagree about the same team.
  const teamOnly = toolJson(await send('tools/call', {
    name: 'generate_daily_digest', arguments: { teamId: 'team-mobile' },
  }));
  check('org and team digests agree',
    oneTeam?.teams?.[0]?.summary?.needsAttention === teamOnly?.summary?.needsAttention
      && oneTeam?.teams?.[0]?.summary?.headcount === teamOnly?.summary?.headcount);

} catch (err) {
  check('harness completed', false, err.message);
} finally {
  child.kill();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log('\n--- server stderr (tail) ---');
    console.log(stderrLines.join('').split('\n').slice(-40).join('\n'));
  }
  process.exit(failed.length ? 1 : 0);
}
