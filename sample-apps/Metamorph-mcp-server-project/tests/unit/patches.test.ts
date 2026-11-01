import { describe, it, expect } from 'vitest';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { applyPatches, generatePatches, unifiedDiff, untrackCommittedEnv } from '../../src/modules/planning/patches.js';
import type { DependencyFix, FilePatch } from '../../src/modules/assessment/types.js';
import { assessDirectory, type Analyzer } from '../../src/modules/assessment/assess.js';
import { writeNodeFixture, writePhpFixture } from '../helpers/fixtures.js';

const ALL = ['patch-dependencies', 'upgrade-runtime', 'remove-committed-env', 'add-packaging'];
const npm = (name: string, from: string, to: string): DependencyFix => ({ ecosystem: 'npm', name, from, to, urgent: false, dev: false });
const pkgist = (name: string, from: string, to: string): DependencyFix => ({ ecosystem: 'Packagist', name, from, to, urgent: false, dev: false });

function run(files: Record<string, string>, stageIds: string[], fixes: DependencyFix[] = [], stack: 'node' | 'php' | 'mixed' | 'unknown' = 'node'): FilePatch[] {
  return generatePatches({ stack, files, fixes, stageIds });
}

const ODD_PKG = '{\n\t"name":"x",\n\t"dependencies" :  {\n\t\t"lodash"  :   "^4.17.15",\n\t\t"zed":"1.0.0"\n\t},\n\t"devDependencies":{"vitest": "~1.0.0"}\n}\n\n';

describe('patch-dependencies', () => {
  it('changes only the one spec and preserves every other byte', () => {
    const [p] = run({ 'package.json': ODD_PKG }, ['patch-dependencies'], [npm('lodash', '4.17.15', '4.17.21')]);
    expect(p.after).toBe(ODD_PKG.replace('"^4.17.15"', '"^4.17.21"'));
    expect(p.before).toBe(ODD_PKG);
    expect(p.path).toBe('package.json');
    expect(p.stageId).toBe('patch-dependencies');
    expect(p.reason).toContain('npm install');
  });

  it('keeps caret, tilde and exact styles', () => {
    const pkg = '{"dependencies":{"a":"^1.0.0","b":"~1.0.0","c":"1.0.0"}}';
    const [p] = run({ 'package.json': pkg }, ['patch-dependencies'], [npm('a', '1.0.0', '1.2.3'), npm('b', '1.0.0', '1.2.3'), npm('c', '1.0.0', '1.2.3')]);
    expect(p.after).toBe('{"dependencies":{"a":"^1.2.3","b":"~1.2.3","c":"1.2.3"}}');
  });

  it('fixes devDependencies', () => {
    const [p] = run({ 'package.json': ODD_PKG }, ['patch-dependencies'], [npm('vitest', '1.0.0', '1.6.1')]);
    expect(p.after).toBe(ODD_PKG.replace('"~1.0.0"', '"~1.6.1"'));
  });

  it('skips entries that are missing and wrong ecosystems', () => {
    expect(run({ 'package.json': ODD_PKG }, ['patch-dependencies'], [npm('nope', '1.0.0', '2.0.0'), pkgist('lodash', '1.0.0', '2.0.0')])).toEqual([]);
  });

  it('is idempotent', () => {
    const fixes = [npm('lodash', '4.17.15', '4.17.21')];
    const first = run({ 'package.json': ODD_PKG }, ['patch-dependencies'], fixes);
    const next = applyPatches({ 'package.json': ODD_PKG }, first);
    expect(run(next, ['patch-dependencies'], fixes)).toEqual([]);
  });

  it('patches composer require and require-dev and never touches lockfiles', () => {
    const composer = '{\n  "require": {"php": ">=7.2", "guzzlehttp/guzzle": "^6.5.0"},\n  "require-dev": {"phpunit/phpunit": "9.5.0"}\n}\n';
    const files = { 'composer.json': composer, 'composer.lock': '{}' };
    const patches = run(files, ['patch-dependencies'], [pkgist('guzzlehttp/guzzle', '6.5.0', '8.3.1'), pkgist('phpunit/phpunit', '9.5.0', '11.5.2')], 'php');
    expect(patches).toHaveLength(1);
    expect(patches[0].after).toBe(composer.replace('^6.5.0', '^8.3.1').replace('9.5.0', '11.5.2'));
    expect(patches[0].reason).toContain('composer update');
  });
});

