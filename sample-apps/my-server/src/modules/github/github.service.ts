import { randomBytes } from 'node:crypto';
import { ConfigService, Injectable, McpError } from '@nitrostack/core';
import type {
  CommitFileInput,
  GitHubApiErrorDetails,
  GitHubCommitSummary,
  GitHubPullRequestSummary,
  GitHubRepositorySummary,
  GitHubTreeItem,
  GitHubUser,
  RepositoryAnalysis,
} from './github.types.js';
import { RepositoryAnalyzerService } from './repository-analyzer.service.js';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  token?: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

interface GitHubDeviceCodeStartResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

interface GitHubDeviceCodePollSuccessResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

interface GitHubDeviceCodePollErrorResponse {
  error: 'authorization_pending' | 'slow_down' | 'expired_token' | 'access_denied' | string;
  error_description?: string;
}

interface GitHubBrowserAuthSession {
  status: 'pending' | 'authenticated' | 'error';
  requestedAt: number;
  expiresAt: number;
  redirectUri: string;
  user?: GitHubUser;
  scopes?: string[];
  error?: string;
}

/**
 * Encapsulates all GitHub REST API interactions used by MCP tools.
 */
@Injectable({ deps: [ConfigService, RepositoryAnalyzerService] })
export class GitHubService {
  private readonly baseUrl = 'https://api.github.com';
  private readonly oauthBaseUrl = 'https://github.com';
  private runtimeToken?: string;
  private readonly pendingDeviceCodes = new Map<
    string,
    { requestedAt: number; expiresIn: number; interval: number }
  >();
  private readonly browserAuthSessions = new Map<string, GitHubBrowserAuthSession>();

  constructor(
    private readonly configService: ConfigService,
    private readonly repositoryAnalyzer: RepositoryAnalyzerService,
  ) {}

  /**
   * Authenticates using a provided PAT and returns the account profile.
   */
  async authenticate(token?: string): Promise<GitHubUser> {
    const resolvedToken = this.resolveToken(token);
    const user = await this.request<GitHubUser>('/user', {
      method: 'GET',
      token: resolvedToken,
    });

    this.runtimeToken = resolvedToken;
    return user;
  }

  /**
   * Starts GitHub OAuth device flow for interactive login.
   */
  async startDeviceAuthorization(): Promise<{
    deviceCode: string;
    userCode: string;
    verificationUri: string;
    expiresIn: number;
    interval: number;
  }> {
    const clientId = this.getOAuthClientId();
    const response = await this.requestOAuthForm<GitHubDeviceCodeStartResponse>(
      '/login/device/code',
      {
        client_id: clientId,
        scope: 'repo read:user',
      },
    );

    this.pendingDeviceCodes.set(response.device_code, {
      requestedAt: Date.now(),
      expiresIn: response.expires_in,
      interval: response.interval,
    });

    return {
      deviceCode: response.device_code,
      userCode: response.user_code,
      verificationUri: response.verification_uri,
      expiresIn: response.expires_in,
      interval: response.interval,
    };
  }

  /**
   * Polls GitHub OAuth device flow to exchange device code for access token.
   */
  async pollDeviceAuthorization(deviceCode: string): Promise<
    | {
        status: 'pending' | 'slow_down';
        message: string;
      }
    | {
        status: 'expired' | 'denied';
        message: string;
      }
    | {
        status: 'authenticated';
        user: GitHubUser;
        scopes: string[];
      }
  > {
    const pending = this.pendingDeviceCodes.get(deviceCode);
    if (!pending) {
      throw new McpError(
        'Unknown device_code. Start authentication again with action="start".',
        'GITHUB_DEVICE_CODE_NOT_FOUND',
        400,
      );
    }

    const elapsedSeconds = Math.floor((Date.now() - pending.requestedAt) / 1000);
    if (elapsedSeconds >= pending.expiresIn) {
      this.pendingDeviceCodes.delete(deviceCode);
      return {
        status: 'expired',
        message: 'Device authorization expired. Start again with action="start".',
      };
    }

    const clientId = this.getOAuthClientId();
    const clientSecret = this.getOAuthClientSecret();

    const payload: Record<string, string> = {
      client_id: clientId,
      device_code: deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    };
    if (clientSecret) {
      payload.client_secret = clientSecret;
    }

    const response = await this.requestOAuthForm<GitHubDeviceCodePollSuccessResponse | GitHubDeviceCodePollErrorResponse>(
      '/login/oauth/access_token',
      payload,
    );

    if ('error' in response) {
      if (response.error === 'authorization_pending') {
        return { status: 'pending', message: 'Authorization pending. Ask user to finish login on GitHub.' };
      }
      if (response.error === 'slow_down') {
        return { status: 'slow_down', message: 'Poll less frequently and retry after a short delay.' };
      }
      if (response.error === 'access_denied') {
        this.pendingDeviceCodes.delete(deviceCode);
        return { status: 'denied', message: 'User denied GitHub authorization request.' };
      }
      if (response.error === 'expired_token') {
        this.pendingDeviceCodes.delete(deviceCode);
        return { status: 'expired', message: 'Device authorization expired. Start again with action="start".' };
      }

      throw new McpError(
        response.error_description ?? 'GitHub OAuth device flow failed.',
        'GITHUB_OAUTH_ERROR',
        400,
        response,
      );
    }

    this.pendingDeviceCodes.delete(deviceCode);
    this.runtimeToken = response.access_token;
    const user = await this.authenticate(response.access_token);

    return {
      status: 'authenticated',
      user,
      scopes: response.scope ? response.scope.split(',').map((value) => value.trim()).filter(Boolean) : [],
    };
  }

  /**
   * Starts GitHub OAuth authorization-code login through the user's browser.
   */
  startBrowserAuthorization(redirectUriOverride?: string): {
    authorizationUrl: string;
    callbackUrl: string;
    state: string;
    expiresIn: number;
  } {
    const clientId = this.getOAuthClientId();
    if (!this.getOAuthClientSecret()) {
      throw new McpError(
        'Browser GitHub login requires GITHUB_OAUTH_CLIENT_SECRET.',
        'GITHUB_BROWSER_AUTH_CLIENT_SECRET_REQUIRED',
        400,
      );
    }
    const callbackUrl = redirectUriOverride ?? this.getBrowserRedirectUri();
    const state = randomBytes(24).toString('hex');
    const expiresIn = 600;

    const url = new URL(`${this.oauthBaseUrl}/login/oauth/authorize`);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', callbackUrl);
    url.searchParams.set('scope', 'repo read:user');
    url.searchParams.set('state', state);
    url.searchParams.set('allow_signup', 'true');

    this.browserAuthSessions.set(state, {
      status: 'pending',
      requestedAt: Date.now(),
      expiresAt: Date.now() + expiresIn * 1000,
      redirectUri: callbackUrl,
    });

    return {
      authorizationUrl: url.toString(),
      callbackUrl,
      state,
      expiresIn,
    };
  }

