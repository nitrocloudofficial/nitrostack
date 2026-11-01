#!/usr/bin/env node
// Benchmark for extractTarGz (src/common/safe-archive.ts). No dependencies. Needs `npm run build` (imports dist/).
//   node scripts/bench-extract.mjs                       both cases, one extraction each, then 2 queued and 2 concurrent
//   node scripts/bench-extract.mjs --module path.js      time another build of the module (for before/after)
//   node scripts/bench-extract.mjs --case mixed          only one case: mixed | nodemodules
//   node scripts/bench-extract.mjs --repeat 3            repeat each measurement, report the median
//   node scripts/bench-extract.mjs --real                ALSO real archives (network): the 5 largest pinned repos of eval/corpus.json plus
//                                                        --owner-repos owner/name,... (public repos), fetched with fetchArchive
//                                                        (codeload.github.com only, 25 MiB cap); over-limit ones are listed as skipped.
//   node scripts/bench-extract.mjs --real-only           only the real archives
// Fixtures are generated in a fresh temp dir (tar.gz bytes only; nothing from them is ever executed) and removed afterwards.
// Each measurement runs in its own child process so VmHWM (peak RSS) is per measurement, not a lifetime peak of the bench.
// Columns (ms unless noted): wall, cpu (user+sys of the whole process, threadpool included), per-phase wall, fs call counts, peak RSS MiB.
//   gunzip  = zlib.gunzip of the same bytes, measured alone first (reference for the decompression cost)
//   contain = wall time in realpath + lstat made by the module (the containment checks of resolveInside)
//   mkdir, write = wall time in those fs calls (with parallel writes the sum can exceed wall)
//   parse   = extract wall - gunzip - fs time; the remainder is tar header parsing and JS bookkeeping
// Wall time depends on machine load: the header prints the load average; compare cpu and call counts across runs, not wall alone.
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile, readdir } from 'node:fs/promises';
import { readFileSync, promises as fsp } from 'node:fs';
import { tmpdir, loadavg, cpus } from 'node:os';
import { join, resolve } from 'node:path';
import { gunzip as gunzipCb, gzipSync } from 'node:zlib';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? dflt : process.argv[i + 1];
};
const MODULE = resolve(arg('module', join(ROOT, 'dist', 'common', 'safe-archive.js')));
const ONLY = arg('case', '');
const REPEAT = Number(arg('repeat', 1));
const REAL = process.argv.includes('--real') || process.argv.includes('--real-only');
const REAL_ONLY = process.argv.includes('--real-only');
const OWNER_REPOS = String(arg('owner-repos', 'dhilipa01/Trial_HEV-EMS,dhilipa01/Privara,dhilipa01/Projects-Coursework,dhilipa01/BBB-Vercel,dhilipa01/dana-hackathon')).split(',').filter(Boolean);
const MIB = 1024 * 1024;

