// verify_patch core. Dispatches ONE run with the stage patch applied and ONE baseline run without it, waits within a
// time budget and returns a small, honest result. Nothing here runs project code: GitHub Actions does, in isolation.
import { resolveApprovedStage, type ApplyOptions } from '../planning/apply.js';
import { isEnvFile, isEnvTemplate, renderDiff } from '../planning/preview.js';
import type { RunnerSummary } from '../report/report-data.js';
import { judge, overallStatus, runnerResultToSummary, viewOf, type RunView, type Verdict } from './evaluate.js';
import { GithubRunner, RunnerError, isFinal, type RunInfo, type RunState } from './github-runner.js';
import type { RunnerResult } from './result.js';
import { analyzeFindings, compareMeasured, type MeasuredComparison } from '../scanners/measured.js';
import { enrichAnalyses, liveEnrichClients, type EnrichClients, type EnrichmentInfo } from '../scanners/enrich.js';

export const DISPATCH_WAIT_MS = 60_000; // fits the ~120 s tool budget after the repository download and assessment
export const RESUME_WAIT_MS = 90_000;

export interface VerifyOutput extends Verdict {
  mode: 'measured';
  status: RunState;
  stage?: { id: string; title: string };
  patched: RunView;
  baseline: RunView;
  resume?: { run_id: string; baseline_run_id?: string };
  // Present only when both runs completed and both results were readable. Shown even when the patched build failed or no tests
  // ran: `verified` and `unverifiedReasons` above still decide whether the patch counts as verified, never this score.
  measured?: MeasuredComparison & { topFindings: TopFinding[]; feeds: EnrichmentInfo };
  notes: string[];
  hint: string;
}

/** One of the highest-ranked findings of the patched run: known-exploited first, then severity, then EPSS. */
export interface TopFinding {
  id: string;
  severity: string;
  title: string;
  kev?: true;
  epss?: number;
  rankReason: string;
}

export const TOP_FINDINGS = 3;

export interface StagePatch {
  patch: string;
  stage: { id: string; title: string };
  notes: string[];
}

/** Regenerates the stage patch exactly as apply_stage does (same approval checks), as a plain `git apply`-able diff. */
export async function patchForStage(dir: string, opts: ApplyOptions): Promise<StagePatch> {
  const { stage, patches } = await resolveApprovedStage(dir, opts);
  // Env file contents are never rendered into a diff (only a header), so those patches cannot be applied by the runner.
  const usable = patches.filter((p) => !(isEnvFile(p.path) && !isEnvTemplate(p.path)));
  const notes: string[] = [];
  if (usable.length < patches.length) notes.push(`${patches.length - usable.length} env file change(s) were left out of the verified patch: their contents are never sent anywhere.`);
  if (usable.length === 0) {
    throw new Error(`Stage "${stage.id}" only changes env files, which cannot be sent to the runner. There is nothing to verify automatically; apply the guided steps and call assess_project.`);
  }
  return { patch: renderDiff(usable, Number.MAX_SAFE_INTEGER), stage: { id: stage.id, title: stage.title }, notes };
}

interface Tracked {
  view: RunView;
  result?: RunnerResult;
}

async function track(runner: GithubRunner, runId: string, waitMs: number): Promise<Tracked> {
  let info: RunInfo;
  try {
    info = await runner.waitFor(runId, waitMs);
  } catch (e) {
    return { view: { runId, status: 'failed', error: errText(e) } };
  }
  if (info.state === 'completed' || info.state === 'failed') {
    try {
      const result = await runner.fetchResult(runId);
      return { view: viewOf(info, result), result };
    } catch (e) {
      // A failed job may have no artifact; a completed one without a readable result is reported, never passed.
      return { view: viewOf(info, undefined, errText(e)) };
    }
  }
  return { view: viewOf(info) };
}

const errText = (e: unknown): string => (e instanceof RunnerError ? e.message : 'unexpected error while reading the run');

async function finish(patched: Tracked | undefined, baseline: Tracked | undefined, base: Pick<VerifyOutput, 'stage' | 'notes'>, feeds: EnrichClients): Promise<VerifyOutput> {
  const pv: RunView = patched?.view ?? { status: 'failed', error: 'no patched run' };
  // The baseline's check list is left out to keep the result small; its status, build and test counts are enough.
  const { checks: _baselineChecks, ...bv } = baseline?.view ?? ({ status: 'failed', error: 'no baseline run' } as RunView);
  void _baselineChecks;
  const verdict = judge(patched?.view, patched?.result);
  const status = overallStatus([patched?.view, baseline?.view]);
  const ids = { run_id: pv.runId, baseline_run_id: bv.runId };
  const waiting = !isFinal(status);
  // Enrichment runs only now, with both results in hand, once for the CVE ids of both runs and under its own time cap (8 s),
  // so the poll budget of the call is not touched. A feed outage is named in measured.feeds.unavailable.
  let measured: VerifyOutput['measured'];
  if (patched?.result && baseline?.result && patched.view.status === 'completed' && baseline.view.status === 'completed') {
    const { analyses, info } = await enrichAnalyses([analyzeFindings(baseline.result), analyzeFindings(patched.result)], feeds);
    const [b, p] = analyses;
    const top = p.findings.slice(0, TOP_FINDINGS).map((f): TopFinding => ({
      id: f.id,
      severity: f.severity,
      title: f.title.length > 100 ? `${f.title.slice(0, 99)}…` : f.title,
      ...(f.kev === true ? { kev: true as const } : {}),
      ...(typeof f.epss === 'number' ? { epss: f.epss } : {}),
      rankReason: f.rankReason ?? `severity ${f.severity}`
    }));
    measured = { ...compareMeasured(b, p), topFindings: top, feeds: info };
  }
  return {
    mode: 'measured',
    status,
    ...verdict,
    ...(base.stage ? { stage: base.stage } : {}),
    patched: pv,
    baseline: bv,
    ...(measured ? { measured } : {}),
    ...(pv.runId ? { resume: { run_id: pv.runId, ...(bv.runId ? { baseline_run_id: bv.runId } : {}) } } : {}),
    notes: base.notes,
    hint: waiting
      ? `Not finished yet. Call verify_patch again with run_id "${ids.run_id}"${ids.baseline_run_id ? ` and baseline_run_id "${ids.baseline_run_id}"` : ''} to check. A cold runner build can take several minutes.`
      : verdict.verified
        ? 'Build succeeded and the project tests ran and passed on the patched code. Pass these run ids to generate_report as runner_run_ids to record it.'
        : 'Not verified. See unverifiedReasons. This is not a pass: do not treat the patch as tested. After fixing the cause, call preview_changes for a fresh approval token and verify_patch again.'
  };
}