  /**
   * Handles GitHub's browser OAuth callback and stores the resulting runtime token.
   */
  async completeBrowserAuthorization(input: {
    state: string;
    code?: string;
    error?: string;
    errorDescription?: string;
  }): Promise<GitHubBrowserAuthSession> {
    const session = this.browserAuthSessions.get(input.state);
    if (!session) {
      throw new McpError('Unknown or expired GitHub OAuth state.', 'GITHUB_BROWSER_AUTH_STATE_NOT_FOUND', 400);
    }

    if (Date.now() > session.expiresAt) {
      this.browserAuthSessions.delete(input.state);
      throw new McpError('GitHub OAuth browser login expired. Start login again.', 'GITHUB_BROWSER_AUTH_EXPIRED', 400);
    }

    if (input.error) {
      session.status = 'error';
      session.error = input.errorDescription ?? input.error;
      return session;
    }

    if (!input.code) {
      throw new McpError('GitHub OAuth callback did not include a code.', 'GITHUB_BROWSER_AUTH_CODE_MISSING', 400);
    }

    const payload: Record<string, string> = {
      client_id: this.getOAuthClientId(),
      code: input.code,
      redirect_uri: session.redirectUri,
    };
    const clientSecret = this.getOAuthClientSecret();
    if (clientSecret) {
      payload.client_secret = clientSecret;
    }

    const response = await this.requestOAuthForm<
      GitHubDeviceCodePollSuccessResponse | GitHubDeviceCodePollErrorResponse
    >('/login/oauth/access_token', payload);

    if ('error' in response) {
      session.status = 'error';
      session.error = response.error_description ?? response.error;
      return session;
    }

    this.runtimeToken = response.access_token;
    const user = await this.authenticate(response.access_token);
    session.status = 'authenticated';
    session.user = user;
    session.scopes = response.scope ? response.scope.split(',').map((value) => value.trim()).filter(Boolean) : [];
    return session;
  }

  pollBrowserAuthorization(state: string): GitHubBrowserAuthSession {
    const session = this.browserAuthSessions.get(state);
    if (!session) {
      throw new McpError('Unknown GitHub OAuth state. Start browser login again.', 'GITHUB_BROWSER_AUTH_STATE_NOT_FOUND', 400);
    }

    if (Date.now() > session.expiresAt) {
      this.browserAuthSessions.delete(state);
      throw new McpError('GitHub OAuth browser login expired. Start login again.', 'GITHUB_BROWSER_AUTH_EXPIRED', 400);
    }

    return session;
  }

  /**
   * Lists repositories available to the authenticated user.
   */
  async listRepositories(
    input: {
      visibility: 'all' | 'public' | 'private';
      affiliation: string;
      sort: 'created' | 'updated' | 'pushed' | 'full_name';
      direction: 'asc' | 'desc';
      per_page: number;
      page: number;
    },
    token?: string,
  ): Promise<GitHubRepositorySummary[]> {
    return this.request<GitHubRepositorySummary[]>('/user/repos', {
      method: 'GET',
      token,
      query: input,
    });
  }

  /**
   * Creates a new repository under the authenticated account.
   */
  async createRepository(
    input: {
      name: string;
      description?: string;
      private: boolean;
      auto_init: boolean;
      gitignore_template?: string;
      license_template?: string;
    },
    token?: string,
  ): Promise<GitHubRepositorySummary> {
    return this.request<GitHubRepositorySummary>('/user/repos', {
      method: 'POST',
      token,
      body: input,
    });
  }

  /**
   * Returns metadata for a specific repository.
   */
  async getRepository(owner: string, repo: string, token?: string): Promise<GitHubRepositorySummary> {
    return this.request<GitHubRepositorySummary>(`/repos/${owner}/${repo}`, {
      method: 'GET',
      token,
    });
  }

  /**
   * Lists commit history for a repository.
   */
  async listCommitHistory(
    owner: string,
    repo: string,
    input: {
      sha?: string;
      path?: string;
      per_page: number;
      page: number;
    },
    token?: string,
  ): Promise<GitHubCommitSummary[]> {
    return this.request<GitHubCommitSummary[]>(`/repos/${owner}/${repo}/commits`, {
      method: 'GET',
      token,
      query: input,
    });
  }

  /**
   * Reads repository tree from a branch, tag, or commit reference.
   */
  async readRepositoryTree(
    owner: string,
    repo: string,
    ref: string,
    recursive: boolean,
    filterPath?: string,
    token?: string,
  ): Promise<{ ref: string; commitSha: string; treeSha: string; truncated: boolean; tree: GitHubTreeItem[] }> {
    const resolvedRef = await this.resolveReference(owner, repo, ref, token);

    const commit = await this.request<{ sha: string; commit: { tree: { sha: string } } }>(
      `/repos/${owner}/${repo}/commits/${encodeURIComponent(resolvedRef)}`,
      {
        method: 'GET',
        token,
      },
    );

    const treeResponse = await this.request<{ sha: string; truncated: boolean; tree: GitHubTreeItem[] }>(
      `/repos/${owner}/${repo}/git/trees/${commit.commit.tree.sha}`,
      {
        method: 'GET',
        token,
        query: { recursive: recursive ? 1 : undefined },
      },
    );

    const normalizedPrefix = filterPath?.replace(/^\/+/, '').replace(/\/+$/, '');
    const filteredTree =
      normalizedPrefix && normalizedPrefix.length > 0
        ? treeResponse.tree.filter((item) => item.path === normalizedPrefix || item.path.startsWith(`${normalizedPrefix}/`))
        : treeResponse.tree;

    return {
      ref: resolvedRef,
      commitSha: commit.sha,
      treeSha: treeResponse.sha,
      truncated: treeResponse.truncated,
      tree: filteredTree,
    };
  }

  /**
   * Reads file contents from a repository path.
   */
  async readFile(
    owner: string,
    repo: string,
    filePath: string,
    ref?: string,
    token?: string,
  ): Promise<{
    path: string;
    sha: string;
    size: number;
    encoding: string;
    contentBase64: string;
    contentUtf8: string;
    htmlUrl?: string;
  }> {
    const content = await this.request<{
      path: string;
      sha: string;
      size: number;
      encoding: string;
      content: string;
      html_url?: string;
      type: string;
    } | Array<unknown>>(`/repos/${owner}/${repo}/contents/${this.encodePath(filePath)}`, {
      method: 'GET',
      token,
      query: { ref },
    });

    if (Array.isArray(content) || !('type' in content) || content.type !== 'file') {
      throw new McpError(
        `Path "${filePath}" is not a file.`,
        'GITHUB_NOT_A_FILE',
        400,
      );
    }

    const contentBase64 = content.content.replace(/\n/g, '');
    const contentUtf8 =
      content.encoding === 'base64'
        ? Buffer.from(contentBase64, 'base64').toString('utf-8')
        : content.content;

    return {
      path: content.path,
      sha: content.sha,
      size: content.size,
      encoding: content.encoding,
      contentBase64,
      contentUtf8,
      htmlUrl: content.html_url,
    };
  }

  /**
   * Lists immediate contents of a directory.
   */
  async readDirectory(
    owner: string,
    repo: string,
    directoryPath = '',
    ref?: string,
    token?: string,
  ): Promise<
    Array<{
      name: string;
      path: string;
      sha: string;
      type: 'file' | 'dir' | string;
      size?: number;
      html_url?: string;
    }>
  > {
    const normalizedPath = directoryPath.replace(/^\/+/, '');
    const requestPath =
      normalizedPath.length > 0
        ? `/repos/${owner}/${repo}/contents/${this.encodePath(normalizedPath)}`
        : `/repos/${owner}/${repo}/contents`;

    const content = await this.request<
      | {
          type: string;
          path: string;
        }
      | Array<{
          name: string;
          path: string;
          sha: string;
          type: 'file' | 'dir' | string;
          size?: number;
          html_url?: string;
        }>
    >(requestPath, {
      method: 'GET',
      token,
      query: { ref },
    });

    if (!Array.isArray(content)) {
      throw new McpError(
        `Path "${directoryPath}" is not a directory.`,
        'GITHUB_NOT_A_DIRECTORY',
        400,
      );
    }

    return content;
  }

