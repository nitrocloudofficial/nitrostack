import { Module } from '@nitrostack/core';
import { ScholarTools } from './scholar.tools.js';
import { ReadingListResource } from './scholar.resources.js';
import { ScholarPrompts } from './scholar.prompts.js';
import { ArxivService } from './services/arxiv.service.js';
import { ReadingListService } from './services/reading-list.service.js';

@Module({
  name: 'scholar',
  description: 'ResearchRadar: arXiv paper discovery + research commercialization intelligence',
  controllers: [
    ScholarTools,
    ReadingListResource,
    ScholarPrompts,
  ],
  providers: [
    ArxivService,
    ReadingListService,
  ],
  exports: [ArxivService, ReadingListService],
})
export class ScholarModule {}
