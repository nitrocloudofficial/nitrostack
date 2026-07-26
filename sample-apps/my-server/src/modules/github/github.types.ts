import { z } from '@nitrostack/core';

/**
 * Shared metadata for all GitHub MCP tool responses.
 */
export const responseMetaSchema = z.object({
  requestId: z.string().optional(),
  timestamp: z.string(),
  source: z.literal('github-deploy-agent'),
});

/**
 * Standard tool response wrapper used across GitHub tools.
 */
export const toolResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema,
    meta: responseMetaSchema,
  });

/**
 * Error shape returned by tool exception filters.
 */
export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
  meta: responseMetaSchema,
});

/**
 * File payload for commit creation tools.
 */
export const commitFileSchema = z.object({
  path: z.string().min(1).describe('Repository-relative file path'),
  content: z.string().describe('File content as UTF-8 text or base64'),
  encoding: z.enum(['utf-8', 'base64']).default('utf-8'),
  mode: z.enum(['100644', '100755']).default('100644'),
});

export type CommitFileInput = z.infer<typeof commitFileSchema>;

/**
 * Tool input schemas
 */
export const authenticateGithubInputSchema = z.object({
  action: z
    .enum(['start', 'poll', 'browser_start', 'browser_poll', 'pat'])
    .default('start')
    .describe('Authentication action. Use browser_start/browser_poll for redirect login, or start/poll for device login.'),
  device_code: z
    .string()
    .optional()
    .describe('Device code returned by authenticate_github(action="start").'),
  state: z
    .string()
    .optional()
    .describe('Browser OAuth state returned by authenticate_github(action="browser_start").'),
  redirect_uri: z
    .string()
    .url()
    .optional()
    .describe('Optional GitHub OAuth callback URL override for browser_start.'),
  token: z
    .string()
    .min(20)
    .optional()
    .describe('Optional PAT fallback (not required for interactive OAuth device flow).'),
});

export const listRepositoriesInputSchema = z.object({
  visibility: z.enum(['all', 'public', 'private']).default('all'),
  affiliation: z
    .string()
    .default('owner,collaborator,organization_member')
    .describe('GitHub repository affiliation filter'),
  sort: z.enum(['created', 'updated', 'pushed', 'full_name']).default('updated'),
  direction: z.enum(['asc', 'desc']).default('desc'),
  per_page: z.number().int().min(1).max(100).default(30),
  page: z.number().int().min(1).default(1),
});

export const createRepositoryInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  private: z.boolean().default(false),
  auto_init: z.boolean().default(true),
  gitignore_template: z.string().optional(),
  license_template: z.string().optional(),
});

export const getRepositoryInputSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
});

export const listCommitHistoryInputSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  sha: z.string().optional().describe('Branch, tag, or commit SHA to start from'),
  path: z.string().optional().describe('Filter commits affecting a specific path'),
  per_page: z.number().int().min(1).max(100).default(30),
  page: z.number().int().min(1).default(1),
});

export const readRepositoryTreeInputSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  ref: z.string().default('HEAD'),
  recursive: z.boolean().default(true),
  path: z.string().optional().describe('Optional path prefix to filter tree items'),
});

export const readFileInputSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  path: z.string().min(1),
  ref: z.string().optional(),
});

export const readDirectoryInputSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  path: z.string().default(''),
  ref: z.string().optional(),
});

export const searchRepositoryInputSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  query: z.string().min(1),
  path: z.string().optional(),
  language: z.string().optional(),
  per_page: z.number().int().min(1).max(100).default(20),
  page: z.number().int().min(1).default(1),
});

export const createBranchInputSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  branch: z.string().min(1).describe('Branch name without refs/heads/ prefix'),
  from_ref: z
    .string()
    .default('heads/main')
    .describe('Base ref used to create the branch, e.g. heads/main'),
});

export const deleteBranchInputSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  branch: z.string().min(1).describe('Branch name without refs/heads/ prefix'),
});

