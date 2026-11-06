// Turns runner results into the small objects verify_patch returns and into the RunnerSummary the report uses.
// Honest-claims rule: `verified` is true only when the build succeeded AND tests ran AND they passed. Everything else
// lists why it is not verified. No free text from the repository is copied here (check tool names are from the runner's
// fixed list, and are length-capped by the result schema).
import type { RunnerSummary } from '../report/report-data.js';
import { isFinal, type RunInfo, type RunState } from './github-runner.js';
import type { RunnerResult } from './result.js';
import { analyzeFindings, summarizeMeasured } from '../scanners/measured.js';

export const MAX_CHECK_ROWS = 25;

export interface RunView {
  runId?: string; // absent only when the dispatch itself failed
  status: RunState;
  conclusion?: string;
  htmlUrl?: string;
  error?: string; // why the result could not be read (token-free)
  patchApplied?: boolean;
  buildOk?: boolean;
  tests?: { ran: number; passed: number; failed: number };
  checks?: Array<{ tool: string; status: 'pass' | 'fail' | 'error' | 'skipped'; durationMs?: number }>;
  php?: { selected?: string; supported: boolean; lockRegenerated?: boolean };
  checkCount?: number;
  findingsTotal?: number;
}

export function viewOf(info: RunInfo, result?: RunnerResult, error?: string): RunView {
  const view: RunView = { runId: info.runId, status: info.state, ...(info.conclusion ? { conclusion: info.conclusion } : {}), ...(info.htmlUrl ? { htmlUrl: info.htmlUrl } : {}) };
  if (error) view.error = error.slice(0, 300);
  if (result) {
    const rank = { fail: 0, error: 1, pass: 2, skipped: 3 } as const;
    const sorted = [...result.checks].sort((a, b) => rank[a.status] - rank[b.status]);
    view.patchApplied = result.patchApplied;
    view.buildOk = result.buildOk;
    view.tests = { ...result.tests };
    view.checks = sorted.slice(0, MAX_CHECK_ROWS).map((c) => ({ tool: c.tool, status: c.status, durationMs: c.durationMs }));
    if (result.php) view.php = { ...(result.php.selected ? { selected: result.php.selected } : {}), supported: result.php.supported, ...(result.php.lockRegenerated !== undefined ? { lockRegenerated: result.php.lockRegenerated } : {}) };
    view.checkCount = result.checks.length;
    view.findingsTotal = result.findingsTotal ?? result.findings.length;
  }
  return view;
}

const BUILD_CHECKS = ['composer-install', 'npm-ci', 'tsc'];

export interface Verdict {
  verified: boolean;
  unverifiedReasons: string[];
}

/** The honest verdict for the patched run. `result` is the validated result.json of that run, when it could be read. */
export function judge(patched: RunView | undefined, result: RunnerResult | undefined): Verdict {
  const reasons: string[] = [];
  const add = (r: string) => {
    if (!reasons.includes(r)) reasons.push(r);
  };
  if (!patched) add('no patched run was measured');
  else if (!isFinal(patched.status)) add(`runner still ${patched.status === 'queued' ? 'queued' : 'running'}`);
  else if (patched.status === 'timed_out') add('runner timed out');
  else if (patched.status === 'failed') add(`runner run failed${patched.conclusion ? ` (${patched.conclusion})` : ''}`);
  if (patched && isFinal(patched.status) && !result) add(patched.error ? `result unavailable: ${patched.error}` : 'result.json unavailable');

  if (result) {
    if (!result.patchApplied) add('patch did not apply');
    let buildReason = false;
    for (const c of result.checks) {
      if (BUILD_CHECKS.includes(c.tool) && (c.status === 'fail' || c.status === 'error')) {
        add(`${c.tool.replace(/-/g, ' ')} ${c.status === 'error' ? 'could not run' : 'failed'}`);
        buildReason = true;
      }
    }
    if (!result.buildOk && !buildReason) add('build not verified');
    const t = result.tests;
    if (t.ran === 0) add('no tests found');
    else if (t.failed > 0) add(`${t.failed} test${t.failed === 1 ? '' : 's'} failed`);
    else if (t.passed === 0) add('no tests passed');
    // PHP: dependencies resolved afresh in a scratch copy do not reflect the committed lockfile, so the run cannot vouch for it.
    if (result.php?.lockRegenerated) add('composer.lock was unusable and was regenerated in a scratch copy, so the committed lockfile was not tested');
    if (result.php && !result.php.supported) add(`PHP ${result.php.selected ?? 'version'} is not supported by the runner image`);
  }
  return { verified: reasons.length === 0, unverifiedReasons: reasons };
}

