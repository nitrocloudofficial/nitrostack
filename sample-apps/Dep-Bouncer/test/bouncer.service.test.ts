import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BouncerService } from '../src/modules/bouncer/bouncer.service.js';
import { NpmRegistryService, type Packument } from '../src/modules/registry/npm-registry.service.js';
import type { TarballService } from '../src/modules/registry/tarball.service.js';
import type { OsvService, AdvisoryLookup } from '../src/modules/registry/osv.service.js';
import type { AnalysisService } from '../src/modules/analysis/analysis.service.js';
import type { IncidentsService } from '../src/modules/incidents/incidents.service.js';
import type { AnalysisContext, FileMap, Finding, VersionManifest } from '../src/modules/analysis/signal.js';
import { decide } from '../src/modules/analysis/verdict.js';

function pack(name = 'fixture', versions = ['1.0.0', '2.0.0', '3.0.0']): Packument {
  return { name, 'dist-tags': { latest: versions.at(-1)! },
    time: Object.fromEntries(versions.map((v, i) => [v, `2025-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`])),
    versions: Object.fromEntries(versions.map(version => [version, {
      name, version, dist: { tarball: `https://registry.npmjs.org/${name}/-/${version}.tgz` },
    }])),
  };
}
const clean: AdvisoryLookup = { available: true, advisories: [] };
const malware: AdvisoryLookup = { available: true, advisories: [{ id: 'MAL-test', malicious: true }] };
const incomplete = (title = 'Code comparison incomplete: unavailable'): Finding => ({ signal: 'code-diff', severity: 'info', title, evidence: [], weight: 0, incomplete: true });

function harness(p = pack(), options: {
  analyze?: (ctx: AnalysisContext) => Promise<Finding[]>;
  query?: (name: string, version: string) => AdvisoryLookup;
  files?: (url: string) => Promise<FileMap>;
  registry?: NpmRegistryService;
} = {}) {
  const queries: string[] = [];
  const analyzed: string[] = [];
  const registry = options.registry ?? new NpmRegistryService();
  if (!options.registry) {
    registry.getPackument = async () => p;
    registry.getWeeklyDownloads = async () => 1000;
  }
  const service = new BouncerService(registry,
    { fetchFiles: options.files ?? (async () => new Map()) } as TarballService,
    { query: async (name: string, version: string) => { queries.push(`${name}@${version}`); return options.query?.(name, version) ?? clean; } } as OsvService,
    { analyze: async (ctx: AnalysisContext) => {
      analyzed.push(ctx.target.version);
      return { ...decide(await options.analyze?.(ctx) ?? []), checks: ['fixture'] };
    } } as AnalysisService,
    {} as IncidentsService);
  return { service, queries, analyzed, registry };
}

test('safeVersion and automatic fallbacks run OSV for every candidate', async () => {
  const { service, queries } = harness(pack(), { query: (_name, version) => version === '1.0.0' ? clean : malware });
  const safe = await service.safeVersion('fixture');
  assert.equal(safe.safeVersion, '1.0.0');
  assert.deepEqual(safe.skipped.map(r => r.verdict), ['BLOCK', 'BLOCK']);
  assert.deepEqual(queries, ['fixture@3.0.0', 'fixture@2.0.0', 'fixture@1.0.0']);
  queries.length = 0;
  const report = await service.checkPackage('fixture', '3.0.0');
  assert.equal(report.verdict, 'BLOCK');
  assert.equal(report.safeVersion?.version, '1.0.0');
  assert.deepEqual(queries, ['fixture@3.0.0', 'fixture@2.0.0', 'fixture@1.0.0']);
});

test('safe candidates exclude incomplete zero-weight findings and unavailable OSV', async () => {
  for (const title of ['Code comparison incomplete: download failed', 'check incomplete: deadline',
    'code-diff check incomplete: timed out', 'new-deps check incomplete: timed out', 'Arbitrary coverage title']) {
    const { service } = harness(pack(), { analyze: async ctx => ctx.target.version === '1.0.0' ? [] : [incomplete(title)] });
    assert.equal((await service.safeVersion('fixture')).safeVersion, '1.0.0');
    const report = await service.checkPackage('fixture', '3.0.0');
    assert.equal(report.verdict, 'REVIEW');
    assert.equal(report.incomplete, true);
    assert.equal(report.safeVersion?.version, '1.0.0');
  }
  const { service } = harness(pack(), { query: () => ({ available: false, advisories: [] }) });
  assert.equal((await service.safeVersion('fixture')).safeVersion, undefined);
  const report = await service.checkPackage('fixture');
  assert.equal(report.verdict, 'REVIEW');
  assert.ok(report.findings.some(f => f.incomplete && f.signal === 'known-advisory'));
});

