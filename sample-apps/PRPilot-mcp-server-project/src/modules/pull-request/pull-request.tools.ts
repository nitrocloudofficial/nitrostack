/**
 * PRPilot — Pull Request Intelligence MCP Tools
 * Exposes 5 focused tools with validated input schemas and source-backed evidence.
 */

import {
  ExecutionContext,
  PromptDecorator as Prompt,
  ResourceDecorator as Resource,
  ToolDecorator as Tool,
  Widget,
  z,
} from '@nitrostack/core';
import { DossierService } from './dossier.service.js';
import { GitHubService } from './github.service.js';
import { HeuristicsService } from './heuristics.service.js';
import {
  ChangeMap,
  LinkedContext,
  PullRequestMetadata,
  ReviewDossier,
  VerificationEvidence,
} from './pull-request.types.js';

const PullRequestInputSchema = z.object({
  owner: z.string().min(1).describe('GitHub repository owner or organization (e.g. "facebook")'),
  repo: z.string().min(1).describe('GitHub repository name (e.g. "react")'),
  pull_number: z.number().int().positive().describe('Pull request number (e.g. 100)'),
});

export class PullRequestTools {
  private github = new GitHubService();
  private heuristics = new HeuristicsService();
  private dossier = new DossierService();

  /**
   * Helper: extract clean PR metadata
   */
  private mapPRMetadata(raw: any, owner: string, repo: string, pullNumber: number): PullRequestMetadata {
    return {
      owner,
      repo,
      number: pullNumber,
      title: raw.title || 'Untitled Pull Request',
      description: raw.body || null,
      author: raw.user?.login || 'unknown',
      author_avatar_url: raw.user?.avatar_url || null,
      state: raw.state === 'closed' ? 'closed' : 'open',
      is_draft: Boolean(raw.draft),
      base_branch: raw.base?.ref || 'main',
      head_branch: raw.head?.ref || 'unknown',
      head_sha: raw.head?.sha || '',
      created_at: raw.created_at || new Date().toISOString(),
      updated_at: raw.updated_at || new Date().toISOString(),
      closed_at: raw.closed_at || null,
      merged_at: raw.merged_at || null,
      changed_files_count: raw.changed_files || 0,
      additions: raw.additions || 0,
      deletions: raw.deletions || 0,
      html_url: raw.html_url || `https://github.com/${owner}/${repo}/pull/${pullNumber}`,
    };
  }

  // --------------------------------------------------------------------------
  // Tool 1: inspect_pull_request
  // --------------------------------------------------------------------------
  @Tool({
    name: 'inspect_pull_request',
    description:
      'Fetch verified metadata for a public GitHub pull request: title, description, author, branch targets, commit SHA, timestamps, and line stats.',
    inputSchema: PullRequestInputSchema,
    examples: {
      request: {
        owner: 'ayushv7',
        repo: 'PRPilot',
        pull_number: 1,
      },
      response: {
        owner: 'ayushv7',
        repo: 'PRPilot',
        number: 1,
        title: 'feat: add GitHub pull request inspection',
        description: 'Implements inspect_pull_request MCP tool.',
        author: 'ayushv7',
        state: 'open',
        is_draft: false,
        base_branch: 'master',
        head_branch: 'feat/inspect-pr',
        head_sha: '749ee62888888888888888888888888888888888',
        changed_files_count: 5,
        additions: 120,
        deletions: 15,
        html_url: 'https://github.com/ayushv7/PRPilot/pull/1',
      },
    },
  })
  async inspectPullRequest(
    input: { owner: string; repo: string; pull_number: number },
    ctx: ExecutionContext
  ): Promise<PullRequestMetadata> {
    ctx.logger.info('Inspecting pull request', {
      owner: input.owner,
      repo: input.repo,
      pull_number: input.pull_number,
    });

    const raw = await this.github.getPullRequest(input.owner, input.repo, input.pull_number);
    return this.mapPRMetadata(raw, input.owner, input.repo, input.pull_number);
  }

