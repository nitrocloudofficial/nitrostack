import { Module } from '@nitrostack/core';
import { SharedModule } from '../../shared/shared.module.js';
import { GithubService } from './github.service.js';
import { GithubTools } from './github.tools.js';

/**
 * GitHub Module
 *
 * Provides repository search, content retrieval, git cloning, and issue creation.
 */
@Module({
  name: 'github',
  description: 'GitHub API integration module',
  imports: [SharedModule],
  providers: [GithubService],
  controllers: [GithubTools],
  exports: [GithubService],
})
export class GithubModule {}
