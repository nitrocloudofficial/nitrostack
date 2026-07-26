import { Module } from '@nitrostack/core';
import { GithubTools } from './github.tools.js';

@Module({
  name: 'github',
  description: 'GitHub integration module',
  controllers: [GithubTools]
})
export class GithubModule {}
