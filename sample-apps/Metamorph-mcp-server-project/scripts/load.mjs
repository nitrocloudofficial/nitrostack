#!/usr/bin/env node
// Load and resilience run (docs/EXECUTION_PLAN.md section K, layer 6). No new dependency: Node http/fetch only.
//   npm run build && npm run load            (about 3 to 6 minutes)
//   node scripts/load.mjs --seconds 10        shorter phases; --quick runs only the mix; --phases big,slow runs just those
// What it does, all offline (scripts/conformance-preload.mjs stubs outbound fetch inside the server process):
//   1. starts the BUILT server over HTTP on a free port (never 3001 or 3002) with METAMORPH_AUTH=off
//   2. mix: concurrent tools/call of assess_project (local fixture tarball), check_watch (stubbed feeds) and analyze_advisory
//      at concurrency 1, 5 and 20 for a fixed time each; records requests/s, p50/p95/p99, errors, RSS and heap
//   3. big input: a fixture near the extraction limits (4,900 files, about 78 MB of tar against the 80 MiB cap)
//   4. slow upstream: OSV held for 20 s, and the repository download held for 45 s (the fetch timeout is 30 s)
// Asserts: peak RSS under 400 MiB, no request over 100 s, no errors in the mix, and that every error names a next step.
// Exit code 1 when an assertion fails. The server is stopped by its exact PID; the script checks that ports 3001 and 3002
// are not held by it afterwards.
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import net from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SERVER = join(ROOT, 'dist', 'index.js');
const PRELOAD = pathToFileURL(join(ROOT, 'scripts', 'conformance-preload.mjs')).href;
const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? dflt : process.argv[i + 1];
};
const QUICK = process.argv.includes('--quick');
const PHASES = new Set(QUICK ? ['mix'] : String(arg('phases', 'mix,big,slow')).split(','));
const SECONDS = Number(arg('seconds', 15));
const RSS_LIMIT_MIB = 400;
const REQUEST_LIMIT_MS = 100_000;
const CLIENT_TIMEOUT_MS = 110_000;
const NEXT_STEP = /\b(use|call|check|provide|pass|send|ask|run|try|add|give|set|retry|see|choose|pick|paste|start|enter|supply)\b/i;

// ---------- fixtures ----------
function tar(files) {
  const parts = [];
  for (const [name, data] of files) {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const h = Buffer.alloc(512);
    h.write(`repo-main/${name}`, 0);
    h.write('0000644\0', 100);
    h.write('0000000\0', 108);
    h.write('0000000\0', 116);
    h.write(buf.length.toString(8).padStart(11, '0') + '\0', 124);
    h.write('00000000000\0', 136);
    h.write('        ', 148);
    h.write('0', 156);
    h.write('ustar\0', 257);
    h.write('00', 263);
    let sum = 0;
    for (const b of h) sum += b;
    h.write(sum.toString(8).padStart(6, '0') + '\0 ', 148);
    parts.push(h, buf, Buffer.alloc((512 - (buf.length % 512)) % 512));
  }
  parts.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(parts));
}

const SMALL = Object.entries({
  'composer.json': JSON.stringify({ name: 'legacy/php-shop', require: { php: '>=7.2', 'guzzlehttp/guzzle': '6.5.0', 'symfony/http-kernel': '4.4.0' } }),
  'composer.lock': JSON.stringify({ packages: [{ name: 'guzzlehttp/guzzle', version: '6.5.0' }, { name: 'symfony/http-kernel', version: 'v4.4.0' }] }),
  'package.json': JSON.stringify({ name: 'legacy-node', engines: { node: '>=10' }, dependencies: { express: '^4.16.0', lodash: '4.17.15', request: '^2.88.0' } }),
  'package-lock.json': JSON.stringify({ lockfileVersion: 3, packages: { '': {}, 'node_modules/express': { version: '4.16.0' }, 'node_modules/lodash': { version: '4.17.15' }, 'node_modules/request': { version: '2.88.0' } } }),
  '.nvmrc': '10\n',
  '.env': 'PORT=3000\n',
  'includes/db.php': "<?php\nerror_reporting(0);\n$db = mysql_connect('localhost', 'shop', 'x');\n",
  'index.php': "<?php\n$r = mysql_query(\"SELECT * FROM products WHERE id = \" . $_GET['id']);\n",
  'login.php': "<?php\n$pass = md5($_POST['password']);\n",
  'page.php': "<?php\ninclude($_GET['page'] . '.php');\n"
});

