// Deterministic file patches for the migration stages, plus a small unified-diff writer. Pure functions: no I/O.
// Only repo-root files (and .github/workflows/ci.yml) are edited, and only through the `files` map the caller passes in.

import type { DependencyFix, FilePatch } from '../assessment/types.js';

export interface PatchInput {
  stack: 'node' | 'php' | 'mixed' | 'unknown';
  files: Record<string, string>;
  fixes: DependencyFix[];
  stageIds: string[];
}

const MAX_PATCHES = 20;
const MAX_FILE_BYTES = 256 * 1024;
const NODE_TARGET = 22;
const PHP_TARGET = '8.4';
const STAGE_ORDER = ['patch-dependencies', 'upgrade-runtime', 'remove-committed-env', 'add-packaging'];
const IGNORE_LINES = ['.env', '.env.*', '!.env.example'];
const CI_PATH = '.github/workflows/ci.yml';

// ---- JSON text helpers: edit one value without re-serialising the file ----

function skipString(text: string, start: number): number {
  let i = start + 1;
  while (i < text.length && text[i] !== '"') i += text[i] === '\\' ? 2 : 1;
  return i;
}

function matchBrace(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (c === '"') i = skipString(text, i);
    else if (c === '{' || c === '[') depth++;
    else if (c === '}' || c === ']') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

// Range of the contents of a top-level object member, e.g. "dependencies": { ... }.
function objectRange(text: string, key: string): { start: number; end: number } | null {
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      const j = skipString(text, i);
      if (depth === 1 && text.slice(i + 1, j) === key) {
        const sep = text.slice(j + 1).match(/^\s*:\s*/);
        if (sep) {
          const open = j + 1 + sep[0].length;
          if (text[open] === '{') {
            const end = matchBrace(text, open);
            return end < 0 ? null : { start: open + 1, end };
          }
        }
      }
      i = j;
    } else if (c === '{' || c === '[') depth++;
    else if (c === '}' || c === ']') depth--;
  }
  return null;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\/-]/g, '\\$&');
}

type EntryEdit = { found: false } | { found: true; text: string | null }; // text null: found but nothing to change

function editEntry(text: string, section: string, name: string, update: (old: string) => string | null): EntryEdit {
  const range = objectRange(text, section);
  if (!range) return { found: false };
  const body = text.slice(range.start, range.end);
  const m = body.match(new RegExp(`("${escapeRe(name)}"\\s*:\\s*")((?:[^"\\\\]|\\\\.)*)(")`));
  if (!m || m.index === undefined) return { found: false };
  const next = update(m[2]);
  if (next === null) return { found: true, text: null };
  const at = range.start + m.index;
  return { found: true, text: text.slice(0, at) + m[1] + next + m[3] + text.slice(at + m[0].length) };
}

// ---- version helpers ----

const SPEC_RE = /^(\^|~|>=|=)?\s*v?(\d+(?:\.\d+){0,2})$/;

function tuple(v: string): number[] {
  const p = v.split('.').map(Number);
  while (p.length < 3) p.push(0);
  return p;
}

function cmp(a: number[], b: number[]): number {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  return 0;
}

// New spec keeping the original range prefix, or null when the spec is unparseable or already at/after `to`.
function fixedSpec(spec: string, to: string): string | null {
  const m = spec.trim().match(SPEC_RE);
  const target = to.replace(/^v/, '');
  if (!m || !/^\d+(\.\d+){0,2}$/.test(target)) return null;
  if (cmp(tuple(m[2]), tuple(target)) >= 0) return null;
  return `${m[1] ?? ''}${target}`;
}

function firstMajor(value: string): number | undefined {
  const m = value.match(/(\d+)/);
  return m ? Number(m[1]) : undefined;
}

function phpAtLeastTarget(constraint: string): boolean {
  const m = constraint.match(/(\d+)(?:\.(\d+))?/);
  if (!m) return false;
  const [tMajor, tMinor] = PHP_TARGET.split('.').map(Number);
  const major = Number(m[1]);
  const minor = Number(m[2] ?? 0);
  return major > tMajor || (major === tMajor && minor >= tMinor);
}

// ---- stages ----

type Draft = Omit<FilePatch, 'stageId'>;

function readable(files: Record<string, string>, path: string): string | undefined {
  const text = files[path];
  if (text === undefined || Buffer.byteLength(text) > MAX_FILE_BYTES) return undefined;
  return text;
}

