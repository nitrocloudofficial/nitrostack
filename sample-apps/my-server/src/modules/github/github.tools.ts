import {
  Cache,
  ExecutionContext,
  Injectable,
  McpError,
  ToolDecorator as Tool,
  UseFilters,
  z,
} from '@nitrostack/core';
import { GitHubExceptionFilter } from '../../filters/github-exception.filter.js';
import { GitHubService } from './github.service.js';
import {
  authenticateGithubInputSchema,
  applyCodePatchInputSchema,
  commitMultipleFilesInputSchema,
  createBranchInputSchema,
  createCommitInputSchema,
  createFeatureBranchAndPrInputSchema,
  createPullRequestInputSchema,
  createRepositoryInputSchema,
  deleteBranchInputSchema,
  getRepositoryInputSchema,
  githubToolMetadata,
  listCommitHistoryInputSchema,
  listPullRequestsInputSchema,
  listRepositoriesInputSchema,
  mergePullRequestInputSchema,
  prepareDeployPlanInputSchema,
  pushChangesInputSchema,
  readDirectoryInputSchema,
  readFileInputSchema,
  readRepositoryTreeInputSchema,
  repoOnboardingSummaryInputSchema,
  searchRepositoryInputSchema,
  setupCiDeploymentGateInputSchema,
} from './github.types.js';

/**
 * MCP tool controller exposing GitHub repository and PR automation operations.
 */
@Injectable({ deps: [GitHubService] })
export class GitHubTools {
  constructor(private readonly githubService: GitHubService) {}

  @Tool({
    name: 'authenticate_github',
    description:
      'Authenticate with GitHub. Use browser_start/browser_poll for browser redirect login, start/poll for device flow, or pat for a token fallback.',
    inputSchema: authenticateGithubInputSchema,
    metadata: githubToolMetadata.authenticate_github,
    annotations: {
      destructiveHint: false,
      idempotentHint: true,
      readOnlyHint: true,
      openWorldHint: true,
    },
  })
  @UseFilters(GitHubExceptionFilter)
  async authenticateGithub(
    input: z.infer<typeof authenticateGithubInputSchema>,
    context: ExecutionContext,
  ) {
    context.logger.info('Authenticating with GitHub', { action: input.action });

    if (input.action === 'pat') {
      const user = await this.githubService.authenticate(input.token);
      return this.ok(context, {
        status: 'authenticated',
        authenticated: true,
        user,
        method: 'pat',
      });
    }

    if (input.action === 'start') {
      const deviceAuth = await this.githubService.startDeviceAuthorization();
      return this.ok(context, {
        status: 'awaiting_user_authorization',
        authenticated: false,
        method: 'oauth_device',
        device_code: deviceAuth.deviceCode,
        user_code: deviceAuth.userCode,
        verification_uri: deviceAuth.verificationUri,
        expires_in: deviceAuth.expiresIn,
        interval: deviceAuth.interval,
        instructions:
          'Open verification_uri, enter user_code, approve access, then call authenticate_github again with action="poll" and the returned device_code.',
      });
    }

    if (input.action === 'browser_start') {
      const browserAuth = this.githubService.startBrowserAuthorization(input.redirect_uri);
      return this.ok(context, {
        status: 'awaiting_browser_authorization',
        authenticated: false,
        method: 'oauth_browser',
        authorization_url: browserAuth.authorizationUrl,
        callback_url: browserAuth.callbackUrl,
        state: browserAuth.state,
        expires_in: browserAuth.expiresIn,
        instructions:
          'Open authorization_url in a browser, approve GitHub access, then call authenticate_github with action="browser_poll" and the returned state.',
      });
    }

    if (input.action === 'browser_poll') {
      const state = input.state?.trim();
      if (!state) {
        throw new McpError('state is required when action="browser_poll".', 'VALIDATION_ERROR', 400);
      }

      const browserResult = this.githubService.pollBrowserAuthorization(state);
      if (browserResult.status === 'authenticated') {
        return this.ok(context, {
          status: 'authenticated',
          authenticated: true,
          method: 'oauth_browser',
          user: browserResult.user,
          scopes: browserResult.scopes ?? [],
        });
      }

      return this.ok(context, {
        status: browserResult.status,
        authenticated: false,
        method: 'oauth_browser',
        message: browserResult.error ?? 'Authorization pending. Finish login in the browser.',
      });
    }

    const deviceCode = input.device_code?.trim();
    if (!deviceCode) {
      throw new McpError('device_code is required when action="poll".', 'VALIDATION_ERROR', 400);
    }

    const pollResult = await this.githubService.pollDeviceAuthorization(deviceCode);
    if (pollResult.status === 'authenticated') {
      return this.ok(context, {
        status: pollResult.status,
        authenticated: true,
        method: 'oauth_device',
        user: pollResult.user,
        scopes: pollResult.scopes,
      });
    }

    return this.ok(context, {
      status: pollResult.status,
      authenticated: false,
      method: 'oauth_device',
      message: pollResult.message,
    });
  }

