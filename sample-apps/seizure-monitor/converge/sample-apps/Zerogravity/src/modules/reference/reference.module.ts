import { Module } from '@nitrostack/core';
import { ReferenceTools } from './reference.tools.js';
import { ReferenceResources } from './reference.resources.js';
import { ReferencePrompts } from './reference.prompts.js';

@Module({
  name: 'reference',
  description: 'TODO: Add description',
  controllers: [ReferenceTools, ReferenceResources, ReferencePrompts],
})
export class ReferenceModule {}
