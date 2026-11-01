import { Widget, UseGuards, ExecutionContext, z } from '@nitrostack/core';
import { Tool } from '../../common/validated-tool.js';
import { scopeGuard } from '../../common/auth/scope.guard.js';
import { READS_PUBLIC_DATA, RETURNS_PATCH_ONLY } from '../../common/tool-annotations.js';
import { assessFull } from '../assessment/assess.js';
import { echoOf } from '../assessment/echo.js';
import { withRepo } from '../assessment/repo-source.js';
import type { Goal } from '../assessment/types.js';
import { applyStageInDir } from './apply.js';
import { generatePatches } from './patches.js';
import { buildPlan } from './plan.js';
import { buildPreview } from './preview.js';

const GOALS = ['patch_advisory', 'upgrade_runtime', 'modernize_all'] as const;
const REPO_DESC = 'Public GitHub repository URL, e.g. https://github.com/owner/repo (a /tree/<branch> link works)';
const GOAL_DESC = 'What to aim for: patch_advisory (fix vulnerable packages), upgrade_runtime (also move off an end-of-life runtime) or modernize_all (default, everything)';
const SUB_DESC = 'Optional folder inside the repository, e.g. apps/api';

// The one thing to do next after a preview, named by tool.
function nextAfterPreview(p: { automated: boolean; approvalToken?: string; files: unknown[] }): string {
  if (!p.automated) return 'This stage is guided: follow its steps, then call assess_project to confirm.';
  if (p.files.length === 0) return 'Nothing to change for this stage. Call plan_modernization to pick another stage, or assess_project to re-scan.';
  return p.approvalToken
    ? 'Review the diff. To continue call apply_stage (needs a write key) with this approvalToken; it expires in a few minutes.'
    : 'Approval tokens are not enabled on this server, so apply_stage cannot be used. Ask the operator to set METAMORPH_TOKEN_SECRET.';
}

interface Input {
  repo_url: string;
  goal?: Goal;
  subfolder?: string;
  stage?: string;
  approval_token?: string;
}

export class PlanningTools {
  @Tool({
    name: 'plan_modernization',
    annotations: READS_PUBLIC_DATA,
    description:
      'Build a staged modernization plan for a public GitHub repository. Use when the user asks for a plan, roadmap or the steps to upgrade or modernize ("give me a plan to upgrade PHP", "what are the steps to modernize this project"). Returns ordered stages (dependency patches, runtime upgrade, removing committed env files, packaging), each with risk, steps, rollback and the projected score. Some stages are automated, others guided. Read-only, needs a plan key: nothing is changed. Step 2, after assess_project. Next step: call preview_changes with an automated stage id.',
    inputSchema: z.object({
      repo_url: z.string().min(10).max(300).describe(REPO_DESC),
      goal: z.enum(GOALS).optional().describe(GOAL_DESC),
      subfolder: z.string().max(200).optional().describe(SUB_DESC)
    }),
    examples: {
      request: { repo_url: 'https://github.com/owner/legacy-app', goal: 'modernize_all' },
      response: {
        assessmentId: 'a1b2c3d4e5f60718',
        stack: 'node',
        goal: 'modernize_all',
        scoreBefore: 52,
        scoreAfter: 88,
        stages: [{ index: 1, id: 'patch-dependencies', title: 'Patch vulnerable dependencies', kind: 'dependencies', automated: true, risk: 'low', addresses: ['dep-vulnerable:lodash'], steps: ['Bump lodash 4.17.15 to 4.17.21'], rollback: 'Revert the manifest changes and reinstall from the old lockfile.', scoreAfter: 64 }],
        hint: 'Call preview_changes with stage set to an automated stage id, for example "patch-dependencies".'
      }
    }
  })
  @Widget('score-dashboard')
  @UseGuards(scopeGuard('plan'))
  async planModernization(input: Input, ctx: ExecutionContext) {
    const goal = input.goal ?? 'modernize_all';
    ctx.logger.info('plan_modernization', { goal });
    const { assessment, plan, commit } = await withRepo(input.repo_url, input.subfolder, ctx, async (dir, meta) => {
      const full = await assessFull(dir);
      return { assessment: full.assessment, plan: buildPlan({ stack: full.assessment.stack, findings: full.findings, fixes: full.fixes, goal }), commit: meta.commit };
    }, { requireProjectRoot: true });
    const automated = plan.stages.find((s) => s.automated);
    return {
      assessmentId: assessment.assessmentId,
      stack: plan.stack,
      goal: plan.goal,
      scoreBefore: plan.scoreBefore,
      scoreAfter: plan.scoreAfter,
      stages: plan.stages.map((s) => ({
        index: s.index,
        id: s.id,
        title: s.title,
        kind: s.kind,
        automated: s.automated,
        risk: s.risk,
        addresses: s.addresses.slice(0, 10),
        steps: s.steps,
        rollback: s.rollback,
        scoreAfter: s.scoreAfter
      })),
      ...echoOf(input, commit),
      hint: automated
        ? `Call preview_changes with stage set to an automated stage id, for example "${automated.id}", to see the exact file changes.`
        : 'No automated stage applies to this project. Follow the guided steps, then call assess_project to re-scan.'
    };
  }

