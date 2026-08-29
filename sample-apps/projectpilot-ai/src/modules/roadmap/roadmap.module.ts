import { Module } from '@nitrostack/core';
import { RoadmapTools } from './roadmap.tools.js';
import { RoadmapService } from './roadmap.service.js';

@Module({
  name: 'roadmap',
  description: 'Builds phases, milestones, dependencies and risk list',

  controllers: [
    RoadmapTools,
  ],

  providers: [
    RoadmapTools,
    RoadmapService,
  ],

  exports: [
    RoadmapService,
  ],
})
export class RoadmapModule {}