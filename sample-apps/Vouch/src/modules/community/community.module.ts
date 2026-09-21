import { Module } from '@nitrostack/core';
import { CommunityTools } from './community.tools.js';
import { CommunityResources } from './community.resources.js';
import { CommunityPrompts } from './community.prompts.js';
import { DatabaseService } from '../../lib/database.service.js';

@Module({
  name: 'community',
  description: 'Community reactions, reports, and moderation',
  controllers: [CommunityTools, CommunityResources, CommunityPrompts],
  providers: [DatabaseService],
})
export class CommunityModule {}
