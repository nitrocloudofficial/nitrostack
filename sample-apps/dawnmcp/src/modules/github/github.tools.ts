import {
  ControllerDecorator as Controller,
  ToolDecorator as Tool,
  ExecutionContext,
  z,
} from '@nitrostack/core';
import { GithubService } from './github.service.js';

/**
 * GitHub MCP Tools
 *
 * Provides GitHub repository search, file reading, cloning, and issue creation tools.
 */
@Controller('github')
export class GithubTools {
  constructor(private readonly githubService: GithubService) {}

  @Tool({
    name: 'search_repository',
    description: 'Search GitHub repositories by query string.',
    inputSchema: z.object({
      query: z.string().min(1).describe('Search query (e.g. "language:typescript mcp").'),
      limit: z.number().int().min(1).max(30).default(10).describe('Maximum results to return.'),
    }),
  })
  async searchRepository(input: { query: string; limit?: number }, ctx: ExecutionContext) {
    ctx.logger.info('Searching GitHub repos', { query: input.query });

    try {
      const results = await this.githubService.searchRepositories(input.query, input.limit ?? 10);
      return { success: true, count: results.length, repositories: results };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  @Tool({
    name: 'read_repository_file',
    description: 'Read the contents of a file directly from a GitHub repository.',
    inputSchema: z.object({
      owner: z.string().min(1).describe('GitHub repository owner / organization.'),
      repo: z.string().min(1).describe('GitHub repository name.'),
      path: z.string().min(1).describe('File path within the repository.'),
    }),
  })
  async readRepositoryFile(
    input: { owner: string; repo: string; path: string },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('Reading GitHub file', { repo: `${input.owner}/${input.repo}`, path: input.path });

    try {
      const content = await this.githubService.getFileContent(input.owner, input.repo, input.path);
      return { success: true, path: input.path, content };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  @Tool({
    name: 'clone_repository',
    description: 'Clone a public or accessible GitHub repository into local storage for indexing and analysis.',
    inputSchema: z.object({
      owner: z.string().min(1).describe('GitHub repository owner / organization.'),
      repo: z.string().min(1).describe('GitHub repository name.'),
      target_name: z.string().optional().describe('Optional custom local folder name.'),
    }),
  })
  async cloneRepository(
    input: { owner: string; repo: string; target_name?: string },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('Cloning GitHub repo', { repo: `${input.owner}/${input.repo}` });

    try {
      const result = await this.githubService.cloneRepository(input.owner, input.repo, input.target_name);
      return {
        success: true,
        localPath: result.localPath,
        url: result.url,
        message: `Repository cloned to ${result.localPath}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  @Tool({
    name: 'create_issue',
    description: 'Create a GitHub issue on a repository. Requires GITHUB_TOKEN environment variable.',
    inputSchema: z.object({
      owner: z.string().min(1).describe('GitHub repository owner / organization.'),
      repo: z.string().min(1).describe('GitHub repository name.'),
      title: z.string().min(1).describe('Issue title.'),
      body: z.string().min(1).describe('Issue description markdown.'),
    }),
  })
  async createIssue(
    input: { owner: string; repo: string; title: string; body: string },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('Creating GitHub issue', { repo: `${input.owner}/${input.repo}`, title: input.title });

    try {
      const issue = await this.githubService.createIssue(input.owner, input.repo, input.title, input.body);
      return { success: true, issueId: issue.id, url: issue.url };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }
}