test('date-fns-like incomplete coverage requires REVIEW without changing its weight', async () => {
  const warning: Finding = { signal: 'code-diff', severity: 'warn', weight: 15,
    title: 'Code comparison incomplete: Tarball exceeds 5000 files', evidence: [], incomplete: true };
  const { service } = harness(pack(), { analyze: async () => [warning] });
  const report = await service.checkPackage('fixture');
  assert.equal(report.verdict, 'REVIEW');
  assert.equal(report.score, 15);
  assert.deepEqual(report.findings, [warning]);
  assert.equal((await service.safeVersion('fixture')).safeVersion, undefined);
});

test('removed releases and security placeholders never become safe candidates', async () => {
  const p = pack();
  delete p.versions['3.0.0'];
  const { service } = harness(p);
  assert.equal((await service.checkPackage('fixture', '3.0.0')).verdict, 'BLOCK');
  assert.equal((await service.safeVersion('fixture', 'latest')).safeVersion, undefined);
  const holder = harness(pack('fixture', ['0.0.1-security.0'])).service;
  assert.equal((await holder.safeVersion('fixture', 'latest')).safeVersion, undefined);
  assert.equal((await holder.checkPackage('fixture')).verdict, 'BLOCK');
});

test('optional dependencies override dependencies which override dev dependencies', async () => {
  const { service } = harness(pack(), { query: (_name, version) => version === '3.0.0' ? malware : clean });
  const report = await service.checkManifest(JSON.stringify({
    devDependencies: { fixture: '1.0.0', dev: '1.0.0' },
    dependencies: { fixture: '2.0.0', regular: '2.0.0' },
    optionalDependencies: { fixture: '3.0.0' },
  }), true);
  assert.equal(report.results.find(r => r.name === 'fixture')?.resolved, '3.0.0');
  assert.equal(report.verdict, 'BLOCK');
  const regular = await service.checkManifest('{"devDependencies":{"fixture":"1.0.0"},"dependencies":{"fixture":"2.0.0"}}', true);
  assert.equal(regular.results[0].resolved, '2.0.0');
});

test('manifest caps and cancellation require REVIEW, including zero completed entries', async () => {
  const { service } = harness();
  const dependencies = Object.fromEntries(Array.from({ length: 61 }, (_, i) => [`dep${i}`, '1.0.0']));
  const capped = await service.checkManifest(JSON.stringify({ dependencies }), false);
  assert.equal(capped.verdict, 'REVIEW');
  assert.equal(capped.truncated, true);
  assert.equal(capped.counts.ALLOW, 60);
  const cancelled = await service.checkManifest('{"dependencies":{"fixture":"1"}}', false, () => {}, () => true);
  assert.equal(cancelled.verdict, 'REVIEW');
  assert.equal(cancelled.cancelled, true);
  assert.deepEqual(cancelled.results, []);
  let stop = false;
  const partial = await service.checkManifest(JSON.stringify({ dependencies }), false, message => {
    if (message.startsWith('[1/')) stop = true;
  }, () => stop);
  assert.equal(partial.cancelled, true);
  assert.equal(partial.verdict, 'REVIEW');
  assert.ok(partial.results.length < 60);
});