describe('upgrade-runtime', () => {
  it('creates .nvmrc when missing and replaces an old one', () => {
    const created = run({ 'package.json': '{}' }, ['upgrade-runtime']);
    expect(created).toEqual([expect.objectContaining({ path: '.nvmrc', before: undefined, after: '22\n' })]);
    const replaced = run({ 'package.json': '{}', '.nvmrc': 'v10\n' }, ['upgrade-runtime']);
    expect(replaced).toEqual([expect.objectContaining({ path: '.nvmrc', before: 'v10\n', after: '22\n' })]);
  });

  it('replaces engines.node by targeted edit', () => {
    const pkg = '{\n\t"engines" : { "node":   ">=10", "npm": ">=6" },\n\t"x": 1\n}\n';
    const patches = run({ 'package.json': pkg, '.nvmrc': '22\n' }, ['upgrade-runtime']);
    expect(patches).toHaveLength(1);
    expect(patches[0].after).toBe(pkg.replace('">=10"', '">=22"'));
  });

  it('replaces the PHP constraint', () => {
    const composer = '{"require": {"php": ">=7.2", "a/b": "^1"}}';
    const [p] = run({ 'composer.json': composer }, ['upgrade-runtime'], [], 'php');
    expect(p.after).toBe('{"require": {"php": "^8.4", "a/b": "^1"}}');
  });

  it('yields nothing for already-modern inputs', () => {
    const files = { 'package.json': '{"engines":{"node":">=22"}}', '.nvmrc': '22\n', 'composer.json': '{"require":{"php":"^8.4"}}' };
    expect(run(files, ['upgrade-runtime'], [], 'mixed')).toEqual([]);
    expect(run({ 'composer.json': '{"require":{"php":">=8.5"}}' }, ['upgrade-runtime'], [], 'php')).toEqual([]);
  });
});

describe('remove-committed-env', () => {
  const V1 = 'sk_live_' + 'abcdef123456';
  const V2 = 'p4ss' + 'w0rd-value-9';
  const V3 = 'AKIA' + 'ABCDEFGHIJKLMNOP';
  const ENV = `# database credentials\nDB_PASSWORD=${V2}\nexport STRIPE_KEY="${V1}"\nAWS_ID=${V3}\nEMPTY=\n`;

  it('never deletes env files; writes a key-only .env.example and the ignore lines', () => {
    const files = { '.env': ENV, '.env.production': 'B=2222\n', '.env.example': 'A=\n', '.env.sample': '', '.env.template': '', '.env.dist': '', '.gitignore': 'node_modules' };
    const patches = run(files, ['remove-committed-env']);
    expect(patches.map((p) => p.path)).toEqual(['.env.example', '.gitignore']);
    expect(patches.every((p) => p.after !== null)).toBe(true);
    expect(patches[0].after).toBe('A=\nDB_PASSWORD=\nSTRIPE_KEY=\nAWS_ID=\nEMPTY=\nB=\n');
    expect(patches[1].after).toBe('node_modules\n.env\n.env.*\n!.env.example\n');
    const json = JSON.stringify(patches.map((p) => [p.reason, p.after]));
    for (const v of [V1, V2, V3, '2222', 'database credentials']) expect(json).not.toContain(v);
    const next = applyPatches(files, patches);
    expect(next['.env']).toBe(ENV);
    expect(next['.env.production']).toBe('B=2222\n');
  });

  it('creates .env.example and .gitignore when absent and ignores nested env files', () => {
    const patches = run({ '.env.local': 'X=1', 'sub/.env': 'Y=2' }, ['remove-committed-env']);
    expect(patches.map((p) => p.path)).toEqual(['.env.example', '.gitignore']);
    expect(patches[0]).toMatchObject({ before: undefined, after: 'X=\n' });
    expect(patches[1]).toMatchObject({ before: undefined, after: '.env\n.env.*\n!.env.example\n' });
  });

  it('is idempotent: nothing to change once keys are listed and ignore lines exist', () => {
    const files = { '.env': 'A=secret1\nB=secret2\n', '.env.example': 'A=\nB=\n', '.gitignore': '.env\n.env.*\n!.env.example\n' };
    expect(run(files, ['remove-committed-env'])).toEqual([]);
    const first = run({ '.env': 'A=secret1\nB=secret2\nC=s3\n', '.env.example': 'A=\nB=' }, ['remove-committed-env']);
    expect(first[0].after).toBe('A=\nB=\nC=\n');
    const next = applyPatches({ '.env': 'A=secret1\nB=secret2\nC=s3\n', '.env.example': 'A=\nB=' }, first);
    expect(run(next, ['remove-committed-env'])).toEqual([]);
  });

  it('adds only the missing ignore lines', () => {
    const patches = run({ '.env': 'x=1', '.env.example': 'x=\n', '.gitignore': '.env\n!.env.example' }, ['remove-committed-env']);
    expect(patches.map((p) => p.path)).toEqual(['.gitignore']);
    expect(patches[0].after).toBe('.env\n!.env.example\n.env.*\n');
  });

  it('does nothing without env files', () => {
    expect(run({ '.env.example': 'A=', '.gitignore': '' }, ['remove-committed-env'])).toEqual([]);
  });

  it('untrackCommittedEnv drops env files from the copy only when .gitignore covers them', () => {
    const files = { '.env': 'A=1', '.env.local': 'B=2', '.env.example': 'A=', '.gitignore': '.env\n.env.*\n!.env.example\n' };
    const r = untrackCommittedEnv(files, files);
    expect(r.untracked).toEqual(['.env', '.env.local']);
    expect(Object.keys(r.files).sort()).toEqual(['.env.example', '.gitignore']);
    expect(untrackCommittedEnv({ '.env': 'A=1', '.gitignore': 'node_modules\n' }, { '.env': 'A=1' })).toEqual({ files: { '.env': 'A=1', '.gitignore': 'node_modules\n' }, untracked: [] });
  });
});

