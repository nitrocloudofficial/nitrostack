import { Module } from '@nitrostack/core';
import { HelixTools } from './helix.tools.js';
import { LLMService } from '../../services/llm.service.js';
import { RAGService } from '../../services/rag.service.js';

@Module({
  name: 'helix',
  providers: [LLMService, RAGService, HelixTools]
})
export class HelixModule { }
