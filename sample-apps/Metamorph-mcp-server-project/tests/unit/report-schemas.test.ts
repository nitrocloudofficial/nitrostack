import { describe, it, expect } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Finding } from '../../src/modules/assessment/types.js';
import { buildReportData } from '../../src/modules/report/report-data.js';
import { buildSarif } from '../../src/modules/report/sarif.js';
import { buildSbom } from '../../src/modules/report/sbom.js';
import { FIXTURES, NOW, dataOf, fullOf, manyFindings, phpShopReportData } from '../helpers/report-fixtures.js';
import { cycloneDx15, sarif210, schemaSources } from '../helpers/schemas.js';

const sarif = sarif210();
const cdx = cycloneDx15();
const roundTrip = (o: unknown) => JSON.parse(JSON.stringify(o));

const PKG = JSON.stringify({ name: 'x', dependencies: { lodash: '4.17.15', '@scope/pkg': '^1.0.0' }, devDependencies: { jest: '^29.0.0' } }, null, 2);
const LOCK = JSON.stringify({ lockfileVersion: 3, packages: { '': {}, 'node_modules/lodash': { version: '4.17.15' } } }, null, 2);
const depFinding = (name: string): Finding => ({ id: `dep-vulnerable:${name}`, category: 'dependencies', severity: 'high', title: `${name}@1.0.0 has 2 known advisories`, evidence: 'GHSA-xxxx', recommendation: `Upgrade ${name}.`, cvss: 7.5, source: 'osv.dev' });

function samples() {
  const withFiles = buildReportData({
    full: fullOf([depFinding('lodash'), depFinding('@scope/pkg'), { id: 'node-no-lockfile', category: 'dependencies', severity: 'medium', title: 'No lockfile', recommendation: 'Commit one.' }, ...manyFindings(6)], { 'package.json': PKG, 'package-lock.json': LOCK }),
    meta: { repoUrl: 'https://github.com/o/r', subfolder: 'apps/api', commit: 'a'.repeat(40), commitSha: 'a'.repeat(40), generatedAt: NOW }
  });
  return {
    'zero findings': FIXTURES['zero findings'](),
    '200 findings': FIXTURES['200 findings'](),
    'unicode and RTL': FIXTURES['unicode, RTL and emoji'](),
    'control characters': FIXTURES['control characters'](),
    '500-char strings': FIXTURES['500-char unbroken strings'](),
    'many dependencies (300, scoped and vendor names)': dataOf(manyFindings(5), { deps: Array.from({ length: 300 }, (_, i) => ({ ecosystem: i % 2 ? ('npm' as const) : ('composer' as const), name: i % 2 ? `@scope/package-${i}` : `vendor/package-${i}`, version: `1.${i}.0`, dev: i % 3 === 0, approximate: i % 5 === 0 })) }),
    'manifest text, subfolder and commit sha': withFiles,
    'dependency without version': dataOf([], { deps: [{ ecosystem: 'npm', name: 'left-pad', version: '', dev: false, approximate: true }, { ecosystem: 'composer', name: 'Vendor/Pkg', version: '1.0.0', dev: true, approximate: false }] })
  };
}

describe('official JSON schemas', () => {
  it('come from pinned npm packages', () => {
    expect(schemaSources.cyclonedx).toBe('10.3.0');
    expect(schemaSources.sarif).toBe('1.0.0-beta.0');
  });

  it('the validators reject broken documents (negative controls)', () => {
    const s = roundTrip(buildSarif(dataOf(manyFindings(3))));
    expect(sarif(s).valid).toBe(true);
    const badLevel = roundTrip(s);
    badLevel.runs[0].results[0].level = 'catastrophic';
    expect(sarif(badLevel).valid).toBe(false);
    const noVersion = roundTrip(s);
    delete noVersion.version;
    expect(sarif(noVersion).valid).toBe(false);
    const badLine = roundTrip(s);
    badLine.runs[0].results[0].locations[0].physicalLocation.region = { startLine: 0 };
    expect(sarif(badLine).valid).toBe(false);

    const b = roundTrip(buildSbom(dataOf([], { deps: [{ ecosystem: 'npm', name: 'a', version: '1.0.0', dev: false, approximate: false }] })));
    expect(cdx(b).valid).toBe(true);
    const badType = roundTrip(b);
    badType.components[0].type = 'not-a-type';
    expect(cdx(badType).valid).toBe(false);
    const badSerial = roundTrip(b);
    badSerial.serialNumber = 'not-a-urn';
    expect(cdx(badSerial).valid).toBe(false);
  });

  for (const [name, data] of Object.entries(samples())) {
    it(`SARIF 2.1.0 is valid: ${name}`, () => {
      const r = sarif(roundTrip(buildSarif(data)));
      expect(r.errors.slice(0, 5)).toEqual([]);
      expect(r.valid).toBe(true);
    });
    it(`CycloneDX 1.5 is valid: ${name}`, () => {
      const r = cdx(roundTrip(buildSbom(data)));
      expect(r.errors.slice(0, 5)).toEqual([]);
      expect(r.valid).toBe(true);
    });
  }

  it('the php-shop sample (real assessment) is valid in both formats', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mm-schema-'));
    try {
      const d = await phpShopReportData(dir);
      expect(sarif(roundTrip(buildSarif(d))).errors).toEqual([]);
      expect(cdx(roundTrip(buildSbom(d))).errors).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
