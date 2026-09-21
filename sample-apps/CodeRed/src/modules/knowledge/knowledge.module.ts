import { Module } from '@nitrostack/core';
import { KnowledgeTools } from './knowledge.tools.js';

@Module({
  name: 'knowledge',
  description: 'Cross-source project knowledge aggregation tools',
  controllers: [KnowledgeTools]
})
export class KnowledgeModule {}