  @Tool({
    name: 'preview_changes',
    annotations: READS_PUBLIC_DATA,
    description:
      'Preview one stage of the modernization plan. Use when the user wants to see the diff or the exact file changes of a stage ("show me the diff for the first stage"). Returns the files that would change and a unified diff, plus a short-lived approval token when the server has one configured. Guided stages return their steps instead of a diff. Read-only, needs a read key: nothing is changed. Step 3, after plan_modernization (use one of its stage ids). Next step: apply_stage with the approvalToken.',
    inputSchema: z.object({
      repo_url: z.string().min(10).max(300).describe(REPO_DESC),
      stage: z.string().min(1).max(60).describe('Stage id from plan_modernization, e.g. patch-dependencies'),
      goal: z.enum(GOALS).optional().describe(GOAL_DESC),
      subfolder: z.string().max(200).optional().describe(SUB_DESC)
    }),
    examples: {
      request: { repo_url: 'https://github.com/owner/legacy-app', stage: 'patch-dependencies' },
      response: {
        stage: { id: 'patch-dependencies', index: 1, title: 'Patch vulnerable dependencies', automated: true, risk: 'low', steps: ['Bump lodash 4.17.15 to 4.17.21'], rollback: 'Revert the manifest changes and reinstall from the old lockfile.', scoreAfter: 64 },
        automated: true,
        files: [{ path: 'package.json', action: 'edit', reason: 'Bump vulnerable dependencies to fixed versions.' }],
        diff: '--- a/package.json\n+++ b/package.json\n@@ -1,3 +1,3 @@\n...',
        expiresInSeconds: 300
      }
    }
  })
  @UseGuards(scopeGuard('read'))
  async previewChanges(input: Input & { stage: string }, ctx: ExecutionContext) {
    const goal = input.goal ?? 'modernize_all';
    ctx.logger.info('preview_changes', { goal, stage: input.stage });
    return withRepo(input.repo_url, input.subfolder, ctx, async (dir, meta) => {
      const { assessment, findings, fixes, files } = await assessFull(dir);
      const plan = buildPlan({ stack: assessment.stack, findings, fixes, goal });
      const patches = generatePatches({ stack: assessment.stack, files, fixes, stageIds: [input.stage] });
      try {
        const preview = buildPreview({ plan, stageId: input.stage, patches, secret: process.env.METAMORPH_TOKEN_SECRET });
        return { ...preview, ...echoOf(input, meta.commit), nextStep: nextAfterPreview(preview) };
      } catch (e) {
        if (!(e instanceof RangeError)) throw e;
        throw new Error(`${e.message} Call plan_modernization first (with the same goal, "${goal}") and pass one of its stage ids as "stage".`);
      }
    }, { requireProjectRoot: true });
  }

  @Tool({
    name: 'apply_stage',
    annotations: RETURNS_PATCH_ONLY,
    description:
      'Apply one automated stage to a throwaway copy of the repository and return the patch plus a PROJECTED before/after score. Use when the user says apply, do it or go ahead after seeing the preview. Needs a write key and the approvalToken from preview_changes. Your repository is never modified and no project code is run: save the returned patch, run git apply, refresh the lockfile. Step 4. Next step: verify_patch to build and test the patch, or assess_project to re-scan.',
    inputSchema: z.object({
      repo_url: z.string().min(10).max(300).describe(REPO_DESC),
      stage: z.string().min(1).max(60).describe('Stage id from plan_modernization, e.g. patch-dependencies'),
      approval_token: z.string().min(1).max(2048).describe('approvalToken returned by preview_changes for this stage (valid for 5 minutes)'),
      goal: z.enum(GOALS).optional().describe(GOAL_DESC),
      subfolder: z.string().max(200).optional().describe(SUB_DESC)
    }),
    examples: {
      request: { repo_url: 'https://github.com/owner/legacy-app', stage: 'patch-dependencies', approval_token: '<approvalToken from preview_changes>' },
      response: {
        stage: { id: 'patch-dependencies', index: 1, title: 'Patch vulnerable dependencies', risk: 'low' },
        applied: true,
        mode: 'projected',
        files: [{ path: 'package.json', action: 'edit' }],
        scoreBefore: 52,
        scoreAfter: 64,
        scoreDelta: 12,
        findingsFixed: ['dep-vulnerable:lodash'],
        remaining: [{ id: 'node-runtime-eol', severity: 'high', title: 'Node 10 is end of life' }],
        patch: '--- a/package.json\n+++ b/package.json\n@@ -1,3 +1,3 @@\n...',
        howToApply: ['Save the patch as fix.patch in the root of your project.', 'Run: git apply fix.patch']
      }
    }
  })
  @Widget('score-dashboard')
  @UseGuards(scopeGuard('write'))
  async applyStage(input: Input & { stage: string; approval_token: string }, ctx: ExecutionContext) {
    const goal = input.goal ?? 'modernize_all';
    ctx.logger.info('apply_stage', { goal, stage: input.stage });
    let commit: string | undefined;
    const applied = await withRepo(input.repo_url, input.subfolder, ctx, (dir, meta) => {
      commit = meta.commit;
      return applyStageInDir(dir, { stage: input.stage, token: input.approval_token, goal, secret: process.env.METAMORPH_TOKEN_SECRET });
    },
    { requireProjectRoot: true });
    return { ...applied, ...echoOf(input, commit), nextStep: 'Save the patch and apply it, then call verify_patch with the same repo_url, stage and approval_token to build and test it on a runner (or assess_project to re-scan).' };
  }
}
