import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diffManifests, diffFiles, ReleaseDiffService } from '../src/modules/bouncer/release-diff.service.js';
import type { FileMap, VersionManifest } from '../src/modules/analysis/signal.js';
import type { NpmRegistryService, Packument } from '../src/modules/registry/npm-registry.service.js';
import type { TarballService } from '../src/modules/registry/tarball.service.js';

const manifest = (version: string): VersionManifest => ({
  name: 'axios', version, dist: { tarball: `https://registry.npmjs.org/axios/-/axios-${version}.tgz` },
});
const files = (entries: Record<string, string | Uint8Array>): FileMap => new Map(
  Object.entries(entries).map(([path, value]) => [path, typeof value === 'string' ? Buffer.from(value) : value]),
);
const before = manifest('1.0.0');
const after = manifest('1.1.0');
const packument = (): Packument => ({ name: 'axios', 'dist-tags': { latest: '1.1.0' },
  versions: { '1.0.0': before, '1.1.0': after },
  time: { '1.0.0': '2026-03-30T00:00:00Z', '1.1.0': '2026-03-31T01:30:00Z' },
});
function service(pack: Packument | null, fetchFiles: TarballService['fetchFiles']): ReleaseDiffService {
  return new ReleaseDiffService({ getPackument: async () => pack } as unknown as NpmRegistryService,
    { fetchFiles } as TarballService);
}

test('axios-like metadata records publisher, lost provenance, scripts and dependency changes', () => {
  const old: VersionManifest = { ...before, _npmUser: { name: 'maintainer' },
    dist: { ...before.dist, attestations: { url: 'https://fixture.invalid/attestations' } },
    scripts: { install: 'old', postinstall: 'removed', test: 'before' },
    dependencies: { stable: '^1', changed: '^1', removed: '~2' },
    optionalDependencies: { optional: '^1', removed: '1' },
  };
  const next: VersionManifest = { ...after, _npmUser: { name: 'new-publisher' },
    scripts: { preinstall: 'new', install: 'changed', test: 'after' },
    dependencies: { stable: '^1', changed: '^2', 'plain-crypto-js': '^4' },
    optionalDependencies: { optional: '^2', added: '3' },
  };
  const result = diffManifests(old, next, packument().time);
  assert.deepEqual(result.publisher, { before: 'maintainer', after: 'new-publisher' });
  assert.deepEqual(result.provenance, { before: true, after: false });
  assert.deepEqual(result.scripts, [
    { name: 'preinstall', before: null, after: 'new' },
    { name: 'install', before: 'old', after: 'changed' },
    { name: 'postinstall', before: 'removed', after: null },
  ]);
  assert.deepEqual(result.dependencies, {
    added: [{ name: 'plain-crypto-js', range: '^4' }],
    removed: [{ name: 'removed', range: '~2' }],
    changed: [{ name: 'changed', before: '^1', after: '^2' }],
  });
  assert.deepEqual(result.optionalDependencies, {
    added: [{ name: 'added', range: '3' }], removed: [{ name: 'removed', range: '1' }],
    changed: [{ name: 'optional', before: '^1', after: '^2' }],
  });
  assert.deepEqual(result.publishTimes, {
    before: packument().time['1.0.0'], after: packument().time['1.1.0'], gapHours: 25.5,
  });
  assert.equal(diffManifests(next, old, packument().time).publishTimes.gapHours, -25.5);
});

test('metadata handles absent fields and invalid or unknown publish times', () => {
  const result = diffManifests(before, after);
  assert.deepEqual(result.publisher, { before: null, after: null });
  assert.deepEqual(result.provenance, { before: false, after: false });
  assert.deepEqual(result.scripts, []);
  assert.deepEqual(result.publishTimes, { before: null, after: null, gapHours: null });
  assert.equal(diffManifests(before, after, { '1.0.0': 'invalid', '1.1.0': 'invalid' }).publishTimes.gapHours, null);
});

test('file comparison detects equal-length content changes and reports sorted paths and byte sizes', () => {
  const result = diffFiles(files({ 'same.js': 'ok', 'changed.js': 'old', 'removed': '' }),
    files({ 'z.txt': 'z', 'a.txt': 'aa', 'same.js': 'ok', 'changed.js': 'new' }));
  assert.deepEqual(result.files, {
    added: [{ path: 'a.txt', bytesAfter: 2 }, { path: 'z.txt', bytesAfter: 1 }],
    removed: [{ path: 'removed', bytesBefore: 0 }],
    changed: [{ path: 'changed.js', bytesBefore: 3, bytesAfter: 3 }],
    counts: { added: 2, removed: 1, changed: 1 },
  });
  assert.deepEqual(result.flagged, []);
});