  @Tool({
    name: 'list_repositories',
    description: 'List repositories available to the authenticated GitHub account.',
    inputSchema: listRepositoriesInputSchema,
    metadata: githubToolMetadata.list_repositories,
    annotations: {
      destructiveHint: false,
      idempotentHint: true,
      readOnlyHint: true,
      openWorldHint: true,
    },
  })
  @UseFilters(GitHubExceptionFilter)
  @Cache({ ttl: 300 })
  async listRepositories(
    input: z.infer<typeof listRepositoriesInputSchema>,
    context: ExecutionContext,
  ) {
    const repositories = await this.githubService.listRepositories(input);
    return this.ok(context, {
      count: repositories.length,
      repositories,
      pagination: {
        page: input.page,
        per_page: input.per_page,
      },
    });
  }

  @Tool({
    name: 'create_repository',
    description: 'Create a new GitHub repository under the authenticated account.',
    inputSchema: createRepositoryInputSchema,
    metadata: githubToolMetadata.create_repository,
    annotations: {
      destructiveHint: true,
      idempotentHint: false,
      readOnlyHint: false,
      openWorldHint: true,
    },
  })
  @UseFilters(GitHubExceptionFilter)
  async createRepository(
    input: z.infer<typeof createRepositoryInputSchema>,
    context: ExecutionContext,
  ) {
    const repository = await this.githubService.createRepository(input);
    return this.ok(context, repository);
  }

  @Tool({
    name: 'get_repository',
    description: 'Get repository metadata and technology analysis for a specific repository.',
    inputSchema: getRepositoryInputSchema,
    metadata: githubToolMetadata.get_repository,
    annotations: {
      destructiveHint: false,
      idempotentHint: true,
      readOnlyHint: true,
      openWorldHint: true,
    },
  })
  @UseFilters(GitHubExceptionFilter)
  @Cache({ ttl: 300 })
  async getRepository(input: z.infer<typeof getRepositoryInputSchema>, context: ExecutionContext) {
    const repository = await this.githubService.getRepository(input.owner, input.repo);
    const analysis = await this.githubService.analyzeRepository(input.owner, input.repo, 'HEAD');
    return this.ok(context, {
      repository,
      analysis,
    });
  }

  @Tool({
    name: 'repo_onboarding_summary',
    description:
      'Use this first when an agent needs to understand a GitHub repository, detect its tech stack, choose build/start commands, or decide how to safely edit it. Returns framework/language/package-manager detection, important files, deploy hints, and recommended next MCP workflow tools.',
    inputSchema: repoOnboardingSummaryInputSchema,
    metadata: githubToolMetadata.repo_onboarding_summary,
    annotations: {
      destructiveHint: false,
      idempotentHint: true,
      readOnlyHint: true,
      openWorldHint: true,
    },
  })
  @UseFilters(GitHubExceptionFilter)
  @Cache({ ttl: 300 })
  async repoOnboardingSummary(
    input: z.infer<typeof repoOnboardingSummaryInputSchema>,
    context: ExecutionContext,
  ) {
    const summary = await this.githubService.getRepoOnboardingSummary(input.owner, input.repo, input.ref);
    return this.ok(context, summary);
  }

