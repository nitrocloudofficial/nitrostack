import { Module } from '@nitrostack/core';
import { GitHubExceptionFilter } from '../../filters/github-exception.filter.js';
import { GitHubBrowserAuthService } from './github-browser-auth.service.js';
import { GitHubService } from './github.service.js';
import { GitHubTools } from './github.tools.js';
import { RepositoryAnalyzerService } from './repository-analyzer.service.js';

/**
 * GitHub feature module containing tools and services for repository automation.
 */
@Module({
  name: 'github',
  description: 'GitHub repository automation module',
  controllers: [GitHubTools],
  providers: [GitHubService, RepositoryAnalyzerService, GitHubExceptionFilter, GitHubBrowserAuthService],
  exports: [GitHubService, RepositoryAnalyzerService],
})
export class GitHubModule {}
