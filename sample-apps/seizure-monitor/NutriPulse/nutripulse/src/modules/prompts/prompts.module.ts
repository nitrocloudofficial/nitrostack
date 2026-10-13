import { Module } from '@nitrostack/core';
import { promptsTools } from './prompts.tools.js';
import { promptsResources } from './prompts.resources.js';
import { promptsPrompts } from './prompts.prompts.js';

@Module({
  name: 'prompts',
  description: 'TODO: Add description',
  controllers: [promptsTools, promptsResources, promptsPrompts],
})
export class promptsModule {}
