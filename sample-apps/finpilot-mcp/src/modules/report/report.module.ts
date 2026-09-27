import { Module } from '@nitrostack/core';
import { ReportTools } from './report.tools.js';

@Module({
  name: 'report',
  controllers: [ReportTools],
})
export class ReportModule {}
