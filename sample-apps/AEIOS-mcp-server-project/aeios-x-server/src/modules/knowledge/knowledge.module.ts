import { Module } from '@nitrostack/core';
import { KnowledgeTools } from './knowledge.tools.js';
import { KnowledgeResources } from './knowledge.resources.js';

@Module({
  name: 'knowledge',
  description: 'Enterprise Knowledge Management - Blackboard shared memory and knowledge categorization',
  controllers: [KnowledgeTools, KnowledgeResources],
})
export class KnowledgeModule {}
