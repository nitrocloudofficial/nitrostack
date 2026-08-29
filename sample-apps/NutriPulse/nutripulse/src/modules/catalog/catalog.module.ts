import { Module } from '@nitrostack/core';
import { catalogTools } from './catalog.tools.js';
import { catalogResources } from './catalog.resources.js';
import { catalogPrompts } from './catalog.prompts.js';

@Module({
  name: 'catalog',
  description: 'TODO: Add description',
  controllers: [catalogTools, catalogResources, catalogPrompts],
})
export class catalogModule {}
