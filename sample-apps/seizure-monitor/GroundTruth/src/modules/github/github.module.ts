import { Module } from '@nitrostack/core';
import { GitHubTools } from './github.tools.js';
import { GitHubResources } from './github.resources.js';

/**
 * Supplies the objective side of GroundTruth: what GitHub says actually happened.
 */
@Module({
  name: 'github',
  description: 'Live GitHub activity used as ground truth for verifying EOD claims',
  controllers: [GitHubTools, GitHubResources],
})
export class GitHubModule {}