// ---------- fixtures ----------
function header(name, size, type) {
  const h = Buffer.alloc(512);
  Buffer.from(name).copy(h, 0, 0, 100);
  h.write('0000644\0', 100);
  h.write('0000000\0', 108);
  h.write('0000000\0', 116);
  h.write(size.toString(8).padStart(11, '0') + '\0', 124);
  h.write('00000000000\0', 136);
  h.write('        ', 148);
  h.write(type, 156);
  h.write('ustar\0', 257);
  h.write('00', 263);
  let sum = 0;
  for (const b of h) sum += b;
  h.write(sum.toString(8).padStart(6, '0') + '\0 ', 148);
  return h;
}
function buildTar(entries) {
  const parts = [];
  for (const e of entries) {
    parts.push(header(e.name, e.data ? e.data.length : 0, e.dir ? '5' : '0'));
    if (e.data && e.data.length) {
      parts.push(e.data);
      const pad = (512 - (e.data.length % 512)) % 512;
      if (pad) parts.push(Buffer.alloc(pad));
    }
  }
  parts.push(Buffer.alloc(1024));
  return Buffer.concat(parts);
}
// deterministic pseudo-text so gzip behaves like source code without an RNG dependency
function text(size, seed) {
  const words = ['export', 'function', 'const', 'return', 'await', 'import', 'from', 'async', 'class', 'interface', 'value', 'config', 'path', 'items', 'user', 'token'];
  const out = [];
  let n = 0;
  let s = seed >>> 0;
  while (n < size) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const w = words[s % words.length] + (s % 7 === 0 ? '\n' : ' ');
    out.push(w);
    n += w.length;
  }
  return Buffer.from(out.join('').slice(0, size));
}
// One explicit directory entry before the first file in it, like a real GitHub tarball.
function layout(files) {
  const seen = new Set();
  const entries = [{ name: 'repo-0123456789ab/', dir: true }];
  for (const f of files) {
    const parts = f.rel.split('/');
    for (let i = 1; i < parts.length; i++) {
      const d = parts.slice(0, i).join('/');
      if (!seen.has(d)) {
        seen.add(d);
        entries.push({ name: `repo-0123456789ab/${d}/`, dir: true });
      }
    }
    entries.push({ name: `repo-0123456789ab/${f.rel}`, data: f.data });
  }
  return entries;
}
// mixed: 4,500 files (small source files plus 100 large ones), depth up to 12, about 78 MB of tar (the cap is 80 MiB).
function mixedFiles() {
  const files = [];
  for (let i = 0; i < 4500; i++) {
    const depth = 1 + (i % 11);
    const dirs = [];
    for (let d = 0; d < depth; d++) dirs.push(`d${(Math.floor(i / 40) + d) % 9}`);
    const large = i % 45 === 0;
    const size = large ? 330_000 + (i % 7) * 20_000 : 600 + ((i * 7919) % 14_000);
    files.push({ rel: `${dirs.join('/')}/f${i}.ts`, data: text(size, i + 1) });
  }
  return files;
}
// nodemodules: thousands of tiny files in package folders.
function nodeModulesFiles() {
  const files = [];
  let i = 0;
  for (let p = 0; p < 1250; p++) {
    const base = `node_modules/${p % 3 === 0 ? '@scope-' + (p % 40) + '/' : ''}pkg${p}`;
    for (const [n, size] of [['package.json', 400 + (p % 300)], ['index.js', 700 + ((p * 31) % 3000)], ['README.md', 300 + ((p * 17) % 900)], ['lib/util.js', 200 + ((p * 13) % 2000)]]) {
      files.push({ rel: `${base}/${n}`, data: text(size, ++i) });
    }
  }
  return files;
}
const CASES = {
  mixed: () => buildTar(layout(mixedFiles())),
  nodemodules: () => buildTar(layout(nodeModulesFiles()))
};

