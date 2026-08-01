/**
 * Proves the server survives an unwritable data directory.
 *
 * The store is a module-level singleton built at import time, so a throwing
 * write would take the process down before it served a single request. A
 * deployed container may well have a read-only or otherwise unwritable working
 * directory, and losing durability is a much better outcome than refusing to
 * boot — this test is what keeps that true.
 *
 * The failure is simulated by planting a regular FILE where `data/` should be,
 * so mkdir and every write beneath it fail the way a read-only mount would.
 *
 * Run `npm run build` first, then `npm run test:readonly`.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'groundtruth-readonly-'));

// Widget HTML and the manifest are resolved relative to the working directory,
// so the sandbox needs them; node_modules resolves from the script's own path,
// so there is no need to copy that.
fs.cpSync(path.join(PROJECT, 'src/widgets/out'), path.join(WORK, 'src/widgets/out'), {
  recursive: true,
});
fs.copyFileSync(
  path.join(PROJECT, 'src/widgets/widget-manifest.json'),
  path.join(WORK, 'src/widgets/widget-manifest.json'),
);
fs.writeFileSync(path.join(WORK, 'data'), 'a file, not a directory');

const child = spawn('node', [path.join(PROJECT, 'dist/index.js')], {
  cwd: WORK,
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
    let msg;
    try { msg = JSON.parse(line); } catch { continue; }
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id).resolve(msg);
      pending.delete(msg.id);
    }
  }
});
const stderr = [];
child.stderr.on('data', (d) => stderr.push(d.toString()));

function send(method, params) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    setTimeout(() => {
      if (pending.has(id)) { pending.delete(id); reject(new Error(`timeout: ${method}`)); }
    }, 25000);
  });
}
function toolJson(res) {
  const text = res?.result?.content?.find((c) => c.type === 'text')?.text;
  try { return JSON.parse(text); } catch { return text; }
}

const results = [];
const check = (name, ok, detail = '') => {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

try {
  const init = await send('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'readonly', version: '1.0.0' },
  });
  check('server boots despite unwritable data dir', !!init.result, init.result?.serverInfo?.name);
  child.stdin.write(
    JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} }) + '\n',
  );

  const submitted = toolJson(
    await send('tools/call', {
      name: 'submit_eod_report',
      arguments: {
        employeeId: 'emp-1',
        reportText: 'Finished the login module. Blocked on staging credentials.',
        confidence: 3,
      },
    }),
  );
  check('submit_eod_report still works in memory', submitted?.stored === true,
    `reportId=${submitted?.reportId}`);

  const digest = toolJson(
    await send('tools/call', {
      name: 'generate_daily_digest',
      arguments: { teamId: 'team-platform' },
    }),
  );
  check('digest reads the in-memory report back', digest?.summary?.submitted === 1);

  const health = await send('resources/read', { uri: 'health://checks' });
  const healthText = health.result?.contents?.[0]?.text ?? '';
  check('storage health reports degraded, not up',
    /degraded/.test(healthText) && /memory only/i.test(healthText));

  // stdout is the JSON-RPC channel; a stray log there corrupts the protocol.
  check('warning went to stderr, not stdout',
    stderr.join('').includes('[store] Could not write'));
  check('stdout carried nothing but complete JSON-RPC frames', buf.trim() === '');
} catch (err) {
  check('harness completed', false, err.message);
} finally {
  child.kill();
  try { fs.rmSync(WORK, { recursive: true, force: true }); } catch { /* temp dir */ }
  const failed = results.filter((r) => !r).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  if (failed) {
    console.log('\n--- server stderr (tail) ---');
    console.log(stderr.join('').split('\n').slice(-20).join('\n'));
  }
  process.exit(failed ? 1 : 0);
}
