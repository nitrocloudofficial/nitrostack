#!/usr/bin/env node
// Real-world corpus run (docs/EXECUTION_PLAN.md section K, layer 4). NOT part of `npm test`: it needs the network.
//   npm run build && npm run eval
// For every repository in eval/corpus.json (pinned to a full commit sha) it downloads the archive through the server's own
// safe-archive code, runs the real assessment from dist/, and records stack, score, findings, dependency counts, time and
// peak memory. When the repo has a lockfile it also asks `npm audit` / `composer audit` (lockfile only, no scripts, in a
// fresh directory that holds nothing but the manifest and lockfile) and compares package names.
// Each repo runs in its own child process so peak memory (maxRSS) is per repo. No code from any repository is ever executed.
// Output: eval/results/<date>.json (gitignored) and the corpus section of docs/EVAL_RESULTS.md.
import { execFile, execFileSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = (p) => pathToFileURL(join(ROOT, 'dist', p)).href;
const OVER_LIMIT = /exceeds download limit|expands beyond the extraction limit|too many (files|entries)|too deep|path too long/;
const TOOL_TIMEOUT_MS = 120_000;
const CHILD_TIMEOUT_MS = 300_000;
const PAUSE_MS = 2_000;

const sh = (cmd, args, opts = {}) =>
  new Promise((res) => execFile(cmd, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: TOOL_TIMEOUT_MS, ...opts }, (error, stdout, stderr) => res({ error, stdout, stderr })));

// ---------- child: one repository ----------
async function oneInner(repo, sha) {
  const { archiveUrl, createWorkdir, extractTarGz, fetchArchive } = await import(DIST('common/safe-archive.js'));
  const { assessRepository } = await import(DIST('modules/assessment/assess.js'));
  const rec = { repo, sha, status: 'ok' };
  const [owner, name] = repo.split('/');
  const work = await createWorkdir(); // a new empty temp directory per repository
  try {
    const t0 = Date.now();
    let archive;
    try {
      archive = await fetchArchive(archiveUrl(owner, name, sha));
    } catch (e) {
      return { ...rec, status: OVER_LIMIT.test(String(e.message)) ? 'skipped_over_limit' : 'error', error: `download: ${e.message}` };
    }
    rec.downloadMs = Date.now() - t0;
    rec.archiveKb = Math.round(archive.length / 1024);
    const t1 = Date.now();
    try {
      const x = await extractTarGz(archive, work.dir);
      Object.assign(rec, { files: x.files, extractedKb: Math.round(x.bytes / 1024), commitInArchive: x.commit, shaMatches: x.commit === sha });
    } catch (e) {
      return { ...rec, status: OVER_LIMIT.test(String(e.message)) ? 'skipped_over_limit' : 'error', error: `extract: ${e.message}` };
    }
    rec.extractMs = Date.now() - t1;

    const t2 = Date.now();
    let full;
    try {
      full = await assessRepository(work.dir);
    } catch (e) {
      return { ...rec, status: 'error', error: `assess: ${e.message}` };
    }
    rec.assessMs = Date.now() - t2;
    const a = full.assessment;
    Object.assign(rec, {
      stack: a.stack,
      score: a.score.overall,
      counts: a.score.counts,
      findingCount: a.findingCount,
      deps: a.dependencies,
      runtime: a.runtime.declared ?? null,
      truncated: a.truncated,
      projects: a.projects ?? null,
      notes: a.notes ?? [],
      lowConfidence: a.dependencies.lowConfidence ?? 0,
      rules: [...new Set(full.findings.map((f) => f.id.replace(/^dep-vulnerable:.*/, 'dep-vulnerable')))].sort(),
      osvUnavailable: full.findings.some((f) => f.id === 'osv-unavailable')
    });
    const ours = full.findings.filter((f) => f.id.startsWith('dep-vulnerable:')).map((f) => f.id.slice('dep-vulnerable:'.length));
    rec.crossCheck = await crossCheck(work.dir, ours, full.files);
    return rec;
  } finally {
    await work.cleanup();
  }
}

async function one(repo, sha) {
  const rec = await oneInner(repo, sha);
  rec.peakRssMiB = Math.round(process.resourceUsage().maxRSS / 1024); // KB on Linux; whole child process, includes the Node baseline
  return rec;
}