  @Tool({
    name: 'apply_code_patch',
    description:
      'Preferred tool when the user asks to push code, save generated files, edit files in GitHub, commit changes, update a branch, or apply a patch. Commits many files atomically to the target branch in one GitHub commit.',
    inputSchema: applyCodePatchInputSchema,
    metadata: githubToolMetadata.apply_code_patch,
    annotations: {
      destructiveHint: true,
      idempotentHint: false,
      readOnlyHint: false,
      openWorldHint: true,
    },
  })
  @UseFilters(GitHubExceptionFilter)
  async applyCodePatch(
    input: z.infer<typeof applyCodePatchInputSchema>,
    context: ExecutionContext,
  ) {
    const result = await this.githubService.applyCodePatch(
      input.owner,
      input.repo,
      input.branch,
      input.message,
      input.files,
    );
    return this.ok(context, result);
  }

  @Tool({
    name: 'create_feature_branch_and_pr',
    description:
      'Preferred tool when the user asks to ship a change, push code safely, open a PR, make a feature branch, implement a requested edit for review, or avoid committing directly to main. Creates a branch, commits all files, and opens a pull request in one workflow.',
    inputSchema: createFeatureBranchAndPrInputSchema,
    metadata: githubToolMetadata.create_feature_branch_and_pr,
    annotations: {
      destructiveHint: true,
      idempotentHint: false,
      readOnlyHint: false,
      openWorldHint: true,
    },
  })
  @UseFilters(GitHubExceptionFilter)
  async createFeatureBranchAndPr(
    input: z.infer<typeof createFeatureBranchAndPrInputSchema>,
    context: ExecutionContext,
  ) {
    const result = await this.githubService.createFeatureBranchAndPr(
      input.owner,
      input.repo,
      input,
    );
    return this.ok(context, result);
  }

  @Tool({
    name: 'prepare_deploy_plan',
    description:
      'Preferred tool when the user asks to deploy, dockerize, containerize, prepare a repo for cloud hosting, detect tech stack, infer build/start commands, or generate Dockerfile files. Returns deploy plan and optional Dockerfile/.dockerignore content that can be committed with apply_code_patch or create_feature_branch_and_pr.',
    inputSchema: prepareDeployPlanInputSchema,
    metadata: githubToolMetadata.prepare_deploy_plan,
    annotations: {
      destructiveHint: false,
      idempotentHint: true,
      readOnlyHint: true,
      openWorldHint: true,
    },
  })
  @UseFilters(GitHubExceptionFilter)
  async prepareDeployPlan(
    input: z.infer<typeof prepareDeployPlanInputSchema>,
    context: ExecutionContext,
  ) {
    const result = await this.githubService.prepareDeployPlan(
      input.owner,
      input.repo,
      input.ref,
      input.include_docker_files,
    );
    return this.ok(context, result);
  }

  @Tool({
    name: 'setup_ci_deployment_gate',
    description:
      'Preferred tool after repo_onboarding_summary or prepare_deploy_plan when the user asks to add GitHub Actions, run tests before deploy, block deployment until tests pass, create CI/CD, or prepare a safe deployment pipeline. Generates an appropriate GitHub Actions workflow and can preview it, commit it, or open a PR.',
    inputSchema: setupCiDeploymentGateInputSchema,
    metadata: githubToolMetadata.setup_ci_deployment_gate,
    annotations: {
      destructiveHint: true,
      idempotentHint: false,
      readOnlyHint: false,
      openWorldHint: true,
    },
  })
  @UseFilters(GitHubExceptionFilter)
  async setupCiDeploymentGate(
    input: z.infer<typeof setupCiDeploymentGateInputSchema>,
    context: ExecutionContext,
  ) {
    const result = await this.githubService.setupCiDeploymentGate(
      input.owner,
      input.repo,
      input,
    );
    return this.ok(context, result);
  }

