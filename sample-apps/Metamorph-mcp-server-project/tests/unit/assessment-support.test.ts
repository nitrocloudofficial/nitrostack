import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { chmod, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectHosting } from '../../src/modules/assessment/hosting.js';
import { DEFAULT_READ_LIMITS, KEY_FILES, readKeyFiles } from '../../src/modules/assessment/files.js';
import { scoreFindings, topFindings } from '../../src/modules/assessment/score.js';
import type { Category, Finding, Severity } from '../../src/modules/assessment/types.js';

const finding = (id: string, severity: Severity, category: Category = 'security', evidence?: string): Finding => ({
  id,
  category,
  severity,
  title: id,
  evidence,
  recommendation: 'Fix it.'
});

describe('readKeyFiles', () => {
  let root: string;
  let outside: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mm-files-'));
    outside = await mkdtemp(join(tmpdir(), 'mm-outside-'));
  });
  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  });

  it('exposes the documented defaults', () => {
    expect(DEFAULT_READ_LIMITS).toEqual({ maxFiles: 5000, maxDepth: 12, maxFileBytes: 262144, maxPhpFiles: 200, maxPhpBytes: 204800, maxScanFiles: 400, maxScanFileBytes: 131072, maxScanTotalBytes: 8388608 });
    expect(KEY_FILES).toContain('package.json');
  });

  it('reads key files and lists all paths in a normal project', async () => {
    await writeFile(join(root, 'package.json'), '{"name":"x"}');
    await writeFile(join(root, 'README.md'), 'hello');
    await writeFile(join(root, 'yarn.lock'), 'lock');
    const r = await readKeyFiles(root);
    expect(r.paths).toEqual(['README.md', 'package.json', 'yarn.lock']);
    expect(r.contents).toEqual({ 'package.json': '{"name":"x"}' });
    expect(r.truncated).toBe(false);
  });

  it('finds key files in nested folders with posix relative paths', async () => {
    await mkdir(join(root, 'api', 'deep'), { recursive: true });
    await writeFile(join(root, 'api', 'package.json'), '{}');
    await writeFile(join(root, 'api', 'deep', 'Dockerfile'), 'FROM node:20');
    await mkdir(join(root, '.github', 'workflows'), { recursive: true });
    await writeFile(join(root, '.github', 'workflows', 'ci.yml'), 'on: push');
    const r = await readKeyFiles(root);
    expect(r.paths).toContain('api/deep/Dockerfile');
    expect(r.paths).toContain('.github/workflows/ci.yml');
    expect(Object.keys(r.contents).sort()).toEqual(['api/deep/Dockerfile', 'api/package.json']);
  });

  it('skips a symlink to an outside file and never reads it', async () => {
    await writeFile(join(outside, 'secret.json'), '{"secret":"outside-value"}');
    await symlink(join(outside, 'secret.json'), join(root, 'package.json'));
    await symlink(outside, join(root, 'linked-dir'));
    const r = await readKeyFiles(root);
    expect(r.paths).toEqual([]);
    expect(JSON.stringify(r)).not.toContain('outside-value');
  });

  it('survives a symlink loop', async () => {
    await mkdir(join(root, 'a'));
    await symlink(root, join(root, 'a', 'loop'));
    await writeFile(join(root, 'a', 'Procfile'), 'web: node x');
    const r = await readKeyFiles(root);
    expect(r.paths).toEqual(['a/Procfile']);
    expect(r.truncated).toBe(false);
  });

  it('lists .env paths and keeps variable names only, never values', async () => {
    await writeFile(join(root, '.env'), 'API_KEY=super-secret-value');
    await writeFile(join(root, '.env.production'), 'TOKEN=another-secret');
    const r = await readKeyFiles(root);
    expect(r.paths).toEqual(['.env', '.env.production']);
    expect(r.contents).toEqual({ '.env': 'API_KEY=\n', '.env.production': 'TOKEN=\n' });
    expect(JSON.stringify(r)).not.toContain('secret');
  });

  it('skips a key file bigger than maxFileBytes but still lists it', async () => {
    await writeFile(join(root, 'package.json'), 'x'.repeat(100));
    await writeFile(join(root, 'tsconfig.json'), '{}');
    const r = await readKeyFiles(root, { maxFileBytes: 50 });
    expect(r.paths).toContain('package.json');
    expect(r.contents).toEqual({ 'tsconfig.json': '{}' });
  });

  it('skips ignored directories', async () => {
    for (const d of ['node_modules', 'vendor', '.git', 'dist', 'build', '.next', '__pycache__']) {
      await mkdir(join(root, d));
      await writeFile(join(root, d, 'package.json'), '{}');
    }
    await writeFile(join(root, 'package.json'), '{}');
    const r = await readKeyFiles(root);
    expect(r.paths).toEqual(['package.json']);
  });

  it('sets truncated when maxFiles is reached', async () => {
    for (let i = 0; i < 5; i++) await writeFile(join(root, `f${i}.txt`), 'x');
    const r = await readKeyFiles(root, { maxFiles: 3 });
    expect(r.paths).toHaveLength(3);
    expect(r.truncated).toBe(true);
  });

  it('does not set truncated when exactly maxFiles files exist', async () => {
    for (let i = 0; i < 3; i++) await writeFile(join(root, `f${i}.txt`), 'x');
    const r = await readKeyFiles(root, { maxFiles: 3 });
    expect(r.paths).toHaveLength(3);
    expect(r.truncated).toBe(false);
  });

  it('sets truncated when maxDepth cuts off folders', async () => {
    await mkdir(join(root, 'a', 'b', 'c'), { recursive: true });
    await writeFile(join(root, 'a', 'one.txt'), 'x');
    await writeFile(join(root, 'a', 'b', 'c', 'deep.txt'), 'x');
    const r = await readKeyFiles(root, { maxDepth: 2 });
    expect(r.paths).toEqual(['a/one.txt']);
    expect(r.truncated).toBe(true);
    const full = await readKeyFiles(root, { maxDepth: 3 });
    expect(full.paths).toContain('a/b/c/deep.txt');
    expect(full.truncated).toBe(false);
  });

  it('collects php files within count and size limits', async () => {
    for (let i = 0; i < 4; i++) await writeFile(join(root, `p${i}.php`), `<?php // ${'a'.repeat(100)}`);
    const r = await readKeyFiles(root, { maxPhpFiles: 2, maxPhpBytes: 20 });
    expect(r.php).toHaveLength(2);
    expect(r.php[0].path).toBe('p0.php');
    expect(r.php.every((p) => p.content.length <= 20)).toBe(true);
    expect(r.paths).toHaveLength(4);
  });

  it.skipIf(process.getuid?.() === 0)('skips an unreadable file without throwing', async () => {
    await writeFile(join(root, 'package.json'), '{}');
    await writeFile(join(root, 'composer.json'), '{}');
    await chmod(join(root, 'package.json'), 0o000);
    const r = await readKeyFiles(root);
    expect(r.contents).toEqual({ 'composer.json': '{}' });
    expect(r.paths).toContain('package.json');
  });

  it('throws a clear error for a missing directory', async () => {
    await expect(readKeyFiles(join(root, 'nope'))).rejects.toThrow(/Cannot read project directory/);
  });

  it('throws a clear error when the path is a file', async () => {
    await writeFile(join(root, 'f.txt'), 'x');
    await expect(readKeyFiles(join(root, 'f.txt'))).rejects.toThrow(/Not a directory/);
  });
});

