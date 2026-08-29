import { Module } from '@nitrostack/core';
import { ReportTools } from './report.tools.js';
import { ReportPrompts } from './report.prompts.js';

@Module({
  name: 'report',
  description: 'Risk interpretation, lifestyle context, and final report generation',
  controllers: [ReportTools, ReportPrompts],
})
export class ReportModule {}
