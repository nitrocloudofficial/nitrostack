// Run after `npm run build`. Live checks resolve the registry's current `latest` tag.
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { setTimeout as sleep } from 'node:timers/promises';

const root = fileURLToPath(new URL('../', import.meta.url));
const bench = new URL('../bench/', import.meta.url);
const incidents = ['axios', 'keyv', 'chalk', 'nx', 'tinycolor'];
const timeoutMs = 90_000;
let replaysOnly = false;
let limit = Infinity;
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg === '--replays-only') replaysOnly = true;
  else if (arg === '--limit') {
    const value = process.argv[++i];
    if (!value || !/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) {
      throw new Error('--limit requires a non-negative integer');
    }
    limit = Number(value);
  } else throw new Error(`Unknown argument: ${arg}`);
}

const packages = replaysOnly ? [] : (await readFile(new URL('packages.txt', bench), 'utf8'))
  .split(/\r?\n/)
  .map(line => line.split('#')[0].trim())
  .filter(Boolean)
  .slice(0, limit);

const server = spawn(process.execPath, ['dist/index.js'], {
  cwd: root,
  env: { ...process.env, NODE_ENV: 'production', MCP_TRANSPORT_TYPE: 'stdio' },
  stdio: ['pipe', 'pipe', 'inherit'],
});
const lines = createInterface({ input: server.stdout });
const pending = new Map();
let nextId = 1;
let serverError;

function failPending(error) {
  serverError = error;
  for (const request of pending.values()) {
    clearTimeout(request.timer);
    request.reject(error);
  }
  pending.clear();
}
server.on('error', failPending);
server.stdin.on('error', failPending);
server.on('exit', (code, signal) => {
  failPending(new Error(`Server exited (code ${code}, signal ${signal})`));
});
lines.on('line', line => {
  let message;
  try { message = JSON.parse(line); } catch { return; }
  if (!message || typeof message !== 'object') return;
  const request = pending.get(message.id);
  if (!request) return;
  clearTimeout(request.timer);
  pending.delete(message.id);
  if (message.error) request.reject(new Error(JSON.stringify(message.error)));
  else request.resolve(message.result);
});

function send(message) {
  server.stdin.write(`${JSON.stringify(message)}\n`);
}

function rpc(method, params) {
  if (serverError) return Promise.reject(serverError);
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`${method} timed out after ${timeoutMs} ms`));
    }, timeoutMs);
    pending.set(id, { resolve, reject, timer });
    send({ jsonrpc: '2.0', id, method, params });
  });
}

async function tool(name, args) {
  const result = await rpc('tools/call', { name, arguments: args });
  const text = result?.content?.[0]?.text;
  if (typeof text !== 'string') throw new Error('Missing result.content[0].text');
  if (text.includes('Too many')) throw new Error(text);
  if (result.isError) throw new Error(text);
  const report = JSON.parse(text);
  if (!report || !['ALLOW', 'REVIEW', 'BLOCK'].includes(report.verdict)
      || typeof report.package !== 'string' || typeof report.version !== 'string'
      || !Number.isFinite(report.score) || !Array.isArray(report.findings)) {
    throw new Error(`Invalid report: ${text}`);
  }
  return report;
}

async function measure(kind, id, name, args) {
  const timestamp = new Date().toISOString();
  const start = performance.now();
  const row = { kind, id, package: kind === 'popular' ? id : null,
    version: null, verdict: 'ERROR', score: null, findings: [], durationMs: 0, timestamp };
  try {
    let report;
    try {
      report = await tool(name, args);
    } catch (error) {
      if (!String(error.message).includes('Too many')) throw error;
      console.error(`${id}: rate limited; waiting 65 seconds before one retry`);
      await sleep(65_000);
      report = await tool(name, args);
    }
    Object.assign(row, { package: report.package, version: report.version,
      verdict: report.verdict, score: report.score,
      findings: report.findings.slice(0, 3).map(finding => finding.title) });
  } catch (error) {
    row.error = error.message;
  }
  row.durationMs = Math.round(performance.now() - start);
  console.error(`${kind} ${id}: ${row.verdict} (${row.durationMs} ms)`);
  return row;
}

const rows = [];
try {
  await rpc('initialize', {
    protocolVersion: '2025-06-18', capabilities: {},
    clientInfo: { name: 'benchmark', version: '1' },
  });
  send({ jsonrpc: '2.0', method: 'notifications/initialized' });
  const jobs = [
    ...incidents.map(id => ['replay', id, 'bouncer_replay_incident', { incident: id }]),
    ...packages.map(name => ['popular', name, 'bouncer_check_package', { name, version: 'latest' }]),
  ];
  for (const job of jobs) {
    if (rows.length) await sleep(300);
    rows.push(await measure(...job));
  }
} catch (error) {
  // An initialization failure means none of the required replays passed.
  for (const id of incidents) rows.push({ kind: 'replay', id, package: null,
    version: null, verdict: 'ERROR', score: null, findings: [], durationMs: 0,
    timestamp: new Date().toISOString(), error: error.message });
} finally {
  lines.close();
  server.stdin.end();
  // SIGKILL: on Linux the server shuts down gracefully on SIGTERM and may keep running.
  server.kill('SIGKILL');
}

const replays = rows.filter(row => row.kind === 'replay');
const popular = rows.filter(row => row.kind === 'popular');
const blocked = replays.filter(row => row.verdict === 'BLOCK').length;
const count = verdict => popular.filter(row => row.verdict === verdict).length;
const errors = count('ERROR');
const summary = `${blocked}/5 replayed hijacks blocked; ${popular.length} popular releases: `
  + `${count('ALLOW')} ALLOW, ${count('REVIEW')} REVIEW, ${count('BLOCK')} BLOCK`
  + (errors ? `; ${errors} ERROR` : '');
const cell = value => String(value ?? '—').replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ');
const findings = row => cell(row.error ?? row.findings.join('; '));
const table = data => [
  '| ID / package | Version | Verdict | Score | Top 3 findings / error | Duration (ms) |',
  '|---|---|---|---:|---|---:|',
  ...data.map(row => `| ${cell(row.id)} | ${cell(row.version)} | ${row.verdict} | ${cell(row.score)} | ${findings(row)} | ${row.durationMs} |`),
].join('\n');
const markdown = [
  '# Benchmark results', '', summary, '',
  `Generated: ${new Date().toISOString()}. Popular checks request the current npm latest tag; resolved versions and per-call timestamps are in results.json.`, '',
  'Replays use labelled reconstructions. Popular packages are a presumed-healthy sample, not independently verified ground truth; REVIEW and BLOCK counts are candidate false positives. Errors are excluded from verdict counts. Durations include any rate-limit wait and retry.', '',
  '## Replayed hijacks', '', table(replays), '',
  '## Non-ALLOW popular releases', '',
  popular.some(row => row.verdict !== 'ALLOW')
    ? table(popular.filter(row => row.verdict !== 'ALLOW')) : 'None.', '',
  '## ALLOW popular releases', '',
  popular.filter(row => row.verdict === 'ALLOW')
    .map(row => `- ${row.package}@${row.version}`).join('\n') || 'None.', '',
];
await mkdir(bench, { recursive: true });
await writeFile(new URL('results.json', bench), `${JSON.stringify(rows, null, 2)}\n`);
await writeFile(new URL('RESULTS.md', bench), markdown.join('\n'));
console.log(summary);
// Exit explicitly: open handles to the (killed) child must not keep CI waiting.
process.exit(blocked === incidents.length ? 0 : 1);