  @Tool({
    name: 'list_commit_history',
    description: 'List commit history for a repository with branch/path filtering and pagination.',
    inputSchema: listCommitHistoryInputSchema,
    metadata: githubToolMetadata.list_commit_history,
    annotations: {
      destructiveHint: false,
      idempotentHint: true,
      readOnlyHint: true,
      openWorldHint: true,
    },
  })
  @UseFilters(GitHubExceptionFilter)
  @Cache({ ttl: 300 })
  async listCommitHistory(
    input: z.infer<typeof listCommitHistoryInputSchema>,
    context: ExecutionContext,
  ) {
    const commits = await this.githubService.listCommitHistory(input.owner, input.repo, {
      sha: input.sha,
      path: input.path,
      per_page: input.per_page,
      page: input.page,
    });
    return this.ok(context, {
      count: commits.length,
      commits,
      pagination: {
        page: input.page,
        per_page: input.per_page,
      },
    });
  }

  @Tool({
    name: 'read_repository_tree',
    description: 'Read the Git tree for a repository reference with optional path filtering.',
    inputSchema: readRepositoryTreeInputSchema,
    metadata: githubToolMetadata.read_repository_tree,
    annotations: {
      destructiveHint: false,
      idempotentHint: true,
      readOnlyHint: true,
      openWorldHint: true,
    },
  })
  @UseFilters(GitHubExceptionFilter)
  async readRepositoryTree(
    input: z.infer<typeof readRepositoryTreeInputSchema>,
    context: ExecutionContext,
  ) {
    const tree = await this.githubService.readRepositoryTree(
      input.owner,
      input.repo,
      input.ref,
      input.recursive,
      input.path,
    );
    return this.ok(context, {
      ...tree,
      count: tree.tree.length,
    });
  }

  @Tool({
    name: 'read_file',
    description: 'Read a file from a GitHub repository and return decoded text plus metadata.',
    inputSchema: readFileInputSchema,
    metadata: githubToolMetadata.read_file,
    annotations: {
      destructiveHint: false,
      idempotentHint: true,
      readOnlyHint: true,
      openWorldHint: true,
    },
  })
  @UseFilters(GitHubExceptionFilter)
  async readFile(input: z.infer<typeof readFileInputSchema>, context: ExecutionContext) {
    const file = await this.githubService.readFile(input.owner, input.repo, input.path, input.ref);
    return this.ok(context, file);
  }

  @Tool({
    name: 'read_directory',
    description: 'List the files and folders at a repository directory path.',
    inputSchema: readDirectoryInputSchema,
    metadata: githubToolMetadata.read_directory,
    annotations: {
      destructiveHint: false,
      idempotentHint: true,
      readOnlyHint: true,
      openWorldHint: true,
    },
  })
  @UseFilters(GitHubExceptionFilter)
  async readDirectory(input: z.infer<typeof readDirectoryInputSchema>, context: ExecutionContext) {
    const entries = await this.githubService.readDirectory(input.owner, input.repo, input.path, input.ref);
    return this.ok(context, {
      path: input.path,
      count: entries.length,
      entries,
    });
  }

  @Tool({
    name: 'search_repository',
    description: 'Search code within a repository using GitHub code search syntax.',
    inputSchema: searchRepositoryInputSchema,
    metadata: githubToolMetadata.search_repository,
    annotations: {
      destructiveHint: false,
      idempotentHint: true,
      readOnlyHint: true,
      openWorldHint: true,
    },
  })
  @UseFilters(GitHubExceptionFilter)
  async searchRepository(
    input: z.infer<typeof searchRepositoryInputSchema>,
    context: ExecutionContext,
  ) {
    const result = await this.githubService.searchRepository(input.owner, input.repo, input.query, {
      path: input.path,
      language: input.language,
      per_page: input.per_page,
      page: input.page,
    });
    return this.ok(context, result);
  }

