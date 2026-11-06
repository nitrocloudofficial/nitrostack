import { scoreFindings } from '../../src/modules/assessment/score.js';
import { assessFull, type Analyzer, type FullAssessment } from '../../src/modules/assessment/assess.js';
import type { Category, Finding, Severity } from '../../src/modules/assessment/types.js';
import { buildPlan } from '../../src/modules/planning/plan.js';
import { attachCloud, buildReportData, type ReportCloud, type ReportData, type ReportDependency, type RunnerSummary } from '../../src/modules/report/report-data.js';
import { writePhpFixture } from './fixtures.js';
import { readFileSync } from 'node:fs';
import { runnerResultToSummary } from '../../src/modules/verify/evaluate.js';
import { parseRunnerResult, type RunnerResult } from '../../src/modules/verify/result.js';

// A runner fixture from tests/fixtures/runner/<name> as a validated result (optionally with fields overridden).
export function runnerFixture(name: string, override: Partial<RunnerResult> = {}): RunnerResult {
  const parsed = parseRunnerResult(readFileSync(new URL(`../fixtures/runner/${name}`, import.meta.url), 'utf8'));
  if (!parsed.ok) throw new Error(parsed.error);
  return { ...parsed.result, ...override };
}

// ReportData whose Verification comes from a runner result evaluated by the same code verify_patch uses.
export function dataWithRunner(patched?: RunnerResult, baseline?: RunnerResult): ReportData {
  return dataOf(manyFindings(4), { runner: runnerResultToSummary({ patched, baseline, patchedRunId: patched ? '2002' : undefined, baselineRunId: baseline ? '1001' : undefined }) });
}

// A green result: build ok, tests ran and passed, nothing else wrong.
export function greenRunnerResult(): RunnerResult {
  const base = runnerFixture('php-shop-after.json');
  return {
    ...base,
    patchApplied: true,
    buildOk: true,
    tests: { ran: 12, passed: 12, failed: 0 },
    checks: base.checks.map((c) => (['composer-install', 'composer-audit', 'phpunit'].includes(c.tool) ? { ...c, status: 'pass' as const } : c)),
    php: { selected: '8.3', version: '8.3.9', constraint: '^8.3', constraintSource: 'require.php', reason: 'lowest installed version satisfying ^8.3', supported: true, lockRegenerated: false }
  };
}

// Shared report fixtures: used by the layout tests and by the PDF/UA validation test.
export const NOW = '2026-10-31T12:00:00.000Z';
const SEVS: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];
const CATS: Category[] = ['security', 'dependencies', 'runtime', 'architecture', 'standards', 'cloud'];

export function fullOf(findings: Finding[], files: Record<string, string> = {}): FullAssessment {
  return {
    assessment: {
      assessmentId: 'test',
      stack: 'php',
      runtime: { declared: '>=7.2' },
      frameworks: [],
      uiLibraries: [],
      hosting: [],
      dependencies: { total: 0, checked: 0, vulnerable: 0, urgent: 0, approximateVersions: false },
      score: scoreFindings(findings),
      topFindings: [],
      findingCount: findings.length,
      truncated: false
    },
    findings,
    fixes: [],
    files
  };
}

export function manyFindings(n: number, extra: Partial<Finding> = {}): Finding[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `rule-${i}`,
    category: CATS[i % CATS.length],
    severity: SEVS[i % SEVS.length],
    title: `Finding number ${i} with a reasonably descriptive title that wraps over more than one line in a narrow column`,
    evidence: `src/module${i}/file${i}.php:${i + 1}`,
    recommendation: `Replace the legacy call number ${i} with the maintained equivalent and re-run the scan.`,
    cwe: i % 3 === 0 ? ['CWE-89'] : undefined,
    owasp: i % 3 === 0 ? ['A03:2021'] : undefined,
    cvss: i % 4 === 0 ? 7.5 : undefined,
    epss: i % 5 === 0 ? 0.12345 : undefined,
    kev: i % 17 === 0 ? true : undefined,
    source: 'osv.dev',
    ...extra
  }));
}

export function dataOf(findings: Finding[], opts: { deps?: ReportDependency[]; runner?: RunnerSummary; repoUrl?: string } = {}): ReportData {
  return buildReportData({
    full: fullOf(findings),
    meta: { repoUrl: opts.repoUrl ?? 'https://github.com/owner/repo', generatedAt: NOW },
    dependencies: opts.deps ?? [],
    runner: opts.runner
  });
}

