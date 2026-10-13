import { Module } from '@nitrostack/core';
import { AIModule } from '../../core/ai/ai.module.js';
import { OpenAICompatibleProvider } from '../../core/ai/openai-compatible.provider.js';
import { AIService } from '../../core/ai/ai.service.js';
import { ContextService } from './context.service.js';
import { ContextTools } from './context.tools.js';

@Module({
  name: 'context-engine',
  description: 'Engine responsible for parsing and structuring user requests via Gemini AI.',
  imports: [AIModule],
  controllers: [ContextTools],
  providers: [OpenAICompatibleProvider, AIService, ContextService, ContextTools],
  exports: [ContextService]
})
export class ContextEngineModule {}
