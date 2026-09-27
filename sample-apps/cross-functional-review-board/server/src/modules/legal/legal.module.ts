import { Module } from '@nitrostack/core';
import { LegalTools } from './legal.tools.js';
import { LegalResources } from './legal.resources.js';
import { LegalPrompts } from './legal.prompts.js';

@Module({
  name: 'legal',
  description: 'Legal review agent for business proposals',
  controllers: [LegalTools, LegalResources, LegalPrompts]
})
export class LegalModule {}