// Near the limits: 4,900 files (limit 5,000) and about 78 MB of tar (the unzip cap is 80 MiB = 83.9 MB), mostly compressible filler.
function bigFixture() {
  const files = [...SMALL];
  const filler = (i) => Buffer.from(`// file ${i}\n` + `const value${i} = "lorem ipsum dolor sit amet, consectetur adipiscing elit ${i}";\n`.repeat(180)); // about 15 KB
  const total = 4900 - files.length;
  for (let i = 0; i < total; i++) {
    const dir = `src/d${i % 40}/s${i % 7}`;
    const ext = i % 10 === 0 ? 'php' : i % 3 === 0 ? 'js' : 'dat';
    files.push([`${dir}/f${i}.${ext}`, ext === 'php' ? Buffer.concat([Buffer.from('<?php\n'), filler(i)]) : filler(i)]);
  }
  return files;
}

// ---------- server control ----------
async function freePort() {
  for (let tries = 0; tries < 20; tries++) {
    const port = await new Promise((res, rej) => {
      const s = net.createServer();
      s.once('error', rej);
      s.listen(0, '127.0.0.1', () => {
        const p = s.address().port;
        s.close(() => res(p));
      });
    });
    if (port !== 3001 && port !== 3002 && port !== 3000) return port;
  }
  throw new Error('could not find a free port');
}

const children = new Set();
async function stop(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const pid = child.pid;
  const exited = new Promise((r) => child.once('exit', r));
  try {
    process.kill(pid, 'SIGTERM'); // exact PID, never a pattern
  } catch {
    /* already gone */
  }
  const timer = setTimeout(() => {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      /* already gone */
    }
  }, 5000);
  await exited;
  clearTimeout(timer);
  children.delete(child);
}
process.on('SIGINT', async () => {
  await Promise.all([...children].map(stop));
  process.exit(130);
});

