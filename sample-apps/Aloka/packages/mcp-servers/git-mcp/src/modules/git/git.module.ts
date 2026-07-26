import { Module } from '@nitrostack/core';
import { GitTools } from './git.tools.js';
import { GitService } from './git.service.js';

@Module({
  name: 'git',
  description: 'Git operations MCP server',
  controllers: [GitTools],
  providers: [GitService]
})
export class GitModule {}
