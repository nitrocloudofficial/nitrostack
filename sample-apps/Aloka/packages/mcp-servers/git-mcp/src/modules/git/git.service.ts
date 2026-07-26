import { Injectable } from '@nitrostack/core';
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
