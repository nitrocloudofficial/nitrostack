import { Module } from '@nitrostack/core';
import { AgentsTools } from './agents.tools.js';
import { AgentsService } from './agents.service.js';
import { BrainModule } from '../brain/brain.module.js';

@Module({
  name: 'agents',
  description: 'Supervisor, Summarizer, Review, and Task Analyzer agents',
  controllers: [AgentsTools],
  providers: [AgentsService],
  imports: [BrainModule],
  exports: [AgentsService]
})
export class AgentsModule {}
