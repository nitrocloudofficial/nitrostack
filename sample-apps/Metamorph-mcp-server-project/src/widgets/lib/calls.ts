// Tesler's law: the widget composes the next tool call for the user. Pure helpers, no React, never throw.
import type { ApplyVM, AssessmentVM, EchoVM, PlanVM, ReportVM, StageVM, VerifyVM } from './view-model';

export interface NextCall {
  tool: string;
  // Arguments the widget can supply. Empty when the result does not carry the repository URL.
  args: Record<string, string>;
  // True when `args` is a complete call; false means the user has to fill in repo_url.
  complete: boolean;
  // The call as text (what 'Copy call' copies and what the card shows).
  text: string;
}

const PLACEHOLDER = 'https://github.com/OWNER/REPO';
const TOKEN_PLACEHOLDER = '<approvalToken from preview_changes>';

// Builds a call from the echo: the repository (and folder) the result came from, plus extra arguments. Without the
// echoed URL the text shows a placeholder and `complete` is false, so the widget never runs a call it had to guess.
function compose(tool: string, echo: Pick<EchoVM, 'repoUrl' | 'subfolder'>, extra: Record<string, string> = {}, placeholders: Record<string, string> = {}): NextCall {
  const args: Record<string, string> = {};
  if (echo.repoUrl) args.repo_url = echo.repoUrl;
  if (echo.repoUrl && echo.subfolder) args.subfolder = echo.subfolder;
  Object.assign(args, extra);
  const shown = echo.repoUrl ? { ...args, ...placeholders } : { repo_url: PLACEHOLDER, ...(echo.subfolder ? { subfolder: echo.subfolder } : {}), ...extra, ...placeholders };
  return { tool, args, complete: Boolean(echo.repoUrl) && Object.keys(placeholders).length === 0, text: `${tool} ${JSON.stringify(shown)}` };
}

export function nextCallAfterAssessment(vm: Pick<AssessmentVM, 'repoUrl' | 'subfolder'>): NextCall {
  return compose('plan_modernization', vm);
}

// preview_changes is read scope and changes nothing: the only call the widget may run on its own after a plan.
export function previewCall(vm: Pick<PlanVM, 'repoUrl' | 'subfolder' | 'goal'>, stage: Pick<StageVM, 'id'>): NextCall {
  return compose('preview_changes', vm, { stage: stage.id, goal: vm.goal });
}

// verify_patch starts runs (write scope) and needs a fresh approval token: copy only, never run from the widget.
export function verifyCall(vm: Pick<ApplyVM, 'repoUrl' | 'subfolder' | 'stage'>): NextCall {
  return compose('verify_patch', vm, { stage: vm.stage.id }, { approval_token: TOKEN_PLACEHOLDER });
}

// Report again, or check a verification again: both are re-runs of the call that produced the result.
export function reportCall(vm: Pick<ReportVM, 'repoUrl' | 'subfolder'>): NextCall {
  return compose('generate_report', vm);
}

export function resumeCall(vm: Pick<VerifyVM, 'patched' | 'baseline'>): NextCall | undefined {
  if (!vm.patched.runId) return undefined;
  const args: Record<string, string> = { run_id: vm.patched.runId, ...(vm.baseline.runId ? { baseline_run_id: vm.baseline.runId } : {}) };
  return { tool: 'verify_patch', args, complete: true, text: `verify_patch ${JSON.stringify(args)}` };
}

export function reportFromRuns(vm: Pick<VerifyVM, 'repoUrl' | 'subfolder' | 'patched' | 'baseline'>): NextCall {
  const ids = { ...(vm.baseline.runId ? { baseline: vm.baseline.runId } : {}), ...(vm.patched.runId ? { patched: vm.patched.runId } : {}) };
  const base = compose('generate_report', vm);
  const shown = JSON.stringify({ ...JSON.parse(base.text.slice('generate_report '.length)), runner_run_ids: ids });
  return { ...base, text: `generate_report ${shown}` };
}

export function assessCall(vm: Pick<EchoVM, 'repoUrl' | 'subfolder'>): NextCall {
  return compose('assess_project', vm);
}

// "owner/repo" from a GitHub URL, else undefined.
export function repoLabel(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const m = url.match(/github\.com[/:]([^/\s]+)\/([^/\s#?]+?)(?:\.git)?(?:[/?#]|$)/i);
  return m ? `${m[1]}/${m[2]}` : undefined;
}

export const shortSha = (s: string | undefined): string | undefined => (s && /^[0-9a-f]{7,40}$/i.test(s) ? s.slice(0, 7) : undefined);

// ---- expiry countdown (report links) ----

// Seconds left of a link that lives `minutes` from `startMs`. Never negative.
export function secondsLeft(startMs: number, minutes: number, nowMs: number): number {
  return Math.max(0, Math.ceil((startMs + minutes * 60_000 - nowMs) / 1000));
}

// m:ss, fixed digits, so the width does not move while it ticks (also use tabular numerals).
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// When the countdown starts: the server's generation time when it is recent and not in the future (the links were
// issued a moment later), else the moment the widget received the result. Never later than 'now', never an old time
// that would show a fresh link as expired.
export function countdownStart(generatedAt: string | undefined, minutes: number, nowMs: number): number {
  const t = generatedAt ? Date.parse(generatedAt) : NaN;
  if (Number.isFinite(t) && t <= nowMs && nowMs - t < minutes * 60_000) return t;
  return nowMs;
}
