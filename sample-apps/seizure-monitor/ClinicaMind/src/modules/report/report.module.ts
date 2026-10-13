import { Module } from '@nitrostack/core';
import { ReportService } from './report.service.js';
import { ReportController } from './report.controller.js';

@Module({
  name: 'report',
  description: 'Clinical Briefing Report Generator Agent Module',
  controllers: [ReportController],
  providers: [ReportService],
  exports: [ReportService]
})
export class ReportModule {}