describe('detectHosting hints', () => {
  const hint = (paths: string[], contents: Record<string, string> = {}) => detectHosting(paths, contents).hints;

  it('detects each hint', () => {
    expect(hint(['Dockerfile'])).toContain('docker');
    expect(hint(['svc/docker-compose.yaml'])).toContain('docker-compose');
    expect(hint(['serverless.yml'])).toContain('serverless-framework');
    expect(hint(['vercel.json'])).toContain('vercel');
    expect(hint(['wrangler.toml'])).toContain('cloudflare-workers');
    expect(hint(['netlify.toml'])).toContain('netlify');
    expect(hint(['Procfile'])).toContain('heroku-style (Procfile)');
    expect(hint(['app.yaml'])).toContain('google-app-engine');
    expect(hint(['infra/main.tf'])).toContain('terraform');
    expect(hint(['.github/workflows/ci.yml'])).toContain('github-actions');
    expect(hint(['public/.htaccess'])).toContain('apache-htaccess');
    expect(hint(['nginx.conf'])).toContain('nginx');
  });

  it('detects kubernetes only from a yaml with apiVersion and a workload kind', () => {
    const manifest = 'apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: x\n';
    expect(hint(['k8s/app.yaml'], { 'k8s/app.yaml': manifest })).toContain('kubernetes');
    expect(hint(['k8s/svc.yml'], { 'k8s/svc.yml': 'apiVersion: v1\nkind: Service\n' })).toContain('kubernetes');
    expect(hint(['k8s/cm.yaml'], { 'k8s/cm.yaml': 'apiVersion: v1\nkind: ConfigMap\n' })).not.toContain('kubernetes');
    expect(hint(['other.yaml'], { 'other.yaml': 'kind: Deployment\n' })).not.toContain('kubernetes');
  });

  it('returns sorted, deduplicated hints', () => {
    const h = hint(['a/Dockerfile', 'b/Dockerfile', 'vercel.json', 'a.tf', 'b.tf']);
    expect(h).toEqual([...new Set(h)].sort());
    expect(h.filter((x) => x === 'docker')).toHaveLength(1);
  });

  it('returns no hints for an unrelated project', () => {
    expect(hint(['src/index.ts', 'package.json'])).toEqual([]);
  });
});

