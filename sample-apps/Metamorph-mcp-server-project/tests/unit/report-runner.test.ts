import { describe, it, expect } from 'vitest';
import { buildDocDefinition, verificationLine } from '../../src/modules/report/pdf.js';
import { attachRunnerResult } from '../../src/modules/report/report-data.js';
import { judge } from '../../src/modules/verify/evaluate.js';
import { runnerResultToSummary } from '../../src/modules/verify/evaluate.js';
import { dataOf, dataWithRunner, greenRunnerResult, manyFindings, runnerFixture } from '../helpers/report-fixtures.js';

// All text of the document definition, with the zero-width break points the layout inserts removed.
function textOf(d: Parameters<typeof buildDocDefinition>[0]): string {
  const out: string[] = [];
  const seen = new WeakSet<object>();
  const walk = (v: unknown): void => {
    if (typeof v === 'string') out.push(v);
    else if (v && typeof v === 'object' && !seen.has(v)) {
      seen.add(v);
      for (const [k, x] of Object.entries(v)) if (k !== 'parent') walk(x);
    }
  };
  walk(buildDocDefinition(d).content);
  return out.join('\n').replaceAll('​', '');
}
// The part of the text before a heading and the part after it
const section = (all: string, from: string, to: string): string => {
  const a = all.indexOf(from);
  const b = all.indexOf(to, a + from.length);
  return all.slice(a, b === -1 ? undefined : b);
};

