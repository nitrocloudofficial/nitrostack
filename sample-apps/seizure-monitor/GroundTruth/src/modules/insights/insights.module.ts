import { Module } from '@nitrostack/core';
import { InsightsTools } from './insights.tools.js';
import { InsightsPrompts } from './insights.prompts.js';

/**
 * Analysis that spans days and people, rather than a single report:
 * wellbeing trends, report search, and open manager questions.
 */
@Module({
  name: 'insights',
  description: 'Cross-day trend analysis, report search, and manager Q&A',
  controllers: [InsightsTools, InsightsPrompts],
})
export class InsightsModule {}