  @Tool({
    name: 'create_branch',
    description: 'Create a new branch from an existing repository reference.',
    inputSchema: createBranchInputSchema,
    metadata: githubToolMetadata.create_branch,
    annotations: {
      destructiveHint: true,
      idempotentHint: false,
      readOnlyHint: false,
      openWorldHint: true,
    },
  })
  @UseFilters(GitHubExceptionFilter)
  async createBranch(input: z.infer<typeof createBranchInputSchema>, context: ExecutionContext) {
    const branch = await this.githubService.createBranch(
      input.owner,
      input.repo,
      input.branch,
      input.from_ref,
    );
    return this.ok(context, branch);
  }

  @Tool({
    name: 'delete_branch',
    description: 'Delete a repository branch.',
    inputSchema: deleteBranchInputSchema,
    metadata: githubToolMetadata.delete_branch,
    annotations: {
      destructiveHint: true,
      idempotentHint: false,
      readOnlyHint: false,
      openWorldHint: true,
    },
  })
  @UseFilters(GitHubExceptionFilter)
  async deleteBranch(input: z.infer<typeof deleteBranchInputSchema>, context: ExecutionContext) {
    const result = await this.githubService.deleteBranch(input.owner, input.repo, input.branch);
    return this.ok(context, result);
  }

  @Tool({
    name: 'create_commit',
    description: 'Create a commit with one file change on a repository branch.',
    inputSchema: createCommitInputSchema,
    metadata: githubToolMetadata.create_commit,
    annotations: {
      destructiveHint: true,
      idempotentHint: false,
      readOnlyHint: false,
      openWorldHint: true,
    },
  })
  @UseFilters(GitHubExceptionFilter)
  async createCommit(input: z.infer<typeof createCommitInputSchema>, context: ExecutionContext) {
    const commit = await this.githubService.createCommit(
      input.owner,
      input.repo,
      input.branch,
      input.message,
      input.file_path,
      input.content,
      input.encoding,
    );
    return this.ok(context, commit);
  }

  @Tool({
    name: 'commit_multiple_files',
    description: 'Create a single commit that updates multiple files in a branch.',
    inputSchema: commitMultipleFilesInputSchema,
    metadata: githubToolMetadata.commit_multiple_files,
    annotations: {
      destructiveHint: true,
      idempotentHint: false,
      readOnlyHint: false,
      openWorldHint: true,
    },
  })
  @UseFilters(GitHubExceptionFilter)
  async commitMultipleFiles(
    input: z.infer<typeof commitMultipleFilesInputSchema>,
    context: ExecutionContext,
  ) {
    const commit = await this.githubService.commitMultipleFiles(
      input.owner,
      input.repo,
      input.branch,
      input.message,
      input.files,
    );
    return this.ok(context, commit);
  }

  @Tool({
    name: 'push_changes',
    description:
      'Update a branch reference to a specific commit SHA, equivalent to pushing changes.',
    inputSchema: pushChangesInputSchema,
    metadata: githubToolMetadata.push_changes,
    annotations: {
      destructiveHint: true,
      idempotentHint: false,
      readOnlyHint: false,
      openWorldHint: true,
    },
  })
  @UseFilters(GitHubExceptionFilter)
  async pushChanges(input: z.infer<typeof pushChangesInputSchema>, context: ExecutionContext) {
    const pushResult = await this.githubService.pushChanges(
      input.owner,
      input.repo,
      input.branch,
      input.commit_sha,
      input.force,
    );
    return this.ok(context, pushResult);
  }

  @Tool({
    name: 'create_pull_request',
    description: 'Open a new pull request from a source branch to a target branch.',
    inputSchema: createPullRequestInputSchema,
    metadata: githubToolMetadata.create_pull_request,
    annotations: {
      destructiveHint: true,
      idempotentHint: false,
      readOnlyHint: false,
      openWorldHint: true,
    },
  })
  @UseFilters(GitHubExceptionFilter)
  async createPullRequest(
    input: z.infer<typeof createPullRequestInputSchema>,
    context: ExecutionContext,
  ) {
    const pullRequest = await this.githubService.createPullRequest(input.owner, input.repo, {
      title: input.title,
      head: input.head,
      base: input.base,
      body: input.body,
      draft: input.draft,
    });
    return this.ok(context, pullRequest);
  }

