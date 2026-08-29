import { Module } from '@nitrostack/core';
import { GitHubAuditorTools } from './github-auditor.tools.js';
import { GitHubAuditorPrompts } from './github-auditor.prompts.js';

@Module({
  name: 'github-auditor',
  description: 'Audits GitHub repositories for quality metrics and security',
  controllers: [GitHubAuditorTools, GitHubAuditorPrompts]
})
export class GitHubAuditorModule {}
