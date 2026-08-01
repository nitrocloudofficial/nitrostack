import { ToolDecorator as Tool, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { GitHubService } from './github.service.js';

const RepoTreeSchema = z.object({
  owner: z.string().describe('Repository owner (user or org)'),
  repo: z.string().describe('Repository name'),
  branch: z.string().default('main').describe('Branch name (default: main)'),
  github_token: z.string().optional().describe('Optional GitHub OAuth access token for authentication'),
});

const FileContentSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  path: z.string().describe('File path relative to repo root'),
  branch: z.string().default('main').describe('Branch name (default: main)'),
  github_token: z.string().optional().describe('Optional GitHub OAuth access token for authentication'),
});

const DirContentsSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  path: z.string().describe('Directory path relative to repo root'),
  branch: z.string().default('main').describe('Branch name (default: main)'),
  github_token: z.string().optional().describe('Optional GitHub OAuth access token for authentication'),
});

const PrSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  pr_number: z.number().describe('Pull Request number'),
  github_token: z.string().optional().describe('Optional GitHub OAuth access token for authentication'),
});

const CommitsSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  branch: z.string().default('main').describe('Branch name (default: main)'),
  count: z.number().default(10).describe('Number of commits to fetch (default: 10)'),
  github_token: z.string().optional().describe('Optional GitHub OAuth access token for authentication'),
});

@Injectable({ deps: [GitHubService] })
export class GitHubTools {
  constructor(private readonly github: GitHubService) {}

  @Tool({
    name: 'get_repo_tree',
    description: 'Fetches the full file tree of a GitHub repository. Returns all file and directory paths. Use this to understand repository structure before fetching specific files.',
    inputSchema: RepoTreeSchema,
  })
  async getRepoTree(input: z.infer<typeof RepoTreeSchema>, ctx: ExecutionContext) {
    return this.github.getRepoTree(input.owner, input.repo, input.branch, input.github_token);
  }

  @Tool({
    name: 'get_file_content',
    description: 'Fetches the content of a specific file from a GitHub repository. Use this to read source code, configuration files, or documentation.',
    inputSchema: FileContentSchema,
  })
  async getFileContent(input: z.infer<typeof FileContentSchema>, ctx: ExecutionContext) {
    return this.github.getFileContent(input.owner, input.repo, input.path, input.branch, input.github_token);
  }

  @Tool({
    name: 'get_directory_contents',
    description: 'Lists the contents of a specific directory in a GitHub repository. Returns file names, types, and sizes.',
    inputSchema: DirContentsSchema,
  })
  async getDirectoryContents(input: z.infer<typeof DirContentsSchema>, ctx: ExecutionContext) {
    return this.github.getDirectoryContents(input.owner, input.repo, input.path, input.branch, input.github_token);
  }

  @Tool({
    name: 'get_pr_diff',
    description: 'Fetches the complete unified diff of a Pull Request. Use this to review code changes.',
    inputSchema: PrSchema,
  })
  async getPrDiff(input: z.infer<typeof PrSchema>, ctx: ExecutionContext) {
    return this.github.getPrDiff(input.owner, input.repo, input.pr_number, input.github_token);
  }

  @Tool({
    name: 'get_pr_files',
    description: 'Fetches the list of files changed in a Pull Request, including status (added, modified, deleted) and patch snippets.',
    inputSchema: PrSchema,
  })
  async getPrFiles(input: z.infer<typeof PrSchema>, ctx: ExecutionContext) {
    return this.github.getPrFiles(input.owner, input.repo, input.pr_number, input.github_token);
  }

  @Tool({
    name: 'get_recent_commits',
    description: 'Fetches recent commits from a GitHub repository branch. Use this to understand recent development activity.',
    inputSchema: CommitsSchema,
  })
  async getRecentCommits(input: z.infer<typeof CommitsSchema>, ctx: ExecutionContext) {
    return this.github.getRecentCommits(input.owner, input.repo, input.branch, input.count, input.github_token);
  }
}
