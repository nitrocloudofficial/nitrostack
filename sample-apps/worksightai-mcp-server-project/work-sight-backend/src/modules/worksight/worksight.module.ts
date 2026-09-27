import { Module } from '@nitrostack/core';
import { WorkSightTools } from './worksight.tools.js';
import { WorkSightResources } from './worksight.resources.js';
import { WorkSightPrompts } from './worksight.prompts.js';

@Module({
  name: 'worksight',
  description: 'Work Sight AI workplace intelligence module for attendance, focus tracking, and phone alert detection',
  controllers: [
    WorkSightTools,
    WorkSightResources,
    WorkSightPrompts,
  ]
})
export class WorkSightModule {}