describe('add-packaging', () => {
  const dockerfile = (files: Record<string, string>): string => run(files, ['add-packaging']).find((p) => p.path === 'Dockerfile')?.after ?? '';

  it('derives CMD from scripts.start, then main, then index.js', () => {
    expect(dockerfile({ 'package.json': '{"scripts":{"start":"node server.js"},"main":"x.js"}' })).toContain('CMD ["node","server.js"]');
    expect(dockerfile({ 'package.json': '{"scripts":{"start":"nodemon app.js"},"main":"lib/main.js"}' })).toContain('CMD ["node","lib/main.js"]');
    expect(dockerfile({ 'package.json': '{"scripts":{"start":"node a.js && b"}}' })).toContain('CMD ["node","index.js"]');
    expect(dockerfile({ 'package.json': 'not json' })).toContain('CMD ["node","index.js"]');
  });

  it('writes a pinned Node Dockerfile and chooses npm ci only with a lockfile', () => {
    const withLock = dockerfile({ 'package.json': '{}', 'package-lock.json': '{}' });
    expect(withLock).toBe('FROM node:22-slim\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --omit=dev\nCOPY . .\nUSER node\nCMD ["node","index.js"]\n');
    expect(dockerfile({ 'package.json': '{}' })).toContain('RUN npm install --omit=dev');
    expect(withLock).not.toContain('latest');
  });

  it('writes the PHP Dockerfile and CI files', () => {
    const patches = run({ 'composer.json': '{}' }, ['add-packaging'], [], 'php');
    expect(patches.map((p) => p.path)).toEqual(['.github/workflows/ci.yml', 'Dockerfile']);
    expect(patches[1].after).toBe('FROM php:8.4-apache\nCOPY . /var/www/html/\nUSER www-data\n');
    expect(patches[0].after).toContain('actions/checkout@v4');
    expect(patches[0].after).toContain('composer validate --no-check-lock');
    expect(patches[0].after).toContain('composer install --no-interaction --prefer-dist');
  });

  it('writes the Node CI file', () => {
    const ci = run({ 'package.json': '{}', 'package-lock.json': '{}' }, ['add-packaging']).find((p) => p.path === '.github/workflows/ci.yml');
    expect(ci?.after).toContain('actions/setup-node@v4');
    expect(ci?.after).toContain('node-version: 22');
    expect(ci?.after).toContain('run: npm ci');
    expect(ci?.after).toContain('npm test --if-present');
    expect(ci?.before).toBeUndefined();
  });

  it('never overwrites an existing Dockerfile or CI file', () => {
    expect(run({ 'package.json': '{}', Dockerfile: 'FROM x\n', '.github/workflows/ci.yml': 'name: x\n' }, ['add-packaging'])).toEqual([]);
  });

  it('mixed stack prefers Node and creates one of each file', () => {
    const patches = run({ 'package.json': '{}', 'composer.json': '{}' }, ['add-packaging'], [], 'mixed');
    expect(patches).toHaveLength(2);
    expect(patches.find((p) => p.path === 'Dockerfile')?.after).toContain('node:22-slim');
  });
});