  // --------------------------------------------------------------------------
  // Tool 2: build_change_map
  // --------------------------------------------------------------------------
  @Tool({
    name: 'build_change_map',
    description:
      'Categorize changed files (application logic, tests, config, docs) and compute investigation risk heuristics (auth, migrations, configs, tests missing).',
    inputSchema: PullRequestInputSchema,
    examples: {
      request: {
        owner: 'ayushv7',
        repo: 'PRPilot',
        pull_number: 1,
      },
      response: {
        total_files: 3,
        total_additions: 50,
        total_deletions: 10,
        is_file_list_truncated: false,
        category_counts: {
          application_logic: 2,
          tests: 1,
          config_dependencies: 0,
          documentation: 0,
          other: 0,
        },
        investigation_signals: [],
      },
    },
  })
  async buildChangeMap(
    input: { owner: string; repo: string; pull_number: number },
    ctx: ExecutionContext
  ): Promise<ChangeMap> {
    ctx.logger.info('Building change map', {
      owner: input.owner,
      repo: input.repo,
      pull_number: input.pull_number,
    });

    const [prRaw, filesRaw] = await Promise.all([
      this.github.getPullRequest(input.owner, input.repo, input.pull_number),
      this.github.getPullRequestFiles(input.owner, input.repo, input.pull_number),
    ]);

    const additions = prRaw.additions || 0;
    const deletions = prRaw.deletions || 0;

    return this.heuristics.buildChangeMap(filesRaw, additions, deletions);
  }

  // --------------------------------------------------------------------------
  // Tool 3: inspect_verification_evidence
  // --------------------------------------------------------------------------
  @Tool({
    name: 'inspect_verification_evidence',
    description:
      'Inspect actual CI and check-run results for the pull request head commit. Honestly reports passing, failing, pending, and absent checks.',
    inputSchema: PullRequestInputSchema,
    examples: {
      request: {
        owner: 'ayushv7',
        repo: 'PRPilot',
        pull_number: 1,
      },
      response: {
        head_sha: '749ee62888888888888888888888888888888888',
        collected_at: '2026-10-17T23:30:00.000Z',
        summary: {
          total: 1,
          passing: 1,
          failing: 0,
          pending: 0,
          skipped: 0,
          overall_status: 'passing',
        },
        checks: [
          {
            name: 'build-and-test',
            source: 'check_run',
            status: 'completed',
            conclusion: 'success',
            details_url: 'https://github.com/ayushv7/PRPilot/actions/runs/1',
            started_at: '2026-10-17T23:28:00.000Z',
            completed_at: '2026-10-17T23:29:00.000Z',
          },
        ],
        honest_assessment: 'All 1 retrieved CI check(s) passed on commit 749ee62.',
      },
    },
  })
  async inspectVerificationEvidence(
    input: { owner: string; repo: string; pull_number: number },
    ctx: ExecutionContext
  ): Promise<VerificationEvidence> {
    ctx.logger.info('Inspecting verification evidence', {
      owner: input.owner,
      repo: input.repo,
      pull_number: input.pull_number,
    });

    const prRaw = await this.github.getPullRequest(input.owner, input.repo, input.pull_number);
    const headSha = prRaw.head?.sha || '';

    if (!headSha) {
      return {
        head_sha: 'unknown',
        collected_at: new Date().toISOString(),
        summary: {
          total: 0,
          passing: 0,
          failing: 0,
          pending: 0,
          skipped: 0,
          overall_status: 'no_checks_found',
        },
        checks: [],
        honest_assessment: 'Pull request head SHA is unavailable.',
      };
    }

    const [checkRuns, statuses] = await Promise.all([
      this.github.getCommitCheckRuns(input.owner, input.repo, headSha),
      this.github.getCommitStatuses(input.owner, input.repo, headSha),
    ]);

    return this.dossier.buildVerificationEvidence(headSha, checkRuns, statuses);
  }

