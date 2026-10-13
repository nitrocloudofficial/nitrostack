import { Module } from '@nitrostack/core';
import { KnowledgeService } from './knowledge.service.js';
import { KnowledgeTools } from './knowledge.tools.js';

@Module({
    name: 'knowledge',
    description: 'Knowledge Engine integration module',
    controllers: [KnowledgeTools],
    providers: [KnowledgeService],
})
export class KnowledgeModule { }