test('npm aliases check the target package and range, including scoped names; local specs stay listed as SKIPPED', async () => {
  const p = pack('malicious');
  const registry = new NpmRegistryService();
  const names: string[] = [];
  registry.getPackument = async name => { names.push(name); return p; };
  registry.getWeeklyDownloads = async () => 1000;
  const { service, queries } = harness(p, { registry, query: () => malware });
  const report = await service.checkManifest(JSON.stringify({ dependencies: {
    chalk: 'npm:malicious@1', scoped: 'npm:@evil/payload@2',
    local: 'file:../local', git: 'github:owner/repo', url: 'https://example.org/archive.tgz',
  } }), false);
  assert.equal(report.verdict, 'BLOCK');
  assert.equal(report.counts.SKIPPED, 3);
  assert.equal(report.results.find(r => r.name === 'chalk')?.resolved, '1.0.0');
  assert.ok(names.includes('malicious'));
  assert.ok(names.includes('@evil/payload'));
  assert.ok(queries.includes('malicious@1.0.0'));
  assert.match(report.results.find(r => r.name === 'chalk')!.reason, /alias for malicious/);
  const skipped = await service.checkManifest('{"dependencies":{"local":"file:../local"}}', false);
  assert.equal(skipped.verdict, 'ALLOW');
  assert.equal(skipped.results[0].verdict, 'SKIPPED');
});

test('manifest and safeVersion resolve arbitrary dist-tags before comparing versions', async () => {
  const p = pack('fixture', ['1.0.0', '2.0.0', '3.0.0-beta.1']);
  p['dist-tags'] = { latest: '1.0.0', next: '3.0.0-beta.1', beta: '2.0.0', custom: '2.0.0' };
  const { service } = harness(p);
  for (const [tag, version] of Object.entries(p['dist-tags'])) {
    const manifest = await service.checkManifest(JSON.stringify({ dependencies: { fixture: tag } }), false);
    assert.equal(manifest.results[0].resolved, version, tag);
    assert.equal((await service.safeVersion('fixture', tag)).safeVersion, version, tag);
  }
});

test('registry dependency lookup resolves ranges and tags; live context queries OSV for the resolved version', async () => {
  const p = pack('dep', ['1.0.0', '1.5.0', '2.0.0', '3.0.0-beta.1']);
  p['dist-tags'] = { latest: '2.0.0', next: '3.0.0-beta.1' };
  const registry = new NpmRegistryService();
  registry.getPackument = async () => p;
  registry.getWeeklyDownloads = async () => 123;
  for (const [range, expected] of [[undefined, '2.0.0'], ['^1', '1.5.0'], ['1.0.0', '1.0.0'], ['next', '3.0.0-beta.1'], ['^9', undefined]] as const) {
    const info = await registry.lookupPackage('dep', range);
    assert.equal(info?.resolved?.version, expected);
    assert.equal(info?.latest?.version, '2.0.0');
  }
  assert.equal((await registry.lookupPackage('dep', 'constructor'))?.resolved, undefined);
  const owner = pack('owner', ['1.0.0']);
  registry.getPackument = async name => name === 'owner' ? owner : p;
  const { service, queries } = harness(owner, { registry,
    query: (name, version) => name === 'dep' && version === '1.0.0' ? malware : clean,
    analyze: async ctx => {
      const pinned = await ctx.lookupPackage!('dep', '1.0.0');
      assert.equal(pinned?.resolved?.version, '1.0.0');
      assert.equal(pinned?.knownMalicious, true);
      assert.equal((await ctx.lookupPackage!('dep', '^2'))?.knownMalicious, false);
      return [];
    },
  });
  await service.checkPackage('owner');
  assert.ok(queries.includes('dep@1.0.0'));
  assert.ok(queries.includes('dep@2.0.0'));
});

test('script review detects implicit native installs and approves only a verified stable baseline', async () => {
  for (const baselineNative of [false, true]) {
    const { service } = harness(pack('fixture', ['1.0.0', '2.0.0']), {
      files: async url => url.includes('2.0.0') || baselineNative ? new Map([['binding.gyp', Buffer.from('{}')]]) : new Map(),
    });
    const review = (await service.reviewInstallScripts([{ name: 'fixture' }])).packages[0];
    assert.equal(review.scripts.install, 'node-gyp rebuild');
    assert.equal(review.recommendation, baselineNative ? 'APPROVE' : 'REVIEW');
    assert.match(review.reasons.join(' '), /binding.gyp/);
  }
});

