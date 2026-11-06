// Builds REAL-shaped plan_modernization, apply_stage and verify_patch results offline, for the widget screenshots.
//  - plan and apply: the real planning code runs over the PHP shop test fixture with a stand-in for OSV (no network).
//  - verify: the real verifyByRunIds + view code runs against the in-memory fake GitHub with the recorded runner
//    results in tests/fixtures/runner. The "not verified" result uses php-shop-after.json as it was recorded (composer
//    install failed, no tests) with the PHP selection block copied from php-shop-after-php74.json. The "verified"
//    result is CONSTRUCTED (the recorded result with a passing build and 12 passing tests), the same way the unit tests do.
// Each result also carries the server's input echo (repo_url, commit, generatedAt), as the tools now return it.
// Output: tests/fixtures/widget/{plan_modernization,apply_stage,verify_patch.notverified,verify_patch.verified}.result.json
// Usage: node scripts/make-widget-flow-fixtures.mjs
import { build } from 'esbuild';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const entry = `
import { assessFull } from ${JSON.stringify(join(root, 'src/modules/assessment/assess.ts'))};
import { buildPlan } from ${JSON.stringify(join(root, 'src/modules/planning/plan.ts'))};
import { generatePatches } from ${JSON.stringify(join(root, 'src/modules/planning/patches.ts'))};
import { applyStageInDir } from ${JSON.stringify(join(root, 'src/modules/planning/apply.ts'))};
import { canonicalHash, signApprovalToken } from ${JSON.stringify(join(root, 'src/common/approval-token.ts'))};
import { echoOf } from ${JSON.stringify(join(root, 'src/modules/assessment/echo.ts'))};
import { verifyByRunIds } from ${JSON.stringify(join(root, 'src/modules/verify/verify.ts'))};
import { GithubRunner } from ${JSON.stringify(join(root, 'src/modules/verify/github-runner.ts'))};
import { CONFIG, FakeGithub, resultZip } from ${JSON.stringify(join(root, 'tests/helpers/fake-github.ts'))};
import { writePhpFixture } from ${JSON.stringify(join(root, 'tests/helpers/fixtures.ts'))};
import { readFileSync } from 'node:fs';

const SECRET = 'k'.repeat(40);
const TODAY = new Date('2026-10-30T00:00:00Z');
const REPO = { repo_url: 'https://github.com/acme/legacy-shop' };
const COMMIT = '41d1c9784742b8b8903f4f4b67378c9f1e5c9a81';
const ADV = {
  'guzzlehttp/guzzle': { id: 'GHSA-25mq-v84q-4j7r', severity: 'high', fixed: '6.5.8' },
  'symfony/http-kernel': { id: 'GHSA-q847-2q57-wmr3', severity: 'high', fixed: '4.4.50' }
};
const analyze = async (pkgs) => pkgs.map((p) => {
  const a = ADV[p.name];
  const num = (v) => String(v).replace(/^v/, '').split('.').map((x) => parseInt(x, 10) || 0);
  const older = (x, y) => { const [m, n] = [num(x), num(y)]; for (let i = 0; i < 3; i++) { if ((m[i] ?? 0) !== (n[i] ?? 0)) return (m[i] ?? 0) < (n[i] ?? 0); } return false; };
  if (!a || !older(p.version, a.fixed)) return { package: p, affected: false, findings: [], truncated: false };
  return { package: p, affected: true, truncated: false, findings: [{ id: a.id, aliases: [], severity: a.severity, summary: 'advisory', fixedVersions: [a.fixed], urgent: false, urgentReasons: [] }] };
});
const fx = (n) => JSON.parse(readFileSync(${JSON.stringify(join(root, 'tests/fixtures/runner/'))} + n, 'utf8'));

export default async function (dir) {
  await writePhpFixture(dir);
  const opts = { analyze, today: TODAY };
  const { assessment, findings, fixes, files } = await assessFull(dir, opts);
  const plan = buildPlan({ stack: assessment.stack, findings, fixes, goal: 'modernize_all' });
  const echo = echoOf(REPO, COMMIT, new Date());
  const planResult = {
    assessmentId: assessment.assessmentId, stack: plan.stack, goal: plan.goal, scoreBefore: plan.scoreBefore, scoreAfter: plan.scoreAfter,
    stages: plan.stages.map((s) => ({ index: s.index, id: s.id, title: s.title, kind: s.kind, automated: s.automated, risk: s.risk, addresses: s.addresses.slice(0, 10), steps: s.steps, rollback: s.rollback, scoreAfter: s.scoreAfter })),
    ...echo,
    hint: 'Call preview_changes with stage set to an automated stage id, for example "patch-dependencies", to see the exact file changes.'
  };
  const stageId = 'patch-dependencies';
  const patches = generatePatches({ stack: assessment.stack, files, fixes, stageIds: [stageId] });
  const index = plan.stages.find((s) => s.id === stageId).index;
  const token = signApprovalToken({ planHash: canonicalHash(plan), patchHash: canonicalHash(patches), stage: index }, SECRET, 1_800_000_000);
  const applied = await applyStageInDir(dir, { stage: stageId, token, goal: 'modernize_all', secret: SECRET, analyze, today: TODAY, now: 1_800_000_005 });
  const applyResult = { ...applied, ...echo, nextStep: 'Save the patch and apply it, then call verify_patch with the same repo_url, stage and approval_token to build and test it on a runner (or assess_project to re-scan).' };

  // verify: recorded runner results through the real verify code
  const g = new FakeGithub();
  const runner = new GithubRunner(CONFIG, { fetchFn: g.fetch, sleep: async () => undefined });
  const done = [{ status: 'completed', conclusion: 'success' }];
  const run = async (patched) => {
    g.runs.clear();
    g.runs.set(9001, { id: 9001, title: 't', states: [...done], artifact: resultZip(patched) });
    g.runs.set(9002, { id: 9002, title: 't', states: [...done], artifact: resultZip(fx('php-shop-before.json')) });
    const out = await verifyByRunIds(runner, { runId: '9001', baselineRunId: '9002' }, 1000, {});
    return { ...out, stage: { id: stageId, title: plan.stages.find((s) => s.id === stageId).title }, ...echoOf(REPO, COMMIT, new Date()) };
  };
  const after = fx('php-shop-after.json');
  const notVerified = await run({ ...after, php: fx('php-shop-after-php74.json').php });
  const passing = {
    ...after, buildOk: true, tests: { ran: 12, passed: 12, failed: 0 }, php: { ...fx('php-shop-modernized-php84.json').php, lockRegenerated: false },
    checks: after.checks.map((c) => (c.tool === 'composer-install' ? { ...c, status: 'pass', summary: 'ok' } : c.tool === 'phpunit' ? { ...c, status: 'pass', summary: '12 passed' } : c))
  };
  const verified = await run(passing);
  return { planResult, applyResult, notVerified, verified };
}`;

const out = await mkdtemp(join(tmpdir(), 'metamorph-flow-'));
const bundle = join(out, 'run.mjs');
await build({ stdin: { contents: entry, resolveDir: root, loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', outfile: bundle, logLevel: 'error', external: ['pdfmake'] });
const work = join(out, 'repo');
await mkdir(work);
const r = await (await import(pathToFileURL(bundle).href)).default(work);
await rm(out, { recursive: true, force: true });
const wrap = (v) => ({ content: [{ type: 'text', text: JSON.stringify(v, null, 2) }], structuredContent: JSON.parse(JSON.stringify(v)) });
const dir = join(root, 'tests/fixtures/widget');
const files = { 'plan_modernization.result.json': r.planResult, 'apply_stage.result.json': r.applyResult, 'verify_patch.notverified.result.json': r.notVerified, 'verify_patch.verified.result.json': r.verified };
for (const [name, v] of Object.entries(files)) {
  await writeFile(join(dir, name), JSON.stringify(wrap(v), null, 2) + '\n');
  console.log('wrote', name, JSON.stringify(v).length, 'chars');
}
