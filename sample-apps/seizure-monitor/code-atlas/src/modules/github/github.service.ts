import { Injectable } from '@nitrostack/core';

const MAX_FILE_SIZE = 100_000;

@Injectable({ deps: [] })
export class GitHubService {
  private getHeaders(githubToken?: string): Record<string, string> {
    const h: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'PPR-MCP-Server',
    };
    const token = githubToken || process.env.GITHUB_ACCESS_TOKEN;
    if (token) h['Authorization'] = `token ${token}`;
    return h;
  }

  async getRepoTree(owner: string, repo: string, branch: string = 'main', githubToken?: string) {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
      { headers: this.getHeaders(githubToken) }
    );
    if (!res.ok) throw new Error(`GitHub API error ${res.status}: ${res.statusText}`);
    const data: any = await res.json();
    return (data.tree as any[]).map((item: any) => ({
      path: item.path,
      type: item.type,
      size: item.size ?? null,
    }));
  }

  async getFileContent(owner: string, repo: string, path: string, branch: string = 'main', githubToken?: string) {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
      { headers: this.getHeaders(githubToken) }
    );
    if (!res.ok) throw new Error(`GitHub API error ${res.status}: ${res.statusText}`);
    const data: any = await res.json();
    if (data.type !== 'file') throw new Error(`Path '${path}' is not a file`);
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    if (content.length > MAX_FILE_SIZE) {
      return content.slice(0, MAX_FILE_SIZE) + '\n\n... (truncated, exceeds 100KB)';
    }
    return content;
  }

  async getDirectoryContents(owner: string, repo: string, path: string, branch: string = 'main', githubToken?: string) {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
      { headers: this.getHeaders(githubToken) }
    );
    if (!res.ok) throw new Error(`GitHub API error ${res.status}: ${res.statusText}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error(`Path '${path}' is not a directory`);
    return (data as any[]).map((item: any) => ({
      name: item.name,
      type: item.type,
      size: item.size,
      path: item.path,
    }));
  }

  async getPrDiff(owner: string, repo: string, prNumber: number, githubToken?: string) {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
      { headers: { ...this.getHeaders(githubToken), Accept: 'application/vnd.github.v3.diff' } }
    );
    if (!res.ok) throw new Error(`GitHub API error ${res.status}: ${res.statusText}`);
    return res.text();
  }

  async getPrFiles(owner: string, repo: string, prNumber: number, githubToken?: string) {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`,
      { headers: this.getHeaders(githubToken) }
    );
    if (!res.ok) throw new Error(`GitHub API error ${res.status}: ${res.statusText}`);
    const data = await res.json();
    return (data as any[]).map((item: any) => ({
      filename: item.filename,
      status: item.status,
      additions: item.additions,
      deletions: item.deletions,
      patch: item.patch ?? null,
    }));
  }

  async getRecentCommits(owner: string, repo: string, branch: string = 'main', count: number = 10, githubToken?: string) {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits?sha=${branch}&per_page=${count}`,
      { headers: this.getHeaders(githubToken) }
    );
    if (!res.ok) throw new Error(`GitHub API error ${res.status}: ${res.statusText}`);
    const data = await res.json();
    return (data as any[]).map((item: any) => ({
      sha: item.sha?.slice(0, 7),
      message: item.commit?.message?.split('\n')[0],
      author: item.commit?.author?.name,
      date: item.commit?.author?.date,
    }));
  }
}
