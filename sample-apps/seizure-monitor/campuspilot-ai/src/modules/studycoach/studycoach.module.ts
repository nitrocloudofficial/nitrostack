import { Module } from '@nitrostack/core';
import { StudyCoachTools } from './studycoach.tools.js';
import { StudyCoachPrompts } from './studycoach.prompts.js';

@Module({
  name: 'studycoach',
  description: 'Smart Study Coach: the flagship agentic feature that proactively analyzes all academic data and generates a personalized daily study plan',
  controllers: [StudyCoachTools, StudyCoachPrompts],
})
export class StudyCoachModule {}
