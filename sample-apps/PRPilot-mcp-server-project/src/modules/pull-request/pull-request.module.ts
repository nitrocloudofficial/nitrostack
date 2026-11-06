import { Module } from '@nitrostack/core';
import { PullRequestTools } from './pull-request.tools.js';

@Module({
  name: 'pull-request',
  description: 'Evidence-driven pull request intelligence and review dossier generation',
  controllers: [PullRequestTools]
})
export class PullRequestModule {}