// ---------- real archives (network) ----------
// Walks tar headers only (no extraction): file count, max depth below the stripped top folder, total file bytes.
function tarStats(tar) {
  let off = 0, files = 0, dirs = 0, depth = 0, bytes = 0;
  while (off + 512 <= tar.length) {
    const h = tar.subarray(off, off + 512);
    if (h.every((b) => b === 0)) break;
    const size = parseInt(h.subarray(124, 136).toString('latin1').replace(/\0.*$/s, '').trim() || '0', 8);
    const type = String.fromCharCode(h[156]);
    if (type === '0' || type === '\0' || type === '5') {
      const n = h.subarray(0, 100).toString('utf8').replace(/\0.*$/s, '');
      depth = Math.max(depth, n.split('/').filter(Boolean).length - 1);
      if (type === '5') dirs++;
      else { files++; bytes += size; }
    }
    off += 512 + Math.ceil(size / 512) * 512;
  }
  return { files, dirs, depth, bytes };
}
async function realSources(mod, dir) {
  const corpus = JSON.parse(await readFile(join(ROOT, 'eval', 'corpus.json'), 'utf8')).repos;
  const list = corpus.slice().sort((a, b) => b.sizeKb - a.sizeKb).slice(0, 5).map((r) => ({ repo: r.repo, ref: r.sha }));
  for (const r of OWNER_REPOS) list.push({ repo: r });
  const ok = [];
  const skipped = [];
  for (const { repo, ref } of list) {
    const [owner, name] = repo.split('/');
    try {
      const gz = await mod.fetchArchive(mod.archiveUrl(owner, name, ref));
      const tar = await promisify(gunzipCb)(gz, { maxOutputLength: 4 * 1024 * MIB }).catch(() => null);
      const st = tar ? tarStats(tar) : null;
      const over = !tar || tar.length > 80 * MIB || (st && (st.files > 5000 || st.dirs > 5000 || st.depth > 12));
      if (over) {
        skipped.push(`${repo}: over the extraction limits (${tar ? (tar.length / MIB).toFixed(0) + ' MiB, ' + st.files + ' files, ' + st.dirs + ' dirs, depth ' + st.depth : 'gunzip failed'})`);
        continue;
      }
      const file = join(dir, `real-${ok.length}.tar.gz`);
      await writeFile(file, gz);
      ok.push({ name: repo, file, st });
    } catch (e) {
      skipped.push(`${repo}: ${e.message}`);
    }
  }
  return { ok, skipped };
}

// ---------- child: one measurement ----------
function vmhwm() {
  const m = readFileSync('/proc/self/status', 'utf8').match(/VmHWM:\s+(\d+) kB/);
  return m ? Number(m[1]) / 1024 : NaN;
}
async function child() {
  const file = arg('file');
  const mode = arg('mode', '1'); // 1 | 2serial | 2parallel
  const data = await readFile(file);
  const mod = await import(pathToFileURL(MODULE).href);
  const ops = {};
  for (const k of ['realpath', 'lstat', 'mkdir', 'writeFile', 'stat', 'open']) {
    const orig = fsp[k];
    ops[k] = { n: 0, ms: 0 };
    fsp[k] = async (...a) => {
      const t = performance.now();
      ops[k].n++;
      try {
        return await orig.apply(fsp, a);
      } finally {
        ops[k].ms += performance.now() - t;
      }
    };
  }
  if (global.gc) global.gc();
  const dirs = [];
  for (let i = 0; i < (mode === '1' ? 1 : 2); i++) dirs.push(await mkdtemp(join(tmpdir(), 'bench-extract-')));
  let queue = Promise.resolve(); // same shape as oneAtATime in src/modules/assessment/repo-source.ts
  const c0 = process.cpuUsage();
  const t0 = performance.now();
  let results;
  if (mode === '2serial') {
    results = await Promise.all(
      dirs.map((d) => {
        const p = queue.then(() => mod.extractTarGz(data, d));
        queue = p.catch(() => undefined);
        return p;
      })
    );
  } else {
    results = await Promise.all(dirs.map((d) => mod.extractTarGz(data, d)));
  }
  const wall = performance.now() - t0;
  const cpu = process.cpuUsage(c0);
  const rssPeak = vmhwm(); // read before the gunzip reference so that reference does not inflate it
  const fsMs = Object.values(ops).reduce((a, o) => a + o.ms, 0);
  const g0 = performance.now();
  const gc0 = process.cpuUsage();
  const tarLen = (await promisify(gunzipCb)(data)).length;
  const gunzipMs = performance.now() - g0;
  const gunzipCpu = process.cpuUsage(gc0);
  const written = (await readdir(dirs[0])).length;
  for (const d of dirs) await rm(d, { recursive: true, force: true });
  process.stdout.write(
    JSON.stringify({
      mode, tarMiB: tarLen / MIB, gzMiB: data.length / MIB, files: results[0].files, topEntries: written,
      wall, cpu: (cpu.user + cpu.system) / 1000, gunzipMs, gunzipCpu: (gunzipCpu.user + gunzipCpu.system) / 1000, fsMs, ops, rssPeak
    })
  );
}