describe('generatePatches limits', () => {
  it('orders by stage then path and only handles known stage ids', () => {
    const files = { 'package.json': '{"dependencies":{"a":"1.0.0"}}', '.env': 'K=x' };
    const patches = run(files, ['add-packaging', 'unknown-stage', 'remove-committed-env', 'upgrade-runtime', 'patch-dependencies'], [npm('a', '1.0.0', '2.0.0')]);
    expect(patches.map((p) => `${p.stageId}:${p.path}`)).toEqual([
      'patch-dependencies:package.json',
      'upgrade-runtime:.nvmrc',
      'remove-committed-env:.env.example',
      'remove-committed-env:.gitignore',
      'add-packaging:.github/workflows/ci.yml',
      'add-packaging:Dockerfile'
    ]);
    expect(run(files, ['unknown-stage'])).toEqual([]);
  });

  it('skips files over 256 KiB', () => {
    const big = `{"dependencies":{"a":"1.0.0"},"pad":"${'x'.repeat(256 * 1024)}"}`;
    expect(run({ 'package.json': big }, ['patch-dependencies'], [npm('a', '1.0.0', '2.0.0')])).toEqual([]);
    expect(run({ '.env': 'K=' + 'x'.repeat(256 * 1024 + 1) }, ['remove-committed-env'])).toEqual([]);
  });

  it('yields one key-only example and one ignore patch however many env files exist', () => {
    const files: Record<string, string> = {};
    for (let i = 0; i < 30; i++) files[`.env.f${String(i).padStart(2, '0')}`] = `K${i}=x`;
    const patches = run(files, ['remove-committed-env']);
    expect(patches.map((p) => p.path)).toEqual(['.env.example', '.gitignore']);
  });
});

describe('applyPatches', () => {
  it('creates, edits and deletes without mutating the input', () => {
    const files = { a: '1', b: '2', c: '3' };
    const patches: FilePatch[] = [
      { path: 'a', stageId: 's', reason: 'r', before: '1', after: '10' },
      { path: 'b', stageId: 's', reason: 'r', before: '2', after: null },
      { path: 'd', stageId: 's', reason: 'r', after: 'new' }
    ];
    expect(applyPatches(files, patches)).toEqual({ a: '10', c: '3', d: 'new' });
    expect(files).toEqual({ a: '1', b: '2', c: '3' });
  });
});

