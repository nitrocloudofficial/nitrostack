import { Module } from '@nitrostack/core';
import { ResearchTools } from './research.tools.js';

@Module({
  name: 'research',
  description: 'Research paper search, summarization, and citation management',
  controllers: [ResearchTools]
})
export class ResearchModule {}
