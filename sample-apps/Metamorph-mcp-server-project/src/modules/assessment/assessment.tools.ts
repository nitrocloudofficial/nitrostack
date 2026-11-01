import { Widget, UseGuards, ExecutionContext, z } from '@nitrostack/core';
import { Tool } from '../../common/validated-tool.js';
import { scopeGuard } from '../../common/auth/scope.guard.js';
import { READS_PUBLIC_DATA } from '../../common/tool-annotations.js';
import { assessDirectory, assessRepository } from './assess.js';
import { echoOf } from './echo.js';
import { withRepo } from './repo-source.js';

export class AssessmentTools {
  @Tool({
    name: 'assess_project',
    annotations: READS_PUBLIC_DATA,
    description:
      'Assess a legacy project from a public GitHub repository. Use when the user wants to check, audit or scan a repository ("check this repo"). Detects the stack (Node/JavaScript, PHP), runtime end-of-life, outdated or deprecated packages, known vulnerabilities, risky legacy code patterns and hosting setup, then returns a score and the top findings. Read-only, needs a read key: nothing is changed. Step 1 of assess_project, plan_modernization, preview_changes, apply_stage, verify_patch. For one package or one advisory id use analyze_advisory instead.',
    inputSchema: z.object({
      repo_url: z.string().min(10).max(300).describe('Public GitHub repository URL, e.g. https://github.com/owner/repo (a /tree/<branch> link works)'),
      subfolder: z.string().max(200).optional().describe('Optional folder inside the repository to assess, e.g. apps/api. Without it every project found (package.json or composer.json, up to 3 folders deep, at most 5) is assessed and merged')
    }),
    examples: {
      request: { repo_url: 'https://github.com/owner/legacy-app' },
      response: { stack: 'node', score: { overall: 61 }, topFindings: [{ id: 'node-runtime-eol', severity: 'high' }] }
    }
  })
  @Widget('score-dashboard')
  @UseGuards(scopeGuard('read'))
  async assessProject(input: { repo_url: string; subfolder?: string }, ctx: ExecutionContext) {
    let commit: string | undefined;
    const assessment = await withRepo(input.repo_url, input.subfolder, ctx, (dir, meta) => {
      commit = meta.commit;
      return input.subfolder ? assessDirectory(dir) : assessRepository(dir).then((f) => f.assessment);
    });
    return { ...assessment, ...echoOf(input, commit), nextStep: 'Call plan_modernization with the same repo_url to get ordered stages, or generate_report for a PDF, SARIF and SBOM.' };
  }
}
