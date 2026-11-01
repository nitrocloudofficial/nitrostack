#!/usr/bin/env node
// Metamorph verification runner. Node 22, zero npm dependencies.
// WARNING: this executes UNTRUSTED project code (installs without scripts, project tests, scanners).
// Run it only inside the runner container or a GitHub Actions ephemeral VM, never in the MCP server.
//
// Inputs (env or --name=value args): REPO_URL, SUBFOLDER, PATCH_B64 or PATCH_GZ_B64 (gzip then base64), CHECKS, plus optional
//   OUT_FILE (default /out/result.json), WORK_DIR (default /work), CHECK_TIMEOUT_S (default 600),
//   INSTALL_TIMEOUT_S (default 900), OUTPUT_CAP_BYTES (default 16 MiB), MAX_PATCH_B64_CHARS (default 60000).
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync, existsSync, readdirSync, statSync, rmSync, cpSync } from 'node:fs';
import { join, resolve, dirname, relative, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { gunzipSync } from 'node:zlib';
import { selectPhp, lockIsStub } from './php-select.mjs';

// ---------- config ----------
const argv = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--') && a.includes('=')).map((a) => [a.slice(2, a.indexOf('=')), a.slice(a.indexOf('=') + 1)])
);
const cfg = (name, def = '') => argv[name] ?? argv[name.toLowerCase().replace(/_/g, '-')] ?? process.env[name] ?? def;

const REPO_URL = cfg('REPO_URL').trim();
const SUBFOLDER = cfg('SUBFOLDER').trim();
const PATCH_B64 = cfg('PATCH_B64').replace(/\s+/g, '');
const PATCH_GZ_B64 = cfg('PATCH_GZ_B64').replace(/\s+/g, '');
const MAX_PATCH_BYTES = Number(cfg('MAX_PATCH_BYTES', String(8 * 1024 * 1024))); // decompressed size cap (gzip bomb guard)
const CHECKS_ARG = cfg('CHECKS', 'all').trim() || 'all';
const OUT_FILE = cfg('OUT_FILE', '/out/result.json');
const WORK_DIR = cfg('WORK_DIR', '/work');
const CHECK_TIMEOUT_MS = Number(cfg('CHECK_TIMEOUT_S', '600')) * 1000;
const INSTALL_TIMEOUT_MS = Number(cfg('INSTALL_TIMEOUT_S', '900')) * 1000;
const OUTPUT_CAP = Number(cfg('OUTPUT_CAP_BYTES', String(16 * 1024 * 1024)));
// GitHub caps the whole workflow_dispatch inputs payload at 65,535 characters; leave room for the other inputs.
const MAX_PATCH_B64_CHARS = Number(cfg('MAX_PATCH_B64_CHARS', '60000'));
const MAX_FINDINGS = 500;
// TEST ONLY: absolute path of a directory (bind-mounted into the container) used instead of cloning from GitHub, so a run can
// happen with `--network none`. Never set by the GitHub workflow. REPO_URL must still be given (it only names the result).
const LOCAL_REPO_DIR = cfg('LOCAL_REPO_DIR').trim();
const RULES_DIR = cfg('SEMGREP_RULES_DIR', '/opt/metamorph/rules');
const RECTOR_FALLBACK = cfg('RECTOR_FALLBACK_CONFIG', '/opt/metamorph/rector.php');
// PHP versions the image carries: PHP_DEFAULT is `php` on PATH, the others live in PHP_ROOT/<ver>/shim/php.
const PHP_VERSIONS = cfg('PHP_VERSIONS', '7.4,8.1,8.3,8.4').split(',').map((v) => v.trim()).filter(Boolean);
const PHP_DEFAULT = cfg('PHP_DEFAULT', '8.4');
const PHP_ROOT = cfg('PHP_ROOT', '/opt/php');

// ---------- redaction (port of src/common/redact.ts; keep the two in sync) ----------
const PATTERNS = [
  ['aws-access-key', /\bAKIA[0-9A-Z]{16}\b/g],
  ['github-token', /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g],
  ['nitro-key', /\bnsk_(?:live|test)_[A-Za-z0-9]{16,}\b/g],
  ['api-key', /\bsk_[A-Za-z0-9_-]{16,}\b/g],
  ['jwt', /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g],
  ['bearer', /\bBearer\s+[A-Za-z0-9._~+/-]{16,}=*/gi],
  ['private-key', /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g],
  ['assignment', /\b([\w-]*(?:api[_-]?key|secret|token|passwd|password|private[_-]?key)[\w-]*)(\s*[:=]\s*)(["']?)[^\s"',;]{6,}\3/gi]
];
export function redact(input) {
  let text = String(input);
  for (const [name, re] of PATTERNS) {
    text = text.replace(re, (...m) => (name === 'assignment' ? `${m[1]}${m[2]}${m[3]}[REDACTED]${m[3]}` : `[REDACTED:${name}]`));
  }
  return text;
}
function redactDeep(v) {
  if (typeof v === 'string') return redact(v);
  if (Array.isArray(v)) return v.map(redactDeep);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, redactDeep(x)]));
  return v;
}