export const createCommitInputSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  branch: z.string().min(1),
  message: z.string().min(1),
  file_path: z.string().min(1),
  content: z.string().min(1),
  encoding: z.enum(['utf-8', 'base64']).default('utf-8'),
});

export const commitMultipleFilesInputSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  branch: z.string().min(1),
  message: z.string().min(1),
  files: z.array(commitFileSchema).min(1),
});

export const pushChangesInputSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  branch: z.string().min(1),
  commit_sha: z.string().length(40),
  force: z.boolean().default(false),
});

export const createPullRequestInputSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  title: z.string().min(1),
  head: z.string().min(1).describe('Source branch'),
  base: z.string().min(1).describe('Target branch'),
  body: z.string().optional(),
  draft: z.boolean().default(false),
});

export const listPullRequestsInputSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  state: z.enum(['open', 'closed', 'all']).default('open'),
  head: z.string().optional(),
  base: z.string().optional(),
  sort: z.enum(['created', 'updated', 'popularity', 'long-running']).default('created'),
  direction: z.enum(['asc', 'desc']).default('desc'),
  per_page: z.number().int().min(1).max(100).default(30),
  page: z.number().int().min(1).default(1),
});

export const mergePullRequestInputSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  pull_number: z.number().int().positive(),
  commit_title: z.string().optional(),
  commit_message: z.string().optional(),
  merge_method: z.enum(['merge', 'squash', 'rebase']).default('merge'),
});

export const repoOnboardingSummaryInputSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  ref: z.string().default('HEAD'),
});

export const applyCodePatchInputSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  branch: z.string().min(1).describe('Target branch to update, e.g. main or a feature branch'),
  message: z.string().min(1).describe('Commit message for the code patch'),
  files: z.array(commitFileSchema).min(1).describe('All files to create or update in one commit'),
});

export const createFeatureBranchAndPrInputSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  base_branch: z.string().default('main').describe('Branch to create the feature branch from'),
  feature_branch: z
    .string()
    .optional()
    .describe('Optional feature branch name. If omitted, one is generated from the PR title.'),
  title: z.string().min(1).describe('Pull request title'),
  body: z.string().optional().describe('Pull request body'),
  commit_message: z.string().min(1).describe('Commit message for all file changes'),
  files: z.array(commitFileSchema).min(1).describe('All files to create or update in the feature branch'),
  draft: z.boolean().default(false),
});

export const prepareDeployPlanInputSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  ref: z.string().default('HEAD'),
  include_docker_files: z
    .boolean()
    .default(true)
    .describe('When true, return Dockerfile and .dockerignore content that can be committed.'),
});

export const setupCiDeploymentGateInputSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  base_branch: z.string().default('main').describe('Branch the workflow should protect and run against'),
  mode: z
    .enum(['preview', 'commit', 'pull_request'])
    .default('pull_request')
    .describe('preview returns files only, commit writes to base_branch, pull_request creates a branch and PR'),
  workflow_path: z
    .string()
    .default('.github/workflows/ci-deploy-gate.yml')
    .describe('Repository path for the generated GitHub Actions workflow'),
  workflow_name: z.string().default('CI Deploy Gate'),
  require_tests: z
    .boolean()
    .default(true)
    .describe('When true, generated workflow fails if no test command can be inferred.'),
  include_docker_build: z
    .boolean()
    .default(true)
    .describe('When true, include Dockerfile generation/checks and docker build validation.'),
  deployment_steps: z
    .array(z.string().min(1))
    .default([])
    .describe('Optional shell commands for deployment. They run only after the test job succeeds.'),
  commit_message: z.string().default('Add CI deploy gate workflow'),
  pr_title: z.string().default('Add CI deploy gate workflow'),
  pr_body: z.string().optional(),
});

/**
 * Repository analyzer output schema.
 */
export const repositoryAnalysisSchema = z.object({
  frameworks: z.array(z.string()),
  languages: z.array(z.string()),
  packageManager: z.enum(['npm', 'pnpm', 'yarn', 'bun', 'pip', 'poetry', 'unknown']),
  hasDockerfile: z.boolean(),
  hasGitHubActions: z.boolean(),
  signals: z.array(
    z.object({
      type: z.string(),
      path: z.string(),
      reason: z.string(),
    }),
  ),
});

