import { mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// NitroStack starts a housekeeping interval on import; it must not keep tests alive.
mock.timers.enable({ apis: ['setInterval'] });
const { IncidentsService } = await import('../src/modules/incidents/incidents.service.js');
mock.timers.reset();

const header = '/* Dep Bouncer reconstruction: benign stand-in, not real malware. */';
const ids = ['axios', 'keyv', 'nx', 'chalk', 'tinycolor'];
const standInPaths: Record<string, string[]> = {
  axios: [], keyv: ['setup.mjs', 'Math_Symbol.js'], nx: ['telemetry.js'],
  chalk: ['source/index.js'], tinycolor: ['bundle.js'],
};

test('all five fixtures parse and disclose sources and reconstruction', () => {
  const service = new IncidentsService();
  assert.deepEqual(service.list().map(({ id }) => id), ids);
  for (const summary of service.list()) {
    const fixture = JSON.parse(readFileSync(new URL(`../src/modules/incidents/fixtures/${summary.id}.json`, import.meta.url), 'utf8'));
    assert.deepEqual(service.get(summary.id), fixture);
    assert.equal(fixture.id, summary.id);
    assert.equal(fixture.target.version, summary.targetVersion);
    assert.ok(fixture.sources.length > 0);
    for (const source of fixture.sources) {
      assert.ok(source.name);
      assert.equal(new URL(source.url).protocol, 'https:');
    }
    assert.ok(fixture.real.length > 0);
    assert.ok(fixture.reconstructed.length > 0);
    assert.ok(summary.osvFirstAdvisory.id.startsWith('MAL-'));
    assert.ok(summary.osvFirstAdvisory.lagHours > 0);
    assert.equal('files' in summary, false);
  }
});

for (const id of ids) {
  test(`${id}: context loads both versions, newest-first baseline, and labelled stand-ins`, async () => {
    const service = new IncidentsService();
    const incident = service.get(id);
    const context = service.toContext(id);
    assert.equal(context.reconstructed, true);
    assert.equal(context.name, incident.packageName);
    assert.equal(context.weeklyDownloads, incident.weeklyDownloads);
    assert.equal(context.target.version, incident.targetVersion);
    assert.equal(context.baseline[0].version, incident.goodVersion);
    assert.ok(context.baseline.length <= 10);
    const times = context.baseline.map(({ version }) => Date.parse(context.time[version]));
    assert.ok(times.every(Number.isFinite));
    assert.deepEqual(times, [...times].sort((a, b) => b - a));
    for (const version of [incident.goodVersion, incident.targetVersion]) {
      const files = await context.loadFiles(version);
      assert.ok(files instanceof Map);
      assert.ok(files.size > 0);
      for (const [path, content] of files) {
        assert.ok(content instanceof Uint8Array);
        assert.equal(new TextDecoder().decode(content), incident.files[version][path]);
      }
    }
    const target = await context.loadFiles(incident.targetVersion);
    for (const path of standInPaths[id]) {
      // chalk's stand-in is appended to the real entry file, as the real injection was.
      const text = new TextDecoder().decode(target.get(path));
      assert.ok(id === 'chalk' ? text.includes(header) : text.startsWith(header), `${id}/${path} must be labelled`);
    }
    await assert.rejects(context.loadFiles('missing-version'), /Files unavailable/);
    assert.equal(await context.lookupPackage?.('unrelated-package'), null);
    assert.equal(await context.lookupPackage?.('__proto__'), null);
    // Each load returns fresh bytes, so signal callers cannot alter subsequent reads.
    const firstPath = target.keys().next().value!;
    target.get(firstPath)![0] = 0;
    assert.notEqual((await context.loadFiles(incident.targetVersion)).get(firstPath)![0], 0);
  });
}

test('reconstructed traits preserve each incident distinction and safe version', async () => {
  const service = new IncidentsService();
  const axios = service.get('axios');
  assert.equal(axios.safeVersion, '1.14.0');
  assert.equal(axios.baseline[0]._npmUser?.name, 'GitHub Actions');
  assert.equal(axios.target._npmUser?.name, 'jasonsaayman');
  assert.ok(axios.baseline[0].dist.attestations);
  assert.equal(axios.target.dist.attestations, undefined);
  assert.equal(axios.target.dependencies?.['plain-crypto-js'], '^4.2.1');
  assert.deepEqual(axios.files[axios.goodVersion], axios.files[axios.targetVersion]);
  const dependency = await service.toContext('axios').lookupPackage?.('plain-crypto-js');
  assert.equal(dependency?.created, '2026-03-30T05:57:32.867Z');
  assert.equal(dependency?.versionCount, 2);
  assert.equal(dependency?.weeklyDownloads, 0);
  assert.equal(dependency?.latest?.scripts?.postinstall, 'node setup.js');

  const keyv = service.get('keyv');
  assert.equal(keyv.safeVersion, '5.6.0');
  assert.deepEqual(keyv.target._npmUser, keyv.baseline[0]._npmUser);
  assert.deepEqual(keyv.target.dist.attestations, keyv.baseline[0].dist.attestations);
  assert.ok(keyv.target.dist.attestations);
  assert.equal(keyv.target.scripts?.preinstall, 'node setup.mjs');
  const loader = keyv.files[keyv.targetVersion]['setup.mjs'];
  assert.ok(loader.length >= 29 * 1024 && loader.length <= 31 * 1024);
  for (const trait of ['_0x', 'child_process', 'execFileSync', 'github.com/oven-sh/bun/releases', '.claude/settings.json', 'SessionStart', '.vscode/tasks.json', 'folderOpen']) assert.ok(loader.includes(trait), trait);
  const noise = keyv.files[keyv.targetVersion]['Math_Symbol.js'];
  assert.ok(noise.length >= 699 * 1024 && noise.length <= 701 * 1024);
  assert.match(noise.slice(header.length), /^\n\/\*[A-Za-z0-9+/]+\*\/$/);

  const nx = service.get('nx');
  assert.equal(nx.safeVersion, '21.4.1');
  assert.ok(nx.baseline[0].dist.attestations);
  assert.equal(nx.target.dist.attestations, undefined);
  assert.deepEqual(nx.target._npmUser, nx.baseline[0]._npmUser);
  assert.equal(nx.baseline[0].scripts?.postinstall, 'node ./bin/post-install || exit 0');
  assert.equal(nx.target.scripts?.postinstall, 'node telemetry.js');
  for (const trait of ['child_process', '--dangerously-skip-permissions', '--yolo', '--trust-all-tools', '.ssh', '.npmrc', 'api.github.com/user/repos', '.bashrc']) assert.ok(nx.files[nx.targetVersion]['telemetry.js'].includes(trait), trait);

  const chalk = service.get('chalk');
  assert.equal(chalk.safeVersion, '5.6.0');
  assert.equal(chalk.target._npmUser?.name, 'qix');
  assert.equal(chalk.target.scripts?.postinstall, undefined);
  for (const trait of ['_0x', '\\x6e', 'window.ethereum', 'XMLHttpRequest.prototype']) assert.ok(chalk.files[chalk.targetVersion]['source/index.js'].includes(trait), trait);
  assert.equal(chalk.files[chalk.targetVersion]['source/index.js'].match(/0x[123]{40}/g)?.length, 3);

  const tinycolor = service.get('tinycolor');
  assert.equal(tinycolor.safeVersion, '4.1.0');
  assert.equal(tinycolor.target.scripts?.postinstall, 'node bundle.js');
  const bundle = tinycolor.files[tinycolor.targetVersion]['bundle.js'];
  assert.ok(bundle.length >= 600 * 1024 && bundle.length < 601 * 1024);
  for (const trait of ['trufflehog', 'webhook.site', 'JSON.stringify(process.env)', '.github/workflows']) assert.ok(bundle.includes(trait), trait);
});

test('unknown incidents fail clearly and returned data cannot mutate fixtures', () => {
  const service = new IncidentsService();
  for (const id of ['missing', '../axios', '__proto__']) {
    assert.throws(() => service.get(id), new RegExp(`Unknown incident: ${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    assert.throws(() => service.toContext(id), /Unknown incident/);
  }
  service.get('axios').target.version = 'changed';
  service.list()[0].osvFirstAdvisory.id = 'changed';
  assert.equal(service.get('axios').target.version, '1.14.1');
  assert.equal(service.list()[0].osvFirstAdvisory.id, 'MAL-2026-2307');
});