async function startServer({ tarball, env = {}, memfile }) {
  const port = await freePort();
  const child = spawn(process.execPath, [`--import=${PRELOAD}`, SERVER], {
    cwd: ROOT,
    stdio: ['ignore', 'ignore', 'ignore'],
    env: {
      ...process.env,
      NODE_ENV: 'production',
      MCP_TRANSPORT_TYPE: 'http',
      PORT: String(port),
      METAMORPH_AUTH: 'off',
      METAMORPH_CONF_TARBALL: tarball,
      METAMORPH_CONF_MEMFILE: memfile,
      METAMORPH_CONF_FEEDS: '1',
      METAMORPH_SANDBOX_DIR: join(tmpdir(), `metamorph-load-${process.pid}`),
      ...env
    }
  });
  children.add(child);
  const url = `http://localhost:${port}/mcp`;
  const t0 = Date.now();
  for (;;) {
    if (child.exitCode !== null) throw new Error(`server exited early with code ${child.exitCode}`);
    try {
      const r = await rpc(url, 'tools/list', {}, 5000);
      if (r.status === 200) break;
    } catch {
      /* not listening yet */
    }
    if (Date.now() - t0 > 90_000) {
      await stop(child);
      throw new Error('server did not start within 90 s');
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return { child, port, url, pid: child.pid, startMs: Date.now() - t0 };
}

const rssKiB = (pid) => {
  try {
    const t = readFileSync(`/proc/${pid}/status`, 'utf8');
    return { rss: Number(t.match(/VmRSS:\s+(\d+)/)?.[1] ?? 0), hwm: Number(t.match(/VmHWM:\s+(\d+)/)?.[1] ?? 0) };
  } catch {
    return { rss: 0, hwm: 0 };
  }
};

// ---------- client ----------
let nextId = 1;
const H = { 'content-type': 'application/json', accept: 'application/json, text/event-stream' };
async function rpc(url, method, params, timeoutMs = CLIENT_TIMEOUT_MS) {
  const res = await fetch(url, { method: 'POST', headers: H, body: JSON.stringify({ jsonrpc: '2.0', id: nextId++, method, params }), signal: AbortSignal.timeout(timeoutMs) });
  const text = await res.text();
  const data = text.split('\n').find((l) => l.startsWith('data: '));
  let body;
  try {
    body = JSON.parse(data ? data.slice(6) : text);
  } catch {
    body = undefined;
  }
  return { status: res.status, body };
}

const REPO = 'https://github.com/example/legacy-shop';
const CALLS = {
  assess_project: () => ({ name: 'assess_project', arguments: { repo_url: REPO } }),
  check_watch: () => ({ name: 'check_watch', arguments: { cve_ids: ['CVE-2021-44228'], products: ['php@8.1', 'nodejs'] } }),
  analyze_advisory: () => ({ name: 'analyze_advisory', arguments: { packages: ['npm:lodash@4.17.15', 'Packagist:guzzlehttp/guzzle@6.5.0'], ids: ['GHSA-aaaa-bbbb-cccc'] } })
};
const MIX = ['assess_project', 'assess_project', 'assess_project', 'assess_project', 'check_watch', 'check_watch', 'check_watch', 'analyze_advisory', 'analyze_advisory', 'analyze_advisory'];

async function call(url, make) {
  const t0 = performance.now();
  try {
    const r = await rpc(url, 'tools/call', make());
    const ms = performance.now() - t0;
    const result = r.body?.result;
    const text = (result?.content ?? []).map((c) => c.text ?? '').join(' ');
    if (r.status !== 200 || !result) return { ms, ok: false, error: `HTTP ${r.status} ${JSON.stringify(r.body?.error ?? '').slice(0, 160)}` };
    if (result.isError) return { ms, ok: false, error: text.slice(0, 240) };
    return { ms, ok: true, bytes: text.length };
  } catch (e) {
    return { ms: performance.now() - t0, ok: false, error: `client: ${e.name}: ${e.message}`.slice(0, 160) };
  }
}

const pct = (sorted, p) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)] : 0);

async function phase({ label, srv, concurrency, seconds, picks, perWorkerCalls }) {
  const lat = [];
  const errors = [];
  const t0 = Date.now();
  const stopAt = seconds ? t0 + seconds * 1000 : Infinity;
  let peak = { rss: 0, hwm: 0 };
  const sampler = setInterval(() => {
    const m = rssKiB(srv.pid);
    peak = { rss: Math.max(peak.rss, m.rss), hwm: Math.max(peak.hwm, m.hwm) };
  }, 200);
  let seq = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async (_, w) => {
      for (let n = 0; Date.now() < stopAt && (!perWorkerCalls || n < perWorkerCalls); n++) {
        const name = picks[(seq++ + w) % picks.length];
        const r = await call(srv.url, CALLS[name]);
        lat.push({ ...r, name });
        if (!r.ok) errors.push({ name, error: r.error, ms: r.ms });
      }
    })
  );
  clearInterval(sampler);
  const wall = (Date.now() - t0) / 1000;
  const sorted = lat.map((l) => l.ms).sort((a, b) => a - b);
  // heap from the in-process sampler, restricted to this phase
  let heapMax = 0;
  let rssMax = 0;
  try {
    for (const line of (await readFile(srv.memfile, 'utf8')).split('\n')) {
      if (!line) continue;
      const m = JSON.parse(line);
      if (m.t >= t0 && m.t <= Date.now() + 500) {
        heapMax = Math.max(heapMax, m.heapUsed);
        rssMax = Math.max(rssMax, m.rss);
      }
    }
  } catch {
    /* no memfile yet */
  }
  const byTool = {};
  for (const l of lat) (byTool[l.name] ??= []).push(l.ms);
  return {
    label,
    concurrency,
    requests: lat.length,
    errors: errors.length,
    errorSamples: [...new Set(errors.map((e) => e.error))].slice(0, 3),
    rps: +(lat.length / wall).toFixed(2),
    p50: Math.round(pct(sorted, 50)),
    p95: Math.round(pct(sorted, 95)),
    p99: Math.round(pct(sorted, 99)),
    maxMs: Math.round(sorted[sorted.length - 1] ?? 0),
    rssPeakMiB: Math.round(Math.max(peak.hwm, peak.rss, rssMax / 1024) / 1024), // VmHWM is the lifetime peak of the server process so far
    rssSampledMiB: Math.round(peak.rss / 1024),
    heapPeakMiB: Math.round(heapMax / 1024 / 1024),
    perToolP50: Object.fromEntries(Object.entries(byTool).map(([k, v]) => [k, Math.round(pct([...v].sort((a, b) => a - b), 50))])),
    wallSeconds: +wall.toFixed(1)
  };
}

