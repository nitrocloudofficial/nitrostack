import { ToolDecorator as Tool, z, ExecutionContext } from '@nitrostack/core';

export class GithubTools {
  @Tool({
    name: 'get_recent_commits',
    description: 'Get the most recent commits for a GitHub repository',
    inputSchema: z.object({
      owner: z.string().describe('Repository owner (username or org)'),
      repo: z.string().describe('Repository name'),
      count: z.number().int().min(1).max(20).default(5).describe('Number of commits to fetch')
    })
  })
  async getRecentCommits(input: { owner: string; repo: string; count: number }, ctx: ExecutionContext) {
    const url = 'https://api.github.com/repos/' + input.owner + '/' + input.repo + '/commits?per_page=' + input.count;

    const response = await fetch(url, {
      headers: {
        Authorization: 'Bearer ' + process.env.GITHUB_TOKEN,
        Accept: 'application/vnd.github+json'
      }
    });

    if (!response.ok) {
      throw new Error('GitHub API error: ' + response.status + ' ' + response.statusText);
    }

    const commits = await response.json() as any[];

    return {
      commits: commits.map((c: any) => ({
        message: c.commit.message,
        author: c.commit.author.name,
        date: c.commit.author.date,
        url: c.html_url
      }))
    };
  }
}