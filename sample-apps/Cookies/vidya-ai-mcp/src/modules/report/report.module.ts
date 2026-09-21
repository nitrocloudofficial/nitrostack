import { Module } from '@nitrostack/core';
import { ReportTools } from './report.tools.js';

@Module({
  name: 'report',
  description: 'Generate consolidated learning reports',
  controllers: [ReportTools]
})
export class ReportModule {}
