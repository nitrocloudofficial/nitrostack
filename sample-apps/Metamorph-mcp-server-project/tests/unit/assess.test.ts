import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assessDirectory, assessFull, type Analyzer } from '../../src/modules/assessment/assess.js';
import { writeNodeFixture, writePhpFixture } from '../helpers/fixtures.js';
import { writeModernPhpFixture } from '../helpers/fixtures-modern.js';

const TODAY = new Date('2026-10-30T00:00:00Z');
const dirs: string[] = [];
const temp = async () => {
  const d = await mkdtemp(join(tmpdir(), 'metamorph-assess-'));
  dirs.push(d);
  return d;
};
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

// Deterministic stand-in for OSV: every package is "affected" with one high, urgent finding.
const fakeOsv: Analyzer = async (pkgs) =>
  pkgs.map((p) => ({
    package: p,
    affected: true,
    truncated: false,
    findings: [{ id: 'GHSA-test-test-test', aliases: [], severity: 'high' as const, summary: 'test advisory', fixedVersions: ['9.9.9'], urgent: true, urgentReasons: ['high_severity' as const] }]
  }));

describe('assessDirectory: legacy Node fixture', () => {
  it('reports runtime EOL, deprecated package, env file, vulnerable deps and a low score', async () => {
    const dir = await temp();
    await writeNodeFixture(dir);
    const a = await assessDirectory(dir, { analyze: fakeOsv, today: TODAY });
    const ids = a.topFindings.map((f) => f.id);
    expect(a.stack).toBe('node');
    expect(a.runtime.minMajor).toBe(10);
    expect(ids).toContain('node-runtime-eol');
    expect(a.topFindings.some((f) => f.id === 'node-deprecated-package' && f.evidence === 'request')).toBe(true);
    expect(a.topFindings.some((f) => f.id === 'env-file-committed')).toBe(true);
    expect(a.dependencies).toMatchObject({ total: 3, checked: 3, vulnerable: 3, urgent: 3, approximateVersions: false });
    expect(a.score.overall).toBeLessThan(60);
    expect(a.assessmentId).toMatch(/^[0-9a-f]{16}$/);
  });

  it('keeps going and says so when the vulnerability service fails', async () => {
    const dir = await temp();
    await writeNodeFixture(dir);
    const a = await assessDirectory(dir, { analyze: async () => { throw new Error('down'); }, today: TODAY });
    expect(a.findingCount).toBeGreaterThan(0);
    expect(a.dependencies.vulnerable).toBe(0);
  });
});

describe('assessDirectory: legacy PHP fixture', () => {
  it('detects PHP smells, composer versions and hosting hints', async () => {
    const dir = await temp();
    await writePhpFixture(dir);
    const a = await assessDirectory(dir, { analyze: fakeOsv, today: TODAY });
    const ids = a.topFindings.map((f) => f.id);
    expect(a.stack).toBe('php');
    expect(a.hosting).toContain('apache-htaccess');
    expect(ids).toEqual(expect.arrayContaining(['php-sql-concatenation']));
    expect(a.dependencies.checked).toBe(2);
    expect(a.dependencies.approximateVersions).toBe(false);
    expect(a.score.overall).toBeLessThan(60);
  });
});

// OSV stand-in for "no known advisories", matching the live check of the pinned modern versions.
const cleanOsv: Analyzer = async (pkgs) => pkgs.map((p) => ({ package: p, affected: false, findings: [], truncated: false }));

describe('assessDirectory: modernized PHP shop', () => {
  it('scores 100 with no findings above info once every issue is fixed', async () => {
    const dir = await temp();
    await writeModernPhpFixture(dir);
    const a = await assessDirectory(dir, { analyze: cleanOsv, today: TODAY });
    expect(a.topFindings.filter((f) => f.severity !== 'info')).toEqual([]);
    expect(a.score.overall).toBe(100);
    expect(a.runtime.declared).toBe('^8.4');
    expect(a.hosting).toEqual(expect.arrayContaining(['docker', 'github-actions']));
  });

  it('the legacy shop scores far lower than the modernized one', async () => {
    const legacy = await temp();
    await writePhpFixture(legacy);
    const before = await assessDirectory(legacy, { analyze: fakeOsv, today: TODAY });
    const modern = await temp();
    await writeModernPhpFixture(modern);
    const after = await assessDirectory(modern, { analyze: cleanOsv, today: TODAY });
    expect(after.score.overall - before.score.overall).toBeGreaterThan(70);
  });
});

describe('assessDirectory: edge cases', () => {
  it('an empty directory is "unknown" and does not throw', async () => {
    const dir = await temp();
    const a = await assessDirectory(dir, { analyze: fakeOsv, today: TODAY });
    expect(a.stack).toBe('unknown');
    expect(a.dependencies.total).toBe(0);
  });

  it('is deterministic for the same input', async () => {
    const dir = await temp();
    await writeNodeFixture(dir);
    const a = await assessDirectory(dir, { analyze: fakeOsv, today: TODAY });
    const b = await assessDirectory(dir, { analyze: fakeOsv, today: TODAY });
    expect(b.assessmentId).toBe(a.assessmentId);
    expect(b.score).toEqual(a.score);
  });
});

