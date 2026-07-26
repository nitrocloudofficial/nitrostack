#!/usr/bin/env node
import { Module, ToolDecorator as Tool, Injectable, McpApp, McpApplicationFactory, z } from '@nitrostack/core';
import { Sanitizer } from '@omnitrace/sanitizer';
import { Octokit } from '@octokit/rest';

@Injectable()
export class GitService {
  private octokit: Octokit;

  constructor() {
    this.octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  }

  private parseSlug(slug: string) {
    const parts = slug.split('/');
    if (parts.length !== 2) throw new Error(`Invalid repo slug: ${slug}`);
    return { owner: parts[0], repo: parts[1] };
  }

  public async readFile(repoSlug: string, commit: string, path: string): Promise<string> {
    try {
      const { owner, repo } = this.parseSlug(repoSlug);
      const res = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
        ref: commit
      });
      if ('content' in res.data) {
        const content = Buffer.from(res.data.content, 'base64').toString('utf8');
        return content; // File contents don't usually contain secrets, but we could scrub
      }
      throw new Error('Not a file');
    } catch (e: any) {
      return `[ERROR] Failed to read file: ${e.message}`;
    }
  }

  public async createBranchAndPr(repoSlug: string, base: string, branch: string, changes: {path: string, content: string}[], title: string, body?: string): Promise<string> {
    try {
      const { owner, repo } = this.parseSlug(repoSlug);

      // 1. Get base branch ref
      const baseRef = await this.octokit.git.getRef({ owner, repo, ref: `heads/${base}` });
      const baseSha = baseRef.data.object.sha;

      // 2. Create branch ref
      await this.octokit.git.createRef({ owner, repo, ref: `refs/heads/${branch}`, sha: baseSha });

      // 3. Create blobs for new files
      const treeEntries = await Promise.all(changes.map(async (c) => {
        const blob = await this.octokit.git.createBlob({ owner, repo, content: c.content, encoding: 'utf-8' });
        return {
          path: c.path,
          mode: '100644' as const,
          type: 'blob' as const,
          sha: blob.data.sha
        };
      }));

      // 4. Create new tree
      const baseCommit = await this.octokit.git.getCommit({ owner, repo, commit_sha: baseSha });
      const tree = await this.octokit.git.createTree({ owner, repo, base_tree: baseCommit.data.tree.sha, tree: treeEntries });

      // 5. Create new commit
      const newCommit = await this.octokit.git.createCommit({
        owner, repo, message: title, tree: tree.data.sha, parents: [baseSha]
      });

      // 6. Update branch ref
      await this.octokit.git.updateRef({ owner, repo, ref: `heads/${branch}`, sha: newCommit.data.sha });

      // 7. Create PR
      const pr = await this.octokit.pulls.create({
        owner, repo, title, body: body || '', head: branch, base
      });

      return Sanitizer.scrub(`[SUCCESS] Pull Request created: ${pr.data.html_url}`);
    } catch (e: any) {
      return `[ERROR] Failed to create PR: ${e.message}`;
    }
  }
}

@McpApp({ 
  module: GitServer, 
  server: { name: 'git-mcp', version: '1.0.0' },
  logging: { level: 'error' }
})
@Module({ 
  name: 'git', 
  imports: [
    
  ],
  providers: [GitService] 
})
export class GitServer {
  constructor(private readonly gitService: GitService) {}

  @Tool({
    name: 'read_file_at_commit',
    description: 'Fetches exact file contents at a given commit SHA',
    inputSchema: z.object({ repo: z.string(), commit: z.string(), path: z.string() })
  })
  async readFileAtCommit(args: { repo: string, commit: string, path: string }) {
    return await this.gitService.readFile(args.repo, args.commit, args.path);
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
    return await this.gitService.createBranchAndPr(args.repo_slug, args.base_branch, args.new_branch, args.file_changes, args.pr_title, args.pr_body);
  }
}

async function bootstrap() {
  const server = await McpApplicationFactory.create(GitServer);
  await server.start();
}
bootstrap().catch(console.error);
