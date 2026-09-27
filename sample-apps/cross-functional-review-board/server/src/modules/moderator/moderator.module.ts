import { Module } from '@nitrostack/core';
import { ModeratorTools } from './moderator.tools.js';
import { ModeratorResources } from './moderator.resources.js';
import { ModeratorPrompts } from './moderator.prompts.js';

@Module({
  name: 'moderator',
  description: 'Moderator synthesis agent for final decision report',
  controllers: [ModeratorTools, ModeratorResources, ModeratorPrompts]
})
export class ModeratorModule {}
