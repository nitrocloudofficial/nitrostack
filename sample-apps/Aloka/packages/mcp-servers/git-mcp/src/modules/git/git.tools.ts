import { ToolDecorator as Tool, z } from '@nitrostack/core';
import { GitService } from './git.service.js';

const gitService = new GitService();

export class GitTools {
  constructor() {}

  @Tool({
    name: 'read_file_at_commit',
    description: 'Fetches exact file contents at a given commit SHA',
    inputSchema: z.object({ repo: z.string(), commit: z.string(), path: z.string() })
  })
  async readFileAtCommit(args: { repo: string, commit: string, path: string }) {
    return await gitService.readFile(args.repo, args.commit, args.path);
  }

  @Tool({
    name: 'create_branch_and_pr',
    description: 'Stage fix, create branch, and open Pull Request',
    inputSchema: z.object({
      repo_slug: z.string(),
      base_branch: z.string().default('main'),
      new_branch: z.string(),
      file_changes: z.array(z.object({ path: z.string(), content: z.string() })),
      pr_title: z.string(),
      pr_body: z.string().optional()
    })
  })
  async createBranchAndPr(args: { repo_slug: string, base_branch: string, new_branch: string, file_changes: {path: string, content: string}[], pr_title: string, pr_body?: string }) {
    return await gitService.createBranchAndPr(args.repo_slug, args.base_branch, args.new_branch, args.file_changes, args.pr_title, args.pr_body);
  }
}