// ---- worst-case fixtures ----
export const long500 = 'a'.repeat(500);
export const slashes500 = Array.from({ length: 50 }, (_, i) => `dir${i}`).join('/') + '/file.php';
const cloudBase: ReportCloud = { status: 'scanned', heading: 'Cloud inventory (AWS, read-only)', summary: 'Scanned eu-west-1, us-east-1 (12 lambda, 3 rds); 3 finding(s).', regions: ['eu-west-1', 'us-east-1'], counts: [], findings: [], findingsTotal: 0, moreFindings: 0, notChecked: [], limits: [], note: 'Read-only scan through an assumed role; see docs/AWS_SETUP.md.', generatedAt: NOW };
export const cloudScanned = (): ReportCloud => ({
  ...cloudBase,
  counts: [{ service: 'lambda', count: { value: 12, origin: 'measured' } }, { service: 'rds', count: { value: 3, origin: 'measured' } }],
  findings: [
    { id: 'aws-lambda-runtime-eol:old-fn', category: 'cloud', severity: 'high', title: 'Lambda function old-fn runs nodejs18.x; support ended 2025-09-01', evidence: 'lambda eu-west-1 old-fn runtime=nodejs18.x', recommendation: 'Move this function to nodejs24.x.', cwe: [], owasp: [], kev: false, rankReason: 'severity high', source: 'aws-readonly', service: 'lambda', region: 'eu-west-1', resource: 'old-fn' },
    { id: 'aws-rds-engine-eol:db-1', category: 'cloud', severity: 'medium', title: 'RDS mysql database db-1 runs version 8.0', recommendation: 'Upgrade the engine.', cwe: [], owasp: [], kev: false, rankReason: 'severity medium', source: 'aws-readonly', service: 'rds', region: 'us-east-1', resource: 'db-1' }
  ],
  findingsTotal: 3,
  moreFindings: 1,
  limits: ['lambda eu-west-1: checked 200, more exist (cap 200)'],
  notChecked: [{ service: 'eks', region: 'eu-west-1', code: 'AccessDenied', note: 'some resources could not be read' }, { service: 'beanstalk', code: 'NoVerifiedEolSource', note: 'no verified end-of-life data source' }]
});

export const FIXTURES: Record<string, () => ReportData> = {
  'cloud section: scanned, with findings, limits and not checked': () => attachCloud(dataOf(manyFindings(8)), cloudScanned()),
  'cloud section: requested but not configured': () => attachCloud(dataOf(manyFindings(3)), { ...cloudBase, status: 'not-configured', summary: 'A cloud scan was requested, but this server is not set up for it. Nothing from AWS is in this report. See docs/AWS_SETUP.md.', regions: [] }),
  'zero findings': () => dataOf([]),
  '200 findings': () => dataOf(manyFindings(200)),
  '500-char unbroken strings': () => dataOf(manyFindings(30, { title: long500, evidence: long500, id: undefined as unknown as string }).map((f, i) => ({ ...f, id: `${long500}-${i}`, evidence: i % 2 ? slashes500 : long500 })), { repoUrl: `https://github.com/owner/${'r'.repeat(200)}` }),
  'runner: not verified (php-shop, lock regenerated)': () => dataWithRunner(runnerFixture('php-shop-after-php74.json'), runnerFixture('php-shop-before.json')),
  'runner: verified': () => dataWithRunner(greenRunnerResult(), runnerFixture('php-shop-before.json')),
  'unicode, RTL and emoji': () =>
    dataOf(manyFindings(12, { title: 'Привет мир Ελληνικά שלום עולם مرحبا بالعالم 你好世界 😀🔥 é café', evidence: 'src/日本語/файл.php:3', recommendation: '‮evil‬ RTL override and 🚀' })),
  'control characters': () =>
    dataOf(manyFindings(12, { title: 'bell\u0007 null\u0000 esc\u001B[31m red\u001B[0m tab\tand\nnewline \u0085   ​', evidence: 'x\u0000y\u0001z.php:1', recommendation: '\u0008backspace' })),
  '1 giant dependency table': () =>
    dataOf(manyFindings(10), {
      deps: Array.from({ length: 6000 }, (_, i) => ({ ecosystem: i % 2 ? ('npm' as const) : ('composer' as const), name: i % 2 ? `@scope/package-${i}` : `vendor/package-${i}`, version: `1.${i}.0`, dev: i % 3 === 0, approximate: i % 5 === 0 }))
    })
};


// The php-shop sample: a real assessment of the synthetic legacy PHP project, with a plan and feed sources.
export async function phpShopReportData(dir: string): Promise<ReportData> {
  await writePhpFixture(dir);
  const fakeOsv: Analyzer = async (pkgs) =>
    pkgs.map((p) => ({ package: p, affected: true, truncated: false, findings: [{ id: 'CVE-2022-31042', aliases: [], severity: 'high' as const, summary: 'test advisory', fixedVersions: ['6.5.8'], urgent: true, urgentReasons: ['known_exploited' as const], cvss: 7.5, cwes: ['CWE-200'] }] }));
  const full = await assessFull(dir, { analyze: fakeOsv, today: new Date('2026-10-31T00:00:00Z'), epss: async () => new Map([['CVE-2022-31042', 0.04]]) });
  const plan = buildPlan({ stack: full.assessment.stack, findings: full.findings, fixes: full.fixes, goal: 'modernize_all' });
  return buildReportData({ full, plan, meta: { repoUrl: 'https://github.com/example/php-shop', commit: 'ref main', generatedAt: NOW }, feeds: { sources: [{ name: 'osv.dev', url: 'https://api.osv.dev', fetchedAt: NOW }] } });
}