export type RepositoryAnalysis = z.infer<typeof repositoryAnalysisSchema>;

/**
 * Tool metadata descriptors used by all GitHub tools.
 */
export const githubToolMetadata = {
  authenticate_github: {
    category: 'github-auth',
    tags: ['github', 'authentication', 'pat'],
  },
  list_repositories: {
    category: 'github-repositories',
    tags: ['github', 'repositories', 'list'],
  },
  create_repository: {
    category: 'github-repositories',
    tags: ['github', 'repositories', 'create'],
  },
  get_repository: {
    category: 'github-repositories',
    tags: ['github', 'repositories', 'details'],
  },
  list_commit_history: {
    category: 'github-commits',
    tags: ['github', 'commit', 'history'],
  },
  read_repository_tree: {
    category: 'github-content',
    tags: ['github', 'tree', 'filesystem'],
  },
  read_file: {
    category: 'github-content',
    tags: ['github', 'file', 'contents'],
  },
  read_directory: {
    category: 'github-content',
    tags: ['github', 'directory', 'contents'],
  },
  search_repository: {
    category: 'github-search',
    tags: ['github', 'search', 'code'],
  },
  create_branch: {
    category: 'github-branches',
    tags: ['github', 'branch', 'create'],
  },
  delete_branch: {
    category: 'github-branches',
    tags: ['github', 'branch', 'delete'],
  },
  create_commit: {
    category: 'github-commits',
    tags: ['github', 'commit', 'single-file'],
  },
  commit_multiple_files: {
    category: 'github-commits',
    tags: ['github', 'commit', 'multi-file'],
  },
  push_changes: {
    category: 'github-commits',
    tags: ['github', 'push', 'ref-update'],
  },
  create_pull_request: {
    category: 'github-pull-requests',
    tags: ['github', 'pull-request', 'create'],
  },
  list_pull_requests: {
    category: 'github-pull-requests',
    tags: ['github', 'pull-request', 'list'],
  },
  merge_pull_request: {
    category: 'github-pull-requests',
    tags: ['github', 'pull-request', 'merge'],
  },
  repo_onboarding_summary: {
    category: 'github-workflows',
    tags: ['github', 'repository', 'onboarding', 'tech-stack', 'agent-first'],
  },
  apply_code_patch: {
    category: 'github-workflows',
    tags: ['github', 'code', 'commit', 'push', 'agent-first'],
  },
  create_feature_branch_and_pr: {
    category: 'github-workflows',
    tags: ['github', 'code', 'branch', 'commit', 'pull-request', 'agent-first'],
  },
  prepare_deploy_plan: {
    category: 'github-workflows',
    tags: ['github', 'deploy', 'docker', 'tech-stack', 'agent-first'],
  },
  setup_ci_deployment_gate: {
    category: 'github-workflows',
    tags: ['github', 'actions', 'ci', 'tests', 'deploy-gate', 'agent-first'],
  },
};

/**
 * GitHub API primitives used by service and tools.
 */
export interface GitHubUser {
  login: string;
  id: number;
  html_url: string;
  name?: string | null;
}

export interface GitHubRepositorySummary {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  pushed_at: string;
}

export interface GitHubTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree' | string;
  sha: string;
  size?: number;
  url: string;
}

export interface GitHubPullRequestSummary {
  id: number;
  number: number;
  state: 'open' | 'closed';
  title: string;
  body: string | null;
  html_url: string;
  user: {
    login: string;
  };
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
  draft?: boolean;
  merged_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GitHubCommitSummary {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
    committer: {
      name: string;
      email: string;
      date: string;
    };
  };
  author: {
    login: string;
    id: number;
    html_url: string;
  } | null;
  committer: {
    login: string;
    id: number;
    html_url: string;
  } | null;
}

export interface GitHubApiErrorDetails {
  status: number;
  statusText: string;
  responseBody?: unknown;
}