  // --------------------------------------------------------------------------
  // Tool 4: trace_related_context
  // --------------------------------------------------------------------------
  @Tool({
    name: 'trace_related_context',
    description:
      'Extract explicit issue and pull request references from PR description and commit messages, fetching verified reference states.',
    inputSchema: PullRequestInputSchema,
    examples: {
      request: {
        owner: 'ayushv7',
        repo: 'PRPilot',
        pull_number: 1,
      },
      response: {
        explicit_issue_references: [
          {
            reference: '#42',
            number: 42,
            source: 'description',
            title: 'Fix auth session expiration',
            state: 'open',
            html_url: 'https://github.com/ayushv7/PRPilot/issues/42',
            relationship: 'explicit_reference',
          },
        ],
        explicit_pr_references: [],
        hypotheses: [],
      },
    },
  })
  async traceRelatedContext(
    input: { owner: string; repo: string; pull_number: number },
    ctx: ExecutionContext
  ): Promise<LinkedContext> {
    ctx.logger.info('Tracing related context', {
      owner: input.owner,
      repo: input.repo,
      pull_number: input.pull_number,
    });

    const [prRaw, commitsRaw] = await Promise.all([
      this.github.getPullRequest(input.owner, input.repo, input.pull_number),
      this.github.getPullRequestCommits(input.owner, input.repo, input.pull_number),
    ]);

    // Extract from description
    const descRefs = this.dossier.extractReferences(prRaw.body || '', 'description');

    // Extract from commit messages
    const commitRefsList = commitsRaw.map((c: any) =>
      this.dossier.extractReferences(c.commit?.message || '', 'commit_message')
    );

    const allIssues = [...descRefs.issues];
    const allPrs = [...descRefs.prs];

    for (const cr of commitRefsList) {
      for (const iss of cr.issues) {
        if (!allIssues.some((x) => x.number === iss.number)) {
          allIssues.push(iss);
        }
      }
      for (const pr of cr.prs) {
        if (!allPrs.some((x) => x.number === pr.number)) {
          allPrs.push(pr);
        }
      }
    }

    // Hydrate first 5 issue details
    const hydratedIssues = await Promise.all(
      allIssues.slice(0, 5).map(async (iss) => {
        const issueData = await this.github.getIssue(input.owner, input.repo, iss.number);
        if (issueData) {
          return {
            ...iss,
            title: issueData.title,
            state: issueData.state,
            html_url: issueData.html_url || iss.html_url,
          };
        }
        return iss;
      })
    );

    return {
      explicit_issue_references: hydratedIssues,
      explicit_pr_references: allPrs,
      hypotheses: [],
    };
  }