test('patterns are new by id at the same path; unchanged and removed files are not flagged', () => {
  const result = diffFiles(files({
    'changed.js': 'eval(old)', 'same.js': 'eval(old)', 'removed.js': 'eval(old)',
    'renamed.cjs': 'eval(old)',
  }), files({
    'changed.js': '// fixture\neval(newValue); JSON.stringify(process.env)', 'same.js': 'eval(old)',
    'added.mjs': 'eval(fixture)', 'rename.cjs': 'eval(old)', 'ignored.txt': 'eval(fixture)',
  }));
  assert.deepEqual(result.flagged.map(hit => [hit.path, hit.id]), [
    ['added.mjs', 'eval'], ['changed.js', 'environment-dump'], ['rename.cjs', 'eval'],
  ]);
  assert.equal(result.flagged[1].line, 2);
  assert.equal(result.flagged[1].category, 'credentials');
  assert.equal(result.flagged[1].severity, 'high');
  assert.ok(result.flagged.every(hit => hit.snippet.length <= 120));
});

test('file lists cap at 50 with accurate totals and scanning includes paths beyond the cap', () => {
  const old: FileMap = new Map();
  const next: FileMap = new Map();
  for (let i = 59; i >= 0; i--) {
    const suffix = String(i).padStart(2, '0');
    old.set(`removed${suffix}`, Buffer.from('old'));
    old.set(`changed${suffix}`, Buffer.from('old'));
    next.set(`changed${suffix}`, Buffer.from('new'));
    next.set(`added${suffix}`, Buffer.from('new'));
  }
  next.set('z.js', Buffer.from('eval(fixture)'));
  const result = diffFiles(old, next);
  assert.deepEqual(result.files.counts, { added: 61, removed: 60, changed: 60 });
  for (const kind of ['added', 'removed', 'changed'] as const) {
    assert.equal(result.files[kind].length, 50);
    const paths = result.files[kind].map(file => file.path);
    assert.deepEqual(paths, [...paths].sort());
  }
  assert.equal(result.flagged[0].path, 'z.js');
});

test('flags cap at 20 and oversized JavaScript is not scanned', () => {
  const next = files(Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`file${i}.js`, 'eval(fixture)'])));
  assert.equal(diffFiles(new Map(), next).flagged.length, 20);
  const oversized = Buffer.alloc(8 * 1024 * 1024 + 1, 32);
  oversized.write('eval(fixture)');
  const result = diffFiles(new Map(), files({ 'huge.js': oversized }));
  assert.equal(result.files.counts.added, 1);
  assert.deepEqual(result.flagged, []);
});

test('service starts both tarball loads in parallel and combines metadata and files', async () => {
  const calls: string[] = [];
  let resolveBefore: (value: FileMap) => void;
  const pending = new Promise<FileMap>(resolve => { resolveBefore = resolve; });
  const diffService = service(packument(), async url => {
    calls.push(url);
    if (url === before.dist.tarball) return pending;
    resolveBefore!(new Map());
    return files({ 'index.js': 'eval(fixture)' });
  });
  const result = await diffService.diff('axios', '1.0.0', '1.1.0');
  assert.deepEqual(calls, [before.dist.tarball, after.dist.tarball]);
  assert.equal(result.name, 'axios');
  assert.equal(result.from, '1.0.0');
  assert.equal(result.to, '1.1.0');
  assert.equal(result.publishTimes.gapHours, 25.5);
  assert.equal(result.files?.counts.added, 1);
  assert.equal(result.flagged[0].id, 'eval');
  assert.equal(result.filesError, undefined);
});

test('either tarball failure preserves metadata with files null and a reason', async () => {
  for (const failing of [before.dist.tarball, after.dist.tarball]) {
    const diffService = service(packument(), async url => {
      if (url === failing) throw new Error('fixture unavailable');
      return new Map();
    });
    const result = await diffService.diff('axios', '1.0.0', '1.1.0');
    assert.equal(result.files, null);
    assert.equal(result.filesError, 'fixture unavailable');
    assert.equal(result.publishTimes.gapHours, 25.5);
    assert.deepEqual(result.flagged, []);
  }
});

test('missing packages, missing versions and removed versions have distinct errors without fetching', async () => {
  const noFetch = async (): Promise<FileMap> => { assert.fail('must not fetch'); };
  await assert.rejects(service(null, noFetch).diff('axios', '1', '2'), { message: 'axios does not exist on npm' });
  for (const [from, to] of [['missing', '1.1.0'], ['1.0.0', 'missing']]) {
    await assert.rejects(service(packument(), noFetch).diff('axios', from, to), {
      message: 'axios@missing is not on the registry',
    });
    const pack = packument();
    pack.time.missing = '2026-03-31T02:00:00Z';
    await assert.rejects(service(pack, noFetch).diff('axios', from, to), {
      message: 'axios@missing was published and later removed from npm',
    });
  }
});
