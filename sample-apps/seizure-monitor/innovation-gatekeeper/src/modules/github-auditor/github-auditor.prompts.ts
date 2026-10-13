import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';

export class GitHubAuditorPrompts {
  @Tool({
    name: 'review_repository',
    description: 'Generate a comprehensive review of the audited repository',
    inputSchema: z.object({
      repositoryName: z.string().describe('Name of the repository'),
      repositoryScore: z.number().describe('Overall repository quality score (0-100)'),
      commitCount: z.number().describe('Total number of commits'),
      contributorCount: z.number().describe('Number of contributors'),
      primaryLanguage: z.string().describe('Primary programming language'),
      readmePresent: z.boolean().describe('Whether README exists'),
      licensePresent: z.boolean().describe('Whether LICENSE exists'),
      securityIssuesFound: z.number().describe('Number of security issues found')
    })
  })
  async reviewRepository(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Generating repository review', { repo: input.repositoryName });

    const scoreLevel = input.repositoryScore >= 80 ? 'Excellent' : 
                       input.repositoryScore >= 60 ? 'Good' : 
                       input.repositoryScore >= 40 ? 'Fair' : 'Poor';

    const review = `
Repository: ${input.repositoryName}
Quality Score: ${input.repositoryScore}/100 (${scoreLevel})

Key Metrics:
- Total Commits: ${input.commitCount}
- Contributors: ${input.contributorCount}
- Primary Language: ${input.primaryLanguage}
- README: ${input.readmePresent ? '✓ Present' : '✗ Missing'}
- LICENSE: ${input.licensePresent ? '✓ Present' : '✗ Missing'}
- Security Issues: ${input.securityIssuesFound}

Summary:
${this.generateSummary(input)}
    `.trim();

    return {
      review,
      scoreLevel,
      status: 'success'
    };
  }

  private generateSummary(input: any): string {
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    if (input.readmePresent) strengths.push('Well-documented with README');
    else weaknesses.push('Missing README documentation');

    if (input.licensePresent) strengths.push('Proper licensing in place');
    else weaknesses.push('No license specified');

    if (input.commitCount > 30) strengths.push('Active development history');
    else weaknesses.push('Limited commit history');

    if (input.contributorCount > 2) strengths.push('Multiple contributors involved');
    else weaknesses.push('Limited team collaboration');

    if (input.securityIssuesFound === 0) strengths.push('No security issues detected');
    else weaknesses.push(`${input.securityIssuesFound} security issue(s) found`);

    let summary = '';
    if (strengths.length > 0) {
      summary += `Strengths: ${strengths.join(', ')}. `;
    }
    if (weaknesses.length > 0) {
      summary += `Areas for improvement: ${weaknesses.join(', ')}.`;
    }

    return summary;
  }
}
