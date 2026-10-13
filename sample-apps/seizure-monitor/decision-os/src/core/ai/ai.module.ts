import { Module } from '@nitrostack/core';
import { OpenAICompatibleProvider } from './openai-compatible.provider.js';
import { AIService } from './ai.service.js';

@Module({
  name: 'ai-core',
  description: 'Core AI infrastructure module providing provider abstractions and LLM capabilities.',
  providers: [OpenAICompatibleProvider, AIService],
  exports: [OpenAICompatibleProvider, AIService],
})
export class AIModule {}