describe('unifiedDiff', () => {
  it('formats a modification with context', () => {
    expect(unifiedDiff('f.txt', 'a\nb\nc\n', 'a\nB\nc\n')).toBe('--- a/f.txt\n+++ b/f.txt\n@@ -1,3 +1,3 @@\n a\n-b\n+B\n c\n');
  });

  it('formats an added and a deleted file', () => {
    expect(unifiedDiff('f', undefined, 'x\ny\n')).toBe('--- /dev/null\n+++ b/f\n@@ -0,0 +1,2 @@\n+x\n+y\n');
    expect(unifiedDiff('f', 'x\ny\n', null)).toBe('--- a/f\n+++ /dev/null\n@@ -1,2 +0,0 @@\n-x\n-y\n');
  });

  it('returns an empty string when nothing changed', () => {
    expect(unifiedDiff('f', 'same\n', 'same\n')).toBe('');
    expect(unifiedDiff('f', undefined, null)).toBe('');
  });

  it('splits distant changes into separate hunks with 3 lines of context', () => {
    const lines = Array.from({ length: 20 }, (_, i) => `l${i + 1}`);
    const after = lines.map((l) => (l === 'l2' || l === 'l19' ? `${l}x` : l));
    expect(unifiedDiff('f', lines.join('\n') + '\n', after.join('\n') + '\n')).toBe(
      [
        '--- a/f',
        '+++ b/f',
        '@@ -1,5 +1,5 @@',
        ' l1',
        '-l2',
        '+l2x',
        ' l3',
        ' l4',
        ' l5',
        '@@ -16,5 +16,5 @@',
        ' l16',
        ' l17',
        ' l18',
        '-l19',
        '+l19x',
        ' l20',
        ''
      ].join('\n')
    );
  });

  it('truncates past maxLines', () => {
    const before = Array.from({ length: 10 }, (_, i) => `o${i}`).join('\n') + '\n';
    const after = Array.from({ length: 10 }, (_, i) => `n${i}`).join('\n') + '\n';
    const out = unifiedDiff('f', before, after, 6);
    expect(out).toBe('--- a/f\n+++ b/f\n@@ -1,10 +1,10 @@\n-o0\n-o1\n-o2\n... diff truncated\n');
    expect(unifiedDiff('f', before, after).endsWith('+n9\n')).toBe(true);
  });
});

describe('integration with the assessor', () => {
  const KEYS = ['package.json', 'package-lock.json', '.nvmrc', '.env', 'composer.json', 'composer.lock'];

  async function load(dir: string): Promise<Record<string, string>> {
    const files: Record<string, string> = {};
    for (const k of KEYS) {
      try {
        files[k] = await readFile(join(dir, k), 'utf8');
      } catch {
        // file not part of this fixture
      }
    }
    return files;
  }

  async function sync(dir: string, before: Record<string, string>, after: Record<string, string>): Promise<void> {
    for (const k of Object.keys(before)) if (!(k in after)) await rm(join(dir, k));
    for (const [k, v] of Object.entries(after)) {
      await mkdir(dirname(join(dir, k)), { recursive: true });
      await writeFile(join(dir, k), v);
    }
  }

  const clean: Analyzer = async (pkgs) => pkgs.map((p) => ({ package: p, affected: false, findings: [], truncated: false }));
  const today = new Date('2026-10-30');

  it.each([
    {
      name: 'node',
      write: writeNodeFixture,
      stack: 'node' as const,
      fixes: [npm('lodash', '4.17.15', '4.17.21'), npm('express', '4.16.0', '4.19.2')],
      gone: ['node-runtime-eol', 'env-file-committed', 'no-container-packaging', 'no-ci']
    },
    {
      name: 'php',
      write: writePhpFixture,
      stack: 'php' as const,
      fixes: [pkgist('guzzlehttp/guzzle', '6.5.0', '8.3.1'), pkgist('symfony/http-kernel', '4.4.0', '7.3.0')],
      gone: ['php-version-eol', 'no-container-packaging', 'no-ci']
    }
  ])('raises the score of the legacy $name fixture and clears the targeted findings', async ({ write, stack, fixes, gone }) => {
    const dir = await mkdtemp(join(tmpdir(), 'patches-'));
    try {
      await write(dir);
      const before = await assessDirectory(dir, { analyze: clean, today });
      const files = await load(dir);
      const patches = generatePatches({ stack, files, fixes, stageIds: ALL });
      expect(patches.length).toBeGreaterThan(0);
      const patched = applyPatches(files, patches);
      // `git rm --cached` is not expressible as a patch: simulate it once .gitignore covers the env file.
      await sync(dir, files, untrackCommittedEnv(patched, files).files);
      const after = await assessDirectory(dir, { analyze: clean, today });
      const ids = new Set(after.topFindings.map((f) => f.id));
      const beforeIds = new Set(before.topFindings.map((f) => f.id));
      for (const id of gone) {
        expect(beforeIds.has(id)).toBe(true);
        expect(ids.has(id)).toBe(false);
      }
      expect(after.score.overall).toBeGreaterThan(before.score.overall);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
