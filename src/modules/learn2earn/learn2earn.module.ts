import { Module } from '@nitrostack/core';
import { Learn2EarnService } from './learn2earn.service.js';
import { Learn2EarnTools } from './learn2earn.tools.js';
import { Learn2EarnResources } from './learn2earn.resources.js';
import { Learn2EarnPrompts } from './learn2earn.prompts.js';

@Module({
  name: 'learn2earn',
  description: 'Learn2Earn AI - gamified learning with AI-generated lessons, quizzes, roadmaps, and a reward wallet',
  controllers: [Learn2EarnTools, Learn2EarnResources, Learn2EarnPrompts],
  providers: [Learn2EarnService],
})
export class Learn2EarnModule {}