/** Overall state across the runs that exist: still going wins, then timed_out, then failed. */
export function overallStatus(views: Array<RunView | undefined>): RunState {
  const s = views.filter((v): v is RunView => v !== undefined).map((v) => v.status);
  if (s.length === 0) return 'failed';
  if (s.some((x) => x === 'running') || (s.some((x) => x === 'queued') && s.some((x) => x !== 'queued'))) return 'running';
  if (s.every((x) => x === 'queued')) return 'queued';
  if (s.includes('timed_out')) return 'timed_out';
  if (s.includes('failed')) return 'failed';
  return 'completed';
}

// ---- report mapping ----

const CHECK_STATUS: Record<RunnerResult['checks'][number]['status'], 'passed' | 'failed' | 'skipped'> = { pass: 'passed', fail: 'failed', error: 'failed', skipped: 'skipped' };

/**
 * Maps the runner's results onto the report's RunnerSummary. Checks come from the patched run when there is one (else
 * the baseline); each detail also states the baseline outcome so the report shows measured before and after.
 * The runner does not compute a Metamorph score, so scoreBefore and scoreAfter stay unset rather than invented.
 */
export function runnerResultToSummary(input: { patched?: RunnerResult; baseline?: RunnerResult; patchedRunId?: string; baselineRunId?: string }): RunnerSummary {
  const { patched, baseline } = input;
  const primary = patched ?? baseline;
  if (!primary) throw new TypeError('runnerResultToSummary needs at least one runner result.');
  const baseByTool = new Map((baseline && patched ? baseline.checks : []).map((c) => [c.tool, c]));
  const checks: RunnerSummary['checks'] = primary.checks.map((c) => {
    const b = baseByTool.get(c.tool);
    const detail = [c.summary, b ? `baseline: ${b.status}` : ''].filter(Boolean).join(' | ');
    return { name: c.tool, status: CHECK_STATUS[c.status], ...(detail ? { detail } : {}), durationMs: c.durationMs };
  });
  const t = primary.tests;
  // Verdict of the patched run (same rule as verify_patch). A baseline alone never verifies a patch.
  const verdict = judge(patched ? ({ status: 'completed' } as RunView) : undefined, patched);
  const bt = baseline && patched ? baseline.tests : undefined;
  const bNote = (x: string) => (bt ? ` | baseline: ${x}` : '');
  checks.push({
    name: 'build',
    status: primary.buildOk ? 'passed' : 'failed',
    detail: `buildOk=${primary.buildOk}${bt && baseline ? bNote(`buildOk=${baseline.buildOk}`) : ''}`
  });
  checks.push({
    name: 'tests',
    status: t.ran === 0 ? 'skipped' : t.failed > 0 ? 'failed' : 'passed',
    detail: `${t.ran} ran, ${t.passed} passed, ${t.failed} failed${t.ran === 0 ? ' (no tests found)' : ''}${bt ? bNote(`${bt.ran} ran, ${bt.passed} passed, ${bt.failed} failed`) : ''}`
  });
  // Measured score and deduplicated findings of the primary run (patched when there is one), plus both summaries when both exist.
  const pa = patched ? analyzeFindings(patched) : undefined;
  const ba = baseline ? analyzeFindings(baseline) : undefined;
  const primaryAnalysis = pa ?? (ba as NonNullable<typeof ba>);
  const ids = [input.baselineRunId ? `baseline run ${input.baselineRunId}` : '', input.patchedRunId ? `patched run ${input.patchedRunId}` : ''].filter(Boolean).join(', ');
  const starts = [patched?.startedAt, baseline?.startedAt].filter((x): x is string => !!x).sort();
  const ends = [patched?.finishedAt, baseline?.finishedAt].filter((x): x is string => !!x).sort();
  return {
    runner: `github-actions${ids ? ` (${ids})` : ''}`,
    ...(starts[0] ? { startedAt: starts[0] } : {}),
    ...(ends.length ? { finishedAt: ends[ends.length - 1] } : {}),
    checks,
    tools: primary.checks.filter((c) => c.version && c.version !== 'n/a' && c.version !== 'unknown').map((c) => ({ name: c.tool, version: c.version })),
    verified: verdict.verified,
    unverifiedReasons: verdict.unverifiedReasons,
    patchApplied: primary.patchApplied,
    buildOk: primary.buildOk,
    tests: { ...primary.tests },
    ...(primary.php ? { php: { ...primary.php } } : {}),
    measured: { basis: patched ? 'patched' : 'baseline', analysis: primaryAnalysis, ...(ba ? { baseline: summarizeMeasured(ba) } : {}), ...(pa ? { patched: summarizeMeasured(pa) } : {}) }
  };
}