// ---------- main ----------
const checks = [];
const check = (id, ok, detail) => checks.push({ id, ok, detail });

async function main() {
  if (!existsSync(SERVER)) {
    console.error('dist/index.js not found. Run `npm run build` first.');
    process.exit(2);
  }
  const work = await mkdtemp(join(tmpdir(), 'metamorph-load-'));
  const results = [];
  try {
    const small = join(work, 'small.tar.gz');
    await writeFile(small, tar(SMALL));

    let srv;
    // ----- phase 1: the mix at three concurrency levels -----
    if (PHASES.has('mix')) {
    srv = await startServer({ tarball: small, memfile: join(work, 'mem-mix.jsonl') });
    srv.memfile = join(work, 'mem-mix.jsonl');
    console.log(`mix server pid ${srv.pid} on port ${srv.port}, started in ${srv.startMs} ms`);
    for (const concurrency of [1, 5, 20]) {
      const r = await phase({ label: 'mix', srv, concurrency, seconds: SECONDS, picks: MIX });
      results.push(r);
      console.log(JSON.stringify(r));
      check(`mix c=${concurrency}: no errors`, r.errors === 0, r.errors ? r.errorSamples.join(' | ') : `${r.requests} requests`);
      check(`mix c=${concurrency}: slowest request under ${REQUEST_LIMIT_MS / 1000} s`, r.maxMs < REQUEST_LIMIT_MS, `${r.maxMs} ms`);
    }
    const mixPeak = Math.max(...results.map((r) => r.rssPeakMiB));
    check(`mix: peak RSS under ${RSS_LIMIT_MIB} MiB`, mixPeak < RSS_LIMIT_MIB, `${mixPeak} MiB`);
    // memory must come back down once the load stops (a leak shows as a floor that keeps rising)
    await new Promise((r) => setTimeout(r, 3000));
    const idle = Math.round(rssKiB(srv.pid).rss / 1024);
    check('mix: RSS after the load is below the peak plus 50 MiB (no runaway growth)', idle < mixPeak + 50, `${idle} MiB idle after load`);
    await stop(srv.child);
    }

    if (PHASES.has('big')) {
      // ----- phase 2: big input near the extraction limits -----
      const big = join(work, 'big.tar.gz');
      const bigBuf = tar(bigFixture());
      await writeFile(big, bigBuf);
      console.log(`big fixture: ${(bigBuf.length / 1024 / 1024).toFixed(1)} MiB compressed, ${(gunzipSync(bigBuf).length / 1024 / 1024).toFixed(1)} MiB of tar (cap 80 MiB), 4,900 files`);
      srv = await startServer({ tarball: big, memfile: join(work, 'mem-big.jsonl') });
      srv.memfile = join(work, 'mem-big.jsonl');
      const bigRuns = [];
      for (const [concurrency, calls] of [[1, 2], [2, 1]]) {
        const r = await phase({ label: 'big input', srv, concurrency, picks: ['assess_project'], perWorkerCalls: calls });
        bigRuns.push(r);
        results.push(r);
        console.log(JSON.stringify(r));
        check(`big input c=${concurrency}: slowest request under ${REQUEST_LIMIT_MS / 1000} s`, r.maxMs < REQUEST_LIMIT_MS, `${r.maxMs} ms`);
        check(`big input c=${concurrency}: every failure names a next step`, r.errorSamples.every((e) => NEXT_STEP.test(e)), r.errors ? r.errorSamples.join(' | ') : 'no failures');
      }
      const bigPeak = Math.max(...bigRuns.map((r) => r.rssPeakMiB));
      check(`big input: peak RSS under ${RSS_LIMIT_MIB} MiB`, bigPeak < RSS_LIMIT_MIB, `${bigPeak} MiB`);
      await stop(srv.child);
    }

    if (PHASES.has('slow')) {
      // ----- phase 3: slow upstream -----
      srv = await startServer({ tarball: small, memfile: join(work, 'mem-slow.jsonl'), env: { METAMORPH_CONF_DELAY_MS: '20000', METAMORPH_CONF_DELAY_HOSTS: 'api.osv.dev' } });
      srv.memfile = join(work, 'mem-slow.jsonl');
      for (const name of ['analyze_advisory', 'assess_project']) {
        const r = await phase({ label: `slow OSV (20 s) ${name}`, srv, concurrency: 1, picks: [name], perWorkerCalls: 1 });
        results.push(r);
        console.log(JSON.stringify(r));
        check(`slow OSV ${name}: answers within ${REQUEST_LIMIT_MS / 1000} s`, r.maxMs < REQUEST_LIMIT_MS, `${r.maxMs} ms, ${r.errors ? 'error: ' + r.errorSamples.join(' | ') : 'ok'}`);
        check(`slow OSV ${name}: an error, if any, names a next step`, r.errorSamples.every((e) => NEXT_STEP.test(e)), r.errors ? r.errorSamples.join(' | ') : 'no error (degraded result)');
      }
      await stop(srv.child);

      srv = await startServer({ tarball: small, memfile: join(work, 'mem-slow2.jsonl'), env: { METAMORPH_CONF_DELAY_MS: '45000', METAMORPH_CONF_DELAY_HOSTS: 'codeload.github.com' } });
      srv.memfile = join(work, 'mem-slow2.jsonl');
      {
        const r = await phase({ label: 'slow download (45 s) assess_project', srv, concurrency: 1, picks: ['assess_project'], perWorkerCalls: 1 });
        results.push(r);
        console.log(JSON.stringify(r));
        check('slow download: fails (the fetch timeout is 30 s) and within 100 s', r.errors === 1 && r.maxMs < REQUEST_LIMIT_MS && r.maxMs > 25_000, `${r.maxMs} ms, ${r.errorSamples.join(' | ')}`);
        check('slow download: the error names a next step', r.errorSamples.length > 0 && r.errorSamples.every((e) => NEXT_STEP.test(e)), r.errorSamples.join(' | '));
        const after = await call(srv.url, CALLS.check_watch);
        check('slow download: the server still answers afterwards', after.ok, after.ok ? `${Math.round(after.ms)} ms` : after.error);
      }
      await stop(srv.child);
    }
  } finally {
    await Promise.all([...children].map(stop));
    await rm(work, { recursive: true, force: true });
    await rm(join(tmpdir(), `metamorph-load-${process.pid}`), { recursive: true, force: true });
  }

  // ports 3001 and 3002 must not be held by anything we started
  for (const port of [3001, 3002]) {
    const held = await new Promise((res) => {
      const s = net.connect({ port, host: '127.0.0.1' });
      s.once('connect', () => (s.destroy(), res(true)));
      s.once('error', () => res(false));
    });
    check(`port ${port} is free`, !held, held ? 'something is listening (not started by this script)' : 'free');
  }
  check('no server process of ours is left', [...children].every((c) => c.exitCode !== null || c.signalCode !== null), 'all stopped by PID');

  console.log('\n=== load results ===');
  console.log('phase | c | requests | errors | req/s | p50 ms | p95 ms | p99 ms | max ms | RSS peak MiB | heap peak MiB');
  for (const r of results) console.log(`${r.label} | ${r.concurrency} | ${r.requests} | ${r.errors} | ${r.rps} | ${r.p50} | ${r.p95} | ${r.p99} | ${r.maxMs} | ${r.rssPeakMiB} | ${r.heapPeakMiB}`);
  console.log('');
  for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.id}: ${c.detail}`);
  const failed = checks.filter((c) => !c.ok).length;
  console.log(`\n${checks.length - failed} pass, ${failed} fail`);
  process.exit(failed ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await Promise.all([...children].map(stop));
  process.exit(2);
});
