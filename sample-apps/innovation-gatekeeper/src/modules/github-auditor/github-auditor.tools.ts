import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';

export class GitHubAuditorTools {
  @Tool({
    name: 'clone-and-audit-repository',
    description: 'Clone and analyze a GitHub repository for quality metrics, security, and metadata',
    inputSchema: z.object({
      repositoryUrl: z.string().url().describe('GitHub repository URL (e.g., https://github.com/user/repo)')
    }),
    examples: {
      request: {
        repositoryUrl: 'https://github.com/example-user/innovation-project'
      },
      response: {
        repositoryName: 'innovation-project',
        repositoryUrl: 'https://github.com/example-user/innovation-project',
        completenessScore: 85,
        codeQualityScore: 90,
        documentationScore: 75,
        testCoverageScore: 60,
        averageScore: 77.5,
        tier: 'Silver',
        status: 'evaluated'
      }
    }
  })
  @Widget('repository-score')
  async cloneAndAuditRepository(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Auditing repository', { url: input.repositoryUrl });

    // Parse repository URL
    const urlParts = input.repositoryUrl.replace('https://github.com/', '').split('/');
    const owner = urlParts[0];
    const repo = urlParts[1]?.replace('.git', '');

    if (!owner || !repo) {
      throw new Error('Invalid GitHub repository URL format');
    }

    try {
      const headers: Record<string, string> = {
        'User-Agent': 'NitroStack-GitHub-Auditor'
      };

      // Fetch repo metadata
      const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
      
      if (!repoResponse.ok) {
        if (repoResponse.status === 404) {
          throw new Error('Repository not found');
        } else if (repoResponse.status === 403) {
          throw new Error('GitHub API rate limit exceeded');
        }
        throw new Error(`GitHub API error: ${repoResponse.statusText}`);
      }

      const repoData: any = await repoResponse.json();

      // Fetch root contents for test coverage estimation
      const contentsResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents`, { headers });
      let hasTestFolder = false;
      if (contentsResponse.ok) {
        const contents: any = await contentsResponse.json();
        if (Array.isArray(contents)) {
          hasTestFolder = contents.some((item: any) => 
            item.type === 'dir' && ['test', 'tests', 'spec', 'e2e'].includes(item.name.toLowerCase())
          );
        }
      }

      // Calculate completeness (description, homepage, topics, issues enabled)
      let completenessScore = 50;
      if (repoData.description) completenessScore += 15;
      if (repoData.homepage) completenessScore += 15;
      if (repoData.has_issues) completenessScore += 10;
      if (repoData.topics && repoData.topics.length > 0) completenessScore += 10;

      // Calculate code quality (heuristic based on stars, forks, and watchers)
      let codeQualityScore = 50;
      if (repoData.stargazers_count > 0) codeQualityScore += Math.min(25, repoData.stargazers_count * 2);
      if (repoData.forks_count > 0) codeQualityScore += Math.min(25, repoData.forks_count * 5);

      // Calculate documentation (wiki, pages, readme is assumed via completeness)
      let documentationScore = 60;
      if (repoData.has_wiki) documentationScore += 20;
      if (repoData.has_pages) documentationScore += 20;

      // Calculate test coverage score based on test folder presence
      const testCoverageScore = hasTestFolder ? 90 : 30;

      const averageScore = (completenessScore + codeQualityScore + documentationScore + testCoverageScore) / 4;

      let tier = 'Bronze';
      if (averageScore >= 90) tier = 'Platinum';
      else if (averageScore >= 80) tier = 'Gold';
      else if (averageScore >= 70) tier = 'Silver';

      return {
        repositoryName: repo,
        repositoryUrl: input.repositoryUrl,
        completenessScore,
        codeQualityScore,
        documentationScore,
        testCoverageScore,
        averageScore,
        tier,
        status: 'evaluated'
      };
    } catch (error: any) {
      ctx.logger.error('Failed to audit repository', { error: error.message });
      
      // Fallback response for errors like rate limits
      return {
        repositoryName: repo,
        repositoryUrl: input.repositoryUrl,
        completenessScore: 0,
        codeQualityScore: 0,
        documentationScore: 0,
        testCoverageScore: 0,
        averageScore: 0,
        tier: 'Unknown',
        status: `Error: ${error.message}`
      };
    }
  }
}
