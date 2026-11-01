import { Widget, UseGuards, ExecutionContext, z } from '@nitrostack/core';
import { Tool } from '../../common/validated-tool.js';
import { scopeGuard } from '../../common/auth/scope.guard.js';
import { DISPATCHES_RUNS } from '../../common/tool-annotations.js';
import { parseGithubRepo } from '../../common/safe-archive.js';
import { echoOf } from '../assessment/echo.js';
import { withRepo } from '../assessment/repo-source.js';
import type { Goal } from '../assessment/types.js';
import { GithubRunner, loadRunnerConfig } from './github-runner.js';
import { patchForStage, verifyByDispatch, verifyByRunIds } from './verify.js';

const GOALS = ['patch_advisory', 'upgrade_runtime', 'modernize_all'] as const;
const RUN_ID = z.string().max(40).regex(/^[0-9]{1,20}$/, 'digits only');

interface Input {
  repo_url?: string;
  subfolder?: string;
  stage?: string;
  approval_token?: string;
  run_id?: string;
  baseline_run_id?: string;
  goal?: Goal;
}

export class VerifyTools {
  @Tool({
    name: 'verify_patch',
    annotations: DISPATCHES_RUNS,
    description:
      'Verify a stage patch by really building and testing it on an isolated GitHub Actions runner (the server never runs project code). Use when the user asks to verify, test or prove that a patch works, or to check on a verification that is still running (run id). Needs a write key. Side effect: starts two runs (patched and baseline) in the operator\'s runner repository; your repository is never touched. Step 5, after apply_stage. Dispatches one run with the patch applied and one baseline run without it, so before and after are both measured. Needs repo_url, stage and the approval_token from preview_changes. Runs can take minutes: when not finished the result says status "running" with run ids; call again with run_id (and baseline_run_id) to resume. Returns verified true only when the build succeeded and tests ran and passed; otherwise verified is false with unverifiedReasons (for example "composer install failed", "no tests found"). Never a pass otherwise.',
    inputSchema: z.object({
      repo_url: z.string().min(10).max(300).optional().describe('Public GitHub repository URL (required with approval_token)'),
      subfolder: z.string().max(200).optional().describe('Optional folder inside the repository, e.g. apps/api'),
      stage: z.string().min(1).max(60).optional().describe('Automated stage id from plan_modernization (required with approval_token)'),
      approval_token: z.string().min(1).max(2048).optional().describe('approvalToken returned by preview_changes for this stage (valid for 5 minutes)'),
      run_id: RUN_ID.optional().describe('Resume: run id of the patched run from an earlier verify_patch result'),
      baseline_run_id: RUN_ID.optional().describe('Resume: run id of the baseline run from an earlier verify_patch result'),
      goal: z.enum(GOALS).optional().describe('Plan goal used to find the stage: patch_advisory, upgrade_runtime or modernize_all (default)')
    }),
    examples: {
      request: { repo_url: 'https://github.com/owner/legacy-app', stage: 'patch-dependencies', approval_token: '<approvalToken from preview_changes>' },
      response: {
        mode: 'measured',
        status: 'running',
        verified: false,
        unverifiedReasons: ['runner still running'],
        stage: { id: 'patch-dependencies', title: 'Patch vulnerable dependencies' },
        patched: { runId: '1234567890', status: 'running' },
        baseline: { runId: '1234567891', status: 'running' },
        resume: { run_id: '1234567890', baseline_run_id: '1234567891' },
        notes: [],
        hint: 'Not finished yet. Call verify_patch again with run_id "1234567890" and baseline_run_id "1234567891" to check.'
      }
    }
  })
  @Widget('score-dashboard')
  @UseGuards(scopeGuard('write'))
  async verifyPatch(input: Input, ctx: ExecutionContext) {
    const resume = input.run_id !== undefined || input.baseline_run_id !== undefined;
    if (!resume && !(input.repo_url && input.stage && input.approval_token)) {
      throw new Error('verify_patch needs either repo_url + stage + approval_token (from preview_changes) to start a verification, or run_id (and baseline_run_id) to resume one.');
    }
    // Fail early and clearly when the server is not set up for verification.
    const runner = new GithubRunner(loadRunnerConfig());
    if (resume) {
      ctx.logger.info('verify_patch', { mode: 'resume' });
      return { ...(await verifyByRunIds(runner, { runId: input.run_id, baselineRunId: input.baseline_run_id })), ...echoOf({}) };
    }
    const goal = input.goal ?? 'modernize_all';
    const { repo_url, stage, approval_token } = input as Required<Pick<Input, 'repo_url' | 'stage' | 'approval_token'>>;
    ctx.logger.info('verify_patch', { mode: 'dispatch', goal, stage });
    let commit: string | undefined;
    const parsed = parseGithubRepo(repo_url); // throws a clear error for anything but a GitHub repository URL
    const result = await verifyByDispatch(runner, {
      repoUrl: `https://github.com/${parsed.owner}/${parsed.repo}`,
      note: parsed.ref ? `The runner clones the default branch of the repository, not "${parsed.ref}". Make sure they match before trusting the result.` : undefined,
      subfolder: input.subfolder,
      getPatch: () => withRepo(repo_url, input.subfolder, ctx, (dir, meta) => {
        commit = meta.commit;
        return patchForStage(dir, { stage, token: approval_token, goal, secret: process.env.METAMORPH_TOKEN_SECRET });
      }, { requireProjectRoot: true })
    });
    return { ...result, ...echoOf(input, commit) };
  }
}