function patchManifest(files: Record<string, string>, path: string, ecosystem: DependencyFix['ecosystem'], fixes: DependencyFix[]): Draft[] {
  const before = readable(files, path);
  if (before === undefined) return [];
  const sections = ecosystem === 'npm' ? ['dependencies', 'devDependencies'] : ['require', 'require-dev'];
  let text = before;
  const done: string[] = [];
  for (const fix of fixes.filter((f) => f.ecosystem === ecosystem)) {
    for (const section of sections) {
      const res = editEntry(text, section, fix.name, (old) => fixedSpec(old, fix.to));
      if (!res.found) continue;
      if (res.text !== null) {
        text = res.text;
        done.push(`${fix.name} to ${fix.to.replace(/^v/, '')}`);
      }
      break;
    }
  }
  if (text === before) return [];
  const refresh = ecosystem === 'npm' ? 'run npm install' : 'run composer update';
  return [{ path, before, after: text, reason: `Raise ${done.join(', ')} to patched versions; ${refresh} to refresh the lockfile.` }];
}

function dependencyPatches(input: PatchInput): Draft[] {
  return [...patchManifest(input.files, 'package.json', 'npm', input.fixes), ...patchManifest(input.files, 'composer.json', 'Packagist', input.fixes)];
}

function runtimePatches(input: PatchInput): Draft[] {
  const { files } = input;
  const out: Draft[] = [];
  const pkg = readable(files, 'package.json');
  if (pkg !== undefined) {
    const nvm = readable(files, '.nvmrc');
    const current = nvm ?? readable(files, '.node-version');
    const major = current === undefined ? undefined : firstMajor(current);
    if (major === undefined || major < NODE_TARGET) {
      out.push({ path: '.nvmrc', before: nvm, after: `${NODE_TARGET}\n`, reason: `Pin the Node.js runtime to ${NODE_TARGET}, a supported release.` });
    }
    const res = editEntry(pkg, 'engines', 'node', (old) => ((firstMajor(old) ?? 0) >= NODE_TARGET ? null : `>=${NODE_TARGET}`));
    if (res.found && res.text !== null) {
      out.push({ path: 'package.json', before: pkg, after: res.text, reason: `Declare the supported Node.js range as >=${NODE_TARGET} in engines.` });
    }
  }
  const composer = readable(files, 'composer.json');
  if (composer !== undefined) {
    const res = editEntry(composer, 'require', 'php', (old) => (phpAtLeastTarget(old) ? null : `^${PHP_TARGET}`));
    if (res.found && res.text !== null) {
      out.push({ path: 'composer.json', before: composer, after: res.text, reason: `Require PHP ^${PHP_TARGET}, a supported release.` });
    }
  }
  return out;
}

export const ENV_EXAMPLE = /\.(example|sample|template|dist)$/i;
const EXAMPLE_PATH = '.env.example';
const KEY_LINE = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_.-]{0,63})\s*=/;
const KEY_ONLY_LINE = /^(?:#[^=]*|\s*(?:export\s+)?[A-Za-z_][A-Za-z0-9_.-]{0,63}=\s*|\s*)$/;

// Top-level env files that are not templates (these are the committed-secret candidates).
export function committedEnvFiles(files: Record<string, string>): string[] {
  return Object.keys(files)
    .filter((path) => !path.includes('/') && /^\.env(\..+)?$/.test(path) && !ENV_EXAMPLE.test(path) && readable(files, path) !== undefined)
    .sort();
}

// Variable names only, in order of first appearance. Values and comments are never read into the result.
export function envKeyNames(text: string): string[] {
  const keys: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(KEY_LINE);
    if (m && !keys.includes(m[1])) keys.push(m[1]);
  }
  return keys;
}

// True when a (diff) line carries no value: a bare KEY=, a comment without "=", or blank.
export function isKeyOnlyLine(line: string): boolean {
  return KEY_ONLY_LINE.test(line);
}