  @Tool({
    name: 'list_pull_requests',
    description: 'List pull requests for a repository with pagination and filtering.',
    inputSchema: listPullRequestsInputSchema,
    metadata: githubToolMetadata.list_pull_requests,
    annotations: {
      destructiveHint: false,
      idempotentHint: true,
      readOnlyHint: true,
      openWorldHint: true,
    },
  })
  @UseFilters(GitHubExceptionFilter)
  async listPullRequests(
    input: z.infer<typeof listPullRequestsInputSchema>,
    context: ExecutionContext,
  ) {
    const pullRequests = await this.githubService.listPullRequests(input.owner, input.repo, {
      state: input.state,
      head: input.head,
      base: input.base,
      sort: input.sort,
      direction: input.direction,
      per_page: input.per_page,
      page: input.page,
    });
    return this.ok(context, {
      count: pullRequests.length,
      pullRequests,
      pagination: {
        page: input.page,
        per_page: input.per_page,
      },
    });
  }

  @Tool({
    name: 'merge_pull_request',
    description: 'Merge a pull request using merge, squash, or rebase strategy.',
    inputSchema: mergePullRequestInputSchema,
    metadata: githubToolMetadata.merge_pull_request,
    annotations: {
      destructiveHint: true,
      idempotentHint: false,
      readOnlyHint: false,
      openWorldHint: true,
    },
  })
  @UseFilters(GitHubExceptionFilter)
  async mergePullRequest(
    input: z.infer<typeof mergePullRequestInputSchema>,
    context: ExecutionContext,
  ) {
    const result = await this.githubService.mergePullRequest(
      input.owner,
      input.repo,
      input.pull_number,
      {
        commit_title: input.commit_title,
        commit_message: input.commit_message,
        merge_method: input.merge_method,
      },
    );
    return this.ok(context, result);
  }

  @Tool({
    name: 'run_security_scan',
    description: '🔒 Security Scan: Detect leaked API keys, tokens, hardcoded passwords, and private configuration files (.env, .pem) committed to Git.',
    inputSchema: z.object({
      owner: z.string().describe('The GitHub repository owner'),
      repo: z.string().describe('The GitHub repository name'),
      ref: z.string().default('HEAD').describe('The branch or commit ref to scan'),
    }),
  })
  @UseFilters(GitHubExceptionFilter)
  @Cache({ ttl: 300 })
  async runSecurityScan(
    input: { owner: string; repo: string; ref: string },
    context: ExecutionContext,
  ) {
    const result = await this.githubService.runSecurityScan(input.owner, input.repo, input.ref);
    return this.ok(context, result);
  }

  @Tool({
    name: 'get_deploy_readiness_score',
    description: '🚀 Deploy Readiness Score: Evaluates repository against production checklists (README, Dockerfile, tests, environment templates, health checks) and returns a score out of 100.',
    inputSchema: z.object({
      owner: z.string().describe('The GitHub repository owner'),
      repo: z.string().describe('The GitHub repository name'),
      ref: z.string().default('HEAD').describe('The branch or commit ref to evaluate'),
    }),
  })
  @UseFilters(GitHubExceptionFilter)
  @Cache({ ttl: 300 })
  async getDeployReadinessScore(
    input: { owner: string; repo: string; ref: string },
    context: ExecutionContext,
  ) {
    const result = await this.githubService.getDeployReadinessScore(input.owner, input.repo, input.ref);
    return this.ok(context, result);
  }

  private ok<T>(context: ExecutionContext, data: T) {
    return {
      success: true,
      data,
      meta: {
        requestId: context.requestId,
        timestamp: new Date().toISOString(),
        source: 'github-deploy-agent' as const,
      },
    };
  }
}
