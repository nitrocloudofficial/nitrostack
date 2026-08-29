import { Module } from '@nitrostack/core';
import { LlmService } from './llm.service.js';

@Module({
  name: 'llm',
  providers: [LlmService],
  exports: [LlmService]
})
export class LlmModule {}