  /**
   * Searches code in a repository using GitHub code search.
   */
  async searchRepository(
    owner: string,
    repo: string,
    query: string,
    options: {
      path?: string;
      language?: string;
      per_page: number;
      page: number;
    },
    token?: string,
  ): Promise<{
    total_count: number;
    incomplete_results: boolean;
    items: Array<{
      name: string;
      path: string;
      sha: string;
      html_url: string;
      repository: { full_name: string };
    }>;
  }> {
    const queryParts = [query, `repo:${owner}/${repo}`];
    if (options.path) {
      queryParts.push(`path:${options.path}`);
    }
    if (options.language) {
      queryParts.push(`language:${options.language}`);
    }

    return this.request('/search/code', {
      method: 'GET',
      token,
      query: {
        q: queryParts.join(' '),
        per_page: options.per_page,
        page: options.page,
      },
    });
  }

  /**
   * Creates a branch from an existing reference.
   */
  async createBranch(
    owner: string,
    repo: string,
    branch: string,
    fromRef: string,
    token?: string,
  ): Promise<{ ref: string; sha: string }> {
    const fromSha = await this.getRefSha(owner, repo, fromRef, token);
    const result = await this.request<{ ref: string; object: { sha: string } }>(
      `/repos/${owner}/${repo}/git/refs`,
      {
        method: 'POST',
        token,
        body: {
          ref: `refs/heads/${branch}`,
          sha: fromSha,
        },
      },
    );

    return { ref: result.ref, sha: result.object.sha };
  }

