import { Module } from '@nitrostack/core';
import { AITools } from './ai.tools.js';
import { AIResources } from './ai.resources.js';
import { AIPrompts } from './ai.prompts.js';
import { AIAnalysisService } from '../../lib/ai-analysis.service.js';
import { DatabaseService } from '../../lib/database.service.js';

@Module({
  name: 'ai',
  description: 'AI analysis: sentiment, duplicates, spam detection, smart summaries',
  controllers: [AITools, AIResources, AIPrompts],
  providers: [AIAnalysisService, DatabaseService],
})
export class AIModule {}