  // --------------------------------------------------------------------------
  // Tool 5: assemble_review_dossier
  // --------------------------------------------------------------------------
  @Tool({
    name: 'assemble_review_dossier',
    description:
      'Synthesize complete Review Dossier: change intent, categorized map, prioritized review signals, CI verification status, linked context, and actionable 3-5 step reviewer route.',
    inputSchema: PullRequestInputSchema,
    examples: {
      request: {
        owner: 'ayushv7',
        repo: 'PRPilot',
        pull_number: 1,
      },
      response: {
        pr: {
          owner: 'ayushv7',
          repo: 'PRPilot',
          number: 1,
          title: 'feat: add GitHub pull request inspection',
          description: 'Initial implementation of PRPilot inspection tools',
          author: 'ayushv7',
          author_avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
          state: 'open',
          is_draft: false,
          base_branch: 'master',
          head_branch: 'feat/inspect-pr',
          head_sha: '749ee62888888888888888888888888888888888',
          created_at: '2026-10-17T23:30:00.000Z',
          updated_at: '2026-10-17T23:32:00.000Z',
          closed_at: null,
          merged_at: null,
          changed_files_count: 5,
          additions: 120,
          deletions: 15,
          html_url: 'https://github.com/ayushv7/PRPilot/pull/1',
        },
        change_intent:
          'PR "feat: add GitHub pull request inspection" introduces changes across 3 logic file(s), 2 test file(s) (+120/-15) targeting \'master\' from \'feat/inspect-pr\'.',
        change_map_summary: {
          total_files: 5,
          additions: 120,
          deletions: 15,
          category_counts: {
            application_logic: 3,
            tests: 2,
            config_dependencies: 0,
            documentation: 0,
            other: 0,
          },
        },
        review_signals: [
          {
            severity: 'high',
            code: 'SIG_AUTH_SECURITY',
            title: 'Authentication & Security Boundary Modified',
            file_path: 'src/modules/pull-request/github.service.ts',
            explanation:
              'Changes touch authentication, credential handling, or security boundaries. Review access control logic.',
            evidence_reference: 'src/modules/pull-request/github.service.ts (modified, +80/-10)',
          },
        ],
        verification: {
          head_sha: '749ee62888888888888888888888888888888888',
          collected_at: '2026-10-17T23:30:00.000Z',
          summary: {
            total: 1,
            passing: 1,
            failing: 0,
            pending: 0,
            skipped: 0,
            overall_status: 'passing',
          },
          checks: [
            {
              name: 'build-and-test',
              source: 'check_run',
              status: 'completed',
              conclusion: 'success',
              details_url: 'https://github.com/ayushv7/PRPilot/actions/runs/1',
              started_at: '2026-10-17T23:28:00.000Z',
              completed_at: '2026-10-17T23:29:00.000Z',
            },
          ],
          honest_assessment: 'All 1 retrieved CI check(s) passed on commit 749ee62.',
        },
        linked_context: {
          explicit_issue_references: [],
          explicit_pr_references: [],
          hypotheses: [],
        },
        reviewer_route: [
          {
            step_number: 1,
            title: 'Inspect High-Risk Boundaries First',
            target_paths: ['src/modules/pull-request/github.service.ts'],
            what_to_look_for: 'Authentication & Security Boundary Modified',
            evidence_source: 'src/modules/pull-request/github.service.ts',
          },
          {
            step_number: 2,
            title: 'Review Core Application Logic',
            target_paths: ['src/modules/pull-request/github.service.ts'],
            what_to_look_for: 'Inspect functional changes and error handling.',
            evidence_source: '3 application logic file(s) changed (+120/-15)',
          },
          {
            step_number: 3,
            title: 'Verify Test Coverage & Assertions',
            target_paths: ['tests/github.service.test.ts'],
            what_to_look_for: 'Ensure tests cover newly introduced edge cases.',
            evidence_source: '2 test file(s) modified or added',
          },
        ],
        evidence_coverage: {
          pr_metadata_examined: true,
          files_examined: 5,
          files_truncated: false,
          checks_retrieved: true,
          commits_examined: 1,
          missing_or_unavailable: [],
        },
        confidence_and_limits: {
          verified_facts: [
            'PR #1 by @ayushv7 is currently open.',
            'Head commit 749ee62 targets branch master.',
          ],
          heuristic_signals: [
            '[HIGH] Authentication & Security Boundary Modified: Changes touch authentication.',
          ],
          unverified_hypotheses: [],
        },
      },
    },
  })
  @Widget('review-dossier')
  async assembleReviewDossier(
    input: { owner: string; repo: string; pull_number: number },
    ctx: ExecutionContext
  ): Promise<ReviewDossier> {
    ctx.logger.info('Assembling review dossier', {
      owner: input.owner,
      repo: input.repo,
      pull_number: input.pull_number,
    });

    const [prRaw, filesRaw, commitsRaw] = await Promise.all([
      this.github.getPullRequest(input.owner, input.repo, input.pull_number),
      this.github.getPullRequestFiles(input.owner, input.repo, input.pull_number),
      this.github.getPullRequestCommits(input.owner, input.repo, input.pull_number),
    ]);

    const pr = this.mapPRMetadata(prRaw, input.owner, input.repo, input.pull_number);
    const changeMap = this.heuristics.buildChangeMap(filesRaw, pr.additions, pr.deletions);

    // Fetch verification checks
    let verification: VerificationEvidence;
    if (pr.head_sha) {
      const [checkRuns, statuses] = await Promise.all([
        this.github.getCommitCheckRuns(input.owner, input.repo, pr.head_sha),
        this.github.getCommitStatuses(input.owner, input.repo, pr.head_sha),
      ]);
      verification = this.dossier.buildVerificationEvidence(pr.head_sha, checkRuns, statuses);
    } else {
      verification = {
        head_sha: 'unknown',
        collected_at: new Date().toISOString(),
        summary: {
          total: 0,
          passing: 0,
          failing: 0,
          pending: 0,
          skipped: 0,
          overall_status: 'no_checks_found',
        },
        checks: [],
        honest_assessment: 'Pull request head SHA is unavailable.',
      };
    }

    // Extract explicit linked context
    const descRefs = this.dossier.extractReferences(pr.description || '', 'description');
    const commitRefsList = commitsRaw.map((c: any) =>
      this.dossier.extractReferences(c.commit?.message || '', 'commit_message')
    );

    const allIssues = [...descRefs.issues];
    const allPrs = [...descRefs.prs];

    for (const cr of commitRefsList) {
      for (const iss of cr.issues) {
        if (!allIssues.some((x) => x.number === iss.number)) {
          allIssues.push(iss);
        }
      }
      for (const p of cr.prs) {
        if (!allPrs.some((x) => x.number === p.number)) {
          allPrs.push(p);
        }
      }
    }

    // Hydrate top issues
    const hydratedIssues = await Promise.all(
      allIssues.slice(0, 5).map(async (iss) => {
        const issueData = await this.github.getIssue(input.owner, input.repo, iss.number);
        if (issueData) {
          return {
            ...iss,
            title: issueData.title,
            state: issueData.state,
            html_url: issueData.html_url || iss.html_url,
          };
        }
        return iss;
      })
    );

    const linkedContext: LinkedContext = {
      explicit_issue_references: hydratedIssues,
      explicit_pr_references: allPrs,
      hypotheses: [],
    };

    return this.dossier.assembleDossier(pr, changeMap, verification, linkedContext);
  }

