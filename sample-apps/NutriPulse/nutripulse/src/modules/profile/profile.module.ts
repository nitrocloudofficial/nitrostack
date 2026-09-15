import { Module } from '@nitrostack/core';
import { profileTools } from './profile.tools.js';
import { profileResources } from './profile.resources.js';
import { profilePrompts } from './profile.prompts.js';

@Module({
  name: 'profile',
  description: 'TODO: Add description',
  controllers: [profileTools, profileResources, profilePrompts],
})
export class profileModule {}