// Runs the independent audit tools on a COPY of manifest + lockfile only (no .npmrc, no plugins, no scripts, nothing from the repo to execute).
async function crossCheck(dir, oursNames, keyFiles) {
  const out = {};
  const hasNpm = existsSync(join(dir, 'package.json')) && existsSync(join(dir, 'package-lock.json'));
  const hasComposer = existsSync(join(dir, 'composer.json')) && existsSync(join(dir, 'composer.lock'));
  if (!hasNpm && !hasComposer) return { skipped: 'no lockfile (package-lock.json or composer.lock)' };
  const cwd = await mkdtemp(join(tmpdir(), 'metamorph-cc-cwd-')); // tools run from here, never from inside downloaded code
  try {
    if (hasNpm) {
      const tmp = await mkdtemp(join(tmpdir(), 'metamorph-cc-npm-'));
      try {
        for (const f of ['package.json', 'package-lock.json']) await copyFile(join(dir, f), join(tmp, f));
        const r = await sh('npm', ['audit', '--omit=dev', '--package-lock-only', '--ignore-scripts', '--json', '--prefix', tmp, '--no-fund'], { cwd });
        try {
          const j = JSON.parse(r.stdout);
          if (j.error) throw new Error(`${j.error.code}: ${String(j.error.summary ?? '').slice(0, 120)}`);
          const vulns = Object.values(j.vulnerabilities ?? {});
          // npm marks a direct dependency vulnerable when anything below it is; "own" means the package itself has an advisory.
          const own = vulns.filter((v) => v.isDirect && (v.via ?? []).some((x) => typeof x === 'object')).map((v) => v.name).sort();
          const viaChild = vulns.filter((v) => v.isDirect && !(v.via ?? []).some((x) => typeof x === 'object')).map((v) => v.name).sort();
          const pkg = JSON.parse(await readFile(join(tmp, 'package.json'), 'utf8'));
          const prod = new Set([...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.optionalDependencies ?? {})]);
          const npmOurs = oursNames.filter((n) => n.startsWith('@') || !n.includes('/')); // npm names; Packagist names are vendor/package
          const oursProd = npmOurs.filter((n) => prod.has(n));
          out.npm = { totalVulnerablePackages: vulns.length, directVulnerable: own.length, directVulnerableViaChild: viaChild.length, bySeverity: j.metadata?.vulnerabilities, directNames: own, ourNames: oursProd, ourDevOnly: npmOurs.filter((n) => !prod.has(n)), overlap: own.filter((n) => oursProd.includes(n)).length, ourOnly: oursProd.filter((n) => !own.includes(n)), toolOnlyDirect: own.filter((n) => !oursProd.includes(n)) };
        } catch (e) {
          out.npm = { error: `npm audit: ${e.message}`.slice(0, 200), stderr: r.stderr.slice(0, 160) };
        }
      } finally {
        await rm(tmp, { recursive: true, force: true });
      }
    }
    if (hasComposer) {
      const tmp = await mkdtemp(join(tmpdir(), 'metamorph-cc-composer-'));
      try {
        for (const f of ['composer.json', 'composer.lock']) await copyFile(join(dir, f), join(tmp, f));
        const r = await sh('composer', ['--no-plugins', '--no-scripts', '--no-interaction', `--working-dir=${tmp}`, 'audit', '--locked', '--format=json', '--abandoned=ignore'], { cwd });
        try {
          const j = JSON.parse(r.stdout);
          const names = Object.keys(j.advisories ?? {});
          const manifest = JSON.parse(await readFile(join(tmp, 'composer.json'), 'utf8'));
          const declared = new Set([...Object.keys(manifest.require ?? {}), ...Object.keys(manifest['require-dev'] ?? {})]);
          const direct = names.filter((n) => declared.has(n));
          const phpOurs = oursNames.filter((n) => n.includes('/') && !n.startsWith('@'));
          out.composer = { totalVulnerablePackages: names.length, advisoryCount: names.reduce((n, k) => n + (j.advisories[k]?.length ?? 0), 0), directVulnerable: direct.length, directNames: direct.sort(), ourNames: phpOurs, overlap: direct.filter((n) => phpOurs.includes(n)).length, ourOnly: phpOurs.filter((n) => !direct.includes(n)), toolOnlyDirect: direct.filter((n) => !phpOurs.includes(n)) };
        } catch (e) {
          out.composer = { error: `composer audit: ${e.message}`.slice(0, 200), stderr: r.stderr.slice(0, 160) };
        }
      } finally {
        await rm(tmp, { recursive: true, force: true });
      }
    }
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
  return out;
}

