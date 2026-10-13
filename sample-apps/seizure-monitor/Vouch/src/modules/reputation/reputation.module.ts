import { Module } from '@nitrostack/core';
import { ReputationTools } from './reputation.tools.js';
import { ReputationResources } from './reputation.resources.js';
import { ReputationPrompts } from './reputation.prompts.js';
import { DatabaseService } from '../../lib/database.service.js';

@Module({
  name: 'reputation',
  description: 'Reviewer reputation, badges, and tier management',
  controllers: [ReputationTools, ReputationResources, ReputationPrompts],
  providers: [DatabaseService],
})
export class ReputationModule {}