export interface DispatchRequest {
  repoUrl: string;
  subfolder?: string;
  note?: string;
  getPatch: () => Promise<StagePatch>;
}

/** Dispatches the patched and baseline runs and waits up to `waitMs` for both. */
export async function verifyByDispatch(runner: GithubRunner, req: DispatchRequest, waitMs = DISPATCH_WAIT_MS, feeds: EnrichClients = liveEnrichClients()): Promise<VerifyOutput> {
  const sp = await req.getPatch();
  const [p, b] = await Promise.allSettled([
    runner.dispatch({ repoUrl: req.repoUrl, subfolder: req.subfolder, patch: sp.patch }),
    runner.dispatch({ repoUrl: req.repoUrl, subfolder: req.subfolder })
  ]);
  if (p.status === 'rejected') throw p.reason; // a baseline run that did start is harmless; nothing useful to resume
  const notes = [...sp.notes, ...(req.note ? [req.note] : [])];
  const baseline: Promise<Tracked> =
    b.status === 'fulfilled'
      ? track(runner, b.value.runId, waitMs)
      : Promise.resolve({ view: { status: 'failed' as const, error: `baseline dispatch failed: ${errText(b.reason)}` } });
  const [patched, base] = await Promise.all([track(runner, p.value.runId, waitMs), baseline]);
  return finish(patched, base, { stage: sp.stage, notes }, feeds);
}

/** Polls runs started earlier. */
export async function verifyByRunIds(runner: GithubRunner, ids: { runId?: string; baselineRunId?: string }, waitMs = RESUME_WAIT_MS, feeds: EnrichClients = liveEnrichClients()): Promise<VerifyOutput> {
  for (const id of [ids.runId, ids.baselineRunId]) {
    if (id !== undefined && !GithubRunner.validRunId(id)) throw new RunnerError('run_id and baseline_run_id must be digits only (the ids from an earlier verify_patch result).');
  }
  const [patched, baseline] = await Promise.all([ids.runId ? track(runner, ids.runId, waitMs) : undefined, ids.baselineRunId ? track(runner, ids.baselineRunId, waitMs) : undefined]);
  return finish(patched, baseline, { notes: [] }, feeds);
}

/** Reads finished runs for generate_report and maps them to the report's RunnerSummary. Unfinished or unreadable runs are an error (the caller asked for them). */
export async function fetchRunnerSummary(runner: GithubRunner, ids: { baseline?: string; patched?: string }, feeds: EnrichClients = liveEnrichClients()): Promise<RunnerSummary> {
  if (!ids.baseline && !ids.patched) throw new RunnerError('runner_run_ids needs a baseline or a patched run id.');
  const read = async (label: string, id: string | undefined): Promise<{ id: string; result: RunnerResult } | undefined> => {
    if (id === undefined) return undefined;
    if (!GithubRunner.validRunId(id)) throw new RunnerError(`runner_run_ids.${label} must be digits only.`);
    const info = await runner.getRun(id);
    if (!isFinal(info.state)) throw new RunnerError(`The ${label} run ${id} is still ${info.state}. Call verify_patch with run_id until it is finished, then generate the report.`);
    if (info.state === 'timed_out') throw new RunnerError(`The ${label} run ${id} timed out, so there is no result to report.`);
    return { id, result: await runner.fetchResult(id) };
  };
  const [b, p] = await Promise.all([read('baseline', ids.baseline), read('patched', ids.patched)]);
  const summary = runnerResultToSummary({ baseline: b?.result, patched: p?.result, baselineRunId: b?.id, patchedRunId: p?.id });
  if (!summary.measured) return summary;
  // KEV and EPSS for the distinct CVE ids of the runner findings (fail-soft, 8 s cap); the report ranks with them.
  const { analyses, info } = await enrichAnalyses([summary.measured.analysis], feeds);
  return { ...summary, measured: { ...summary.measured, analysis: analyses[0], enrichment: info } };
}