test('script review reports unavailable tarballs and does not confuse nested binding.gyp with root builds', async () => {
  const unavailable = harness(pack(), { files: async () => { throw new Error('offline'); } }).service;
  const failed = (await unavailable.reviewInstallScripts([{ name: 'fixture' }])).packages[0];
  assert.equal(failed.recommendation, 'REVIEW');
  assert.match(failed.reasons.join(' '), /could not check.*offline/);
  const nested = harness(pack(), { files: async () => new Map([['nested/binding.gyp', Buffer.from('{}')]]) }).service;
  assert.equal((await nested.reviewInstallScripts([{ name: 'fixture' }])).packages[0].recommendation, 'NO_SCRIPTS');
});

test('implicit native installs remain visible for blocked, incomplete and failed baseline checks', async () => {
  for (const blocked of [false, true]) {
    const { service } = harness(pack(), {
      query: () => blocked ? malware : clean,
      analyze: async () => blocked ? [] : [incomplete()],
      files: async () => new Map([['binding.gyp', Buffer.from('{}')]]),
    });
    const review = (await service.reviewInstallScripts([{ name: 'fixture' }])).packages[0];
    assert.equal(review.recommendation, blocked ? 'DENY' : 'REVIEW');
    assert.equal(review.scripts.install, 'node-gyp rebuild');
    assert.match(review.reasons.join(' '), /binding.gyp/);
  }
  const { service } = harness(pack(), {
    files: async url => {
      if (!url.includes('3.0.0')) throw new Error('baseline unavailable');
      return new Map([['binding.gyp', Buffer.from('{}')]]);
    },
  });
  const review = (await service.reviewInstallScripts([{ name: 'fixture' }])).packages[0];
  assert.equal(review.recommendation, 'REVIEW');
  assert.match(review.reasons.join(' '), /previous release could not be checked.*baseline unavailable/);
});

test('explicit install or preinstall suppresses npm implicit native install detection', async () => {
  for (const hook of ['preinstall', 'install']) {
    const p = pack();
    for (const manifest of Object.values(p.versions)) manifest.scripts = { [hook]: 'node install.js' };
    const { service } = harness(p, { files: async () => assert.fail('explicit hooks need no implicit build lookup') });
    const review = (await service.reviewInstallScripts([{ name: 'fixture' }])).packages[0];
    assert.equal(review.recommendation, 'APPROVE');
    assert.equal(review.scripts[hook], 'node install.js');
  }
});

test('manifest rejects non-object JSON, ignores non-object sections and handles inherited version names cleanly', async () => {
  const { service } = harness();
  for (const value of ['null', '[]', '"text"', '1', 'true']) {
    await assert.rejects(service.checkManifest(value, true), /must be a JSON object/);
  }
  await assert.rejects(service.checkManifest('{', true), /not valid JSON/);
  const ignored = await service.checkManifest('{"dependencies":[],"optionalDependencies":"x","devDependencies":null}', true);
  assert.deepEqual(ignored.results, []);
  for (const version of ['constructor', '__proto__', 'toString']) {
    await assert.rejects(service.checkPackage('fixture', version), /no version matching/);
    assert.equal((await service.safeVersion('fixture', version)).safeVersion, undefined);
  }
  const p = pack();
  (p['dist-tags'] as Record<string, unknown>).broken = {};
  await assert.rejects(harness(p).service.checkPackage('fixture', 'broken'), /no version matching/);
});

test('file loads are de-duplicated across concurrent checks', async () => {
  let loads = 0;
  const { service } = harness(pack('fixture', ['1.0.0']), {
    files: async () => { loads++; await new Promise(resolve => setTimeout(resolve, 5)); return new Map(); },
    analyze: async ctx => { await ctx.loadFiles(ctx.target.version); return []; },
  });
  await Promise.all(Array.from({ length: 10 }, () => service.checkPackage('fixture')));
  assert.equal(loads, 1);
});

test('registry skips caching packuments larger than 20 MB even when trimming makes them small', async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  for (const oversized of [false, true]) {
    let loads = 0;
    const data = { ...pack(), ...(oversized ? { readme: 'x'.repeat(20 * 1024 * 1024) } : {}) };
    const registry = new NpmRegistryService();
    globalThis.fetch = async () => { loads++; return Response.json(data); };
    await registry.getPackument('fixture');
    await registry.getPackument('fixture');
    assert.equal(loads, oversized ? 2 : 1);
  }
});