  /**
   * Deletes an existing branch reference.
   */
  async deleteBranch(owner: string, repo: string, branch: string, token?: string): Promise<{ deleted: boolean }> {
    await this.request<void>(`/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, {
      method: 'DELETE',
      token,
    });
    return { deleted: true };
  }

  /**
   * Creates a single-file commit and updates the target branch ref.
   */
  async createCommit(
    owner: string,
    repo: string,
    branch: string,
    message: string,
    filePath: string,
    content: string,
    encoding: 'utf-8' | 'base64',
    token?: string,
  ): Promise<{ branch: string; previousCommitSha: string; commitSha: string; treeSha: string }> {
    return this.commitFiles(
      owner,
      repo,
      branch,
      message,
      [
        {
          path: filePath,
          content,
          encoding,
          mode: '100644',
        },
      ],
      token,
    );
  }

  /**
   * Creates a multi-file commit and updates the target branch ref.
   */
  async commitMultipleFiles(
    owner: string,
    repo: string,
    branch: string,
    message: string,
    files: CommitFileInput[],
    token?: string,
  ): Promise<{ branch: string; previousCommitSha: string; commitSha: string; treeSha: string }> {
    return this.commitFiles(owner, repo, branch, message, files, token);
  }

  /**
   * Updates branch reference to point to an existing commit SHA (push-like ref update).
   */
  async pushChanges(
    owner: string,
    repo: string,
    branch: string,
    commitSha: string,
    force: boolean,
    token?: string,
  ): Promise<{ branch: string; commitSha: string; forced: boolean }> {
    await this.request<{ ref: string; object: { sha: string } }>(
      `/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`,
      {
        method: 'PATCH',
        token,
        body: { sha: commitSha, force },
      },
    );

    return {
      branch,
      commitSha,
      forced: force,
    };
  }

  /**
   * Creates a pull request.
   */
  async createPullRequest(
    owner: string,
    repo: string,
    input: {
      title: string;
      head: string;
      base: string;
      body?: string;
      draft: boolean;
    },
    token?: string,
  ): Promise<GitHubPullRequestSummary> {
    return this.request<GitHubPullRequestSummary>(`/repos/${owner}/${repo}/pulls`, {
      method: 'POST',
      token,
      body: input,
    });
  }

  /**
   * Lists pull requests in a repository.
   */
  async listPullRequests(
    owner: string,
    repo: string,
    input: {
      state: 'open' | 'closed' | 'all';
      head?: string;
      base?: string;
      sort: 'created' | 'updated' | 'popularity' | 'long-running';
      direction: 'asc' | 'desc';
      per_page: number;
      page: number;
    },
    token?: string,
  ): Promise<GitHubPullRequestSummary[]> {
    return this.request<GitHubPullRequestSummary[]>(`/repos/${owner}/${repo}/pulls`, {
      method: 'GET',
      token,
      query: input,
    });
  }

  /**
   * Merges a pull request with merge/squash/rebase strategy.
   */
  async mergePullRequest(
    owner: string,
    repo: string,
    pullNumber: number,
    input: {
      commit_title?: string;
      commit_message?: string;
      merge_method: 'merge' | 'squash' | 'rebase';
    },
    token?: string,
  ): Promise<{ sha: string; merged: boolean; message: string }> {
    return this.request<{ sha: string; merged: boolean; message: string }>(
      `/repos/${owner}/${repo}/pulls/${pullNumber}/merge`,
      {
        method: 'PUT',
        token,
        body: input,
      },
    );
  }

  /**
   * Analyzes repository technologies using repository tree signals.
   */
  async analyzeRepository(owner: string, repo: string, ref = 'HEAD', token?: string): Promise<RepositoryAnalysis> {
    const tree = await this.readRepositoryTree(owner, repo, ref, true, undefined, token);
    const paths = tree.tree.map((item) => item.path);
    const fileContents: Record<string, string> = {};

    if (paths.includes('package.json')) {
      const packageJson = await this.readFile(owner, repo, 'package.json', tree.ref, token);
      fileContents['package.json'] = packageJson.contentUtf8;
    }
    if (paths.includes('requirements.txt')) {
      const requirements = await this.readFile(owner, repo, 'requirements.txt', tree.ref, token);
      fileContents['requirements.txt'] = requirements.contentUtf8;
    }
    if (paths.includes('pyproject.toml')) {
      const pyproject = await this.readFile(owner, repo, 'pyproject.toml', tree.ref, token);
      fileContents['pyproject.toml'] = pyproject.contentUtf8;
    }

    return this.repositoryAnalyzer.analyze(paths, fileContents);
  }

  async getRepoOnboardingSummary(
    owner: string,
    repo: string,
    ref = 'HEAD',
    token?: string,
  ): Promise<{
    repository: GitHubRepositorySummary;
    ref: string;
    defaultBranch: string;
    analysis: RepositoryAnalysis;
    importantFiles: string[];
    recommendedAgentWorkflow: string[];
    deployHints: ReturnType<GitHubService['buildDeployHints']>;
  }> {
    const repository = await this.getRepository(owner, repo, token);
    const tree = await this.readRepositoryTree(owner, repo, ref, true, undefined, token);
    const paths = tree.tree.map((item) => item.path);
    const analysis = await this.analyzeRepository(owner, repo, tree.ref, token);
    const deployHints = this.buildDeployHints(analysis, paths);

    try {
      const auditNotes = await this.auditCrossOriginAuth(owner, repo, tree.ref, paths, token);
      deployHints.notes.push(...auditNotes);
    } catch {
      // Fail-safe audit
    }

    return {
      repository,
      ref: tree.ref,
      defaultBranch: repository.default_branch,
      analysis,
      importantFiles: this.selectImportantFiles(paths),
      recommendedAgentWorkflow: [
        'Use repo_onboarding_summary before editing unfamiliar repositories.',
        'Use apply_code_patch when the user asks to save, commit, push, or update files on an existing branch.',
        'Use create_feature_branch_and_pr when the user asks to ship a change, open a PR, review changes, or avoid writing directly to main.',
        'Use prepare_deploy_plan when the user asks to deploy, dockerize, containerize, or identify build/start commands.',
        'Use setup_ci_deployment_gate after prepare_deploy_plan when the user asks to add GitHub Actions, run tests before deploy, or block deployment until CI passes.',
      ],
      deployHints,
    };
  }

  async applyCodePatch(
    owner: string,
    repo: string,
    branch: string,
    message: string,
    files: CommitFileInput[],
    token?: string,
  ): Promise<{
    branch: string;
    commit: { previousCommitSha: string; commitSha: string; treeSha: string };
    filesChanged: string[];
  }> {
    const commit = await this.commitMultipleFiles(owner, repo, branch, message, files, token);
    return {
      branch,
      commit: {
        previousCommitSha: commit.previousCommitSha,
        commitSha: commit.commitSha,
        treeSha: commit.treeSha,
      },
      filesChanged: files.map((file) => file.path),
    };
  }

  async createFeatureBranchAndPr(
    owner: string,
    repo: string,
    input: {
      base_branch: string;
      feature_branch?: string;
      title: string;
      body?: string;
      commit_message: string;
      files: CommitFileInput[];
      draft: boolean;
    },
    token?: string,
  ): Promise<{
    branch: { ref: string; sha: string; name: string };
    commit: { previousCommitSha: string; commitSha: string; treeSha: string };
    pullRequest: GitHubPullRequestSummary;
    filesChanged: string[];
  }> {
    const branchName = input.feature_branch ?? this.generateBranchName(input.title);
    const branch = await this.createBranch(owner, repo, branchName, `heads/${input.base_branch}`, token);
    const commit = await this.commitMultipleFiles(owner, repo, branchName, input.commit_message, input.files, token);
    const pullRequest = await this.createPullRequest(
      owner,
      repo,
      {
        title: input.title,
        head: branchName,
        base: input.base_branch,
        body: input.body,
        draft: input.draft,
      },
      token,
    );

    return {
      branch: {
        ref: branch.ref,
        sha: branch.sha,
        name: branchName,
      },
      commit,
      pullRequest,
      filesChanged: input.files.map((file) => file.path),
    };
  }

  async prepareDeployPlan(
    owner: string,
    repo: string,
    ref = 'HEAD',
    includeDockerFiles = true,
    token?: string,
  ): Promise<{
    repository: GitHubRepositorySummary;
    ref: string;
    analysis: RepositoryAnalysis;
    build: ReturnType<GitHubService['buildDeployHints']>;
    docker?: {
      recommended: boolean;
      reason: string;
      files: CommitFileInput[];
    };
  }> {
    const repository = await this.getRepository(owner, repo, token);
    const tree = await this.readRepositoryTree(owner, repo, ref, true, undefined, token);
    const paths = tree.tree.map((item) => item.path);
    const analysis = await this.analyzeRepository(owner, repo, tree.ref, token);
    const build = this.buildDeployHints(analysis, paths);

    return {
      repository,
      ref: tree.ref,
      analysis,
      build,
      docker: includeDockerFiles ? this.buildDockerFiles(analysis, paths) : undefined,
    };
  }

  async setupCiDeploymentGate(
    owner: string,
    repo: string,
    input: {
      base_branch: string;
      mode: 'preview' | 'commit' | 'pull_request';
      workflow_path: string;
      workflow_name: string;
      require_tests: boolean;
      include_docker_build: boolean;
      deployment_steps: string[];
      commit_message: string;
      pr_title: string;
      pr_body?: string;
    },
    token?: string,
  ): Promise<{
    mode: 'preview' | 'commit' | 'pull_request';
    workflowPath: string;
    analysis: RepositoryAnalysis;
    files: CommitFileInput[];
    gate: {
      testCommand?: string;
      buildCommand?: string;
      dockerBuildIncluded: boolean;
      deploymentRunsAfterTests: boolean;
      deploymentStepsConfigured: boolean;
    };
    commit?: { branch: string; previousCommitSha: string; commitSha: string; treeSha: string };
    pullRequest?: GitHubPullRequestSummary;
    nextDeploymentRule: string;
  }> {
    const tree = await this.readRepositoryTree(owner, repo, input.base_branch, true, undefined, token);
    const paths = tree.tree.map((item) => item.path);
    const fileContents = await this.readDeployRelevantFiles(owner, repo, tree.ref, paths, token);
    const analysis = this.repositoryAnalyzer.analyze(paths, fileContents);
    const deployHints = this.buildDeployHints(analysis, paths);
    const commands = this.inferCiCommands(analysis, paths, fileContents, deployHints);
    const docker = input.include_docker_build ? this.buildDockerFiles(analysis, paths) : undefined;
    const dockerFiles = docker?.recommended ? docker.files : [];
    const workflow = this.buildGitHubActionsWorkflow({
      workflowName: input.workflow_name,
      baseBranch: input.base_branch,
      requireTests: input.require_tests,
      packageManager: deployHints.packageManager,
      testCommand: commands.testCommand,
      buildCommand: commands.buildCommand,
      includeDockerBuild: input.include_docker_build,
      hasDockerfileAfterPatch: analysis.hasDockerfile || dockerFiles.some((file) => file.path === 'Dockerfile'),
      deploymentSteps: input.deployment_steps,
    });
    const files: CommitFileInput[] = [
      ...dockerFiles,
      {
        path: input.workflow_path,
        content: workflow,
        encoding: 'utf-8',
        mode: '100644',
      },
    ];

    let commit:
      | { branch: string; previousCommitSha: string; commitSha: string; treeSha: string }
      | undefined;
    let pullRequest: GitHubPullRequestSummary | undefined;

    if (input.mode === 'commit') {
      const result = await this.commitMultipleFiles(
        owner,
        repo,
        input.base_branch,
        input.commit_message,
        files,
        token,
      );
      commit = {
        branch: input.base_branch,
        previousCommitSha: result.previousCommitSha,
        commitSha: result.commitSha,
        treeSha: result.treeSha,
      };
    } else if (input.mode === 'pull_request') {
      const result = await this.createFeatureBranchAndPr(
        owner,
        repo,
        {
          base_branch: input.base_branch,
          title: input.pr_title,
          body:
            input.pr_body ??
            [
              'Adds a GitHub Actions CI deploy gate.',
              '',
              'Deployment steps run only after the test job succeeds.',
            ].join('\n'),
          commit_message: input.commit_message,
          files,
          draft: false,
        },
        token,
      );
      commit = {
        branch: result.branch.name,
        previousCommitSha: result.commit.previousCommitSha,
        commitSha: result.commit.commitSha,
        treeSha: result.commit.treeSha,
      };
      pullRequest = result.pullRequest;
    }

    return {
      mode: input.mode,
      workflowPath: input.workflow_path,
      analysis,
      files,
      gate: {
        testCommand: commands.testCommand,
        buildCommand: commands.buildCommand,
        dockerBuildIncluded: input.include_docker_build,
        deploymentRunsAfterTests: true,
        deploymentStepsConfigured: input.deployment_steps.length > 0,
      },
      commit,
      pullRequest,
      nextDeploymentRule:
        'Run deployment only after the GitHub Actions test job completes successfully for the pushed commit or pull request head SHA.',
    };
  }

  private async commitFiles(
    owner: string,
    repo: string,
    branch: string,
    message: string,
    files: CommitFileInput[],
    token?: string,
  ): Promise<{ branch: string; previousCommitSha: string; commitSha: string; treeSha: string }> {
    const headSha = await this.getRefSha(owner, repo, `heads/${branch}`, token);
    const headCommit = await this.request<{ tree: { sha: string } }>(
      `/repos/${owner}/${repo}/git/commits/${headSha}`,
      {
        method: 'GET',
        token,
      },
    );

    // Auto-filter unsafe files and bloated folders (like node_modules, .git, .env)
    const ignoredPatterns = ['node_modules/', '.git/'];
    const filteredFiles = files.filter((file) => {
      const lowerPath = file.path.toLowerCase();
      // Exclude raw local .env files but allow templates like .env.example
      if (lowerPath === '.env' || lowerPath.endsWith('/.env')) {
        return false;
      }
      return !ignoredPatterns.some((pattern) => 
        lowerPath.startsWith(pattern) || lowerPath.includes(`/${pattern}`)
      );
    });

    const treeEntries: Array<{ path: string; mode: string; type: 'blob'; sha: string }> = [];
    for (const file of filteredFiles) {
      const blob = await this.request<{ sha: string }>(`/repos/${owner}/${repo}/git/blobs`, {
        method: 'POST',
        token,
        body: {
          content: file.content,
          encoding: file.encoding === 'base64' ? 'base64' : 'utf-8',
        },
      });
      treeEntries.push({
        path: file.path,
        mode: file.mode,
        type: 'blob',
        sha: blob.sha,
      });
    }

    const tree = await this.request<{ sha: string }>(`/repos/${owner}/${repo}/git/trees`, {
      method: 'POST',
      token,
      body: {
        base_tree: headCommit.tree.sha,
        tree: treeEntries,
      },
    });

    const commit = await this.request<{ sha: string }>(`/repos/${owner}/${repo}/git/commits`, {
      method: 'POST',
      token,
      body: {
        message,
        tree: tree.sha,
        parents: [headSha],
      },
    });

    await this.request(`/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, {
      method: 'PATCH',
      token,
      body: { sha: commit.sha, force: false },
    });

    return {
      branch,
      previousCommitSha: headSha,
      commitSha: commit.sha,
      treeSha: tree.sha,
    };
  }

