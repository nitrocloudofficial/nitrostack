import { Module } from '@nitrostack/core';
import { GithubTools } from './github.tools.js';

@Module({
  name: 'github',
  description: 'GitHub repository tools',
  controllers: [GithubTools]
})
export class GithubModule {}