// ---------- parent ----------
function runChild(file, mode) {
  return new Promise((res, rej) => {
    const args = ['--expose-gc', fileURLToPath(import.meta.url), '--child', '--file', file, '--mode', mode, '--module', MODULE];
    const c = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'inherit'] });
    let out = '';
    c.stdout.on('data', (d) => (out += d));
    c.on('close', (code) => (code === 0 ? res(JSON.parse(out)) : rej(new Error(`child exited ${code}`))));
  });
}
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const f0 = (n) => Math.round(n).toString();

async function parent() {
  const dir = await mkdtemp(join(tmpdir(), 'bench-fixtures-'));
  try {
    console.log(`module: ${MODULE}`);
    console.log(`loadavg: ${loadavg().map((x) => x.toFixed(2)).join(' ')} (cores: ${cpus().length}); node ${process.version}`);
    const rows = [];
    const jobs = [];
    if (!REAL_ONLY) {
      for (const name of Object.keys(CASES)) {
        if (ONLY && ONLY !== name) continue;
        const file = join(dir, `${name}.tar.gz`);
        await writeFile(file, gzipSync(CASES[name](), { level: 6 }));
        jobs.push({ name, file, modes: name === 'mixed' ? ['1', '2serial', '2parallel'] : ['1'] });
      }
    }
    if (REAL) {
      const { ok, skipped } = await realSources(await import(pathToFileURL(MODULE).href), dir);
      for (const r of ok) {
        console.log(`real ${r.name}: ${r.st.files} files, ${r.st.dirs} dirs, depth ${r.st.depth}, ${(r.st.bytes / MIB).toFixed(1)} MiB of file bytes`);
        jobs.push({ name: r.name.split('/')[1].slice(0, 22), file: r.file, modes: ['1'] });
      }
      for (const m of skipped) console.log(`skipped ${m}`);
    }
    for (const { name, file, modes } of jobs) {
      for (const mode of modes) {
        const rs = [];
        for (let i = 0; i < REPEAT; i++) rs.push(await runChild(file, mode));
        const pick = (f) => median(rs.map(f));
        const r = rs[0];
        rows.push({
          case: name, mode, files: r.files, tarMiB: r.tarMiB.toFixed(1), gzMiB: r.gzMiB.toFixed(1),
          wall: f0(pick((x) => x.wall)), cpu: f0(pick((x) => x.cpu)), gunzip: f0(pick((x) => x.gunzipMs)),
          contain: f0(pick((x) => x.ops.realpath.ms + x.ops.lstat.ms)), mkdir: f0(pick((x) => x.ops.mkdir.ms)),
          write: f0(pick((x) => x.ops.writeFile.ms)),
          parse: f0(Math.max(0, pick((x) => x.wall) - pick((x) => x.gunzipMs) - pick((x) => x.fsMs))),
          realpath: r.ops.realpath.n, lstat: r.ops.lstat.n, mkdirN: r.ops.mkdir.n, writeN: r.ops.writeFile.n, rss: f0(pick((x) => x.rssPeak))
        });
      }
    }
    const cols = ['case', 'mode', 'files', 'tarMiB', 'gzMiB', 'wall', 'cpu', 'gunzip', 'contain', 'mkdir', 'write', 'parse', 'realpath', 'lstat', 'mkdirN', 'writeN', 'rss'];
    const w = cols.map((c) => Math.max(c.length, ...rows.map((r) => String(r[c]).length)));
    const line = (cells) => cells.map((c, i) => String(c).padStart(w[i])).join('  ');
    console.log('modes: 1 = one archive, 2serial = two queued one at a time, 2parallel = two at once; call counts are for the first run; rss = peak MiB');
    console.log(line(cols));
    for (const r of rows) console.log(line(cols.map((c) => r[c])));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

if (process.argv.includes('--child')) await child();
else await parent();
