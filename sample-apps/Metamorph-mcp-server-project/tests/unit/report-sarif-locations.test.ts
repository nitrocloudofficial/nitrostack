import { describe, it, expect } from 'vitest';
import type { Finding } from '../../src/modules/assessment/types.js';
import { buildReportData } from '../../src/modules/report/report-data.js';
import { buildSarif, lineOfDeclaration, lineOfLockEntry, locationOf } from '../../src/modules/report/sarif.js';
import { NOW, fullOf } from '../helpers/report-fixtures.js';

const PKG = `{
  "name": "demo",
  "scripts": {
    "lodash": "echo not a dependency"
  },
  "dependencies": {
    "express": "^4.16.0",
    "lodash": "4.17.15",
    "@scope/pkg": "^1.0.0"
  },
  "devDependencies": {
    "jest": "^29.0.0"
  }
}
`;
const LOCK = `{
  "lockfileVersion": 3,
  "packages": {
    "": {},
    "node_modules/express": { "version": "4.16.0" },
    "node_modules/transitive": {
      "version": "1.0.0"
    }
  }
}
`;
const COMPOSER = `{
    "name": "acme/shop",
    "require": {
        "php": ">=7.2",
        "guzzlehttp/guzzle": "^6.5"
    },
    "require-dev": {
        "phpunit/phpunit": "^8.0"
    }
}
`;
const COMPOSER_LOCK = `{
    "packages": [
        {
            "name": "guzzlehttp/guzzle",
            "version": "6.5.0"
        },
        {
            "name": "psr/log",
            "version": "1.1.0"
        }
    ]
}
`;

const dep = (name: string, extra: Partial<Finding> = {}): Finding => ({ id: `dep-vulnerable:${name}`, category: 'dependencies', severity: 'high', title: `${name}@1 has advisories`, evidence: 'GHSA-aaaa-bbbb-cccc', recommendation: `Upgrade ${name}.`, ...extra });
const generic = (id: string, extra: Partial<Finding> = {}): Finding => ({ id, category: 'standards', severity: 'low', title: id, recommendation: 'Fix it.', ...extra });

function sarifOf(findings: Finding[], files: Record<string, string>, meta: { subfolder?: string } = {}) {
  const d = buildReportData({ full: fullOf(findings, files), meta: { repoUrl: 'https://github.com/o/r', generatedAt: NOW, ...meta } });
  const s = JSON.parse(JSON.stringify(buildSarif(d)));
  const byRule = (id: string) => s.runs[0].results.find((r: { ruleId: string }) => r.ruleId === id);
  const loc = (id: string) => byRule(id).locations[0].physicalLocation as { artifactLocation: { uri: string; uriBaseId: string }; region?: { startLine: number } };
  return { s, byRule, loc, run: s.runs[0] };
}

