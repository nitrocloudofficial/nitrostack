import { Module } from '@nitrostack/core';
import { GithubService } from './github.service.js';
import { ConfigModule } from '../config/config.module.js';

/**
 * GitHub Module
 */
@Module({
  name: 'github',
  description: 'GitHub API wrapper for code search',
  imports: [ConfigModule],
  providers: [GithubService],
  exports: [GithubService],
})
export class GithubModule {}