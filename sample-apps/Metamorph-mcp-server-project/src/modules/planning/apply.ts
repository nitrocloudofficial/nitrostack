// apply_stage core: verifies the approval, applies one stage's patches inside a throwaway copy, re-assesses that copy
// and builds a PROJECTED before/after result. The user's repository is never touched; the user applies the diff.
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { canonicalHash, verifyApprovalToken } from '../../common/approval-token.js';
import { redact } from '../../common/redact.js';
import { createWorkdir, resolveInside } from '../../common/safe-archive.js';
import { assessFull, type Analyzer, type AssessOptions, type FullAssessment } from '../assessment/assess.js';
import type { DependencyFix, FilePatch, Finding, Goal, ModernizationPlan, PlanStage, Severity } from '../assessment/types.js';
import { applyPatches, envKeyNames, generatePatches, shellQuote, untrackCommittedEnv } from './patches.js';
import { buildPlan } from './plan.js';
import { renderDiff } from './preview.js';

const MIN_SECRET_LEN = 32;
const MAX_DIFF_LINES = 1500;
const MAX_FIXED = 15;
const MAX_REMAINING = 5;
const NOT_CONFIGURED =
  'Approvals are not configured on this server (METAMORPH_TOKEN_SECRET is missing or shorter than 32 characters), so nothing can be applied. Ask the server operator to set it.';

export interface ApplyResult {
  stage: Pick<PlanStage, 'id' | 'index' | 'title' | 'risk'>;
  applied: true;
  mode: 'projected';
  files: Array<{ path: string; action: 'create' | 'edit' | 'delete' }>;
  scoreBefore: number;
  scoreAfter: number;
  scoreDelta: number;
  findingsFixed: string[];
  remaining: Array<{ id: string; severity: Severity; title: string }>;
  patch: string;
  howToApply: string[];
  note?: string;
}

// ---- lockfile projection ----

type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => v !== null && typeof v === 'object' && !Array.isArray(v);

function parseObject(text: string): Json | undefined {
  try {
    const v: unknown = JSON.parse(text);
    return isObj(v) ? v : undefined;
  } catch {
    return undefined;
  }
}

function setVersion(entry: unknown, to: string): boolean {
  if (!isObj(entry) || typeof entry.version !== 'string' || entry.version === to) return false;
  entry.version = to;
  return true;
}

function npmLock(text: string, fixes: DependencyFix[]): string {
  const lock = parseObject(text);
  if (!lock) return text;
  const v = lock.lockfileVersion;
  const packages = isObj(lock.packages) ? lock.packages : undefined;
  const deps = isObj(lock.dependencies) ? lock.dependencies : undefined;
  let changed = false;
  for (const f of fixes) {
    if (f.ecosystem !== 'npm') continue;
    if (v === 1 || (v === undefined && !packages)) changed = setVersion(deps?.[f.name], f.to) || changed;
    else {
      changed = setVersion(packages?.[`node_modules/${f.name}`], f.to) || changed;
      if (v === 2) changed = setVersion(deps?.[f.name], f.to) || changed;
    }
  }
  return changed ? JSON.stringify(lock, null, 2) + (text.endsWith('\n') ? '\n' : '') : text;
}

function composerLock(text: string, fixes: DependencyFix[]): string {
  const lock = parseObject(text);
  if (!lock) return text;
  let changed = false;
  for (const f of fixes) {
    if (f.ecosystem !== 'Packagist') continue;
    for (const section of ['packages', 'packages-dev']) {
      const list = lock[section];
      if (!Array.isArray(list)) continue;
      for (const entry of list) {
        if (!isObj(entry) || entry.name !== f.name || typeof entry.version !== 'string') continue;
        const next = (entry.version.startsWith('v') ? 'v' : '') + f.to.replace(/^v/, '');
        if (next !== entry.version) {
          entry.version = next;
          changed = true;
        }
      }
    }
  }
  return changed ? JSON.stringify(lock, null, 2) + (text.endsWith('\n') ? '\n' : '') : text;
}

// Projects what `npm install` / `composer update` would record for the fixed packages: only the installed version
// strings are rewritten. This is NOT a real install (no resolution, integrity hashes or sub-dependencies change),
// which is why the result is labelled projected. Unparseable lockfiles are left unchanged.
export function refreshLocks(files: Record<string, string>, fixes: DependencyFix[]): Record<string, string> {
  const out = { ...files };
  if (typeof out['package-lock.json'] === 'string') out['package-lock.json'] = npmLock(out['package-lock.json'], fixes);
  if (typeof out['composer.lock'] === 'string') out['composer.lock'] = composerLock(out['composer.lock'], fixes);
  return out;
}

// ---- approval ----

export type ApprovalCheck = { ok: true } | { ok: false; message: string };