  // --------------------------------------------------------------------------
  // Resource: prpilot://heuristics/catalog
  // --------------------------------------------------------------------------
  @Resource({
    uri: 'prpilot://heuristics/catalog',
    name: 'Investigation Signal Catalog',
    description: 'Reference catalog of heuristic risk signals and inspection rules used by PRPilot.',
    mimeType: 'application/json',
  })
  async getHeuristicCatalog(ctx: ExecutionContext) {
    ctx.logger.info('Reading heuristic signal catalog');
    return [
      {
        code: 'SIG_AUTH_SECURITY',
        severity: 'high',
        title: 'Authentication & Security Boundary Modified',
        criteria: 'Changes touch authentication, credential handling, token creation, or crypto libraries.',
      },
      {
        code: 'SIG_DB_MIGRATION',
        severity: 'high',
        title: 'Database Schema or Migration Modified',
        criteria: 'Changes touch database migrations, SQL schemas, or ORM models.',
      },
      {
        code: 'SIG_CONFIG_ENV',
        severity: 'medium',
        title: 'Runtime Configuration / Environment Altered',
        criteria: 'Changes modify .env templates, Docker configs, or runtime configs.',
      },
      {
        code: 'SIG_DEPENDENCY_CHANGE',
        severity: 'medium',
        title: 'Third-Party Dependency Manifest Changed',
        criteria: 'Changes touch package.json, cargo.toml, requirements.txt, or go.mod.',
      },
      {
        code: 'SIG_INPUT_VALIDATION',
        severity: 'medium',
        title: 'Input Validation / Endpoint Layer Touched',
        criteria: 'Changes touch validation schemas, sanitize routines, or controllers.',
      },
      {
        code: 'SIG_UNTESTED_LOGIC',
        severity: 'high',
        title: 'Application Logic Modified Without Tests',
        criteria: 'Two or more application logic files changed without any accompanying test files.',
      },
      {
        code: 'SIG_HIGH_CHURN',
        severity: 'medium',
        title: 'High-Volume Diff (Review Fatigue Risk)',
        criteria: 'Pull request exceeds 500 line changes or modifies 15 or more files.',
      },
    ];
  }

  // --------------------------------------------------------------------------
  // Prompt: review_pull_request
  // --------------------------------------------------------------------------
  @Prompt({
    name: 'review_pull_request',
    description:
      'Guided prompt for an AI agent to conduct an evidence-driven code review of a GitHub pull request using PRPilot tools.',
    arguments: [
      { name: 'owner', description: 'GitHub repository owner or organization (e.g. "facebook")', required: true },
      { name: 'repo', description: 'GitHub repository name (e.g. "react")', required: true },
      { name: 'pull_number', description: 'Pull request number (e.g. 31000)', required: true },
    ],
  })
  async getReviewPrompt(
    args: { owner: string; repo: string; pull_number: string | number },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Generating review_pull_request prompt', { args });
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Investigate ${args.owner}/${args.repo} pull request #${args.pull_number}. Build the Review Dossier, explain which changes need the most careful human review, check the actual CI evidence, trace explicit related issues, and give me a prioritized review route. Cite the evidence for every important finding and tell me what you could not verify.`,
          },
        },
      ],
    };
  }
}
