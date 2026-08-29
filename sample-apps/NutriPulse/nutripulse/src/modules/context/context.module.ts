import { Module } from '@nitrostack/core';
import { contextTools } from './context.tools.js';
import { contextResources } from './context.resources.js';
import { contextPrompts } from './context.prompts.js';

@Module({
  name: 'context',
  description: 'TODO: Add description',
  controllers: [contextTools, contextResources, contextPrompts],
})
export class contextModule {}