export function checkApproval(
  token: string,
  expected: { planHash: string; patchHash: string; stage: number },
  secret: string | undefined,
  now?: number
): ApprovalCheck {
  if (typeof secret !== 'string' || secret.length < MIN_SECRET_LEN) return { ok: false, message: NOT_CONFIGURED };
  const r = verifyApprovalToken(token, expected, secret, now);
  if (r.ok) return r;
  if (r.reason === 'expired') return { ok: false, message: 'The approval token expired. Call preview_changes again and use the new approvalToken.' };
  if (r.reason === 'mismatch') {
    return { ok: false, message: 'The project, plan or patch changed since the preview (for example new advisories were published). Call preview_changes again and review the new diff.' };
  }
  return { ok: false, message: 'Invalid approval token. Call preview_changes again and pass its approvalToken unchanged.' };
}

// ---- result ----

export interface ApplyResultInput {
  stage: PlanStage;
  patches: FilePatch[];
  filesBefore: Record<string, string>;
  filesAfter: Record<string, string>;
  before: { score: number; findings: Finding[] };
  after: { score: number; findings: Finding[] };
  // Env files that the projection treated as untracked (`git rm --cached`); they are not part of the patch.
  untracked?: string[];
  // Variable NAMES (never values) held by those files, to rotate.
  envKeys?: string[];
}

function changedPaths(before: Record<string, string>, after: Record<string, string>): string[] {
  const all = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...all].filter((p) => before[p] !== after[p]).sort();
}

function lockStep(files: Record<string, string>): string {
  const npm = 'package.json' in files;
  const php = 'composer.json' in files;
  if (npm && !php) return 'Run npm install to refresh the lockfile.';
  if (php && !npm) return 'Run composer update to refresh the lockfile.';
  return 'Run npm install or composer update to refresh the lockfile.';
}

const ENV_NOTE =
  ' The committed-env finding clears only after you run git rm --cached on each env file: a patch cannot untrack a file, so the projection simply removes it from the temporary copy once .gitignore covers it. The patch never deletes your local env file and never contains its values.';

function envSteps(untracked: string[], keys: string[]): string[] {
  const names = keys.length > 0 ? keys.join(', ') : '(see .env.example)';
  return [
    ...untracked.map((p) => `Run: git rm --cached ${shellQuote(p)}`),
    `Rotate every secret that was in the env file(s), they are exposed in git history. Keys: ${names}`,
    ...untracked.map(
      (p) => `Purge history: git filter-repo --path ${shellQuote(p)} --invert-paths (WARNING: this rewrites history and needs a force-push by a human; coordinate with all clone owners)`
    )
  ];
}

export function buildApplyResult(input: ApplyResultInput): ApplyResult {
  const { stage, patches, filesBefore, filesAfter, before, after } = input;
  const untracked = input.untracked ?? [];
  const envLines = untracked.length > 0 ? envSteps(untracked, input.envKeys ?? []) : [];
  const afterIds = new Set(after.findings.map((f) => f.id));
  return {
    stage: { id: stage.id, index: stage.index, title: stage.title, risk: stage.risk },
    applied: true,
    mode: 'projected',
    files: changedPaths(filesBefore, filesAfter)
      .filter((p) => !untracked.includes(p))
      .map((p) => ({
      path: p,
      action: !(p in filesAfter) ? 'delete' : !(p in filesBefore) ? 'create' : 'edit'
    })),
    scoreBefore: before.score,
    scoreAfter: after.score,
    scoreDelta: after.score - before.score,
    findingsFixed: [...new Set(before.findings.map((f) => f.id))].filter((id) => !afterIds.has(id)).slice(0, MAX_FIXED),
    remaining: after.findings.slice(0, MAX_REMAINING).map((f) => ({ id: f.id, severity: f.severity, title: redact(f.title).text })),
    patch: redact(renderDiff(patches, MAX_DIFF_LINES)).text,
    howToApply: [
      'Save the patch as fix.patch in the root of your project.',
      'Run: git apply fix.patch',
      ...envLines.map((l) => redact(l).text),
      lockStep(filesBefore),
      'Run your tests.',
      'Commit and push.',
      'Call assess_project again to confirm the real score.'
    ],
    note: 'Projected result: the changes were applied to a temporary copy and lockfile versions were updated the way an install would record them. Nothing in your repository was changed. Apply the patch yourself, then assess_project shows the real score.' + (untracked.length > 0 ? ENV_NOTE : '')
  };
}

// ---- orchestration inside a prepared (throwaway) directory ----

export interface ApplyOptions {
  stage: string;
  token: string;
  goal: Goal;
  secret: string | undefined;
  analyze?: Analyzer;
  today?: Date;
  now?: number; // unix seconds
}

