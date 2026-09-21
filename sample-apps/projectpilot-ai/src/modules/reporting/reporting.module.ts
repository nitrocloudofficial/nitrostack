import { Module } from '@nitrostack/core';
import { ReportingTools } from './reporting.tools.js';
import { ReportingResources } from './reporting.resources.js';
import { ReportingPrompts } from './reporting.prompts.js';
import { ReportingService } from './reporting.service.js';

@Module({
  name: 'reporting',
  description: 'Assembles the final Planning Report and Allocation & Progress Report',

  controllers: [
    ReportingTools,
    ReportingResources,
    ReportingPrompts,
  ],

  providers: [
    ReportingTools,
    ReportingResources,
    ReportingPrompts,
    ReportingService,
  ],

  exports: [
    ReportingService,
  ],
})
export class ReportingModule {}
