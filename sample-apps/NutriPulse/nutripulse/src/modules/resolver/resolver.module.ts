import { Module } from '@nitrostack/core';
import { resolverTools } from './resolver.tools.js';
import { resolverResources } from './resolver.resources.js';
import { resolverPrompts } from './resolver.prompts.js';

@Module({
  name: 'resolver',
  description: 'TODO: Add description',
  controllers: [resolverTools, resolverResources, resolverPrompts],
})
export class resolverModule {}