// POSIX single-quote a path only when needed, so a crafted file name cannot inject shell syntax.
export function shellQuote(path: string): string {
  return /^[A-Za-z0-9._\/-]+$/.test(path) ? path : `'${path.replace(/'/g, `'\\''`)}'`;
}

function ignoresEnv(ignore: string | undefined): boolean {
  const lines = new Set((ignore ?? '').split(/\r?\n/).map((l) => l.trim()));
  return lines.has('.env*') || (lines.has('.env') && lines.has('.env.*'));
}

// Projection only: a patch cannot untrack a file, so `git rm --cached` is simulated by dropping the file from the copy.
// Done only when the (patched) .gitignore covers env files.
export function untrackCommittedEnv(patched: Record<string, string>, original: Record<string, string>): { files: Record<string, string>; untracked: string[] } {
  if (!ignoresEnv(patched['.gitignore'])) return { files: patched, untracked: [] };
  const untracked = committedEnvFiles(original);
  const files = { ...patched };
  for (const path of untracked) delete files[path];
  return { files, untracked };
}

function envPatches(input: PatchInput): Draft[] {
  const { files } = input;
  const out: Draft[] = [];
  const envFiles = committedEnvFiles(files);
  if (envFiles.length === 0) return out;

  // .env.example: KEY names only. Existing lines are never rewritten; missing keys are appended with blank values.
  const keys: string[] = [];
  for (const path of envFiles) for (const k of envKeyNames(files[path])) if (!keys.includes(k)) keys.push(k);
  const example = files[EXAMPLE_PATH];
  if (keys.length > 0 && (example === undefined || Buffer.byteLength(example) <= MAX_FILE_BYTES)) {
    const have = new Set(envKeyNames(example ?? ''));
    const add = keys.filter((k) => !have.has(k));
    if (add.length > 0) {
      const base = example === undefined || example === '' || example.endsWith('\n') ? (example ?? '') : `${example}\n`;
      const lines = add.map((k) => `${k}=`).join('\n');
      out.push({
        path: EXAMPLE_PATH,
        before: example,
        after: `${base}${lines}\n`,
        reason: `Record the variable names from ${envFiles.join(', ')} in .env.example with blank values. No value is copied.`
      });
    }
  }

  const ignore = files['.gitignore'];
  if (ignore === undefined || Buffer.byteLength(ignore) <= MAX_FILE_BYTES) {
    const present = new Set((ignore ?? '').split(/\r?\n/).map((l) => l.trim()));
    const missing = IGNORE_LINES.filter((l) => !present.has(l));
    if (missing.length > 0) {
      const base = ignore === undefined || ignore === '' || ignore.endsWith('\n') ? (ignore ?? '') : `${ignore}\n`;
      out.push({ path: '.gitignore', before: ignore, after: `${base}${missing.join('\n')}\n`, reason: 'Ignore environment files so they are not committed again.' });
    }
  }
  return out;
}

function pickKind(input: PatchInput): 'node' | 'php' | undefined {
  const hasNode = 'package.json' in input.files;
  const hasPhp = 'composer.json' in input.files;
  if (input.stack === 'php' && hasPhp) return 'php';
  if (hasNode) return 'node';
  return hasPhp ? 'php' : undefined;
}

function nodeStartCommand(pkg: string | undefined): string[] {
  let parsed: unknown;
  try {
    parsed = pkg === undefined ? undefined : JSON.parse(pkg);
  } catch {
    parsed = undefined;
  }
  const obj = typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  const scripts = typeof obj.scripts === 'object' && obj.scripts !== null ? (obj.scripts as Record<string, unknown>) : {};
  const start = typeof scripts.start === 'string' ? scripts.start.trim().match(/^node\s+([^\s&|;<>$`"'\\]+)$/) : null;
  if (start) return ['node', start[1]];
  const main = typeof obj.main === 'string' && /^[^\s"'\\]+$/.test(obj.main) ? obj.main : 'index.js';
  return ['node', main];
}

function nodeDockerfile(files: Record<string, string>): string {
  const install = 'package-lock.json' in files ? 'npm ci --omit=dev' : 'npm install --omit=dev';
  return [
    `FROM node:${NODE_TARGET}-slim`,
    'WORKDIR /app',
    'COPY package*.json ./',
    `RUN ${install}`,
    'COPY . .',
    'USER node',
    `CMD ${JSON.stringify(nodeStartCommand(files['package.json']))}`,
    ''
  ].join('\n');
}

function ciFile(kind: 'node' | 'php', files: Record<string, string>): string {
  const head = ['name: CI', 'on:', '  push:', '  pull_request:', 'jobs:', '  test:', '    runs-on: ubuntu-latest', '    steps:', '      - uses: actions/checkout@v4'];
  const steps =
    kind === 'node'
      ? [
          '      - uses: actions/setup-node@v4',
          '        with:',
          `          node-version: ${NODE_TARGET}`,
          `      - run: ${'package-lock.json' in files ? 'npm ci' : 'npm install'}`,
          '      - run: npm test --if-present'
        ]
      : ['      - run: composer validate --no-check-lock', '      - run: composer install --no-interaction --prefer-dist'];
  return [...head, ...steps, ''].join('\n');
}

function packagingPatches(input: PatchInput): Draft[] {
  const kind = pickKind(input);
  if (!kind) return [];
  const { files } = input;
  const out: Draft[] = [];
  if (!('Dockerfile' in files)) {
    const after = kind === 'node' ? nodeDockerfile(files) : `FROM php:${PHP_TARGET}-apache\nCOPY . /var/www/html/\nUSER www-data\n`;
    out.push({ path: 'Dockerfile', before: undefined, after, reason: 'Add a Dockerfile with a pinned base image so deployments are repeatable.' });
  }
  if (!(CI_PATH in files)) {
    out.push({ path: CI_PATH, before: undefined, after: ciFile(kind, files), reason: 'Add a CI workflow that installs dependencies and runs the tests on every push.' });
  }
  return out;
}

const GENERATORS: Record<string, (input: PatchInput) => Draft[]> = {
  'patch-dependencies': dependencyPatches,
  'upgrade-runtime': runtimePatches,
  'remove-committed-env': envPatches,
  'add-packaging': packagingPatches
};

export function generatePatches(input: PatchInput): FilePatch[] {
  const out: FilePatch[] = [];
  for (const stageId of STAGE_ORDER) {
    if (!input.stageIds.includes(stageId)) continue;
    const drafts = GENERATORS[stageId](input).sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
    for (const d of drafts) out.push({ stageId, path: d.path, reason: d.reason, before: d.before, after: d.after });
  }
  return out.slice(0, MAX_PATCHES);
}

export function applyPatches(files: Record<string, string>, patches: FilePatch[]): Record<string, string> {
  const out: Record<string, string> = { ...files };
  for (const p of patches) {
    if (p.after === null) delete out[p.path];
    else out[p.path] = p.after;
  }
  return out;
}

// ---- unified diff ----

type Op = { t: ' ' | '+' | '-'; line: string };

function splitLines(text: string): string[] {
  if (text === '') return [];
  const lines = text.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  return lines;
}

const MAX_DP_CELLS = 16_000_000;

function diffOps(a: string[], b: string[]): Op[] {
  let head = 0;
  while (head < a.length && head < b.length && a[head] === b[head]) head++;
  let tail = 0;
  while (tail < a.length - head && tail < b.length - head && a[a.length - 1 - tail] === b[b.length - 1 - tail]) tail++;
  const am = a.slice(head, a.length - tail);
  const bm = b.slice(head, b.length - tail);
  const ops: Op[] = a.slice(0, head).map((line) => ({ t: ' ', line }));
  const n = am.length;
  const m = bm.length;
  if ((n + 1) * (m + 1) > MAX_DP_CELLS) {
    for (const line of am) ops.push({ t: '-', line });
    for (const line of bm) ops.push({ t: '+', line });
  } else {
    const w = m + 1;
    const lcs = new Uint32Array((n + 1) * w);
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        lcs[i * w + j] = am[i] === bm[j] ? lcs[(i + 1) * w + j + 1] + 1 : Math.max(lcs[(i + 1) * w + j], lcs[i * w + j + 1]);
      }
    }
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (am[i] === bm[j]) {
        ops.push({ t: ' ', line: am[i] });
        i++;
        j++;
      } else if (lcs[(i + 1) * w + j] >= lcs[i * w + j + 1]) ops.push({ t: '-', line: am[i++] });
      else ops.push({ t: '+', line: bm[j++] });
    }
    while (i < n) ops.push({ t: '-', line: am[i++] });
    while (j < m) ops.push({ t: '+', line: bm[j++] });
  }
  for (const line of a.slice(a.length - tail)) ops.push({ t: ' ', line });
  return ops;
}

