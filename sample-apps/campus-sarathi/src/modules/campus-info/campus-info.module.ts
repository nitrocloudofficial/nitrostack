import { Module } from '@nitrostack/core';
import { CampusInfoTools } from './campus-info.tools.js';
import { CampusInfoResources } from './campus-info.resources.js';
import { CampusInfoService } from './campus-info.service.js';

@Module({
  name: 'campus-info',
  description: 'University campus information and events',
  controllers: [CampusInfoTools, CampusInfoResources],
  providers: [CampusInfoService],
  imports: [],
  exports: [CampusInfoService]
})
export class CampusInfoModule {}
