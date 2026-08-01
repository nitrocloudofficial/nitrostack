import { Module } from '@nitrostack/core';
import { ResearchService } from './research.service.js';
import { ResearchController } from './research.controller.js';

@Module({
  name: 'research',
  description: 'PubMed Medical Literature Research Agent Module',
  controllers: [ResearchController],
  providers: [ResearchService],
  exports: [ResearchService]
})
export class ResearchModule {}