describe('detectHosting findings', () => {
  const ids = (paths: string[], contents: Record<string, string> = {}, opts?: { isNodeMajorEol?: (m: number) => boolean }) =>
    detectHosting(paths, contents, opts).findings.map((f) => f.id);
  const cleanDockerfile = 'FROM node:22-alpine\nUSER node\nCMD ["node","x.js"]\n';

  it('stays quiet on a clean sample', () => {
    const r = detectHosting(['Dockerfile', '.github/workflows/ci.yml', '.env.example'], { Dockerfile: cleanDockerfile }, { isNodeMajorEol: () => false });
    expect(r.findings).toEqual([]);
  });

  it('flags committed env files but not templates', () => {
    const r = detectHosting(['.env', 'api/.env.production', '.env.local', '.env.example', '.env.sample'], {});
    const ev = r.findings.filter((f) => f.id === 'env-file-committed').map((f) => f.evidence);
    expect(ev).toEqual(['.env', '.env.local', 'api/.env.production']);
    const f = r.findings.find((x) => x.id === 'env-file-committed');
    expect(f?.severity).toBe('high');
    expect(f?.category).toBe('security');
  });

  it('flags missing container packaging, and not when any platform hint exists', () => {
    expect(ids(['src/a.ts'])).toContain('no-container-packaging');
    for (const p of ['Dockerfile', 'serverless.yml', 'vercel.json', 'wrangler.toml', 'netlify.toml', 'Procfile']) {
      expect(ids([p])).not.toContain('no-container-packaging');
    }
    const k8s = { 'k.yaml': 'apiVersion: v1\nkind: Ingress\n' };
    expect(ids(['k.yaml'], k8s)).not.toContain('no-container-packaging');
  });

  it('flags missing CI, and not for any known CI system', () => {
    expect(ids(['src/a.ts'])).toContain('no-ci');
    for (const p of ['.github/workflows/test.yml', '.gitlab-ci.yml', '.circleci/config.yml', 'Jenkinsfile']) {
      expect(ids([p])).not.toContain('no-ci');
    }
  });

  it('uses the EOL callback for node base images', () => {
    const calls: number[] = [];
    const eol = (m: number) => {
      calls.push(m);
      return m < 20;
    };
    const old = detectHosting(['Dockerfile'], { Dockerfile: 'FROM node:16-alpine\nUSER node\n' }, { isNodeMajorEol: eol });
    const f = old.findings.find((x) => x.id === 'docker-base-image-eol');
    expect(f?.severity).toBe('high');
    expect(f?.category).toBe('runtime');
    expect(f?.evidence).toContain('Dockerfile');
    expect(f?.evidence).toContain('node:16-alpine');
    expect(calls).toContain(16);
    const fresh = detectHosting(['Dockerfile'], { Dockerfile: 'FROM node:22\nUSER node\n' }, { isNodeMajorEol: eol });
    expect(fresh.findings.map((x) => x.id)).not.toContain('docker-base-image-eol');
  });

  it('does not report EOL without a callback', () => {
    expect(ids(['Dockerfile'], { Dockerfile: 'FROM node:10\nUSER node\n' })).not.toContain('docker-base-image-eol');
  });

  it('flags latest or untagged base images but not pinned, scratch or stage references', () => {
    const latest = detectHosting(['Dockerfile'], { Dockerfile: 'FROM nginx:latest\nUSER n\n' });
    expect(latest.findings.find((f) => f.id === 'docker-latest-tag')?.severity).toBe('low');
    expect(ids(['Dockerfile'], { Dockerfile: 'FROM ubuntu\nUSER n\n' })).toContain('docker-latest-tag');
    const multi = 'FROM node:22 AS build\nFROM scratch\nFROM build\nFROM alpine@sha256:abc\nFROM registry.local:5000/app:1.2\nUSER n\n';
    expect(ids(['Dockerfile'], { Dockerfile: multi })).not.toContain('docker-latest-tag');
  });

  it('flags a Dockerfile without USER', () => {
    const r = detectHosting(['Dockerfile'], { Dockerfile: 'FROM node:22\nCMD ["node"]\n' });
    const f = r.findings.find((x) => x.id === 'docker-runs-as-root');
    expect(f?.severity).toBe('low');
    expect(f?.category).toBe('security');
    expect(ids(['Dockerfile'], { Dockerfile: cleanDockerfile })).not.toContain('docker-runs-as-root');
  });

  it('does not turn terraform or kubernetes into findings', () => {
    const r = detectHosting(['main.tf', 'k.yaml'], { 'k.yaml': 'apiVersion: v1\nkind: Deployment\n' });
    expect(r.findings.map((f) => f.id)).not.toContain('terraform-present');
    expect(r.findings.map((f) => f.id)).not.toContain('kubernetes-present');
  });

  it('orders findings by severity then id and is deterministic', () => {
    const paths = ['.env', 'Dockerfile'];
    const contents = { Dockerfile: 'FROM node:14\n' };
    const opts = { isNodeMajorEol: () => true };
    const a = detectHosting(paths, contents, opts).findings;
    const b = detectHosting([...paths].reverse(), contents, opts).findings;
    expect(a).toEqual(b);
    expect(a.map((f) => f.id)).toEqual(['docker-base-image-eol', 'env-file-committed', 'docker-runs-as-root', 'no-ci']);
  });
});

