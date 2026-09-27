import { Module } from '@nitrostack/core';
import { KnowledgeResources } from './knowledge.resources.js';
import { KnowledgePrompts } from './knowledge.prompts.js';

@Module({
  name: 'knowledge',
  description: 'Provides scheme data and glossary resources and prompts',
  controllers: [KnowledgeResources, KnowledgePrompts]
})
export class KnowledgeModule {}
