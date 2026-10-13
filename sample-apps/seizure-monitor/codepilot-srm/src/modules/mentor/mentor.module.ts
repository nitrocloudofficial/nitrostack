import { Module } from '@nitrostack/core';
import { MentorTools } from './mentor.tools.js';
import { MentorResources } from './mentor.resources.js';
import { MentorPrompts } from './mentor.prompts.js';

@Module({
  name: 'mentor',
  description: 'AI Interview Mentor - core business logic for CodePilot SRM',
  controllers: [
    MentorTools,
    MentorResources,
    MentorPrompts
  ]
})
export class MentorModule {}