async function writeChanged(dir: string, before: Record<string, string>, after: Record<string, string>): Promise<void> {
  for (const rel of changedPaths(before, after)) {
    const target = await resolveInside(dir, rel);
    if (!(rel in after)) {
      await fs.rm(target, { force: true });
      continue;
    }
    await fs.mkdir(await resolveInside(dir, path.dirname(rel)), { recursive: true });
    await fs.writeFile(target, after[rel]);
  }
}

// Plan, stage and patches for an approved stage, with every check apply_stage makes: configured secret, known and
// automated stage, something to change, and an approval token bound to the plan hash, patch hash and stage index.
export async function resolveApprovedStage(dir: string, opts: ApplyOptions): Promise<{ full: FullAssessment; plan: ModernizationPlan; stage: PlanStage; patches: FilePatch[]; assess: AssessOptions }> {
  if (typeof opts.secret !== 'string' || opts.secret.length < MIN_SECRET_LEN) throw new Error(NOT_CONFIGURED);
  const assess: AssessOptions = { analyze: opts.analyze, today: opts.today };
  const full = await assessFull(dir, assess);
  const plan = buildPlan({ stack: full.assessment.stack, findings: full.findings, fixes: full.fixes, goal: opts.goal });
  const stage = plan.stages.find((s) => s.id === opts.stage);
  if (!stage) {
    throw new Error(`Unknown stage "${opts.stage}". Valid stage ids: ${plan.stages.map((s) => s.id).join(', ') || '(none)'}. Call plan_modernization to see the stages.`);
  }
  if (!stage.automated) {
    throw new Error(`Stage "${stage.id}" is guided and has nothing to apply automatically. Follow its steps, then call assess_project to confirm: ${stage.steps.join(' ')}`);
  }
  const patches = generatePatches({ stack: full.assessment.stack, files: full.files, fixes: full.fixes, stageIds: [stage.id] });
  if (patches.length === 0) throw new Error(`Nothing to change for stage "${stage.id}": the project already looks fixed. Call assess_project to confirm.`);

  const check = checkApproval(opts.token, { planHash: canonicalHash(plan), patchHash: canonicalHash(patches), stage: stage.index }, opts.secret, opts.now);
  if (!check.ok) throw new Error(check.message);
  return { full, plan, stage, patches, assess };
}

export async function applyStageInDir(dir: string, opts: ApplyOptions): Promise<ApplyResult> {
  const { full, stage, patches, assess } = await resolveApprovedStage(dir, opts);
  return projectStage(dir, full, stage, patches, assess);
}

// Applies already-generated patches to `dir` (which must be a throwaway copy), re-assesses it and builds the PROJECTED
// result. No approval is checked here: callers either verified one (applyStageInDir) or only report read-only numbers.
async function projectStage(dir: string, full: FullAssessment, stage: PlanStage, patches: FilePatch[], assess: AssessOptions): Promise<ApplyResult> {
  // Patches may touch files the assessment does not keep (for example .env): start from their recorded contents too.
  const base = { ...full.files };
  for (const p of patches) if (p.before !== undefined && !(p.path in base)) base[p.path] = p.before;
  const patched = applyPatches(base, patches);
  const projected = stage.id === 'remove-committed-env' ? untrackCommittedEnv(patched, base) : { files: patched, untracked: [] as string[] };
  const filesAfter = refreshLocks(projected.files, full.fixes);
  const envKeys: string[] = [];
  for (const f of projected.untracked) for (const k of envKeyNames(base[f])) if (!envKeys.includes(k)) envKeys.push(k);
  await writeChanged(dir, base, filesAfter);
  const again = await assessFull(dir, assess);
  return buildApplyResult({
    stage,
    patches,
    filesBefore: base,
    filesAfter,
    before: { score: full.assessment.score.overall, findings: full.findings },
    after: { score: again.assessment.score.overall, findings: again.findings },
    untracked: projected.untracked,
    envKeys
  });
}

// Read-only reporting helper: the projected result of every automated stage, each computed in its own private copy of
// `dir` with the same patch generation and projection apply_stage uses. It needs no approval token because nothing is
// returned that could be applied (only the numbers and the patch text) and `dir` itself is never modified.
// A stage whose projection fails is left out rather than failing the report.
export async function projectAutomatedStages(dir: string, full: FullAssessment, plan: ModernizationPlan, assess: AssessOptions = {}): Promise<ApplyResult[]> {
  const out: ApplyResult[] = [];
  for (const stage of plan.stages) {
    if (!stage.automated) continue;
    const patches = generatePatches({ stack: full.assessment.stack, files: full.files, fixes: full.fixes, stageIds: [stage.id] });
    if (patches.length === 0) continue;
    const copy = await createWorkdir(process.env.METAMORPH_SANDBOX_DIR);
    try {
      await fs.cp(dir, copy.dir, { recursive: true, dereference: false });
      out.push(await projectStage(copy.dir, full, stage, patches, assess));
    } catch {
      // projection is best effort in a report
    } finally {
      await copy.cleanup();
    }
  }
  return out;
}