describe('runner verdict in the report', () => {
  it('php-shop fixtures render "Not verified" with reasons, including lock regeneration', () => {
    for (const name of ['php-shop-after.json', 'php-shop-after-php74.json', 'php-shop-modernized-php84.json', 'php-shop-before.json']) {
      const d = dataWithRunner(runnerFixture(name), undefined);
      expect(d.verification?.verified, name).toBe(false);
      expect(verificationLine(d).text, name).toMatch(/^Not verified: /);
      expect(d.verification?.unverifiedReasons.length, name).toBeGreaterThan(0);
      const all = textOf(d);
      expect(all, name).not.toMatch(/Verified by the runner/);
      expect(all, name).toContain('Not verified: ');
    }
    const d74 = dataWithRunner(runnerFixture('php-shop-after-php74.json'));
    expect(d74.verification?.unverifiedReasons.join(' | ')).toMatch(/composer\.lock was unusable and was regenerated/);
    expect(d74.verification?.unverifiedReasons.join(' | ')).toMatch(/composer install failed/);
    expect(d74.verification?.unverifiedReasons.join(' | ')).toMatch(/no tests found/);
  });

  it('shows measured per-check status, buildOk, tests and the php selection in the Verification section', () => {
    const d = dataWithRunner(runnerFixture('php-shop-after-php74.json'), runnerFixture('php-shop-before.json'));
    const v = section(textOf(d), 'Verification results', 'Dependencies and SBOM');
    expect(v).toContain('Why it is not verified');
    expect(v).toContain('Build succeeded');
    expect(v).toContain('Patch applied');
    expect(v).toContain('0 ran, 0 passed, 0 failed (no tests found)');
    expect(v).toContain('PHP version selected');
    expect(v).toContain('7.4.33');
    expect(v).toContain('>=7.2 (from require.php)');
    expect(v).toContain('composer.lock regenerated');
    for (const c of ['composer-install', 'composer-audit', 'phpunit', 'semgrep', 'trivy']) expect(v).toContain(c);
    expect(v).toContain('failed');
    expect(v).toContain('skipped');
    expect(v).toContain('passed');
    expect(v).toContain('baseline: ');
    expect(v).toContain('All values below were measured by the runner');
  });

  it('says "verified" on the cover, executive summary and Verification section only when the runner verdict is true', () => {
    const green = greenRunnerResult();
    expect(judge({ status: 'completed' } as never, green)).toEqual({ verified: true, unverifiedReasons: [] });
    const d = dataWithRunner(green, runnerFixture('php-shop-before.json'));
    expect(d.verification?.verified).toBe(true);
    expect(d.verification?.php?.lockRegenerated).toBe(false);
    const line = verificationLine(d).text;
    expect(line).toBe('Verified by the runner (measured): the build succeeded and 12 of 12 tests passed.');
    const all = textOf(d);
    expect(all.split(line).length - 1).toBeGreaterThanOrEqual(3); // cover row, executive summary, Verification section
    expect(all).not.toContain('Why it is not verified');
    expect(all).not.toContain('Not verified: ');
  });

  it('turns to "Not verified" when any single condition fails, and lists that reason', () => {
    const green = greenRunnerResult();
    const cases: Array<[string, Parameters<typeof dataWithRunner>[0], RegExp]> = [
      ['a failed test', { ...green, tests: { ran: 12, passed: 11, failed: 1 } }, /1 test failed/],
      ['no tests', { ...green, tests: { ran: 0, passed: 0, failed: 0 } }, /no tests found/],
      ['build not ok', { ...green, buildOk: false }, /build not verified/],
      ['patch not applied', { ...green, patchApplied: false }, /patch did not apply/],
      ['lock regenerated', { ...green, php: { ...green.php!, lockRegenerated: true } }, /regenerated in a scratch copy/],
      ['unsupported php', { ...green, php: { ...green.php!, supported: false } }, /not supported by the runner image/]
    ];
    for (const [name, r, re] of cases) {
      const d = dataWithRunner(r);
      expect(d.verification?.verified, name).toBe(false);
      expect(verificationLine(d).text, name).toMatch(re);
      expect(textOf(d), name).not.toContain('Verified by the runner');
    }
  });

  it('a baseline run alone never verifies a patch', () => {
    const d = dataWithRunner(undefined, greenRunnerResult());
    expect(d.verification?.verified).toBe(false);
    expect(d.verification?.unverifiedReasons).toContain('no patched run was measured');
  });

  it('a summary without a verdict is shown as not verified, never as verified', () => {
    const d = attachRunnerResult(dataOf(manyFindings(2)), { runner: 'x', checks: [{ name: 'a', status: 'passed' }] });
    expect(d.verification?.verified).toBe(false);
    expect(verificationLine(d).text).toBe('Not verified: the runner result carries no verdict.');
    // a hand-made "verified" with reasons attached is still verified only through the flag, and reasons are dropped when true
    const forged = attachRunnerResult(dataOf([]), { runner: 'x', checks: [], verified: false, unverifiedReasons: ['because'] });
    expect(verificationLine(forged).text).toBe('Not verified: because.');
  });

  it('without runner ids the report says no runner result is attached', () => {
    expect(verificationLine(dataOf([])).text).toBe('Not verified: no runner result attached');
    expect(textOf(dataOf([]))).not.toContain('Verified by the runner');
  });

  it('runnerResultToSummary carries the php block, build and tests through', () => {
    const s = runnerResultToSummary({ patched: runnerFixture('php-shop-modernized-php84.json'), patchedRunId: '7' });
    expect(s.php).toMatchObject({ selected: '8.4', version: '8.4.27', constraint: '^8.4', lockRegenerated: true, supported: true });
    expect(s.buildOk).toBe(false);
    expect(s.tests).toEqual({ ran: 0, passed: 0, failed: 0 });
    expect(s.verified).toBe(false);
  });
});

describe('Known limits appendix', () => {
  it('states the limits the owner listed', () => {
    const all = textOf(dataOf(manyFindings(3)));
    const s = all.slice(all.indexOf('Appendix D: known limits'));
    expect(s).toContain('shown as "?"');
    expect(s).toContain('valid for 10 minutes');
    expect(s).toContain('memory of the one server instance');
    expect(s).toContain('works for anyone who holds it');
    expect(s).toContain('"Projected" means');
    expect(s).toContain('"Measured" means');
    expect(s).toContain('0 to 100');
    expect(s).toContain('half weight');
    expect(s).toContain('only (a report describes one project');
    expect(s).toContain('No part of the repository was skipped');
  });
  it('says what was skipped when the scan was truncated or dependencies were unchecked', () => {
    const d = dataOf(manyFindings(1));
    d.truncatedScan = true;
    d.dependencyStats.checked = { ...d.dependencyStats.checked, value: 3 };
    d.dependencyStats.total = { ...d.dependencyStats.total, value: 10 };
    const all = textOf(d);
    expect(all).toContain('exceeded the scan limit');
    expect(all).toContain('7 of 10 direct dependencies were not checked');
  });
});