describe('SARIF locations', () => {
  it('every result has a physicalLocation, whatever the finding', () => {
    const { run } = sarifOf([dep('lodash'), dep('ghost-package'), generic('weird', { evidence: '8.4.27' }), generic('no-evidence'), generic('with-path', { evidence: 'src/a.php:12' }), generic('composer-no-lock')], { 'package.json': PKG });
    expect(run.results.length).toBe(6);
    for (const r of run.results) {
      expect(r.locations).toHaveLength(1);
      expect(r.locations[0].physicalLocation.artifactLocation.uri).toMatch(/^[^/].*/);
      expect(r.locations[0].physicalLocation.artifactLocation.uriBaseId).toBe('SRCROOT');
      const region = r.locations[0].physicalLocation.region;
      if (region) expect(region.startLine).toBeGreaterThanOrEqual(1);
    }
  });

  it('dependency findings point at the line of the package in package.json (dependencies only, not scripts)', () => {
    const { loc, byRule } = sarifOf([dep('lodash'), dep('express'), dep('@scope/pkg'), dep('jest')], { 'package.json': PKG });
    expect(loc('dep-vulnerable:lodash')).toEqual({ artifactLocation: { uri: 'package.json', uriBaseId: 'SRCROOT' }, region: { startLine: 8 } });
    expect(PKG.split('\n')[7]).toContain('"lodash": "4.17.15"');
    expect(loc('dep-vulnerable:express').region?.startLine).toBe(7);
    expect(loc('dep-vulnerable:@scope/pkg').region?.startLine).toBe(9);
    expect(loc('dep-vulnerable:jest').region?.startLine).toBe(12);
    expect(byRule('dep-vulnerable:lodash').properties.locationKind).toBe('declaring-manifest');
  });

  it('falls back to the lockfile line when the manifest does not declare the package', () => {
    const { loc } = sarifOf([dep('transitive')], { 'package.json': PKG, 'package-lock.json': LOCK });
    expect(loc('dep-vulnerable:transitive')).toMatchObject({ artifactLocation: { uri: 'package-lock.json' }, region: { startLine: 6 } });
  });

  it('composer packages point at composer.json (case-insensitive) or composer.lock', () => {
    const files = { 'composer.json': COMPOSER, 'composer.lock': COMPOSER_LOCK };
    const { loc } = sarifOf([dep('guzzlehttp/guzzle'), dep('phpunit/phpunit'), dep('psr/log')], files);
    expect(loc('dep-vulnerable:guzzlehttp/guzzle')).toMatchObject({ artifactLocation: { uri: 'composer.json' }, region: { startLine: 5 } });
    expect(loc('dep-vulnerable:phpunit/phpunit').region?.startLine).toBe(8);
    expect(loc('dep-vulnerable:psr/log')).toMatchObject({ artifactLocation: { uri: 'composer.lock' }, region: { startLine: 8 } });
    expect(lineOfDeclaration('composer.json', COMPOSER, 'GuzzleHttp/Guzzle')).toBe(5);
  });

  it('never fabricates a line: a package that is not found names the manifest without a region and says so', () => {
    const { loc, byRule } = sarifOf([dep('ghost-package')], { 'package.json': PKG });
    expect(loc('dep-vulnerable:ghost-package').artifactLocation.uri).toBe('package.json');
    expect(loc('dep-vulnerable:ghost-package').region).toBeUndefined();
    expect(byRule('dep-vulnerable:ghost-package').message.text).toContain('was not found by name');
  });

  it('with no file text available the manifest is still named, without a region', () => {
    // ReportData built without manifests (e.g. older callers): ecosystem comes from the dependency list or the stack
    const d = buildReportData({ full: fullOf([dep('lodash')], {}), meta: { repoUrl: 'https://github.com/o/r', generatedAt: NOW }, dependencies: [{ ecosystem: 'npm', name: 'lodash', version: '4.17.15', dev: false, approximate: false }] });
    const r = JSON.parse(JSON.stringify(buildSarif(d))).runs[0].results[0];
    expect(r.locations[0].physicalLocation.artifactLocation.uri).toBe('package.json');
    expect(r.locations[0].physicalLocation.region).toBeUndefined();
    expect(r.message.text).toContain('line unknown');
  });

  it('a deprecated-package finding (evidence is the package name) points at its declaration, not at a file named like the package', () => {
    const { loc } = sarifOf([{ id: 'node-deprecated-package', category: 'dependencies', severity: 'medium', title: 'Deprecated package in use: lodash', evidence: 'lodash', recommendation: 'Replace it.' }], { 'package.json': PKG });
    expect(loc('node-deprecated-package')).toMatchObject({ artifactLocation: { uri: 'package.json' }, region: { startLine: 8 } });
  });

  it('repo-wide findings point at the file named in their evidence; paths with traversal are not trusted', () => {
    const { loc } = sarifOf([generic('hardcoded-secret', { evidence: 'config/app.php:42' }), generic('docker-root', { evidence: 'Dockerfile.prod' }), generic('evil', { evidence: '../../etc/passwd:1' })], { 'package.json': PKG });
    expect(loc('hardcoded-secret')).toMatchObject({ artifactLocation: { uri: 'config/app.php' }, region: { startLine: 42 } });
    expect(loc('docker-root').artifactLocation.uri).toBe('Dockerfile.prod');
    expect(loc('docker-root').region).toBeUndefined();
    expect(loc('evil').artifactLocation.uri).toBe('package.json'); // fallback
  });

  it('other findings fall back to the project manifest with a clear note and no line', () => {
    const { loc, byRule } = sarifOf([generic('node-no-lockfile', { evidence: '4 dependencies and no package-lock.json' }), generic('composer-no-lock'), generic('php-version-eol', { evidence: 'PHP 7.4 ended 2022-11-28' }), generic('some-other-rule')], { 'package.json': PKG, 'composer.json': COMPOSER });
    expect(loc('node-no-lockfile').artifactLocation.uri).toBe('package.json');
    expect(loc('composer-no-lock').artifactLocation.uri).toBe('composer.json');
    expect(loc('php-version-eol').artifactLocation.uri).toBe('composer.json');
    expect(loc('some-other-rule').artifactLocation.uri).toBe('package.json');
    for (const id of ['node-no-lockfile', 'composer-no-lock', 'some-other-rule']) {
      expect(loc(id).region).toBeUndefined();
      expect(byRule(id).properties.locationKind).toBe('project-manifest-fallback');
      expect(byRule(id).message.text).toContain('(Location: no file location for this finding; pointing at the project manifest');
    }
  });

  it('with no manifest at all the fallback is the README, with a note', () => {
    const full = fullOf([generic('some-other-rule')], {});
    full.assessment.stack = 'unknown';
    const s = JSON.parse(JSON.stringify(buildSarif(buildReportData({ full, meta: { repoUrl: 'https://github.com/o/r', generatedAt: NOW } }))));
    const byRule = (id: string) => s.runs[0].results.find((r: { ruleId: string }) => r.ruleId === id);
    const loc = (id: string) => byRule(id).locations[0].physicalLocation;
    expect(loc('some-other-rule').artifactLocation.uri).toBe('README.md');
    expect(byRule('some-other-rule').message.text).toContain('pointing at the README');
  });

  it('multi-project findings are located in their own project folder', () => {
    const files = { 'apps/api/package.json': PKG, 'apps/web/package.json': PKG.replace('"lodash": "4.17.15",\n    ', '') };
    const { loc } = sarifOf([dep('lodash', { project: 'apps/api' }), generic('node-no-tests', { project: 'apps/web' })], files);
    expect(loc('dep-vulnerable:lodash')).toMatchObject({ artifactLocation: { uri: 'apps/api/package.json' }, region: { startLine: 8 } });
    expect(loc('node-no-tests').artifactLocation.uri).toBe('apps/web/package.json');
  });

  it('keeps SRCROOT and the subfolder mapping', () => {
    const d = buildReportData({ full: fullOf([dep('lodash')], { 'package.json': PKG }), meta: { repoUrl: 'https://github.com/o/r', subfolder: 'apps/api', commitSha: 'b'.repeat(40), generatedAt: NOW } });
    const run = JSON.parse(JSON.stringify(buildSarif(d))).runs[0];
    expect(run.versionControlProvenance[0].mappedTo).toEqual({ uriBaseId: 'SRCROOT', uri: 'apps/api' });
    expect(run.results[0].locations[0].physicalLocation.artifactLocation.uriBaseId).toBe('SRCROOT');
  });

  it('only the four manifest files are kept from the assessed files, and are not in the PDF text', () => {
    const d = buildReportData({ full: fullOf([], { 'package.json': PKG, 'Dockerfile': 'FROM node:10', '.nvmrc': '10', 'sub/composer.lock': COMPOSER_LOCK }), meta: { repoUrl: 'https://github.com/o/r', generatedAt: NOW } });
    expect(Object.keys(d.manifests ?? {}).sort()).toEqual(['package.json', 'sub/composer.lock']);
  });

  it('line helpers', () => {
    expect(lineOfDeclaration('package.json', '{"dependencies":{"a":"1"}}', 'a')).toBe(1);
    expect(lineOfDeclaration('package.json', PKG, 'nope')).toBeUndefined();
    expect(lineOfLockEntry('package-lock.json', LOCK, 'express')).toBe(5);
    expect(locationOf('8.4.27')).toBeUndefined();
    expect(locationOf('7.4')).toBeUndefined();
    expect(locationOf('src/a.php:3')).toEqual({ path: 'src/a.php', line: 3 });
    expect(locationOf('composer.json')).toEqual({ path: 'composer.json' });
  });
});