  private async getRefSha(owner: string, repo: string, ref: string, token?: string): Promise<string> {
    const normalizedRef = this.normalizeRef(ref);
    const branchRef = await this.request<{ object: { sha: string } }>(
      `/repos/${owner}/${repo}/git/ref/${encodeURIComponent(normalizedRef)}`,
      {
        method: 'GET',
        token,
      },
    );

    return branchRef.object.sha;
  }

  private async resolveReference(owner: string, repo: string, ref: string, token?: string): Promise<string> {
    if (ref !== 'HEAD') {
      return ref;
    }

    const repository = await this.getRepository(owner, repo, token);
    return repository.default_branch;
  }

  private normalizeRef(ref: string): string {
    const withoutPrefix = ref.startsWith('refs/') ? ref.slice(5) : ref;
    if (withoutPrefix.startsWith('heads/') || withoutPrefix.startsWith('tags/')) {
      return withoutPrefix;
    }

    return `heads/${withoutPrefix}`;
  }

  private resolveToken(token?: string): string {
    const explicitToken = token?.trim();
    if (explicitToken) {
      return explicitToken;
    }

    if (this.runtimeToken) {
      return this.runtimeToken;
    }

    const envToken = this.configService.get<string>('GITHUB_TOKEN');
    if (envToken) {
      return envToken;
    }

    throw new McpError(
      'No GitHub token available. Run authenticate_github with OAuth action="start" and action="poll".',
      'GITHUB_AUTH_REQUIRED',
      401,
    );
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const token = this.resolveToken(options.token);
    const url = new URL(`${this.baseUrl}${endpoint}`);

    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const response = await fetch(url.toString(), {
      method: options.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'github-deploy-agent',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (response.status === 204) {
      return undefined as T;
    }

    const rawBody = await response.text();
    const parsedBody = this.tryParseJson(rawBody);

    if (!response.ok) {
      const details: GitHubApiErrorDetails = {
        status: response.status,
        statusText: response.statusText,
        responseBody: parsedBody ?? rawBody,
      };

      throw new McpError(
        this.extractGitHubErrorMessage(details) ?? 'GitHub API request failed.',
        'GITHUB_API_ERROR',
        response.status,
        details,
      );
    }

    return (parsedBody as T) ?? (undefined as T);
  }

  private tryParseJson(value: string): unknown | undefined {
    if (!value) {
      return undefined;
    }
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return undefined;
    }
  }

  private extractGitHubErrorMessage(details: GitHubApiErrorDetails): string | undefined {
    if (
      details.responseBody &&
      typeof details.responseBody === 'object' &&
      details.responseBody !== null &&
      'message' in details.responseBody &&
      typeof (details.responseBody as { message?: unknown }).message === 'string'
    ) {
      return (details.responseBody as { message: string }).message;
    }

    return undefined;
  }

  private encodePath(path: string): string {
    return path
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
  }

  private getOAuthClientId(): string {
    const clientId =
      this.configService.get<string>('GITHUB_OAUTH_CLIENT_ID') ??
      this.configService.get<string>('GITHUB_CLIENT_ID');
    if (!clientId) {
      throw new McpError(
        'GitHub OAuth login requires GITHUB_OAUTH_CLIENT_ID.',
        'GITHUB_OAUTH_CLIENT_ID_REQUIRED',
        400,
      );
    }

    return clientId;
  }

  private getOAuthClientSecret(): string | undefined {
    return (
      this.configService.get<string>('GITHUB_OAUTH_CLIENT_SECRET') ??
      this.configService.get<string>('GITHUB_CLIENT_SECRET')
    );
  }

  private getBrowserRedirectUri(): string {
    const explicitRedirectUri = this.configService.get<string>('GITHUB_OAUTH_REDIRECT_URI');
    if (explicitRedirectUri) {
      return explicitRedirectUri;
    }

    const publicBaseUrl =
      this.configService.get<string>('RESOURCE_URI') ??
      this.configService.get<string>('NITROSTACK_PUBLIC_URL');
    if (!publicBaseUrl) {
      throw new McpError(
        'Browser GitHub login requires GITHUB_OAUTH_REDIRECT_URI, RESOURCE_URI, or NITROSTACK_PUBLIC_URL.',
        'GITHUB_BROWSER_AUTH_REDIRECT_URI_REQUIRED',
        400,
      );
    }

    return `${publicBaseUrl.replace(/\/$/, '')}/auth/github/callback`;
  }

  private selectImportantFiles(paths: string[]): string[] {
    const priority = [
      'package.json',
      'pnpm-lock.yaml',
      'package-lock.json',
      'yarn.lock',
      'bun.lockb',
      'requirements.txt',
      'pyproject.toml',
      'go.mod',
      'Cargo.toml',
      'Dockerfile',
      'docker-compose.yml',
      '.github/workflows',
      'README.md',
    ];

    return paths
      .filter((path) => priority.some((candidate) => path === candidate || path.startsWith(`${candidate}/`)))
      .slice(0, 40);
  }

  private async readDeployRelevantFiles(
    owner: string,
    repo: string,
    ref: string,
    paths: string[],
    token?: string,
  ): Promise<Record<string, string>> {
    const candidates = [
      'package.json',
      'requirements.txt',
      'pyproject.toml',
      'go.mod',
      'Cargo.toml',
    ];
    const fileContents: Record<string, string> = {};

    for (const path of candidates) {
      if (!paths.includes(path)) {
        continue;
      }

      try {
        const file = await this.readFile(owner, repo, path, ref, token);
        fileContents[path] = file.contentUtf8;
      } catch {
        // Best-effort analysis: missing or unreadable manifests should not block workflow generation.
      }
    }

    return fileContents;
  }

  private inferCiCommands(
    analysis: RepositoryAnalysis,
    paths: string[],
    fileContents: Record<string, string>,
    deployHints: ReturnType<GitHubService['buildDeployHints']>,
  ): {
    testCommand?: string;
    buildCommand?: string;
  } {
    const packageJson = this.parsePackageJson(fileContents['package.json']);
    if (packageJson) {
      const packageManager = deployHints.packageManager === 'unknown' ? 'npm' : deployHints.packageManager;
      const runner = this.packageRunner(packageManager);
      const hasUsableTestScript =
        typeof packageJson.scripts?.test === 'string' &&
        !packageJson.scripts.test.includes('no test specified') &&
        packageJson.scripts.test.trim().length > 0;
      return {
        testCommand: hasUsableTestScript ? `${runner} test` : undefined,
        buildCommand: typeof packageJson.scripts?.build === 'string' ? `${runner} run build` : deployHints.buildCommand,
      };
    }

    if (analysis.frameworks.includes('FastAPI') || analysis.languages.includes('Python')) {
      return {
        testCommand: paths.some((path) => path.startsWith('tests/')) ? 'python -m pytest' : undefined,
        buildCommand: undefined,
      };
    }

    if (analysis.languages.includes('Go')) {
      return {
        testCommand: 'go test ./...',
        buildCommand: 'go build ./...',
      };
    }

    if (analysis.languages.includes('Rust')) {
      return {
        testCommand: 'cargo test',
        buildCommand: 'cargo build --release',
      };
    }

    return {
      testCommand: undefined,
      buildCommand: deployHints.buildCommand,
    };
  }

  private buildGitHubActionsWorkflow(input: {
    workflowName: string;
    baseBranch: string;
    requireTests: boolean;
    packageManager: RepositoryAnalysis['packageManager'];
    testCommand?: string;
    buildCommand?: string;
    includeDockerBuild: boolean;
    hasDockerfileAfterPatch: boolean;
    deploymentSteps: string[];
  }): string {
    const testScript = input.testCommand
      ? input.testCommand
      : input.requireTests
        ? 'echo "No test command could be inferred. Add a test script before deployment." && exit 1'
        : 'echo "No test command inferred; continuing because require_tests=false."';
    const buildScript = input.buildCommand ?? 'echo "No build command inferred; skipping build."';
    const dockerScript =
      input.includeDockerBuild && input.hasDockerfileAfterPatch
        ? 'docker build -t app-under-test .'
        : 'echo "Docker build skipped because no Dockerfile is available."';
    const deploymentScript =
      input.deploymentSteps.length > 0
        ? input.deploymentSteps.join('\n          ')
        : 'echo "Tests passed. Add deployment commands here or call the next deployment MCP tool."';
    const nodeInstallScript = this.githubActionsNodeInstallScript(input.packageManager);

    return [
      `name: ${this.yamlQuote(input.workflowName)}`,
      '',
      'on:',
      '  push:',
      '    branches:',
      `      - ${this.yamlQuote(input.baseBranch)}`,
      '  pull_request:',
      '    branches:',
      `      - ${this.yamlQuote(input.baseBranch)}`,
      '  workflow_dispatch:',
      '',
      'jobs:',
      '  test:',
      '    name: Test and build',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - name: Checkout',
      '        uses: actions/checkout@v4',
      '',
      '      - name: Set up Node.js',
      '        if: ${{ hashFiles(\'package.json\') != \'\' }}',
      '        uses: actions/setup-node@v4',
      '        with:',
      '          node-version: 22',
      '',
      '      - name: Install Node dependencies',
      '        if: ${{ hashFiles(\'package.json\') != \'\' }}',
      '        run: |',
      `          ${nodeInstallScript}`,
      '',
      '      - name: Set up Python',
      '        if: ${{ hashFiles(\'requirements.txt\', \'pyproject.toml\') != \'\' }}',
      '        uses: actions/setup-python@v5',
      '        with:',
      '          python-version: "3.12"',
      '',
      '      - name: Install Python dependencies',
      '        if: ${{ hashFiles(\'requirements.txt\', \'pyproject.toml\') != \'\' }}',
      '        run: |',
      '          python -m pip install --upgrade pip',
      '          if [ -f requirements.txt ]; then pip install -r requirements.txt; fi',
      '          if [ -f pyproject.toml ]; then pip install .; fi',
      '',
      '      - name: Run tests',
      '        run: |',
      `          ${testScript}`,
      '',
      '      - name: Run build',
      '        run: |',
      `          ${buildScript}`,
      '',
      '      - name: Validate Docker image',
      '        run: |',
      `          ${dockerScript}`,
      '',
      '  deploy_ready:',
      '    name: Deployment gate',
      '    runs-on: ubuntu-latest',
      '    needs: test',
      '    if: ${{ needs.test.result == \'success\' }}',
      '    steps:',
      '      - name: Deployment steps gated by tests',
      '        run: |',
      `          ${deploymentScript}`,
      '',
    ].join('\n');
  }

  private buildDeployHints(
    analysis: RepositoryAnalysis,
    paths: string[],
  ): {
    likelyRuntime: string;
    packageManager: RepositoryAnalysis['packageManager'];
    installCommand?: string;
    buildCommand?: string;
    startCommand?: string;
    dockerfilePath: string;
    notes: string[];
  } {
    const hasPath = (path: string): boolean => paths.includes(path);
    const notes: string[] = [];

    if (analysis.frameworks.includes('Next.js')) {
      const packageManager = analysis.packageManager === 'unknown' ? 'npm' : analysis.packageManager;
      return {
        likelyRuntime: 'node',
        packageManager,
        installCommand: this.packageInstallCommand(packageManager, this.hasPackageLockfile(packageManager, paths)),
        buildCommand: `${this.packageRunner(packageManager)} run build`,
        startCommand: `${this.packageRunner(packageManager)} run start`,
        dockerfilePath: 'Dockerfile',
        notes: [
          'Detected Next.js. Ensure package.json has build and start scripts.',
          ...notes,
        ],
      };
    }

    if (analysis.languages.includes('Node')) {
      const packageManager = analysis.packageManager === 'unknown' ? 'npm' : analysis.packageManager;
      return {
        likelyRuntime: 'node',
        packageManager,
        installCommand: this.packageInstallCommand(packageManager, this.hasPackageLockfile(packageManager, paths)),
        buildCommand: hasPath('tsconfig.json') ? `${this.packageRunner(packageManager)} run build` : undefined,
        startCommand: `${this.packageRunner(packageManager)} start`,
        dockerfilePath: 'Dockerfile',
        notes: [
          'Detected Node.js. Confirm package.json scripts before deploying.',
          ...notes,
        ],
      };
    }

    if (analysis.frameworks.includes('FastAPI')) {
      return {
        likelyRuntime: 'python',
        packageManager: analysis.packageManager,
        installCommand: hasPath('requirements.txt') ? 'pip install -r requirements.txt' : 'pip install .',
        startCommand: 'uvicorn main:app --host 0.0.0.0 --port 8000',
        dockerfilePath: 'Dockerfile',
        notes: ['Detected FastAPI. Adjust module path if the app is not main:app.'],
      };
    }

    if (analysis.languages.includes('Python')) {
      return {
        likelyRuntime: 'python',
        packageManager: analysis.packageManager,
        installCommand: hasPath('requirements.txt') ? 'pip install -r requirements.txt' : 'pip install .',
        startCommand: 'python main.py',
        dockerfilePath: 'Dockerfile',
        notes: ['Detected Python. Confirm entry point before deploying.'],
      };
    }

    return {
      likelyRuntime: 'unknown',
      packageManager: analysis.packageManager,
      dockerfilePath: 'Dockerfile',
      notes: ['Unable to infer a complete deploy command set. Ask for entry point or inspect README/package files.'],
    };
  }

  private buildDockerFiles(
    analysis: RepositoryAnalysis,
    paths: string[],
  ): {
    recommended: boolean;
    reason: string;
    files: CommitFileInput[];
  } {
    if (analysis.hasDockerfile) {
      return {
        recommended: false,
        reason: 'Repository already contains a Dockerfile.',
        files: [],
      };
    }

    const hints = this.buildDeployHints(analysis, paths);
    if (hints.likelyRuntime === 'node') {
      const packageManager = hints.packageManager === 'unknown' ? 'npm' : hints.packageManager;
      const lockfile = this.lockfileForPackageManager(packageManager);
      const hasLockfile = lockfile ? paths.includes(lockfile) : false;
      const installCommand = this.packageInstallCommand(packageManager, hasLockfile);
      const buildCommand = hints.buildCommand;
      const startCommand = hints.startCommand ?? `${this.packageRunner(packageManager)} start`;
      const copyLockfile = hasLockfile && lockfile ? `COPY package.json ${lockfile} ./` : 'COPY package.json ./';

      return {
        recommended: true,
        reason: 'Generated a production Node.js Dockerfile from detected package metadata.',
        files: [
          {
            path: 'Dockerfile',
            encoding: 'utf-8',
            mode: '100644',
            content: [
              'FROM node:22-alpine AS deps',
              'WORKDIR /app',
              copyLockfile,
              `RUN ${installCommand}`,
              '',
              'FROM node:22-alpine AS builder',
              'WORKDIR /app',
              'COPY --from=deps /app/node_modules ./node_modules',
              'COPY . .',
              buildCommand ? `RUN ${buildCommand}` : '# No build command inferred',
              '',
              'FROM node:22-alpine AS runner',
              'WORKDIR /app',
              'ENV NODE_ENV=production',
              'COPY --from=builder /app .',
              'EXPOSE 3000',
              `CMD ${JSON.stringify(startCommand.split(' '))}`,
              '',
            ].join('\n'),
          },
          {
            path: '.dockerignore',
            encoding: 'utf-8',
            mode: '100644',
            content: ['node_modules', 'dist', '.next/cache', '.git', '.env', 'npm-debug.log*', ''].join('\n'),
          },
        ],
      };
    }

    if (hints.likelyRuntime === 'python') {
      const installCommand = hints.installCommand ?? 'pip install .';
      const startCommand = hints.startCommand ?? 'python main.py';
      return {
        recommended: true,
        reason: 'Generated a Python Dockerfile from detected Python project files.',
        files: [
          {
            path: 'Dockerfile',
            encoding: 'utf-8',
            mode: '100644',
            content: [
              'FROM python:3.12-slim',
              'WORKDIR /app',
              'ENV PYTHONDONTWRITEBYTECODE=1',
              'ENV PYTHONUNBUFFERED=1',
              'COPY . .',
              `RUN ${installCommand}`,
              'EXPOSE 8000',
              `CMD ${JSON.stringify(startCommand.split(' '))}`,
              '',
            ].join('\n'),
          },
          {
            path: '.dockerignore',
            encoding: 'utf-8',
            mode: '100644',
            content: ['__pycache__', '*.pyc', '.venv', '.git', '.env', ''].join('\n'),
          },
        ],
      };
    }

    return {
      recommended: false,
      reason: 'Dockerfile generation needs a recognized Node.js or Python stack.',
      files: [],
    };
  }

  private packageRunner(packageManager: RepositoryAnalysis['packageManager']): string {
    if (packageManager === 'pnpm') return 'pnpm';
    if (packageManager === 'yarn') return 'yarn';
    if (packageManager === 'bun') return 'bun';
    return 'npm';
  }

  private packageInstallCommand(packageManager: RepositoryAnalysis['packageManager'], hasLockfile = true): string {
    if (packageManager === 'pnpm') return hasLockfile ? 'pnpm install --frozen-lockfile' : 'pnpm install';
    if (packageManager === 'yarn') return hasLockfile ? 'yarn install --frozen-lockfile' : 'yarn install';
    if (packageManager === 'bun') return hasLockfile ? 'bun install --frozen-lockfile' : 'bun install';
    return hasLockfile ? 'npm ci' : 'npm install';
  }

  private lockfileForPackageManager(packageManager: RepositoryAnalysis['packageManager']): string | undefined {
    if (packageManager === 'pnpm') return 'pnpm-lock.yaml';
    if (packageManager === 'yarn') return 'yarn.lock';
    if (packageManager === 'bun') return 'bun.lockb';
    if (packageManager === 'npm') return 'package-lock.json';
    return undefined;
  }

  private hasPackageLockfile(packageManager: RepositoryAnalysis['packageManager'], paths: string[]): boolean {
    const lockfile = this.lockfileForPackageManager(packageManager);
    return lockfile ? paths.includes(lockfile) : false;
  }

  private generateBranchName(title: string): string {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'agent-change';
    return `agent/${slug}-${Date.now().toString(36)}`;
  }

  private parsePackageJson(value?: string): { scripts?: Record<string, string> } | undefined {
    if (!value) {
      return undefined;
    }

    try {
      return JSON.parse(value) as { scripts?: Record<string, string> };
    } catch {
      return undefined;
    }
  }

  private yamlQuote(value: string): string {
    return JSON.stringify(value);
  }

  private githubActionsNodeInstallScript(packageManager: RepositoryAnalysis['packageManager']): string {
    if (packageManager === 'pnpm') {
      return [
        'corepack enable',
        'if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; else pnpm install; fi',
      ].join('\n          ');
    }

    if (packageManager === 'yarn') {
      return [
        'corepack enable',
        'if [ -f yarn.lock ]; then yarn install --frozen-lockfile; else yarn install; fi',
      ].join('\n          ');
    }

    if (packageManager === 'bun') {
      return [
        'curl -fsSL https://bun.sh/install | bash',
        'export PATH="$HOME/.bun/bin:$PATH"',
        'if [ -f bun.lockb ] || [ -f bun.lock ]; then bun install --frozen-lockfile; else bun install; fi',
      ].join('\n          ');
    }

    return 'if [ -f package-lock.json ]; then npm ci; else npm install; fi';
  }

  private async requestOAuthForm<T>(
    endpoint: string,
    payload: Record<string, string>,
  ): Promise<T> {
    const url = `${this.oauthBaseUrl}${endpoint}`;
    const body = new URLSearchParams(payload);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'github-deploy-agent',
      },
      body: body.toString(),
    });

    const rawBody = await response.text();
    const parsedBody = this.tryParseJson(rawBody);

    if (!response.ok) {
      throw new McpError(
        'GitHub OAuth request failed.',
        'GITHUB_OAUTH_HTTP_ERROR',
        response.status,
        {
          status: response.status,
          statusText: response.statusText,
          responseBody: parsedBody ?? rawBody,
        },
      );
    }

    return parsedBody as T;
  }

  private async auditCrossOriginAuth(
    owner: string,
    repo: string,
    ref: string,
    paths: string[],
    token?: string,
  ): Promise<string[]> {
    const auditNotes: string[] = [];

    const clientCandidates = paths.filter(p => {
      const lower = p.toLowerCase();
      return (lower.includes('apislice') || lower.includes('slices/api') || lower.includes('utils/api') || lower.endsWith('apiclient.ts') || lower.endsWith('apiclient.js')) && 
             (lower.endsWith('.js') || lower.endsWith('.ts') || lower.endsWith('.tsx') || lower.endsWith('.jsx'));
    });

    const serverCandidates = paths.filter(p => {
      const lower = p.toLowerCase();
      return (lower.endsWith('server.js') || lower.endsWith('server.ts') || lower.endsWith('app.js') || lower.endsWith('app.ts') || lower.includes('cors'));
    });

    for (const p of clientCandidates) {
      try {
        const file = await this.readFile(owner, repo, p, ref, token);
        const content = file.contentUtf8;
        
        if ((content.includes('createApi') || content.includes('fetchBaseQuery') || content.includes('axios')) && 
            !content.includes("credentials: 'include'") && 
            !content.includes('credentials: "include"') && 
            !content.includes('withCredentials: true')) {
          auditNotes.push(
            `[CORS/AUTH AUDIT]: Checked ${p}. It looks like a frontend API client but is missing "credentials: 'include'" or "withCredentials: true". Cross-domain cookie authentication (e.g. JWT logins) will fail in production between Vercel and Render unless this is enabled.`
          );
        }
      } catch {
        // Ignore read failures
      }
    }

    for (const p of serverCandidates) {
      try {
        const file = await this.readFile(owner, repo, p, ref, token);
        const content = file.contentUtf8;

        if (content.includes('cors(') || content.includes('corsOption')) {
          if (content.includes("origin: '*'") || content.includes('origin: "*"')) {
            auditNotes.push(
              `[CORS/AUTH AUDIT]: Checked ${p}. It has CORS configured with a wildcard origin ('*'). Wildcards are NOT compatible with cross-origin cookie credentials. Ensure your backend CORS configuration resolves origin dynamically.`
            );
          }
        }
      } catch {
        // Ignore read failures
      }
    }

    return auditNotes;
  }

  async runSecurityScan(
    owner: string,
    repo: string,
    ref = 'HEAD',
    token?: string,
  ): Promise<{
    hasLeakedSecrets: boolean;
    findings: Array<{
      file: string;
      type: 'critical' | 'warning';
      description: string;
      snippet?: string;
    }>;
  }> {
    const tree = await this.readRepositoryTree(owner, repo, ref, true, undefined, token);
    const paths = tree.tree.map((item) => item.path);
    const findings: Array<{ file: string; type: 'critical' | 'warning'; description: string; snippet?: string }> = [];

    const forbiddenFiles = ['.env', '.pem', 'key.json', 'id_rsa', 'id_dsa', 'credentials.json'];
    for (const p of paths) {
      const lower = p.toLowerCase();
      for (const forbidden of forbiddenFiles) {
        if (lower === forbidden || lower.endsWith(`/${forbidden}`)) {
          findings.push({
            file: p,
            type: 'critical',
            description: `Leaked Configuration File: Private configuration or key file '${forbidden}' has been committed to Git. Remove this immediately!`,
          });
        }
      }
    }

    const scanCandidates = paths.filter(p => {
      const lower = p.toLowerCase();
      return lower.endsWith('.js') || lower.endsWith('.ts') || lower.endsWith('.tsx') || lower.endsWith('.jsx') || lower.endsWith('.json') || lower.endsWith('.yaml') || lower.endsWith('.yml');
    }).slice(0, 15);

    const secretRegexes = [
      { name: 'GitHub Token', regex: /ghp_[A-Za-z0-9_]{36,255}/g, type: 'critical' as const },
      { name: 'Vercel Token', regex: /vcp_[A-Za-z0-9_]{20,64}/g, type: 'critical' as const },
      { name: 'Render Token', regex: /rnd_[A-Za-z0-9_]{20,64}/g, type: 'critical' as const },
      { name: 'MongoDB URI Connection String', regex: /mongodb\+srv:\/\/[A-Za-z0-9_]+:[A-Za-z0-9_]+@/g, type: 'critical' as const },
      { name: 'Generic Password String', regex: /(password|secret|private_key)\s*[:=]\s*['"][a-zA-Z0-9_\-+=@#$!%^&*()]{8,}['"]/gi, type: 'warning' as const },
    ];

    for (const p of scanCandidates) {
      try {
        const file = await this.readFile(owner, repo, p, ref, token);
        const content = file.contentUtf8;

        for (const { name, regex, type } of secretRegexes) {
          const matches = content.match(regex);
          if (matches) {
            findings.push({
              file: p,
              type,
              description: `Potential Leaked ${name}: Found hardcoded pattern match.`,
              snippet: matches.map(m => m.slice(0, 8) + '...').join(', '),
            });
          }
        }
      } catch {
        // Ignore read failures during search
      }
    }

    return {
      hasLeakedSecrets: findings.some(f => f.type === 'critical'),
      findings,
    };
  }

  async getDeployReadinessScore(
    owner: string,
    repo: string,
    ref = 'HEAD',
    token?: string,
  ): Promise<{
    score: number;
    checklist: Array<{
      item: string;
      passed: boolean;
      impactPoints: number;
      description: string;
    }>;
  }> {
    const tree = await this.readRepositoryTree(owner, repo, ref, true, undefined, token);
    const paths = tree.tree.map((item) => item.path);
    const lowerPaths = paths.map(p => p.toLowerCase());

    const hasPath = (name: string): boolean => lowerPaths.some(p => p === name || p.endsWith(`/${name}`));

    const checklist: Array<{ item: string; passed: boolean; impactPoints: number; description: string }> = [];

    const hasReadme = hasPath('readme.md');
    checklist.push({
      item: 'README.md',
      passed: hasReadme,
      impactPoints: 15,
      description: 'Documentation manifest describing repository setup and deployment parameters.',
    });

    const hasDockerfile = hasPath('dockerfile');
    checklist.push({
      item: 'Dockerfile',
      passed: hasDockerfile,
      impactPoints: 15,
      description: 'Infrastructure image builder file for containerized cloud deployment.',
    });

    const hasEnvExample = hasPath('.env.example');
    checklist.push({
      item: '.env.example',
      passed: hasEnvExample,
      impactPoints: 15,
      description: 'Template configuration file mapping required environment keys.',
    });

    const hasGitignore = hasPath('.gitignore');
    checklist.push({
      item: '.gitignore',
      passed: hasGitignore,
      impactPoints: 20,
      description: 'Exclusion filter preventing build artifacts and secrets from being committed to Git.',
    });

    let hasTests = lowerPaths.some(p => p.includes('.test.') || p.includes('.spec.'));
    if (!hasTests && hasPath('package.json')) {
      try {
        const file = await this.readFile(owner, repo, 'package.json', ref, token);
        const pkg = JSON.parse(file.contentUtf8);
        if (pkg.scripts && pkg.scripts.test && !pkg.scripts.test.includes('no test specified')) {
          hasTests = true;
        }
      } catch {}
    }
    checklist.push({
      item: 'Tests configured',
      passed: hasTests,
      impactPoints: 20,
      description: 'Existence of unit test configurations or scripts inside the repository.',
    });

    let hasHealth = lowerPaths.some(p => p.includes('health') || p.includes('status'));
    if (!hasHealth) {
      const entrypoint = lowerPaths.find(p => p.endsWith('server.js') || p.endsWith('server.ts') || p.endsWith('app.js') || p.endsWith('app.ts'));
      if (entrypoint) {
        try {
          const file = await this.readFile(owner, repo, entrypoint, ref, token);
          const content = file.contentUtf8.toLowerCase();
          if (content.includes('/health') || content.includes('/healthz') || content.includes('/status')) {
            hasHealth = true;
          }
        } catch {}
      }
    }
    checklist.push({
      item: 'Health endpoint check',
      passed: hasHealth,
      impactPoints: 15,
      description: 'Routing configuration for live ping/health checks (/health or /status) inside source code.',
    });

    let score = 100;
    for (const item of checklist) {
      if (!item.passed) {
        score -= item.impactPoints;
      }
    }
    score = Math.max(0, score);

    return {
      score,
      checklist,
    };
  }
}
