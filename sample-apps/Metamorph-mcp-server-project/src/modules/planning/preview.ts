// Builds the preview of one automated stage: file list, a capped unified diff and, when a secret is configured,
// an approval token bound to the exact plan and patches. Pure: no I/O. File contents are never returned beyond the diff.
import { canonicalHash, signApprovalToken } from '../../common/approval-token.js';
import { redact } from '../../common/redact.js';
import type { FilePatch, ModernizationPlan, PlanStage } from '../assessment/types.js';
import { ENV_EXAMPLE, isKeyOnlyLine, unifiedDiff } from './patches.js';

const MAX_DIFF_LINES = 400;
const MIN_SECRET_LEN = 32;
const TOKEN_TTL_SECONDS = 300;

export interface Preview {
  stage: Pick<PlanStage, 'id' | 'index' | 'title' | 'automated' | 'risk' | 'steps' | 'rollback' | 'scoreAfter'>;
  automated: boolean;
  files: Array<{ path: string; action: 'create' | 'edit' | 'delete'; reason: string }>;
  diff: string;
  planHash?: string;
  patchHash?: string;
  approvalToken?: string;
  expiresInSeconds?: number;
  note?: string;
}

export interface PreviewInput {
  plan: ModernizationPlan;
  stageId: string;
  patches: FilePatch[];
  secret: string | undefined;
  now?: number; // unix seconds
}

function action(p: FilePatch): 'create' | 'edit' | 'delete' {
  if (p.after === null) return 'delete';
  return p.before === undefined ? 'create' : 'edit';
}

export const isEnvFile = (path: string) => (path.split('/').pop() ?? '').startsWith('.env');
export const isEnvTemplate = (path: string) => ENV_EXAMPLE.test(path);

// Env files show only a header (key-only templates excepted). The one exception is a template (.env.example) whose ADDED lines are all key-only
// (KEY= with no value): its diff is what the user needs to apply the patch, and it can hold no secret value.
function patchDiff(p: FilePatch): string {
  if (!isEnvFile(p.path)) return unifiedDiff(p.path, p.before, p.after, Number.MAX_SAFE_INTEGER);
  if (isEnvTemplate(p.path) && p.after !== null) {
    const diff = unifiedDiff(p.path, p.before, p.after, Number.MAX_SAFE_INTEGER);
    const added = diff.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++'));
    if (added.every((l) => isKeyOnlyLine(l.slice(1)))) return diff;
  }
  return `--- ${p.before === undefined ? '/dev/null' : `a/${p.path}`}\n+++ ${p.after === null ? '/dev/null' : `b/${p.path}`}\n(content hidden: env file)\n`;
}

// Combined unified diff of all patches, capped at maxLines. Env files show only a header (key-only templates excepted).
export function renderDiff(patches: FilePatch[], maxLines: number): string {
  const lines = patches
    .map(patchDiff)
    .join('')
    .split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  if (lines.length <= maxLines) return lines.length === 0 ? '' : lines.join('\n') + '\n';
  return [...lines.slice(0, maxLines), '... diff truncated'].join('\n') + '\n';
}

export function buildPreview(input: PreviewInput): Preview {
  const { plan, stageId, patches, secret, now } = input;
  const stage = plan.stages.find((s) => s.id === stageId);
  if (!stage) {
    throw new RangeError(`Unknown stage "${stageId}". Valid stage ids: ${plan.stages.map((s) => s.id).join(', ') || '(none)'}.`);
  }
  const head: Preview['stage'] = {
    id: stage.id,
    index: stage.index,
    title: stage.title,
    automated: stage.automated,
    risk: stage.risk,
    steps: stage.steps,
    rollback: stage.rollback,
    scoreAfter: stage.scoreAfter
  };

  if (!stage.automated) {
    return {
      stage: head,
      automated: false,
      files: [],
      diff: '',
      note: 'This stage is guided: the client edits the code following the steps, then Metamorph re-scans to confirm the result.'
    };
  }
  if (patches.length === 0) {
    return { stage: head, automated: true, files: [], diff: '', note: 'Nothing to change for this stage: the project already looks fixed.' };
  }

  const planHash = canonicalHash(plan);
  const patchHash = canonicalHash(patches);
  let redacted = 0;
  const clean = (text: string): string => {
    const r = redact(text);
    redacted += r.count;
    return r.text;
  };
  const out: Preview = {
    stage: head,
    automated: true,
    files: patches.map((p) => ({ path: p.path, action: action(p), reason: clean(p.reason) })),
    diff: clean(renderDiff(patches, MAX_DIFF_LINES)),
    planHash,
    patchHash
  };
  if (typeof secret === 'string' && secret.length >= MIN_SECRET_LEN) {
    out.approvalToken = signApprovalToken({ planHash, patchHash, stage: stage.index }, secret, now);
    out.expiresInSeconds = TOKEN_TTL_SECONDS;
  } else {
    out.note = `Approval tokens are disabled until METAMORPH_TOKEN_SECRET (${MIN_SECRET_LEN}+ characters) is set on the server.`;
  }
  if (redacted > 0) out.note = out.note ? `${out.note} Some values were redacted in this preview.` : 'Some values were redacted in this preview.';
  return out;
}
