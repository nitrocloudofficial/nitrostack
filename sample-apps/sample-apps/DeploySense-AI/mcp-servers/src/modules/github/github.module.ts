import { Module } from '@nitrostack/core';
import { GithubService } from './github.service.js';
import { GithubTools } from './github.tools.js';
import { ConfigModule } from '../config/config.module.js';

@Module({
  name: 'githubmodule',
  imports: [ConfigModule],
  controllers: [GithubTools],
  providers: [GithubService],
  exports: [GithubService],
})
export class GithubModule {}