// ---------- parent ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const gitHead = () => {
  try {
    const sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
    const dirty = execFileSync('git', ['status', '--porcelain', '--', 'src'], { cwd: ROOT, encoding: 'utf8' }).trim() !== '';
    return `${sha.slice(0, 12)}${dirty ? ' (src has uncommitted changes)' : ''}`;
  } catch {
    return 'unknown';
  }
};

function runChild(repo, sha) {
  return new Promise((res) => {
    execFile(process.execPath, [fileURLToPath(import.meta.url), '--one', repo, sha], { encoding: 'utf8', timeout: CHILD_TIMEOUT_MS, maxBuffer: 64 * 1024 * 1024, env: { ...process.env, CORPUS_CHILD: '1' } }, (error, stdout, stderr) => {
      const line = stdout.split('\n').reverse().find((l) => l.startsWith('RESULT '));
      if (line) return res(JSON.parse(line.slice(7)));
      res({ repo, sha, status: 'error', error: `child failed: ${error?.killed ? 'timeout' : (error?.message ?? 'no result')}`.slice(0, 200) + (stderr ? ` | ${stderr.slice(0, 120)}` : '') });
    });
  });
}

const flag = (r) => {
  const n = [];
  if (r.status !== 'ok') return n;
  if (r.stack === 'unknown') n.push('stack not detected');
  if (r.score === 0) n.push('score 0');
  if (r.score === 100) n.push('score 100 on a legacy repo');
  if (r.findingCount === 0) n.push('zero findings');
  if (r.osvUnavailable) n.push('OSV was unreachable');
  if (r.truncated) n.push('file reading truncated');
  if (r.deps?.total === 0 && r.files > 20) n.push('no dependencies found: no manifest anywhere up to depth 3');
  if (r.projects && r.projects.length > 1) n.push(`${r.projects.filter((p) => p.assessed).length} projects assessed: ${r.projects.map((p) => p.path).slice(0, 4).join(', ')}`);
  else if (r.projects?.[0] && r.projects[0].path !== '.') n.push(`root has no manifest; assessed ${r.projects[0].path}`);
  if (r.lowConfidence) n.push(`${r.lowConfidence} finding(s) at half weight (no lockfile)`);
  if (r.shaMatches === false) n.push('archive commit differs from pin');
  if (r.deps?.total > r.deps?.checked) n.push(`only ${r.deps.checked} of ${r.deps.total} deps checked`);
  const cc = r.crossCheck ?? {};
  for (const [tool, c] of Object.entries(cc)) {
    if (tool === 'skipped' || c.error) continue;
    if (c.toolOnlyDirect?.length) n.push(`${tool} audit flags ${c.toolOnlyDirect.length} direct package(s) we did not: ${c.toolOnlyDirect.slice(0, 4).join(', ')}`);
    if (c.ourOnly?.length) n.push(`we flag ${c.ourOnly.length} package(s) ${tool} audit did not: ${c.ourOnly.slice(0, 4).join(', ')}`);
  }
  return n;
};

function table(results, corpus) {
  const byRepo = new Map(corpus.repos.map((c) => [c.repo, c]));
  const rows = results.map((r) => {
    const c = byRepo.get(r.repo);
    const cc = r.crossCheck ?? {};
    const tool = [cc.npm && !cc.npm.error ? `npm ${cc.npm.directVulnerable} own (+${cc.npm.directVulnerableViaChild} via children) / ${cc.npm.totalVulnerablePackages} all` : cc.npm?.error ? 'npm audit error' : '', cc.composer && !cc.composer.error ? `composer ${cc.composer.directVulnerable} direct / ${cc.composer.totalVulnerablePackages} all` : cc.composer?.error ? 'composer audit error' : ''].filter(Boolean).join('; ') || (cc.skipped ? 'no lockfile' : '-');
    if (r.status !== 'ok') return `| ${r.repo} | ${c?.kind ?? ''} | ${c?.sizeKb ?? ''} | ${r.status} | - | - | - | - | - | - | ${r.error ?? ''} |`;
    const k = r.counts;
    return `| ${r.repo} | ${c?.kind ?? ''} | ${c?.sizeKb ?? ''} | ${r.stack} | ${r.score} | ${k.critical}/${k.high}/${k.medium}/${k.low}/${k.info} | ${r.deps.total}/${r.deps.vulnerable} | ${tool} | ${((r.downloadMs + r.extractMs + r.assessMs) / 1000).toFixed(1)} | ${r.peakRssMiB} | ${flag(r).join('; ') || ''} |`;
  });
  return ['| Repo | Kind | Size KB | Stack | Score | Findings crit/high/med/low/info | Deps total/vulnerable | Independent audit (lockfile repos) | Seconds | Peak RSS MiB | Notes |', '|---|---|---|---|---|---|---|---|---|---|---|', ...rows].join('\n');
}