// ---------- small helpers ----------
const SEV_RANK = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
const clip = (s, n) => {
  const t = String(s ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
};
const tail = (s, n = 400) => {
  const t = String(s ?? '').trim();
  return t.length > n ? '…' + t.slice(-n) : t;
};
// Error text for summaries: drop CLI usage lines and notices, keep the last part (the cause is printed last).
const errText = (s, n = 300) => {
  const lines = String(s ?? '')
    .split('\n')
    .filter((l) => l.trim() && !/^\s*[\w:-]+ \[-/.test(l) && !/^(Warning|Composer could not detect|Installing dependencies|Verifying lock|Package operations)/.test(l.trim()));
  const t = lines.join(' ').replace(/\s+/g, ' ').trim();
  return t.length > n ? '…' + t.slice(-(n - 1)) : t;
};
const safeJson = (s) => {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
};
const readJson = (p) => (existsSync(p) ? safeJson(readFileSync(p, 'utf8')) : undefined);

// Minimal environment for child processes: no inherited tokens or secrets.
const CHILD_ENV = {
  PATH: process.env.PATH ?? '/usr/local/bin:/usr/bin:/bin',
  HOME: process.env.HOME ?? '/tmp',
  LANG: 'C.UTF-8',
  CI: '1',
  GIT_TERMINAL_PROMPT: '0',
  COMPOSER_NO_INTERACTION: '1',
  COMPOSER_HOME: process.env.COMPOSER_HOME ?? join(process.env.HOME ?? '/tmp', '.composer'),
  NPM_CONFIG_UPDATE_NOTIFIER: 'false',
  NPM_CONFIG_FUND: 'false',
  NO_COLOR: '1',
  FORCE_COLOR: '0'
};

/** Run a command without a shell. Resolves always; never throws. Kills the process group on timeout. */
function run(cmd, args, { cwd, timeoutMs = CHECK_TIMEOUT_MS, env = {}, cap = OUTPUT_CAP } = {}) {
  return new Promise((done) => {
    const started = Date.now();
    let out = '';
    let err = '';
    let outBytes = 0;
    let errBytes = 0;
    let truncated = false;
    let timedOut = false;
    let spawnError;
    let child;
    try {
      child = spawn(cmd, args, { cwd, env: { ...CHILD_ENV, ...env }, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) {
      return done({ code: null, out, err: String(e), timedOut, truncated, spawnError: String(e), durationMs: 0 });
    }
    const killGroup = () => {
      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch {
        try {
          child.kill('SIGKILL');
        } catch {}
      }
    };
    const timer = setTimeout(() => {
      timedOut = true;
      killGroup();
    }, timeoutMs);
    const take = (chunk, which) => {
      const room = (which === 'out' ? cap - outBytes : Math.min(cap, 512 * 1024) - errBytes);
      if (room <= 0) {
        truncated = true;
        return;
      }
      const s = chunk.length > room ? (truncated = true, chunk.subarray(0, room)) : chunk;
      if (which === 'out') {
        out += s.toString('utf8');
        outBytes += s.length;
      } else {
        err += s.toString('utf8');
        errBytes += s.length;
      }
    };
    child.stdout.on('data', (c) => take(c, 'out'));
    child.stderr.on('data', (c) => take(c, 'err'));
    child.on('error', (e) => {
      spawnError = String(e.message ?? e);
    });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      killGroup(); // reap stragglers (dev servers, watchers) the check left behind
      done({ code: signal ? null : code, signal, out, err, timedOut, truncated, spawnError, durationMs: Date.now() - started });
    });
  });
}

const versionCache = new Map();
async function toolVersion(tool, args = ['--version'], cwd, env = {}) {
  const key = tool + args.join(' ') + (env.PATH ?? '');
  if (versionCache.has(key)) return versionCache.get(key);
  const r = await run(tool, args, { cwd, env, timeoutMs: 30000, cap: 64 * 1024 });
  const text = (r.out || r.err).split('\n').find((l) => /\d+\.\d+/.test(l)) ?? '';
  const m = text.match(/\d+\.\d+(?:\.\d+)?(?:[-+.\w]*)?/);
  const v = r.spawnError ? 'unavailable' : (m ? m[0] : 'unknown');
  versionCache.set(key, v);
  return v;
}

// ---------- result accumulation ----------
const result = {
  schema: 1,
  repo: '',
  commit: '',
  patchApplied: false,
  startedAt: new Date().toISOString(),
  finishedAt: '',
  checks: [],
  findings: [],
  tests: { ran: 0, passed: 0, failed: 0 },
  buildOk: false
};
const allFindings = []; // uncapped, capped at the end
const sevCounts = () => ({ critical: 0, high: 0, medium: 0, low: 0, info: 0 });

function finalize() {
  result.finishedAt = new Date().toISOString();
  allFindings.sort((a, b) => SEV_RANK[b.severity] - SEV_RANK[a.severity]);
  result.findingsTotal = allFindings.length;
  result.findingsDropped = Math.max(0, allFindings.length - MAX_FINDINGS);
  result.findings = allFindings.slice(0, MAX_FINDINGS);
  const safe = redactDeep(result);
  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(safe, null, 2) + '\n');
}

let rootPrefix = ''; // absolute project root, stripped from finding paths
const relPath = (p) => {
  let t = String(p);
  if (rootPrefix && t.startsWith(rootPrefix + '/')) t = t.slice(rootPrefix.length + 1);
  return t.replace(/^\.\//, '');
};
function addFinding(tool, f) {
  const sev = SEV_RANK[f.severity] !== undefined ? f.severity : 'medium';
  const item = { tool, ruleId: clip(f.ruleId || 'unknown', 200), severity: sev, title: clip(f.title || f.ruleId || 'finding', 200) };
  if (f.path) item.path = clip(relPath(f.path), 500);
  if (Number.isInteger(f.line) && f.line > 0) item.line = f.line;
  if (f.cwe?.length) item.cwe = [...new Set(f.cwe)].slice(0, 10);
  // Optional identity fields (advisory ids, package, versions). Absent when the tool's output does not carry them.
  const text = (v, n) => (typeof v === 'string' && v.trim() ? clip(v.trim(), n) : undefined);
  const setText = (k, v, n) => {
    const t = text(v, n);
    if (t) item[k] = t;
  };
  setText('package', f.package, 214);
  setText('installedVersion', f.installedVersion, 100);
  setText('fixedVersion', f.fixedVersion, 100);
  setText('affectedVersions', f.affectedVersions, 200);
  const aliases = [...new Set((f.aliases ?? []).map((a) => text(a, 64)).filter(Boolean))].slice(0, 10);
  if (aliases.length) item.aliases = aliases;
  const owasp = [...new Set((f.owasp ?? []).map((a) => text(a, 20)).filter(Boolean))].slice(0, 10);
  if (owasp.length) item.owasp = owasp;
  if (typeof f.cvss === 'number' && Number.isFinite(f.cvss) && f.cvss > 0 && f.cvss <= 10) item.cvss = f.cvss;
  allFindings.push(item);
  return sev;
}

/** Record a check. `parsed` = {findings?, tests?, counts?, summary?, status?} from a parser. */
async function record(def, r, parsed, versionArgs) {
  const version = await toolVersion(def.bin ?? def.tool, versionArgs ?? def.versionArgs ?? ['--version'], def.cwd, def.env);
  const counts = sevCounts();
  for (const f of parsed?.findings ?? []) counts[addFinding(def.name ?? def.tool, f)]++;
  Object.assign(counts, parsed?.counts ?? {});
  let status = parsed?.status;
  let summary = parsed?.summary ?? '';
  if (!status) {
    if (r.spawnError) (status = 'error'), (summary = `could not start: ${r.spawnError}`);
    else if (r.timedOut) (status = 'error'), (summary = `timed out after ${Math.round(r.durationMs / 1000)}s`);
    else if (r.truncated && parsed?.parseFailed) (status = 'error'), (summary = `output exceeded ${OUTPUT_CAP} bytes`);
    else if (parsed?.parseFailed) (status = 'error'), (summary = `could not parse output (exit ${r.code}): ${errText(r.err || r.out, 300)}`);
    else if (r.code === 0) status = 'pass';
    else if (def.failCodes?.includes(r.code) || parsed?.findings?.length) status = 'fail';
    else (status = 'error'), (summary = summary || `exit ${r.code}: ${errText(r.err || r.out, 300)}`);
  }
  if (!summary) {
    const n = parsed?.findings?.length ?? 0;
    summary = status === 'pass' ? 'ok' : n ? `${n} finding(s)` : `exit ${r.code}: ${errText(r.err || r.out, 300)}`;
  }
  const check = {
    tool: def.name ?? def.tool,
    version,
    status,
    durationMs: r.durationMs ?? 0,
    summary: clip(summary, 500),
    counts
  };
  if (r.code !== null && r.code !== undefined) check.counts.exitCode = r.code;
  result.checks.push(check);
  if (parsed?.tests) {
    result.tests.ran += parsed.tests.ran;
    result.tests.passed += parsed.tests.passed;
    result.tests.failed += parsed.tests.failed;
  }
  console.error(`[check] ${def.tool} ${status} ${check.durationMs}ms ${check.summary}`);
  return check;
}
function skip(tool, why) {
  result.checks.push({ tool, version: 'n/a', status: 'skipped', durationMs: 0, summary: clip(why, 500), counts: {} });
  console.error(`[check] ${tool} skipped: ${why}`);
}

// ---------- normalisers ----------
function sevFromScore(n) {
  return n >= 9 ? 'critical' : n >= 7 ? 'high' : n >= 4 ? 'medium' : n > 0 ? 'low' : 'info';
}
const SEV_WORDS = { critical: 'critical', high: 'high', moderate: 'medium', medium: 'medium', low: 'low', info: 'info', informational: 'info', warning: 'medium', error: 'high', note: 'low', none: 'info', unknown: 'medium' };
const ADVISORY_ID_RE = /\b(?:CVE-\d{4}-\d{4,}|GHSA-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4})\b/gi;
const advisoryIdsOf = (...texts) => [...new Set(texts.flatMap((t) => String(t ?? '').match(ADVISORY_ID_RE) ?? []).map((x) => (x.toUpperCase().startsWith('CVE') ? x.toUpperCase() : `GHSA-${x.slice(5).toLowerCase()}`)))];
const owaspOf = (...tags) => [...new Set(tags.flatMap((t) => String(t ?? '').match(/\bA(?:0[1-9]|10):2021\b/g) ?? []))];
const cweOf = (...texts) => [...new Set(texts.flatMap((t) => String(t ?? '').match(/CWE-\d+/gi) ?? []).map((c) => c.toUpperCase()))];

/** Generic SARIF 2.1 -> findings. `override` forces a severity for tools that do not grade (gitleaks). */
function parseSarif(text, { override } = {}) {
  const doc = safeJson(text);
  if (!doc || !Array.isArray(doc.runs)) return { parseFailed: true, findings: [] };
  const findings = [];
  for (const run of doc.runs) {
    const rules = new Map((run.tool?.driver?.rules ?? []).map((r) => [r.id, r]));
    for (const res of run.results ?? []) {
      const rule = rules.get(res.ruleId) ?? (Number.isInteger(res.ruleIndex) ? run.tool?.driver?.rules?.[res.ruleIndex] : undefined) ?? {};
      const props = rule.properties ?? {};
      const score = Number(props['security-severity'] ?? res.properties?.['security-severity']);
      const tagSev = (props.tags ?? []).map((t) => String(t).toLowerCase()).find((t) => SEV_WORDS[t] !== undefined);
      const severity = override ?? (Number.isFinite(score) ? sevFromScore(score) : tagSev ? SEV_WORDS[tagSev] : (SEV_WORDS[res.level ?? rule.defaultConfiguration?.level ?? 'warning'] ?? 'medium'));
      const loc = res.locations?.[0]?.physicalLocation;
      const message = res.message?.text ?? rule.shortDescription?.text ?? rule.name ?? res.ruleId;
      const fullMessage = String(message ?? '');
      // trivy puts "Package: x / Installed Version: y / Fixed Version: z" in the SARIF message text
      const msgField = (name) => fullMessage.match(new RegExp(`^${name}:[ \\t]*(.+)$`, 'mi'))?.[1]?.trim();
      const vulnLine = fullMessage.match(/^Vulnerability[ \t]+(\S+)/mi)?.[1];
      const ids = advisoryIdsOf(res.ruleId ?? rule.id, vulnLine);
      findings.push({
        ruleId: res.ruleId ?? rule.id,
        severity,
        ...(ids.length ? { aliases: ids } : {}),
        ...(msgField('Package') ? { package: msgField('Package') } : {}),
        ...(msgField('Installed Version') ? { installedVersion: msgField('Installed Version') } : {}),
        ...(msgField('Fixed Version') ? { fixedVersion: msgField('Fixed Version') } : {}),
        ...(Number.isFinite(score) && score > 0 ? { cvss: score } : {}),
        owasp: owaspOf(...(props.tags ?? [])),
        title: firstLine(message),
        path: loc?.artifactLocation?.uri?.replace(/^file:\/\//, ''),
        line: loc?.region?.startLine,
        cwe: cweOf(...(props.tags ?? []), props.cwe, rule.fullDescription?.text, rule.help?.text?.slice(0, 2000), ...(res.properties?.cwe ? [res.properties.cwe] : []))
      });
    }
  }
  return { findings };
}
const firstLine = (s) => String(s ?? '').split('\n').find((l) => l.trim()) ?? '';

function parseComposerAudit(text) {
  const doc = safeJson(text);
  if (!doc || typeof doc !== 'object') return { parseFailed: true, findings: [] };
  const findings = [];
  const adv = doc.advisories && !Array.isArray(doc.advisories) ? doc.advisories : {};
  for (const [pkg, list] of Object.entries(adv)) {
    for (const a of Array.isArray(list) ? list : Object.values(list)) {
      // composer's JSON has no CVSS severity for most advisories; it is only used when present.
      const sev = SEV_WORDS[String(a.severity ?? '').toLowerCase()] ?? 'medium';
      const remote = (Array.isArray(a.sources) ? a.sources : []).map((x) => x?.remoteId);
      findings.push({
        ruleId: a.cve || a.advisoryId || `advisory-${pkg}`,
        severity: sev,
        title: `${pkg}: ${a.title ?? 'security advisory'}`,
        path: 'composer.lock',
        cwe: cweOf(a.title),
        package: a.packageName || pkg,
        affectedVersions: a.affectedVersions,
        // CVE, composer's PKSA id and any GHSA/CVE id the advisory sources list, so other tools' findings can be matched
        aliases: [...advisoryIdsOf(a.cve, ...remote), ...(a.advisoryId ? [String(a.advisoryId)] : [])]
      });
    }
  }
  const abandoned = doc.abandoned && !Array.isArray(doc.abandoned) ? doc.abandoned : {};
  for (const pkg of Object.keys(abandoned)) findings.push({ ruleId: 'abandoned-package', severity: 'low', title: `${pkg} is abandoned`, path: 'composer.json', package: pkg });
  return { findings };
}

function parseNpmAudit(text) {
  const doc = safeJson(text);
  if (!doc || typeof doc !== 'object') return { parseFailed: true, findings: [] };
  if (doc.error) return { parseFailed: true, findings: [], summary: `npm audit error: ${doc.error.summary ?? doc.error.code}` };
  const findings = [];
  for (const [name, v] of Object.entries(doc.vulnerabilities ?? {})) {
    const direct = (v.via ?? []).filter((x) => typeof x === 'object');
    if (!direct.length) continue; // transitive-only entries are reported at their source package
    for (const via of direct) {
      const id = String(via.url ?? '').split('/').pop() || String(via.source ?? name);
      const fix = v.fixAvailable && typeof v.fixAvailable === 'object' && v.fixAvailable.name === name ? v.fixAvailable.version : undefined;
      findings.push({
        ruleId: id,
        severity: SEV_WORDS[via.severity] ?? 'medium',
        title: `${name}: ${via.title ?? 'advisory'}`,
        path: 'package-lock.json',
        cwe: (via.cwe ?? []).map(String),
        package: via.name || name,
        affectedVersions: via.range,
        fixedVersion: fix,
        aliases: advisoryIdsOf(via.url, id),
        cvss: via.cvss?.score
      });
    }
  }
  return { findings };
}

function parsePhpstan(text) {
  const doc = safeJson(text);
  if (!doc || typeof doc !== 'object') return { parseFailed: true, findings: [] };
  const findings = [];
  for (const [file, d] of Object.entries(doc.files ?? {})) {
    for (const m of d.messages ?? []) findings.push({ ruleId: m.identifier ?? 'phpstan', severity: 'low', title: m.message, path: file, line: m.line });
  }
  for (const e of doc.errors ?? []) findings.push({ ruleId: 'phpstan-error', severity: 'medium', title: String(e) });
  return { findings };
}

function parseRector(text) {
  const doc = safeJson(text);
  if (!doc || typeof doc !== 'object') return { parseFailed: true, findings: [] };
  const findings = [];
  for (const d of doc.file_diffs ?? []) {
    for (const rule of d.applied_rectors?.length ? d.applied_rectors : ['rector']) {
      findings.push({ ruleId: String(rule).split('\\').pop(), severity: 'info', title: `Rector would change this file: ${String(rule).split('\\').pop()}`, path: d.file });
    }
  }
  if (!(doc.file_diffs ?? []).length) for (const f of doc.changed_files ?? []) findings.push({ ruleId: 'rector', severity: 'info', title: 'Rector would change this file', path: f });
  for (const e of doc.errors ?? []) findings.push({ ruleId: 'rector-error', severity: 'medium', title: e.message ?? String(e), path: e.file, line: e.line });
  return { findings, counts: { changedFiles: doc.totals?.changed_files ?? (doc.file_diffs ?? []).length } };
}

function parseEslint(text) {
  const doc = safeJson(text);
  if (!Array.isArray(doc)) return { parseFailed: true, findings: [] };
  const findings = [];
  for (const f of doc) {
    for (const m of f.messages ?? []) findings.push({ ruleId: m.ruleId ?? 'eslint-parse', severity: m.severity === 2 ? 'medium' : 'low', title: m.message, path: f.filePath, line: m.line });
  }
  return { findings };
}

function parseTsc(text) {
  const findings = [];
  for (const line of text.split('\n')) {
    const m = line.match(/^(.+?)\((\d+),\d+\): error (TS\d+): (.*)$/);
    if (m) findings.push({ ruleId: m[3], severity: 'medium', title: m[4], path: m[1], line: Number(m[2]) });
    else {
      const g = line.match(/^error (TS\d+): (.*)$/);
      if (g) findings.push({ ruleId: g[1], severity: 'medium', title: g[2] });
    }
  }
  return { findings };
}

function parseCheckov(text) {
  let doc = safeJson(text);
  if (Array.isArray(doc)) doc = { results: { failed_checks: doc.flatMap((d) => d.results?.failed_checks ?? []) } };
  if (!doc || typeof doc !== 'object') return { parseFailed: true, findings: [] };
  const findings = (doc.results?.failed_checks ?? []).map((c) => ({
    ruleId: c.check_id,
    severity: SEV_WORDS[String(c.severity ?? '').toLowerCase()] ?? 'medium',
    title: c.check_name,
    path: String(c.file_path ?? '').replace(/^\//, ''),
    line: c.file_line_range?.[0]
  }));
  return { findings };
}

// test-count parsers
function parseJunit(path) {
  if (!existsSync(path)) return undefined;
  const xml = readFileSync(path, 'utf8');
  const root = xml.match(/<testsuites?\b[^>]*>/)?.[0] ?? '';
  const n = (k) => Number(root.match(new RegExp(`\\b${k}="(\\d+)"`))?.[1] ?? NaN);
  let ran = n('tests');
  let bad = n('failures') + n('errors');
  if (!Number.isFinite(ran)) {
    // nested suites: sum top-level testsuite attributes
    const suites = [...xml.matchAll(/<testsuite\b[^>]*>/g)].map((m) => m[0]);
    if (!suites.length) return undefined;
    ran = 0;
    bad = 0;
    for (const s of suites.slice(0, 1)) {
      ran += Number(s.match(/\btests="(\d+)"/)?.[1] ?? 0);
      bad += Number(s.match(/\bfailures="(\d+)"/)?.[1] ?? 0) + Number(s.match(/\berrors="(\d+)"/)?.[1] ?? 0);
    }
  }
  return { ran, failed: bad, passed: Math.max(0, ran - bad) };
}
function parseJsTestOutput(text) {
  // vitest: "Tests  1 failed | 4 passed (5)"; jest: "Tests:       1 failed, 4 passed, 5 total"
  const line = text.split('\n').find((l) => /^\s*Tests[: ]\s+\d/.test(l));
  if (line) {
    const failed = Number(line.match(/(\d+) failed/)?.[1] ?? 0);
    const passed = Number(line.match(/(\d+) passed/)?.[1] ?? 0);
    return { ran: failed + passed, passed, failed };
  }
  // node:test / tap
  const p = text.match(/^# pass (\d+)/m);
  const f = text.match(/^# fail (\d+)/m);
  if (p && f) return { ran: Number(p[1]) + Number(f[1]), passed: Number(p[1]), failed: Number(f[1]) };
  return undefined;
}

// ---------- steps ----------
function fail(msg) {
  console.error(`[runner] ${msg}`);
}

let patchBuf; // decoded patch bytes, set by validateInputs
function validateInputs() {
  const m = REPO_URL.match(/^https:\/\/github\.com\/([A-Za-z0-9._-]+)\/([A-Za-z0-9._-]+?)(?:\.git)?\/?$/);
  if (!m) return 'REPO_URL must be an https://github.com/<owner>/<repo> URL';
  result.repo = `${m[1]}/${m[2]}`;
  if (SUBFOLDER && (!/^[A-Za-z0-9._\-/ ]+$/.test(SUBFOLDER) || SUBFOLDER.split('/').includes('..') || SUBFOLDER.startsWith('/'))) return 'SUBFOLDER must be a relative path without ".."';
  if (PATCH_B64 && PATCH_GZ_B64) return 'Send either PATCH_B64 or PATCH_GZ_B64, not both';
  const encoded = PATCH_GZ_B64 || PATCH_B64;
  const name = PATCH_GZ_B64 ? 'PATCH_GZ_B64' : 'PATCH_B64';
  // The cap applies to the characters actually sent, i.e. after compression.
  if (encoded.length > MAX_PATCH_B64_CHARS) {
    return `${name} is ${encoded.length} characters, over the ${MAX_PATCH_B64_CHARS} limit (GitHub workflow_dispatch allows 65,535 characters for all inputs combined). Next step: ${PATCH_GZ_B64 ? 'split the change into smaller stages' : 'send the patch gzip-compressed as PATCH_GZ_B64 (gzip, then base64)'}, or run the Docker image locally.`;
  }
  if (encoded && !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) return `${name} is not valid base64`;
  if (PATCH_GZ_B64) {
    try {
      patchBuf = gunzipSync(Buffer.from(PATCH_GZ_B64, 'base64'), { maxOutputLength: MAX_PATCH_BYTES });
    } catch {
      return `PATCH_GZ_B64 is not valid gzip data or expands beyond ${MAX_PATCH_BYTES} bytes`;
    }
  } else if (PATCH_B64) patchBuf = Buffer.from(PATCH_B64, 'base64');
  return '';
}

const ALL_CHECKS = ['composer-install', 'composer-audit', 'phpunit', 'phpstan', 'rector', 'npm-ci', 'npm-audit', 'eslint', 'tsc', 'npm-test', 'trivy', 'semgrep', 'gitleaks', 'checkov', 'hadolint'];
const ALIASES = { composer: ['composer-install', 'composer-audit'], php: ['composer-install', 'composer-audit', 'phpunit', 'phpstan', 'rector'], npm: ['npm-ci', 'npm-audit', 'eslint', 'tsc', 'npm-test'], node: ['npm-ci', 'npm-audit', 'eslint', 'tsc', 'npm-test'], scanners: ['trivy', 'semgrep', 'gitleaks', 'checkov', 'hadolint'], light: ['composer-install', 'composer-audit', 'phpunit', 'phpstan', 'npm-ci', 'npm-audit', 'eslint', 'tsc', 'npm-test', 'gitleaks', 'hadolint'] };
function parseChecks(spec) {
  const want = new Set();
  for (const raw of spec.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)) {
    if (raw === 'all') ALL_CHECKS.forEach((c) => want.add(c));
    else if (ALIASES[raw]) ALIASES[raw].forEach((c) => want.add(c));
    else if (ALL_CHECKS.includes(raw)) want.add(raw);
    else return { error: `unknown check "${clip(raw, 40)}". Valid: all, ${ALL_CHECKS.join(', ')}, ${Object.keys(ALIASES).join(', ')}` };
  }
  return { want };
}

function findFiles(root, test, maxDepth = 3) {
  const found = [];
  const walk = (dir, depth) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.isSymbolicLink()) continue;
      if (e.isDirectory()) {
        if (['node_modules', 'vendor', '.git'].includes(e.name) || depth >= maxDepth) continue;
        walk(join(dir, e.name), depth + 1);
      } else if (test(e.name)) found.push(join(dir, e.name));
    }
  };
  walk(root, 0);
  return found.slice(0, 50);
}

async function main() {
  const inputError = validateInputs();
  if (inputError) {
    skip('input-validation', inputError);
    result.checks.at(-1).status = 'error';
    return;
  }
  const parsedChecks = parseChecks(CHECKS_ARG);
  if (parsedChecks.error) {
    skip('input-validation', parsedChecks.error);
    result.checks.at(-1).status = 'error';
    return;
  }
  const want = parsedChecks.want;

  // 1. shallow clone (no submodules, no hooks, https only)
  mkdirSync(WORK_DIR, { recursive: true });
  const repoDir = mkdtempSync(join(WORK_DIR, 'repo-'));
  const cloneUrl = `https://github.com/${result.repo}.git`;
  let clone;
  if (LOCAL_REPO_DIR) {
    // copy (not link) so the mounted directory is never modified; symlinks are not followed
    try {
      cpSync(resolve(LOCAL_REPO_DIR), repoDir, { recursive: true, dereference: false, filter: (src) => !src.split(sep).includes('.git') });
      clone = { code: 0, durationMs: 0, err: '', out: '' };
    } catch (e) {
      clone = { code: 1, durationMs: 0, err: String(e?.message ?? e), out: '' };
    }
  } else {
    clone = await run('git', ['-c', 'core.hooksPath=/dev/null', '-c', 'protocol.allow=never', '-c', 'protocol.https.allow=always', 'clone', '--depth', '1', '--single-branch', '--no-tags', '--no-recurse-submodules', cloneUrl, repoDir], { timeoutMs: 300000, cap: 256 * 1024 });
  }
  result.checks.push({ tool: 'git-clone', version: await toolVersion('git'), status: clone.code === 0 ? 'pass' : 'error', durationMs: clone.durationMs, summary: clone.code === 0 ? (LOCAL_REPO_DIR ? 'local directory copied (test mode, no clone)' : 'shallow clone ok') : `clone failed: ${tail(clone.err)}`, counts: {} });
  if (clone.code !== 0) return;
  const headRes = LOCAL_REPO_DIR ? { out: 'local-directory' } : await run('git', ['rev-parse', 'HEAD'], { cwd: repoDir, timeoutMs: 10000, cap: 1024 });
  result.commit = headRes.out.trim().slice(0, 64);

  // 2. patch: check first, then apply. A bad patch is a reported result, not a crash.
  if (patchBuf) {
    const patchFile = join(mkdtempSync(join(tmpdir(), 'mm-patch-')), 'change.diff');
    const buf = patchBuf;
    writeFileSync(patchFile, buf);
    const gitApply = (extra) => run('git', ['-c', 'core.hooksPath=/dev/null', 'apply', '--whitespace=nowarn', ...extra, patchFile], { cwd: repoDir, timeoutMs: 60000, cap: 64 * 1024 });
    const chk = await gitApply(['--check']);
    let applied = false;
    let summary;
    if (chk.code !== 0) summary = `git apply --check failed: ${tail(chk.err)}`;
    else {
      const ap = await gitApply([]);
      applied = ap.code === 0;
      summary = applied ? `patch applied (${buf.length} bytes)` : `git apply failed: ${tail(ap.err)}`;
    }
    result.patchApplied = applied;
    result.checks.push({ tool: 'git-apply', version: await toolVersion('git'), status: applied ? 'pass' : 'fail', durationMs: chk.durationMs, summary: clip(summary, 500), counts: {} });
    if (!applied) return; // verifying an unapplied patch would be misleading
  }

  const root = resolve(repoDir, SUBFOLDER || '.');
  if (relative(repoDir, root).startsWith('..') || !existsSync(root) || !statSync(root).isDirectory()) {
    skip('input-validation', `SUBFOLDER "${clip(SUBFOLDER, 100)}" not found in repo`);
    result.checks.at(-1).status = 'error';
    return;
  }
  rootPrefix = root;
  const has = (f) => existsSync(join(root, f));
  const hasPkg = has('package.json');
  const hasComposer = has('composer.json');
  const pkg = hasPkg ? readJson(join(root, 'package.json')) ?? {} : {};
  const tmp = mkdtempSync(join(tmpdir(), 'mm-out-'));
  const on = (c) => want.has(c);
  const notSelected = (c) => !on(c) && skip(c, 'not selected in CHECKS');
  const needs = (c, cond, why) => {
    if (!on(c)) return notSelected(c), false;
    if (!cond) return skip(c, why), false;
    return true;
  };
  let composerInstallOk;
  let npmInstallOk;

  // 3. static scanners first, on the clean tree (before installs add vendor/ and node_modules/)
  if (on('gitleaks')) {
    const rep = join(tmp, 'gitleaks.sarif');
    const r = await run('gitleaks', ['detect', '--no-git', '--source', root, '--redact', '--no-banner', '--exit-code', '1', '--report-format', 'sarif', '--report-path', rep]);
    const parsed = parseSarif(existsSync(rep) ? readFileSync(rep, 'utf8') : '{"runs":[]}', { override: 'high' });
    await record({ tool: 'gitleaks', failCodes: [1], versionArgs: ['version'] }, r, parsed);
  } else notSelected('gitleaks');

  if (on('semgrep')) {
    const rep = join(tmp, 'semgrep.sarif');
    const base = ['--sarif', '--output', rep, '--quiet', '--disable-version-check', '--error', '--timeout', '30', '--exclude', 'node_modules', '--exclude', 'vendor', root];
    // `--config auto` fetches rules from the semgrep registry (network, and semgrep requires metrics on for it).
    let r = await run('semgrep', ['scan', '--config', 'auto', ...base], { cwd: root });
    let mode = 'registry rules (--config auto)';
    const out = () => (existsSync(rep) ? readFileSync(rep, 'utf8') : '');
    if (!out() || (r.code !== 0 && r.code !== 1)) {
      if (existsSync(RULES_DIR)) {
        rmSync(rep, { force: true });
        const first = r;
        r = await run('semgrep', ['scan', '--config', RULES_DIR, '--metrics', 'off', ...base], { cwd: root });
        r.durationMs += first.durationMs;
        mode = `offline fallback rules (${first.timedOut ? 'auto timed out' : 'auto unavailable'})`;
      }
    }
    const parsed = parseSarif(out() || '');
    if (parsed.parseFailed && r.code === 0 && !out()) parsed.parseFailed = true;
    await record({ tool: 'semgrep', failCodes: [1] }, r, { ...parsed, summary: parsed.parseFailed ? undefined : `${mode}: ${parsed.findings.length} finding(s)` });
  } else notSelected('semgrep');

  if (on('trivy')) {
    const rep = join(tmp, 'trivy.sarif');
    const r = await run('trivy', ['fs', '--format', 'sarif', '--output', rep, '--quiet', '--scanners', 'vuln,misconfig', '--skip-dirs', 'node_modules,vendor', '--exit-code', '1', root]);
    const parsed = existsSync(rep) ? parseSarif(readFileSync(rep, 'utf8')) : { parseFailed: true, findings: [] };
    await record({ tool: 'trivy', failCodes: [1] }, r, parsed);
  } else notSelected('trivy');

  if (on('checkov')) {
    const r = await run('checkov', ['-d', root, '-o', 'json', '--quiet', '--skip-path', 'node_modules', '--skip-path', 'vendor'], { cwd: root });
    // checkov exits 1 on failed checks; empty stdout with exit 0 means no supported IaC files found
    const parsed = r.out.trim() ? parseCheckov(r.out) : r.code === 0 ? { findings: [], summary: 'no supported IaC files' } : { parseFailed: true, findings: [] };
    await record({ tool: 'checkov', failCodes: [1] }, r, parsed);
  } else notSelected('checkov');

  if (on('hadolint')) {
    const files = findFiles(root, (n) => /^Dockerfile(\..+)?$|\.Dockerfile$/.test(n));
    if (!files.length) skip('hadolint', 'no Dockerfile found');
    else {
      const r = await run('hadolint', ['--format', 'sarif', '--no-fail', ...files], { cwd: root });
      const parsed = parseSarif(r.out);
      parsed.findings.forEach((f) => (f.path = f.path ? relative(root, resolve(root, f.path)) : f.path));
      // --no-fail keeps exit 0; findings decide the status
      await record({ tool: 'hadolint' }, r, { ...parsed, status: parsed.parseFailed ? undefined : parsed.findings.some((f) => f.severity !== 'info') ? 'fail' : 'pass', summary: parsed.parseFailed ? undefined : `${files.length} Dockerfile(s), ${parsed.findings.length} finding(s)` });
    }
  } else notSelected('hadolint');

  // 4. PHP
  // Pick the PHP version from the project's own constraints; composer and phpunit run on it.
  let phpEnv = {};
  let phpRoot = root;
  let phpSel;
  if (hasComposer && (on('composer-install') || on('phpunit'))) {
    const installed = [];
    for (const label of PHP_VERSIONS) {
      const bin = label === PHP_DEFAULT ? 'php' : join(PHP_ROOT, label, 'shim', 'php');
      if (label !== PHP_DEFAULT && !existsSync(bin)) continue;
      const v = await run(bin, ['-r', 'echo PHP_VERSION;'], { timeoutMs: 30000, cap: 4096 });
      if (v.code === 0 && /^\d+\.\d+\.\d+/.test(v.out.trim())) installed.push({ label, version: v.out.trim().split(/[^\d.]/)[0], bin });
    }
    phpSel = selectPhp({ composerJson: readJson(join(root, 'composer.json')), lock: readJson(join(root, 'composer.lock')), installed, defaultLabel: PHP_DEFAULT });
    const chosen = installed.find((i) => i.label === phpSel.selected);
    if (chosen && chosen.label !== PHP_DEFAULT) phpEnv = { PATH: `${dirname(chosen.bin)}:${CHILD_ENV.PATH}` };
    result.php = {
      ...(phpSel.selected ? { selected: phpSel.selected, version: chosen?.version ?? phpSel.version } : {}),
      ...(phpSel.constraint ? { constraint: clip(phpSel.constraint, 200) } : {}),
      constraintSource: phpSel.constraintSource,
      reason: clip(phpSel.reason, 400),
      supported: phpSel.supported
    };
    console.error(`[php] ${phpSel.supported ? `selected ${phpSel.selected}` : 'unsupported'}: ${phpSel.reason}`);
  }
  let composerNoDev = false;
  if (needs('composer-install', hasComposer, 'no composer.json')) {
    const installArgs = ['install', '--no-scripts', '--no-plugins', '--no-interaction', '--no-progress', '--prefer-dist', '--no-security-blocking'];
    const lockJson = readJson(join(root, 'composer.lock'));
    let r;
    let note;
    let forced; // status override
    if (!phpSel.supported) {
      const msg = phpSel.reason.startsWith('no supported PHP version') ? phpSel.reason : `no supported PHP version for constraint ${phpSel.constraint ?? '(unknown)'}`;
      result.checks.push({ tool: 'composer-install', version: 'n/a', status: 'error', durationMs: 0, summary: clip(msg, 500), counts: {} });
      console.error(`[check] composer-install error ${msg}`);
      composerInstallOk = false;
    } else {
      if (lockIsStub(lockJson)) {
        // The committed composer.lock lists packages without dist/source, so `composer install` cannot use it. Resolve
        // fresh in a scratch copy and say so; the original lock is never reported as having built.
        const scratch = join(mkdtempSync(join(tmpdir(), 'mm-scratch-')), 'project');
        cpSync(root, scratch, { recursive: true, filter: (p) => !/(^|\/)(vendor|node_modules|\.git)$/.test(p) });
        rmSync(join(scratch, 'composer.lock'), { force: true });
        const upd = await run('composer', ['update', '--no-scripts', '--no-plugins', '--no-interaction', '--no-progress', '--ignore-platform-reqs', '--no-security-blocking'], { cwd: scratch, env: phpEnv, timeoutMs: INSTALL_TIMEOUT_MS, cap: 2 * 1024 * 1024 });
        const pkgs = [...(lockJson.packages ?? []), ...(lockJson['packages-dev'] ?? [])];
        const bare = pkgs.filter((p) => !p || (!p.dist && !p.source)).length;
        result.php.lockRegenerated = true;
        r = upd;
        composerNoDev = true; // a stub lock has no require-dev information; audit --locked needs --no-dev
        forced = 'fail'; // the original lock did not build, whatever the fresh resolution did
        note = `original composer.lock is a stub (${bare} of ${pkgs.length} locked packages have no dist/source) and cannot be installed; lock regenerated with composer update --ignore-platform-reqs in a scratch copy on PHP ${result.php.selected}: ${upd.code === 0 ? 'fresh install ok' : `fresh install failed: ${errText(upd.err || upd.out, 160)}`}. The original lock did not build`;
        if (upd.code === 0) phpRoot = scratch;
      } else {
        r = await run('composer', installArgs, { cwd: root, env: phpEnv, timeoutMs: INSTALL_TIMEOUT_MS, cap: 2 * 1024 * 1024 });
        // Old composer.lock files carry no require-dev information; composer refuses them unless --no-dev is given.
        if (r.code !== 0 && /doesnotcontainrequire-devinformation/.test((r.err + r.out).replace(/\s+/g, ''))) {
          const first = r;
          r = await run('composer', [...installArgs, '--no-dev'], { cwd: root, env: phpEnv, timeoutMs: INSTALL_TIMEOUT_MS, cap: 2 * 1024 * 1024 });
          r.durationMs += first.durationMs;
          composerNoDev = true; // audit must skip dev too, install success or not
          note = 'lock file has no require-dev information (old composer.lock format) (retried with --no-dev)';
        }
      }
      const c = await record({ name: 'composer-install', tool: 'composer', bin: 'composer', env: phpEnv, failCodes: [1, 2] }, r, forced ? { status: forced, summary: note } : { summary: r.code === 0 ? note : undefined });
      c.tool = 'composer-install';
      composerInstallOk = c.status === 'pass';
    }
  }
  if (needs('composer-audit', hasComposer, 'no composer.json')) {
    const auditArgs = ['audit', '--locked', '--format=json', '--no-interaction'];
    if (composerNoDev) auditArgs.push('--no-dev');
    const r = await run('composer', auditArgs, { cwd: root });
    const parsed = r.out.trim() ? parseComposerAudit(r.out) : { parseFailed: true, findings: [] };
    const c = await record({ name: 'composer-audit', tool: 'composer', bin: 'composer', failCodes: [1, 2, 3, 4, 5, 6, 7, 8] }, r, parsed);
    c.tool = 'composer-audit';
  }
  if (on('phpunit')) {
    const hasPhpunit = existsSync(join(phpRoot, 'vendor/bin/phpunit')) && (has('phpunit.xml') || has('phpunit.xml.dist') || has('phpunit.dist.xml'));
    if (!hasPhpunit) skip('phpunit', !(has('phpunit.xml') || has('phpunit.xml.dist') || has('phpunit.dist.xml')) ? 'no phpunit config' : composerInstallOk === false ? 'composer install did not succeed' : 'no vendor/bin/phpunit');
    else {
      const junit = join(tmp, 'phpunit.xml');
      const r = await run('php', ['vendor/bin/phpunit', '--log-junit', junit, '--no-interaction'], { cwd: phpRoot, env: phpEnv });
      const tests = parseJunit(junit);
      const parsed = { tests, findings: [], summary: tests ? `${tests.passed}/${tests.ran} passed` : `no junit output (exit ${r.code}): ${tail(r.err || r.out)}` };
      if (!tests && r.code !== 0) parsed.status = 'error';
      const c = await record({ tool: 'phpunit', bin: 'php', versionArgs: ['vendor/bin/phpunit', '--version'], cwd: phpRoot, env: phpEnv, failCodes: [1, 2] }, r, parsed);
      void c;
    }
  } else notSelected('phpunit');
  if (on('phpstan')) {
    const cfgFile = ['phpstan.neon', 'phpstan.neon.dist', 'phpstan.dist.neon'].find(has);
    const srcDir = ['src', 'app', 'lib'].find((d) => existsSync(join(root, d)));
    if (!cfgFile && !srcDir) skip('phpstan', 'no phpstan config and no src/app/lib directory');
    else {
      const args = ['analyse', '--error-format=json', '--no-progress', '--no-interaction', '--memory-limit=1G'];
      if (!cfgFile) args.push('--level=5', srcDir);
      const r = await run('phpstan', args, { cwd: root });
      await record({ tool: 'phpstan', failCodes: [1] }, r, parsePhpstan(r.out));
    }
  } else notSelected('phpstan');
  if (on('rector')) {
    const phpFiles = hasComposer || findFiles(root, (n) => n.endsWith('.php'), 4).length > 0;
    if (!phpFiles) skip('rector', 'no PHP project');
    else {
      const projectCfg = has('rector.php');
      const args = ['process', '--dry-run', '--output-format=json', '--no-progress-bar'];
      if (projectCfg) args.push('--config', join(root, 'rector.php'));
      else {
        const src = ['src', 'app', 'lib'].filter((d) => existsSync(join(root, d)));
        args.push('--config', RECTOR_FALLBACK, ...(src.length ? src : ['.']));
      }
      const r = await run('rector', args, { cwd: root });
      await record({ tool: 'rector', failCodes: [2] }, r, parseRector(r.out));
    }
  } else notSelected('rector');

  // 5. Node
  if (needs('npm-ci', hasPkg, 'no package.json')) {
    const cmd = has('package-lock.json') || has('npm-shrinkwrap.json') ? 'ci' : 'install';
    const r = await run('npm', [cmd, '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: root, timeoutMs: INSTALL_TIMEOUT_MS, cap: 2 * 1024 * 1024 });
    const c = await record({ name: 'npm-ci', tool: 'npm', bin: 'npm', failCodes: [1] }, r, { summary: cmd === 'ci' ? undefined : 'no lockfile: used npm install' });
    c.tool = 'npm-ci';
    npmInstallOk = c.status === 'pass';
  }
  if (needs('npm-audit', hasPkg, 'no package.json')) {
    const r = await run('npm', ['audit', '--json'], { cwd: root });
    const c = await record({ name: 'npm-audit', tool: 'npm', bin: 'npm', failCodes: [1] }, r, r.out.trim() ? parseNpmAudit(r.out) : { parseFailed: true, findings: [] });
    c.tool = 'npm-audit';
  }
  if (on('eslint')) {
    const cfgFile = ['eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs', 'eslint.config.ts', '.eslintrc', '.eslintrc.js', '.eslintrc.cjs', '.eslintrc.json', '.eslintrc.yml', '.eslintrc.yaml'].find(has) || pkg.eslintConfig;
    if (!has('node_modules/.bin/eslint') || !cfgFile) skip('eslint', !cfgFile ? 'no eslint config' : 'eslint not installed in project');
    else {
      const r = await run('node_modules/.bin/eslint', ['.', '-f', 'json'], { cwd: root });
      await record({ tool: 'eslint', bin: join(root, 'node_modules/.bin/eslint'), failCodes: [1], cwd: root }, r, r.out.trim() ? parseEslint(r.out) : { parseFailed: true, findings: [] });
    }
  } else notSelected('eslint');
  if (on('tsc')) {
    if (!has('tsconfig.json') || !has('node_modules/.bin/tsc')) skip('tsc', !has('tsconfig.json') ? 'no tsconfig.json' : 'typescript not installed in project');
    else {
      const r = await run('node_modules/.bin/tsc', ['--noEmit', '--pretty', 'false'], { cwd: root });
      await record({ tool: 'tsc', bin: join(root, 'node_modules/.bin/tsc'), failCodes: [1, 2], cwd: root }, r, parseTsc(r.out + '\n' + r.err));
    }
  } else notSelected('tsc');
  if (on('npm-test')) {
    const script = pkg.scripts?.test;
    if (!script || /no test specified/.test(script)) skip('npm-test', 'no test script');
    else if (npmInstallOk === false) skip('npm-test', 'npm install did not succeed');
    else {
      const r = await run('npm', ['test', '--silent'], { cwd: root, env: { CI: '1' } });
      const tests = parseJsTestOutput(r.out + '\n' + r.err);
      const parsed = { findings: [], tests, summary: tests ? `${tests.passed}/${tests.ran} passed` : `exit ${r.code}; test counts not recognised in output` };
      const c = await record({ name: 'npm-test', tool: 'npm', bin: 'npm', failCodes: [1] }, r, parsed);
      c.tool = 'npm-test';
    }
  } else notSelected('npm-test');

  // buildOk: every detected ecosystem installed, and the compiler (if run) accepted the code
  const compileFailed = result.checks.some((c) => c.tool === 'tsc' && c.status !== 'pass');
  const installs = [composerInstallOk, npmInstallOk].filter((x) => x !== undefined);
  result.buildOk = installs.length > 0 && installs.every(Boolean) && !compileFailed;
  rmSync(tmp, { recursive: true, force: true });
}

try {
  await main();
} catch (e) {
  fail(`unexpected error: ${e?.stack ?? e}`);
  result.checks.push({ tool: 'runner', version: process.version, status: 'error', durationMs: 0, summary: clip(`runner crashed: ${e?.message ?? e}`, 500), counts: {} });
}
finalize();
console.error(`[runner] wrote ${OUT_FILE}`);
