import { ResourceDecorator as Resource, Widget, UseGuards, ExecutionContext, z } from '@nitrostack/core';
import { Tool } from '../../common/validated-tool.js';
import { requestKeyId, scopeGuard } from '../../common/auth/scope.guard.js';
import { GENERATES_REPORT } from '../../common/tool-annotations.js';
import { assessFull } from '../assessment/assess.js';
import { echoOf } from '../assessment/echo.js';
import { withRepo } from '../assessment/repo-source.js';
import type { Goal } from '../assessment/types.js';
import { parseGithubRepo } from '../../common/safe-archive.js';
import { buildPlan } from '../planning/plan.js';
import { MIME, generateReport, lookupResource } from './report.js';
import { reportRoutesActive } from './download.js';
import { linkProvider } from './links.js';
import { attachCloud, attachRunnerResult, buildReportData, type ReportData } from './report-data.js';
import { collectCloudSection, type CloudStepDeps } from '../cloud/report-cloud.js';
import { recordFeeds } from './feed-sources.js';
import { GithubRunner, loadRunnerConfig } from '../verify/github-runner.js';
import { fetchRunnerSummary } from '../verify/verify.js';
import { projectAutomatedStages } from '../planning/apply.js';

const GOALS = ['patch_advisory', 'upgrade_runtime', 'modernize_all'] as const;
const RUN_ID = z.string().max(40).regex(/^[0-9]{1,20}$/, 'digits only');

function refOf(repoUrl: string): string | undefined {
  try {
    return parseGithubRepo(repoUrl).ref;
  } catch {
    return undefined;
  }
}

export class ReportTools {
  @Tool({
    name: 'generate_report',
    annotations: GENERATES_REPORT,
    description:
      'Generate an assessment report for a public GitHub repository. Always produces three files: a PDF (cover, summary, findings by CWE/OWASP with KEV and EPSS, plan, patch summary, verification, dependencies, appendix), a SARIF 2.1.0 file and a CycloneDX 1.5 SBOM. Every number is labelled measured, projected or reported. The result lists a signed download link for each file (valid 10 minutes, tied to the requesting API key but still usable by anyone who holds the link; absolute when the server has METAMORPH_PUBLIC_URL), the score, finding counts and page count; the files are also readable as metamorph://report/<id> resources for 10 minutes. Use when the user wants a report, PDF, SARIF or SBOM to keep or share; for a quick answer use assess_project. The AWS account is never contacted unless include_cloud is true; then a read-only Cloud inventory section (separate from the repository score) is added, or a short note when AWS is not set up. Read-only, needs a read key: nothing is changed.',
    inputSchema: z.object({
      repo_url: z.string().min(10).max(300).describe('Public GitHub repository URL, e.g. https://github.com/owner/repo (a /tree/<branch> link works)'),
      subfolder: z.string().max(200).optional().describe('Optional folder inside the repository, e.g. apps/api'),
      goal: z.enum(GOALS).optional().describe('Plan goal used for the plan section: patch_advisory, upgrade_runtime or modernize_all (default)'),
      runner_run_ids: z
        .object({ baseline: RUN_ID.optional(), patched: RUN_ID.optional() })
        .optional()
        .describe('Run ids from verify_patch (finished runs). When given, the Verification section and measured before/after come from the runner. Without them the section says "Not verified".'),
      include_cloud: z.boolean().optional().describe('Also scan the configured AWS account read-only and add a Cloud section; needs the AWS setup in docs/AWS_SETUP.md')
    }),
    examples: {
      request: { repo_url: 'https://github.com/owner/legacy-app' },
      response: {
        reportId: 'a1b2c3d4e5f60718293a4b5c',
        score: { overall: 52, origin: 'measured' },
        findings: { total: 9, critical: 0, high: 3, medium: 4, low: 2, info: 0 },
        topFindings: [{ severity: 'high', title: 'SQL query built from request input' }],
        pages: 8,
        files: [
          {
            format: 'pdf',
            label: 'PDF report',
            fileName: 'metamorph-report-a1b2c3d4.pdf',
            bytes: 180000,
            mimeType: 'application/pdf',
            uri: 'metamorph://report/a1b2c3d4e5f60718293a4b5c.pdf',
            downloadUrl: 'https://metamorph.example.com/reports/a1b2c3d4e5f60718293a4b5c.pdf?t=<signed token>'
          }
        ],
        expiresInMinutes: 10,
        message: 'Download links (valid 10 minutes): ...'
      }
    }
  })
  @Widget('score-dashboard')
  @UseGuards(scopeGuard('read'))
  async generateReport(input: { repo_url: string; subfolder?: string; goal?: Goal; runner_run_ids?: { baseline?: string; patched?: string }; include_cloud?: boolean }, ctx: ExecutionContext) {
    const keyId = requestKeyId(ctx); // short non-secret id of the requesting key; binds the download links to it
    ctx.logger.info('generate_report', { goal: input.goal ?? 'modernize_all' });
    const data = await collectReportData(input, ctx);
    const links = linkProvider({ secret: process.env.METAMORPH_TOKEN_SECRET, publicUrl: process.env.METAMORPH_PUBLIC_URL, routesActive: reportRoutesActive(), keyId });
    return { ...(await generateReport(data, links, undefined, keyId)), ...echoOf(input, data.meta.commitSha) };
  }
}