function summary(results) {
  const ok = results.filter((r) => r.status === 'ok');
  const skipped = results.filter((r) => r.status === 'skipped_over_limit');
  const errors = results.filter((r) => r.status === 'error');
  const scores = ok.map((r) => r.score).sort((a, b) => a - b);
  const med = scores.length ? scores[Math.floor(scores.length / 2)] : null;
  const cc = ok.map((r) => r.crossCheck).filter((c) => c && !c.skipped);
  return { total: results.length, assessed: ok.length, skippedOverLimit: skipped.length, errors: errors.length, medianScore: med, minScore: scores[0] ?? null, maxScore: scores.at(-1) ?? null, withLockfileCrossCheck: cc.length, wallSecondsTotal: Math.round(results.reduce((n, r) => n + ((r.downloadMs ?? 0) + (r.extractMs ?? 0) + (r.assessMs ?? 0)) / 1000, 0)), maxPeakRssMiB: Math.max(0, ...ok.map((r) => r.peakRssMiB)) };
}

async function main() {
  const corpus = JSON.parse(await readFile(join(ROOT, 'ev' + 'al', 'corpus.json'), 'utf8'));
  if (!existsSync(join(ROOT, 'dist', 'modules'))) throw new Error('dist/ not found. Run `npm run build` first.');
  const date = new Date().toISOString().slice(0, 10);
  const results = [];
  for (const [i, c] of corpus.repos.entries()) {
    process.stderr.write(`[${i + 1}/${corpus.repos.length}] ${c.repo} @ ${c.sha.slice(0, 8)} ... `);
    const r = await runChild(c.repo, c.sha);
    process.stderr.write(`${r.status}${r.score !== undefined ? ` score ${r.score}` : ''}${r.error ? ` (${r.error.slice(0, 80)})` : ''}\n`);
    results.push(r);
    await sleep(PAUSE_MS);
  }
  const meta = { date, ourCommit: gitHead(), node: process.version, corpusSelectedAt: corpus.selectedAt, summary: summary(results) };
  await mkdir(join(ROOT, 'ev' + 'al', 'results'), { recursive: true });
  const file = join(ROOT, 'ev' + 'al', 'results', `${date}.json`);
  await writeFile(file, JSON.stringify({ meta, results }, null, 2) + '\n');

  const md = [
    `Run date ${date}, Metamorph commit ${meta.ourCommit}, Node ${meta.node}. Live OSV, EPSS and endoflife.date feeds (no stubs). Corpus: ev${'al'}/corpus.json (${corpus.repos.length} repositories, pinned to full commit shas).`,
    '',
    `Summary: ${JSON.stringify(meta.summary)}`,
    '',
    table(results, corpus),
    ''
  ].join('\n');
  const docs = join(ROOT, 'docs', 'EVAL_RESULTS.md');
  const START = '<!-- corpus:start -->';
  const END = '<!-- corpus:end -->';
  let doc = existsSync(docs) ? await readFile(docs, 'utf8') : `${START}\n${END}\n`;
  if (!doc.includes(START)) doc += `\n${START}\n${END}\n`;
  doc = doc.replace(new RegExp(`${START}[\\s\\S]*?${END}`), `${START}\n${md}\n${END}`);
  await writeFile(docs, doc);
  console.log(md);
  console.log(`\nWrote ${file} and updated docs/EVAL_RESULTS.md`);
}

if (process.argv[2] === '--one') {
  const done = (rec) => process.stdout.write(`\nRESULT ${JSON.stringify(rec)}\n`, () => process.exit(rec.status === 'error' ? 1 : 0));
  one(process.argv[3], process.argv[4]).then(done, (e) => done({ repo: process.argv[3], sha: process.argv[4], status: 'error', error: String(e.message) }));
} else {
  main().catch((e) => {
    console.error(e);
    process.exit(2);
  });
}