const CONTEXT = 3;

function range(start: number, count: number): string {
  return count === 1 ? `${start}` : `${start},${count}`;
}

export function unifiedDiff(path: string, before: string | undefined, after: string | null, maxLines = 400): string {
  if (before === undefined && after === null) return '';
  if (before === after) return '';
  const ops = diffOps(splitLines(before ?? ''), splitLines(after ?? ''));
  const changed: number[] = [];
  ops.forEach((op, i) => {
    if (op.t !== ' ') changed.push(i);
  });
  if (changed.length === 0) return '';

  const out: string[] = [`--- ${before === undefined ? '/dev/null' : `a/${path}`}`, `+++ ${after === null ? '/dev/null' : `b/${path}`}`];
  // Old/new line counts before each op index.
  const oldAt: number[] = [];
  const newAt: number[] = [];
  let o = 0;
  let n = 0;
  for (const op of ops) {
    oldAt.push(o);
    newAt.push(n);
    if (op.t !== '+') o++;
    if (op.t !== '-') n++;
  }

  let k = 0;
  while (k < changed.length) {
    let last = k;
    while (last + 1 < changed.length && changed[last + 1] - changed[last] - 1 <= CONTEXT * 2) last++;
    const from = Math.max(0, changed[k] - CONTEXT);
    const to = Math.min(ops.length - 1, changed[last] + CONTEXT);
    const slice = ops.slice(from, to + 1);
    const oldCount = slice.filter((x) => x.t !== '+').length;
    const newCount = slice.filter((x) => x.t !== '-').length;
    const oldStart = oldCount === 0 ? oldAt[from] : oldAt[from] + 1;
    const newStart = newCount === 0 ? newAt[from] : newAt[from] + 1;
    out.push(`@@ -${range(oldStart, oldCount)} +${range(newStart, newCount)} @@`);
    for (const x of slice) out.push(`${x.t}${x.line}`);
    k = last + 1;
  }

  if (out.length > maxLines) return [...out.slice(0, maxLines), '... diff truncated'].join('\n') + '\n';
  return out.join('\n') + '\n';
}