type Fx = { fixed: string[]; urgent?: boolean };
const finding = (x: Fx, i: number) => ({ id: `GHSA-test-${i}`, aliases: [], severity: 'high' as const, summary: 's', fixedVersions: x.fixed, urgent: x.urgent ?? false, urgentReasons: [] });
const analyzerFor = (spec: Record<string, Fx[] | null>): Analyzer => async (pkgs) =>
  pkgs.map((p) => {
    const fx = spec[p.name];
    return { package: p, affected: fx != null, truncated: false, findings: (fx ?? []).map(finding) };
  });

describe('assessFull', () => {
  it('picks the highest fixed version across findings', async () => {
    const dir = await temp();
    await writeNodeFixture(dir);
    const analyze = analyzerFor({
      lodash: [{ fixed: ['4.17.19'] }, { fixed: ['4.17.21'] }],
      express: [{ fixed: ['4.17.21'] }, { fixed: ['4.18.0'] }]
    });
    const { fixes } = await assessFull(dir, { analyze, today: TODAY });
    expect(fixes.find((f) => f.name === 'lodash')).toMatchObject({ ecosystem: 'npm', from: '4.17.15', to: '4.17.21', dev: false });
    expect(fixes.find((f) => f.name === 'express')?.to).toBe('4.18.0');
  });

  it('compares versions numerically, not as strings', async () => {
    const dir = await temp();
    await writeNodeFixture(dir);
    const analyze = analyzerFor({ lodash: [{ fixed: ['4.9.0'] }, { fixed: ['4.10.0'] }] });
    const { fixes } = await assessFull(dir, { analyze, today: TODAY });
    expect(fixes.find((f) => f.name === 'lodash')?.to).toBe('4.10.0');
  });

  it('excludes non-affected packages and affected ones with no fixed version', async () => {
    const dir = await temp();
    await writeNodeFixture(dir);
    const analyze = analyzerFor({ lodash: [{ fixed: ['4.17.21'] }], express: [{ fixed: [] }], request: null });
    const { fixes } = await assessFull(dir, { analyze, today: TODAY });
    expect(fixes.map((f) => f.name)).toEqual(['lodash']);
  });

  it('flags urgent if any finding is urgent, and sorts urgent first then by name', async () => {
    const dir = await temp();
    await writeNodeFixture(dir);
    const analyze = analyzerFor({
      express: [{ fixed: ['4.18.0'] }],
      lodash: [{ fixed: ['4.17.20'] }, { fixed: ['4.17.21'], urgent: true }],
      request: [{ fixed: ['2.88.3'], urgent: true }]
    });
    const { fixes } = await assessFull(dir, { analyze, today: TODAY });
    expect(fixes.map((f) => [f.name, f.urgent])).toEqual([['lodash', true], ['request', true], ['express', false]]);
  });

  it('marks devDependencies as dev', async () => {
    const dir = await temp();
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'x', dependencies: { lodash: '4.17.15' }, devDependencies: { mocha: '1.0.0' } }));
    const analyze = analyzerFor({ lodash: [{ fixed: ['4.17.21'] }], mocha: [{ fixed: ['2.0.0'] }] });
    const { fixes } = await assessFull(dir, { analyze, today: TODAY });
    expect(fixes.find((f) => f.name === 'mocha')).toMatchObject({ dev: true, from: '1.0.0', to: '2.0.0' });
    expect(fixes.find((f) => f.name === 'lodash')?.dev).toBe(false);
  });

  it('returns every finding, not just the top 10', async () => {
    const dir = await temp();
    await writePhpFixture(dir);
    const { assessment, findings } = await assessFull(dir, { analyze: fakeOsv, today: TODAY });
    expect(assessment.topFindings).toHaveLength(10);
    expect(findings.length).toBeGreaterThan(10);
    expect(findings).toHaveLength(assessment.findingCount);
  });

  it('exposes key file contents', async () => {
    const dir = await temp();
    await writeNodeFixture(dir);
    const { files } = await assessFull(dir, { analyze: fakeOsv, today: TODAY });
    expect(Object.keys(files)).toEqual(expect.arrayContaining(['package.json', 'package-lock.json']));
    expect(files['package.json']).toContain('legacy-node-orders');
  });

  it('assessDirectory equals assessFull().assessment', async () => {
    const node = await temp();
    await writeNodeFixture(node);
    const php = await temp();
    await writePhpFixture(php);
    for (const dir of [node, php]) {
      const opts = { analyze: fakeOsv, today: TODAY };
      expect(await assessDirectory(dir, opts)).toEqual((await assessFull(dir, opts)).assessment);
    }
  });
});