export interface CollectDeps {
  archiveFetch?: typeof fetch;
  feeds?: Parameters<typeof recordFeeds>[0];
  now?: () => Date;
  runner?: GithubRunner; // injectable for tests; defaults to the configured GitHub runner
  cloud?: CloudStepDeps; // injectable for tests; only used when include_cloud is true
}

// Everything generate_report needs from the network and the repository, as typed ReportData. Read-only.
export async function collectReportData(
  input: { repo_url: string; subfolder?: string; goal?: Goal; runner_run_ids?: { baseline?: string; patched?: string }; include_cloud?: boolean },
  ctx: Pick<ExecutionContext, 'logger'>,
  deps: CollectDeps = {}
): Promise<ReportData> {
  const goal = input.goal ?? 'modernize_all';
  // AWS is reached only when the user asked (include_cloud). It starts now, runs beside the repository work and never rejects.
  const cloud = input.include_cloud === true ? collectCloudSection(deps.cloud) : undefined;
  const feeds = recordFeeds(deps.feeds);
  const assess = { ...feeds.options };
  const { full, plan, apply, commit } = await withRepo(
    input.repo_url,
    input.subfolder,
    ctx,
    async (dir, repo) => {
      const f = await assessFull(dir, assess);
      const p = buildPlan({ stack: f.assessment.stack, findings: f.findings, fixes: f.fixes, goal });
      // Projected result of each automated stage, computed in private copies (same patches apply_stage uses).
      const a = await projectAutomatedStages(dir, f, p, assess);
      return { full: f, plan: p, apply: a, commit: repo.commit };
    },
    { fetchFn: deps.archiveFetch, requireProjectRoot: true }
  );
  const ref = refOf(input.repo_url);
  const data = buildReportData({
    full,
    plan,
    apply,
    feeds: { sources: feeds.sources() },
    meta: {
      repoUrl: input.repo_url,
      subfolder: input.subfolder,
      commit: commit ?? (ref ? `ref ${ref} (branch or tag, not a commit sha)` : undefined),
      commitSha: commit,
      generatedAt: (deps.now?.() ?? new Date()).toISOString()
    }
  });
  const ids = input.runner_run_ids;
  let out = data;
  if (ids && (ids.baseline || ids.patched)) {
    const runner = deps.runner ?? new GithubRunner(loadRunnerConfig());
    out = attachRunnerResult(data, await fetchRunnerSummary(runner, ids, feeds.enrich));
  }
  return cloud ? attachCloud(out, await cloud) : out;
}

// The SDK's resource handler matches {id} templates against the requested URI and returns Buffer as a binary blob.
export class ReportResources {
  @Resource({
    uri: 'metamorph://report/{id}.pdf',
    name: 'Metamorph PDF report',
    description: 'A PDF report produced by generate_report. Kept in memory for 10 minutes (at most 5 reports).',
    mimeType: MIME.pdf
  })
  async pdf(uri: string) {
    return this.read(uri);
  }

  @Resource({
    uri: 'metamorph://report/{id}.sarif',
    name: 'Metamorph SARIF report',
    description: 'SARIF 2.1.0 findings produced by generate_report. Kept in memory for 10 minutes.',
    mimeType: MIME.sarif
  })
  async sarif(uri: string) {
    return this.read(uri);
  }

  @Resource({
    uri: 'metamorph://report/{id}.cdx.json',
    name: 'Metamorph CycloneDX SBOM',
    description: 'CycloneDX 1.5 SBOM produced by generate_report. Kept in memory for 10 minutes.',
    mimeType: MIME.sbom
  })
  async sbom(uri: string) {
    return this.read(uri);
  }

  private read(uri: string) {
    const a = lookupResource(uri);
    if (!a) throw new Error('Report not found or expired. Run generate_report again.');
    return a.format === 'pdf' ? { type: 'binary' as const, data: a.data } : { type: 'text' as const, data: a.data.toString('utf8') };
  }
}