describe('scoreFindings', () => {
  it('scores 100 with no findings', () => {
    const s = scoreFindings([]);
    expect(s.overall).toBe(100);
    expect(Object.values(s.byCategory).every((v) => v === 100)).toBe(true);
    expect(s.counts).toEqual({ critical: 0, high: 0, medium: 0, low: 0, info: 0 });
  });

  it('deducts the fixed weights', () => {
    expect(scoreFindings([finding('a', 'critical')]).overall).toBe(75);
    expect(scoreFindings([finding('a', 'high')]).overall).toBe(88);
    expect(scoreFindings([finding('a', 'medium')]).overall).toBe(95);
    expect(scoreFindings([finding('a', 'low')]).overall).toBe(98);
    expect(scoreFindings([finding('a', 'info')]).overall).toBe(100);
    const mix = scoreFindings([finding('a', 'critical'), finding('b', 'high'), finding('c', 'medium'), finding('d', 'low'), finding('e', 'info')]);
    expect(mix.overall).toBe(56);
    expect(mix.counts).toEqual({ critical: 1, high: 1, medium: 1, low: 1, info: 1 });
  });

  it('floors at 0', () => {
    const many = Array.from({ length: 10 }, (_, i) => finding(`c${i}`, 'critical'));
    expect(scoreFindings(many).overall).toBe(0);
  });

  it('isolates categories', () => {
    const s = scoreFindings([finding('a', 'critical', 'security'), finding('b', 'low', 'cloud')]);
    expect(s.byCategory.security).toBe(75);
    expect(s.byCategory.cloud).toBe(98);
    expect(s.byCategory.runtime).toBe(100);
    expect(s.overall).toBe(73);
  });
});

describe('topFindings', () => {
  it('dedupes by id and evidence', () => {
    const r = topFindings([finding('a', 'high', 'security', 'x'), finding('a', 'high', 'security', 'x'), finding('a', 'high', 'security', 'y')]);
    expect(r).toHaveLength(2);
  });

  it('orders by severity desc, then category, then id', () => {
    const r = topFindings([
      finding('z', 'low', 'cloud'),
      finding('b', 'high', 'standards'),
      finding('a', 'high', 'security'),
      finding('c', 'high', 'security'),
      finding('m', 'critical', 'runtime')
    ]);
    expect(r.map((f) => f.id)).toEqual(['m', 'a', 'c', 'b', 'z']);
  });

  it('limits to max, default 10', () => {
    const many = Array.from({ length: 15 }, (_, i) => finding(`f${String(i).padStart(2, '0')}`, 'low'));
    expect(topFindings(many)).toHaveLength(10);
    expect(topFindings(many, 3)).toHaveLength(3);
    expect(topFindings(many, 0)).toEqual([]);
  });

  it('does not mutate the input', () => {
    const input = [finding('b', 'low'), finding('a', 'high')];
    topFindings(input);
    expect(input.map((f) => f.id)).toEqual(['b', 'a']);
  });
});
